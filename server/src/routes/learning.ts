import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { learningRecords, wordProgress, words, pets, streakRecords } from '../db/schemas/index.js'
import { eq, and, gte, lte, sql, desc, or, isNull } from 'drizzle-orm'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { calculateNextReview, isReviewDue } from '../services/ebbinghaus.js'
import { earnStarlight } from '../services/starlight-service.js'
import { userProfiles } from '../db/schemas/index.js'

export const learningRoutes = Router()

// 所有学习路由需要登录
learningRoutes.use(authMiddleware)

// ============================================================
// POST /sessions — 别名，兼 E2E 测试（等同于 /session/start）
// ============================================================
learningRoutes.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const today = new Date().toISOString().slice(0, 10)

    const [record] = await db
      .insert(learningRecords)
      .values({
        userId,
        sessionDate: today,
        startTime: new Date(),
        effectiveMinutes: 0,
        wordsLearned: 0,
        wordsReviewed: 0,
        sentencesSpoken: 0,
        starsEarned: 0,
        streakContinued: false,
      })
      .returning()

    res.json({ session: record })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create session' })
  }
})

// ============================================================
// GET /summary — 别名，兼 E2E 测试（等同于 /progress）
// ============================================================
learningRoutes.get('/summary', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const records = await db
      .select({
        effectiveMinutes: learningRecords.effectiveMinutes,
        wordsLearned: learningRecords.wordsLearned,
        wordsReviewed: learningRecords.wordsReviewed,
        sentencesSpoken: learningRecords.sentencesSpoken,
        starsEarned: learningRecords.starsEarned,
        sessionDate: learningRecords.sessionDate,
      })
      .from(learningRecords)
      .where(eq(learningRecords.userId, userId))

    const totalMinutes = records.reduce((s, r) => s + r.effectiveMinutes, 0)
    const totalWordsLearned = records.reduce((s, r) => s + r.wordsLearned, 0)

    res.json({
      summary: {
        totalMinutes,
        totalWordsLearned,
        totalSessions: records.length,
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get summary' })
  }
})

// ============================================================
// POST /session/start — 开始学习会话
// ============================================================
learningRoutes.post('/session/start', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const today = new Date().toISOString().slice(0, 10)

    const [record] = await db
      .insert(learningRecords)
      .values({
        userId,
        sessionDate: today,
        startTime: new Date(),
        effectiveMinutes: 0,
        wordsLearned: 0,
        wordsReviewed: 0,
        sentencesSpoken: 0,
        starsEarned: 0,
        streakContinued: false,
      })
      .returning()

    res.json({ session: record })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start session' })
  }
})

// ============================================================
// POST /session/end — 结束学习会话（提交学习数据）
// ============================================================
learningRoutes.post('/session/end', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const {
      sessionId,
      effectiveMinutes,
      wordsLearned,
      wordsReviewed,
      sentencesSpoken,
      starsEarned,
      emotionSummary,
    } = req.body

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' })
      return
    }

    const [record] = await db
      .select()
      .from(learningRecords)
      .where(and(eq(learningRecords.id, sessionId), eq(learningRecords.userId, userId)))
      .limit(1)

    if (!record) {
      res.status(404).json({ error: 'Session not found' })
      return
    }

    const [updated] = await db
      .update(learningRecords)
      .set({
        endTime: new Date(),
        effectiveMinutes: effectiveMinutes ?? record.effectiveMinutes,
        wordsLearned: wordsLearned ?? record.wordsLearned,
        wordsReviewed: wordsReviewed ?? record.wordsReviewed,
        sentencesSpoken: sentencesSpoken ?? record.sentencesSpoken,
        starsEarned: starsEarned ?? record.starsEarned,
        emotionSummary: emotionSummary ?? record.emotionSummary,
      })
      .where(eq(learningRecords.id, sessionId))
      .returning()

    // 更新宠物学习时长
    if (effectiveMinutes > 0) {
      const [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)
      if (pet) {
        await db
          .update(pets)
          .set({
            totalLearningMinutes: pet.totalLearningMinutes + effectiveMinutes,
            updatedAt: new Date(),
          })
          .where(eq(pets.userId, userId))
      }
    }

    // 自动处理连胜打卡（学习即打卡，无需用户手动操作）
    await autoStreakCheckin(userId)

    // 星光获取：根据学习数据自动发放
    try {
      if (wordsLearned > 0) {
        await earnStarlight(userId, 'earn_word', sessionId)
      }
      if (wordsReviewed > 0) {
        await earnStarlight(userId, 'earn_review', sessionId)
      }
    } catch {
      // 星光获取失败不影响主流程
    }

    res.json({ session: updated })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to end session' })
  }
})

