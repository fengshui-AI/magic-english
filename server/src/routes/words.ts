import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { words, wordProgress } from '../db/schemas/index.js'
import { eq, and, sql } from 'drizzle-orm'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'

export const wordRoutes = Router()

// GET /api/v1/words — 词库列表（支持筛选，含用户学习状态）
wordRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const theme = req.query.theme as string | undefined
    const grade = req.query.grade as string | undefined
    const difficulty = req.query.difficulty as string | undefined
    const page = parseInt((req.query.page as string) || '1')
    const limit = Math.min(parseInt((req.query.limit as string) || '20'), 50)
    const offset = (page - 1) * limit

    const conditions = []
    if (theme) conditions.push(eq(words.theme, theme))
    if (grade) conditions.push(eq(words.gradeLevel, parseInt(grade)))
    if (difficulty) conditions.push(eq(words.difficulty, parseInt(difficulty)))

    const where = and(...conditions)

    const query = db.select().from(words).where(where).limit(limit).offset(offset)
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(words)
      .where(where)

    const [items, [total]] = await Promise.all([query, countQuery])

    // 尝试获取用户学习状态（可选，不需要登录）
    let userId: string | null = null
    try {
      const auth = req.headers.authorization
      if (auth?.startsWith('Bearer ')) {
        const payload = getJwtPayload(req)
        userId = payload.userId
      }
    } catch {
      // 未登录时忽略
    }

    let progressMap: Record<string, any> = {}
    if (userId && items.length > 0) {
      const wordIds = items.map((w) => w.id)
      const progress = await db
        .select()
        .from(wordProgress)
        .where(
          and(
            eq(wordProgress.userId, userId),
            ...(wordIds.length > 0 ? [sql`${wordProgress.wordId} IN (${wordIds})`] : []),
          ),
        )
      for (const p of progress) {
        progressMap[p.wordId] = p
      }
    }

    res.json({
      items: items.map((w) => ({
        ...w,
        progress: progressMap[w.id]
          ? {
              status: progressMap[w.id].status,
              reviewCount: progressMap[w.id].reviewCount,
              avgScore: progressMap[w.id].avgScore,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total: Number(total.count),
        totalPages: Math.ceil(Number(total.count) / limit),
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get words' })
  }
})

// GET /api/v1/words/topics — 主题列表
wordRoutes.get('/topics', async (_req: Request, res: Response) => {
  try {
    const topics = await db.select({ theme: words.theme }).from(words).groupBy(words.theme)
    res.json({ topics: topics.map((t) => t.theme).filter(Boolean) })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get topics' })
  }
})

// GET /api/v1/words/:id
wordRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const [word] = await db.select().from(words).where(eq(words.id, id)).limit(1)
    if (!word) {
      res.status(404).json({ error: 'Word not found' })
      return
    }

    // 尝试获取用户进度
    let progress = null
    try {
      const payload = getJwtPayload(req)
      const [wp] = await db
        .select()
        .from(wordProgress)
        .where(and(eq(wordProgress.userId, payload.userId), eq(wordProgress.wordId, id)))
        .limit(1)
      progress = wp || null
    } catch {
      // 未登录忽略
    }

    res.json({ word: { ...word, progress } })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get word' })
  }
})

// GET /api/v1/words/:id/story-anchor — 单词故事锚点
wordRoutes.get('/:id/story-anchor', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const [word] = await db.select().from(words).where(eq(words.id, id)).limit(1)
    if (!word) {
      res.status(404).json({ error: 'Word not found' })
      return
    }

    let storyAnchor = null
    if (word.storyAnchor) {
      try {
        storyAnchor = JSON.parse(word.storyAnchor)
      } catch {
        storyAnchor = { raw: word.storyAnchor }
      }
    }

    if (!storyAnchor) {
      storyAnchor = generateDefaultStoryAnchor(word.word, word.translation, word.theme || '')
    }

    res.json({
      wordId: word.id,
      word: word.word,
      translation: word.translation,
      storyAnchor,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get story anchor' })
  }
})

// GET /api/v1/words/themes/:theme — 按主题获取单词（含故事锚点）
wordRoutes.get('/themes/:theme', async (req: Request, res: Response) => {
  try {
    const theme = req.params.theme
    const items = await db
      .select()
      .from(words)
      .where(eq(words.theme, theme))
      .orderBy(words.difficulty)

    res.json({ theme, items })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get words by theme' })
  }
})

/**
 * 生成默认故事锚点（基于单词和主题的简单规则）
 */
function generateDefaultStoryAnchor(word: string, translation: string, theme: string): any {
  const anchors: Record<string, any> = {
    animal: {
      scene: `豆豆带你来到神奇的动物王国，一只可爱的${translation}正在等你！`,
      character: `会说话的${translation}`,
      emotion: '好奇、兴奋',
      sentence: `Look! A ${word} is waving at you!`,
      hint: `想象一只${translation}在跟你打招呼的样子`,
    },
    space: {
      scene: `豆豆的火箭起飞了！你们在太空中发现了${translation}。`,
      character: `太空探险家豆豆`,
      emotion: '惊奇、冒险',
      sentence: `Wow! Can you see the ${word} in space?`,
      hint: `想象你在太空中漂浮，看到${translation}的瞬间`,
    },
    school: {
      scene: `豆豆和你一起走进魔法教室，今天要学习关于${translation}的知识！`,
      character: `魔法老师豆豆`,
      emotion: '认真、有趣',
      sentence: `Let's learn about ${word} together!`,
      hint: `想象你在教室里和豆豆一起学习${translation}`,
    },
  }

  return (
    anchors[theme] || {
      scene: `豆豆带你探索单词的世界：${translation}！`,
      character: '豆豆',
      emotion: '好奇',
      sentence: `Let's learn the word: ${word}!`,
      hint: `记住${translation}就是 ${word}`,
    }
  )
}