// ============================================================
// POST /pronounce — 提交跟读评分结果
// ============================================================
learningRoutes.post('/pronounce', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const { wordId, score, accuracy, fluency, completeness, feedback, sessionId } = req.body

    if (!wordId || score == null) {
      res.status(400).json({ error: 'wordId and score are required' })
      return
    }

    // 更新或创建单词进度
    const [existing] = await db
      .select()
      .from(wordProgress)
      .where(and(eq(wordProgress.userId, userId), eq(wordProgress.wordId, wordId)))
      .limit(1)

    const quality = score >= 80 ? 'correct' : score >= 50 ? 'fuzzy' : 'forgot'

    if (existing) {
      const { nextReviewAt, newStage, status } = calculateNextReview(existing.reviewCount, quality)

      const [updated] = await db
        .update(wordProgress)
        .set({
          status,
          reviewCount: existing.reviewCount + 1,
          correctCount: quality === 'correct' ? existing.correctCount + 1 : existing.correctCount,
          lastReviewAt: new Date(),
          nextReviewAt,
          avgScore: existing.avgScore
            ? (existing.avgScore * existing.reviewCount + score / 100) / (existing.reviewCount + 1)
            : score / 100,
          updatedAt: new Date(),
        })
        .where(eq(wordProgress.id, existing.id))
        .returning()

      res.json({
        progress: updated,
        quality,
        nextStage: newStage,
        nextReviewInDays: nextReviewAt
          ? Math.ceil((nextReviewAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : null,
      })
    } else {
      // 首次学习
      const { nextReviewAt, newStage, status } = calculateNextReview(0, quality)

      const [created] = await db
        .insert(wordProgress)
        .values({
          userId,
          wordId,
          status,
          reviewCount: 1,
          correctCount: quality === 'correct' ? 1 : 0,
          lastReviewAt: new Date(),
          nextReviewAt,
          avgScore: score / 100,
        })
        .returning()

      res.json({
        progress: created,
        quality,
        nextStage: newStage,
        nextReviewInDays: Math.ceil((nextReviewAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      })
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process pronunciation' })
  }
})

// ============================================================
// GET /history — 学习历史（支持日期范围）
// ============================================================
learningRoutes.get('/history', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const from = req.query.from as string | undefined
    const to = req.query.to as string | undefined
    const limit = Math.min(parseInt((req.query.limit as string) || '30'), 100)

    const conditions = [eq(learningRecords.userId, userId)]
    if (from) conditions.push(gte(learningRecords.sessionDate, from))
    if (to) conditions.push(lte(learningRecords.sessionDate, to))

    const records = await db
      .select()
      .from(learningRecords)
      .where(and(...conditions))
      .orderBy(desc(learningRecords.sessionDate))
      .limit(limit)

    // 汇总统计
    const totalMinutes = records.reduce((sum, r) => sum + r.effectiveMinutes, 0)
    const totalWords = records.reduce((sum, r) => sum + r.wordsLearned, 0)
    const totalStars = records.reduce((sum, r) => sum + r.starsEarned, 0)

    res.json({
      records,
      summary: {
        totalSessions: records.length,
        totalMinutes,
        totalWords,
        totalStars,
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get history' })
  }
})

// ============================================================
// GET /today — 今日学习摘要
// ============================================================
learningRoutes.get('/today', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const today = new Date().toISOString().slice(0, 10)

    const [todayRecord] = await db
      .select()
      .from(learningRecords)
      .where(and(eq(learningRecords.userId, userId), eq(learningRecords.sessionDate, today)))
      .limit(1)

    // 待复习词
    const [reviewCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(wordProgress)
      .where(
        and(
          eq(wordProgress.userId, userId),
          lte(wordProgress.nextReviewAt, new Date()),
          or(
            eq(wordProgress.status, 'learning'),
            eq(wordProgress.status, 'review'),
            eq(wordProgress.status, 'new'),
          ),
        ),
      )

    // 已掌握词
    const [masteredCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(wordProgress)
      .where(and(eq(wordProgress.userId, userId), eq(wordProgress.status, 'mastered')))

    res.json({
      today: todayRecord || null,
      pendingReviews: Number(reviewCount?.count || 0),
      masteredWords: Number(masteredCount?.count || 0),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get today summary' })
  }
})

// ============================================================
// GET /review-queue — 获取当日待复习单词列表
// ============================================================
learningRoutes.get('/review-queue', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const limit = Math.min(parseInt((req.query.limit as string) || '20'), 50)

    const items = await db
      .select({
        progress: wordProgress,
        word: words,
      })
      .from(wordProgress)
      .innerJoin(words, eq(wordProgress.wordId, words.id))
      .where(
        and(
          eq(wordProgress.userId, userId),
          lte(wordProgress.nextReviewAt, new Date()),
          or(
            eq(wordProgress.status, 'learning'),
            eq(wordProgress.status, 'review'),
            eq(wordProgress.status, 'new'),
          ),
        ),
      )
      .orderBy(wordProgress.nextReviewAt)
      .limit(limit)

    res.json({
      queue: items,
      total: items.length,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get review queue' })
  }
})

// ============================================================
// GET /journal — 手账本：用户学过的所有单词卡牌（含稀有度）
// 稀有度规则：new/learning=common、review=rare、mastered=epic
// ============================================================
learningRoutes.get('/journal', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    const rows = await db
      .select({
        id: words.id,
        word: words.word,
        meaning: words.translation,
        theme: words.theme,
        status: wordProgress.status,
        reviewCount: wordProgress.reviewCount,
        updatedAt: wordProgress.updatedAt,
      })
      .from(wordProgress)
      .innerJoin(words, eq(wordProgress.wordId, words.id))
      .where(eq(wordProgress.userId, userId))
      .orderBy(desc(wordProgress.updatedAt))

    const statusToRarity = (status: string): { rarity: string; rarityLabel: string } => {
      if (status === 'mastered') return { rarity: 'epic', rarityLabel: '史诗' }
      if (status === 'review') return { rarity: 'rare', rarityLabel: '稀有' }
      return { rarity: 'common', rarityLabel: '普通' }
    }

    const items = rows.map((r) => {
      const { rarity, rarityLabel } = statusToRarity(r.status)
      return {
        id: r.id,
        word: r.word,
        meaning: r.meaning,
        theme: r.theme,
        status: r.status,
        rarity,
        rarityLabel,
      }
    })

    const stats = {
      total: items.length,
      rare: items.filter((i) => i.rarity === 'rare').length,
      epic: items.filter((i) => i.rarity === 'epic').length,
    }

    res.json({ items, stats })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get journal' })
  }
})

// ============================================================
// POST /review/:wordId — 提交复习结果
// ============================================================
learningRoutes.post('/review/:wordId', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const wordId = req.params.wordId
    const { quality, score } = req.body // quality: 'correct' | 'fuzzy' | 'forgot'

    if (!quality || !['correct', 'fuzzy', 'forgot'].includes(quality)) {
      res.status(400).json({ error: 'quality must be one of: correct, fuzzy, forgot' })
      return
    }

    const [existing] = await db
      .select()
      .from(wordProgress)
      .where(and(eq(wordProgress.userId, userId), eq(wordProgress.wordId, wordId)))
      .limit(1)

    if (!existing) {
      res.status(404).json({ error: 'Word progress not found. Learn this word first via /pronounce' })
      return
    }

    const { nextReviewAt, newStage, status } = calculateNextReview(existing.reviewCount, quality)

    const [updated] = await db
      .update(wordProgress)
      .set({
        status,
        reviewCount: existing.reviewCount + 1,
        correctCount: quality === 'correct' ? existing.correctCount + 1 : existing.correctCount,
        lastReviewAt: new Date(),
        nextReviewAt,
        avgScore:
          score != null
            ? existing.avgScore
              ? (existing.avgScore * existing.reviewCount + score) / (existing.reviewCount + 1)
              : score
            : existing.avgScore,
        updatedAt: new Date(),
      })
      .where(eq(wordProgress.id, existing.id))
      .returning()

    res.json({
      progress: updated,
      newStage,
      status,
      nextReviewInDays: Math.ceil((nextReviewAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process review' })
  }
})

// ============================================================
// GET /daily-plan — 获取今日学习计划
// ============================================================
learningRoutes.get('/daily-plan', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    // 获取用户年级
    const [user] = await db
      .select({ grade: sql<number>`grade` })
      .from(sql`users`)
      .where(eq(sql`id`, userId))
      .limit(1)
      .catch(() => [null])

    const gradeLevel = user?.grade || 3

    // 待复习词
    const reviewItems = await db
      .select({
        progress: wordProgress,
        word: words,
      })
      .from(wordProgress)
      .innerJoin(words, eq(wordProgress.wordId, words.id))
      .where(
        and(
          eq(wordProgress.userId, userId),
          lte(wordProgress.nextReviewAt, new Date()),
          or(
            eq(wordProgress.status, 'learning'),
            eq(wordProgress.status, 'review'),
            eq(wordProgress.status, 'new'),
          ),
        ),
      )
      .orderBy(wordProgress.nextReviewAt)
      .limit(10)

    // 已学过的 wordId 集合
    const learnedIds = await db
      .select({ wordId: wordProgress.wordId })
      .from(wordProgress)
      .where(eq(wordProgress.userId, userId))

    const learnedIdSet = new Set(learnedIds.map((l) => l.wordId))

    // 推荐新词（同年级、未学过）
    // 优先推荐兴趣主题的单词
    let preferredThemes: string[] = []
    try {
      const [profile] = await db
        .select({ interestMap: userProfiles.interestMap })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1)
      if (profile?.interestMap) {
        const map = profile.interestMap as Record<string, number>
        preferredThemes = Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k]) => k)
      }
    } catch { /* profile read optional */ }

    const candidateLimit = learnedIdSet.size > 0 ? learnedIdSet.size + 20 : 20
    const candidates = await db
      .select()
      .from(words)
      .where(eq(words.gradeLevel, gradeLevel))
      .limit(candidateLimit)

    const unlearned = candidates.filter((w) => !learnedIdSet.has(w.id))

    // 兴趣主题优先排序
    const sorted = [...unlearned].sort((a, b) => {
      const aPref = a.theme && preferredThemes.includes(a.theme) ? 1 : 0
      const bPref = b.theme && preferredThemes.includes(b.theme) ? 1 : 0
      return bPref - aPref
    })

    const newWords = sorted.slice(0, 5)

    res.json({
      plan: {
        _version: '20260718-fix-uuid',
        reviewCount: reviewItems.length,
        newWordCount: newWords.length,
        reviewQueue: reviewItems.map((r) => ({
          wordId: r.word.id,
          word: r.word.word,
          translation: r.word.translation,
          phonetic: r.word.phonetic,
          difficulty: r.word.difficulty,
          gradeLevel: r.word.gradeLevel,
          theme: r.word.theme,
          sentence: r.word.sentence,
          sentenceCn: r.word.sentenceCn,
          status: r.progress.status,
          reviewCount: r.progress.reviewCount,
          avgScore: r.progress.avgScore,
        })),
        newWords: newWords.map((w) => ({
          wordId: w.id,
          word: w.word,
          translation: w.translation,
          phonetic: w.phonetic,
          difficulty: w.difficulty,
          gradeLevel: w.gradeLevel,
          theme: w.theme,
          sentence: w.sentence,
          sentenceCn: w.sentenceCn,
        })),
        suggestedOrder: [
          ...reviewItems.map((r) => ({ type: 'review', wordId: r.word.id })),
          ...newWords.map((w) => ({ type: 'new', wordId: w.id })),
        ],
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get daily plan' })
  }
})

// ============================================================
// GET /progress — 学习进度总览（也是 /summary 别名）
// ============================================================
learningRoutes.get('/progress', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    // 所有学习记录汇总
    const records = await db
      .select({
        effectiveMinutes: learningRecords.effectiveMinutes,
        wordsLearned: learningRecords.wordsLearned,
        wordsReviewed: learningRecords.wordsReviewed,
        sentencesSpoken: learningRecords.sentencesSpoken,
        starsEarned: learningRecords.starsEarned,
        sessionDate: learningRecords.sessionDate,
      })
      .from(learningRecords)
      .where(eq(learningRecords.userId, userId))

    const totalMinutes = records.reduce((s, r) => s + r.effectiveMinutes, 0)
    const totalWordsLearned = records.reduce((s, r) => s + r.wordsLearned, 0)
    const totalSentencesSpoken = records.reduce((s, r) => s + r.sentencesSpoken, 0)
    const totalStars = records.reduce((s, r) => s + r.starsEarned, 0)

    // 计算连续学习天数
    const activeDates = new Set(records.map((r) => String(r.sessionDate).slice(0, 10)))

    let streak = 0
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10)

    let checkDate = activeDates.has(todayStr) ? today : new Date(today.getTime() - 86400000)

    while (activeDates.has(checkDate.toISOString().slice(0, 10))) {
      streak++
      checkDate = new Date(checkDate.getTime() - 86400000)
    }

    // 各状态词汇量
    const [statusCounts] = await db
      .select({
        new_: sql<number>`count(*) filter (where ${wordProgress.status} = 'new')`,
        learning: sql<number>`count(*) filter (where ${wordProgress.status} = 'learning')`,
        review: sql<number>`count(*) filter (where ${wordProgress.status} = 'review')`,
        mastered: sql<number>`count(*) filter (where ${wordProgress.status} = 'mastered')`,
      })
      .from(wordProgress)
      .where(eq(wordProgress.userId, userId))

    // 今日待复
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(wordProgress)
      .where(
        and(
          eq(wordProgress.userId, userId),
          lte(wordProgress.nextReviewAt, new Date()),
          or(
            eq(wordProgress.status, 'learning'),
            eq(wordProgress.status, 'review'),
            eq(wordProgress.status, 'new'),
          ),
        ),
      )

    res.json({
      summary: {
        totalMinutes,
        totalWordsLearned,
        totalSentencesSpoken,
        totalStars,
        currentStreak: streak,
        totalSessions: records.length,
      },
      vocabulary: {
        new: Number(statusCounts?.new_ || 0),
        learning: Number(statusCounts?.learning || 0),
        review: Number(statusCounts?.review || 0),
        mastered: Number(statusCounts?.mastered || 0),
        total:
          Number(statusCounts?.new_ || 0) +
          Number(statusCounts?.learning || 0) +
          Number(statusCounts?.review || 0) +
          Number(statusCounts?.mastered || 0),
      },
      pendingReview: Number(pendingCount?.count || 0),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get progress' })
  }
})

// ============================================================
// 自动连胜打卡：学习会话结束时自动触发
// 复用 streak_records 表的逻辑，学习即打卡
// ============================================================
async function autoStreakCheckin(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    const [existing] = await db
      .select()
      .from(streakRecords)
      .where(eq(streakRecords.userId, userId))
      .limit(1)

    if (!existing) {
      // 首次打卡
      await db.insert(streakRecords).values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today,
        freezeCards: 1,
        streakLevel: 0,
      })
      return
    }

    // 今天已经打过卡了
    if (existing.lastActiveDate === today) return

    const lastDate = new Date(existing.lastActiveDate || '')
    const todayDate = new Date(today)
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))

    if (diffDays === 1) {
      // 连续打卡：streak +1
      const newStreak = existing.currentStreak + 1
      const newLongest = Math.max(newStreak, existing.longestStreak)
      const newLevel = newStreak >= 60 ? 5 : newStreak >= 30 ? 4 : newStreak >= 15 ? 3 : newStreak >= 7 ? 2 : newStreak >= 3 ? 1 : 0
      const newFreezeCards = existing.freezeCards + (newStreak % 7 === 0 ? 1 : 0)

      await db
        .update(streakRecords)
        .set({
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
          streakLevel: newLevel,
          freezeCards: newFreezeCards,
          updatedAt: new Date(),
        })
        .where(eq(streakRecords.userId, userId))
    } else if (diffDays === 2 && existing.freezeCards > 0) {
      // 隔了一天但有冻结卡：自动消耗冻结卡保护连胜
      await db
        .update(streakRecords)
        .set({
          lastActiveDate: today,
          freezeCards: existing.freezeCards - 1,
          updatedAt: new Date(),
        })
        .where(eq(streakRecords.userId, userId))
    } else {
      // 断了：重置 streak
      await db
        .update(streakRecords)
        .set({
          currentStreak: 1,
          lastActiveDate: today,
          updatedAt: new Date(),
        })
        .where(eq(streakRecords.userId, userId))
    }
  } catch {
    // streak 打卡失败不影响主流程
  }
}
