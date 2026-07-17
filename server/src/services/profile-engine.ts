// ============================================================
// 画像引擎 — 学习风格 + 兴趣图谱 + 置信度管理
//
// 学习风格 6 种：
//   visual     — 视觉型（偏好图片、卡片、颜色标注）
//   auditory   — 听觉型（偏好听音、跟读、歌曲）
//   verbal     — 语言型（偏好文字阅读、故事、拼写）
//   kinetic    — 动觉型（偏好互动游戏、点击操作、动画）
//   social     — 社交型（偏好对话、角色扮演、竞争）
//   reflective — 反思型（偏好复习、纠错、安静学习）
//
// 画像置信度 4 阶段：
//   observing (0-3天)   — 观察期，置信度 < 0.3
//   emerging (3-7天)    — 初判期，置信度 0.3-0.5
//   stable (7-30天)     — 稳定期，置信度 0.5-0.8
//   confirmed (30+天)   — 确定期，置信度 > 0.8
// ============================================================

import { db } from '../db/index.js'
import {
  learningRecords,
  wordProgress,
  emotionLogs,
  dialogueSessions,
  words,
  userProfiles,
  users,
} from '../db/schemas/index.js'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'

// ============================================================
// 类型定义
// ============================================================

export type LearningStyle = 'visual' | 'auditory' | 'verbal' | 'kinetic' | 'social' | 'reflective'

export type ConfidenceStage = 'observing' | 'emerging' | 'stable' | 'confirmed'

export interface StyleScore {
  style: LearningStyle
  score: number // 0-1 相对分数
  signals: string[] // 信号来源
}

export interface InterestItem {
  theme: string // 主题名
  score: number // 0-1 兴趣强度
  lastActive: string // 最后活跃日期
  totalMinutes: number // 累计学习分钟
  wordCount: number // 相关词汇量
}

export interface DormantInterest {
  theme: string
  lastScore: number
  dormantSince: string
}

export interface ProfileResult {
  userId: string
  learningStyle: {
    primary: StyleScore
    secondary: StyleScore
    distribution: Record<LearningStyle, number>
    confidence: number
    stage: ConfidenceStage
    dataDays: number
  }
  interests: {
    active: InterestItem[]
    dormant: DormantInterest[]
    recommendation: string[]
  }
  difficultyFlags: {
    weakThemes: string[]
    weakSkills: string[] // 'pronunciation' | 'spelling' | 'grammar' | 'fluency'
    avgCorrectRate: number
  }
  rhythmType: string // 'morning_lark' | 'night_owl' | 'afternoon' | 'scattered'
  updatedAt: string
}

export interface ContentSignal {
  gradeLevel: number
  preferredThemes: string[]
  weakThemes: string[]
  suggestedDifficulty: 'easy' | 'normal' | 'challenge'
  focusTopics: string[]
}

// ============================================================
// 学习风格信号提取
// ============================================================

// 信号权重配置
const STYLE_SIGNALS: Record<LearningStyle, { events: string[]; weight: number }> = {
  visual: { events: ['image_view', 'card_flip', 'color_match', 'word_image'], weight: 1 },
  auditory: {
    events: ['pronounce_attempt', 'listen_repeat', 'song_play', 'audio_focus'],
    weight: 1,
  },
  verbal: { events: ['read_text', 'spell_word', 'story_read', 'writing'], weight: 1 },
  kinetic: { events: ['drag_drop', 'tap_rapid', 'swipe_action', 'game_interact'], weight: 1 },
  social: { events: ['dialogue_chat', 'role_play', 'compete', 'share'], weight: 1 },
  reflective: { events: ['review_word', 'error_correct', 'quiet_study', 'self_check'], weight: 1 },
}

/** 根据学习行为记录计算学习风格 */
export function computeLearningStyle(
  records: Array<{ rawSignals?: any }>,
  dataDays: number,
): ProfileResult['learningStyle'] {
  // 初始化所有风格分数
  const scores: Record<LearningStyle, { total: number; signals: string[] }> = {
    visual: { total: 0, signals: [] },
    auditory: { total: 0, signals: [] },
    verbal: { total: 0, signals: [] },
    kinetic: { total: 0, signals: [] },
    social: { total: 0, signals: [] },
    reflective: { total: 0, signals: [] },
  }

  // 从各种信号源累加分数
  for (const record of records) {
    const signals = record.rawSignals || {}
    const source = signals.source || ''
    const actionType = signals.actionType || ''
    const interactionMode = signals.interactionMode || ''

    // 情感日志中的交互模式
    if (interactionMode) {
      addSignal(scores, interactionMode as string, 0.5)
    }

    // 学习行为类型
    if (actionType) {
      addSignal(scores, actionType as string, 1)
    }

    // 来源类型推断
    if (source === 'dialogue') addSignal(scores, 'social', 0.8)
    if (source === 'pronounce') addSignal(scores, 'auditory', 0.8)
    if (source === 'review') addSignal(scores, 'reflective', 0.8)
    if (source === 'word_card') addSignal(scores, 'visual', 0.8)
    if (source === 'game') addSignal(scores, 'kinetic', 0.8)
  }

  // 计算分布
  const total = Object.values(scores).reduce((sum, s) => sum + s.total, 0) || 1
  const distribution = {} as Record<LearningStyle, number>
  for (const style of Object.keys(scores) as LearningStyle[]) {
    distribution[style] = scores[style].total / total
  }

  // 找主要和次要风格
  const sorted = (Object.keys(scores) as LearningStyle[])
    .map((s) => ({ style: s, score: distribution[s], signals: scores[s].signals }))
    .sort((a, b) => b.score - a.score)

  // 置信度计算
  const confidence = computeConfidence(dataDays, records.length)
  const stage = getConfidenceStage(confidence, dataDays)

  return {
    primary: { style: sorted[0].style, score: sorted[0].score, signals: sorted[0].signals },
    secondary: { style: sorted[1].style, score: sorted[1].score, signals: sorted[1].signals },
    distribution,
    confidence,
    stage,
    dataDays,
  }
}

function addSignal(
  scores: Record<LearningStyle, { total: number; signals: string[] }>,
  signal: string,
  weight: number,
) {
  for (const [style, config] of Object.entries(STYLE_SIGNALS)) {
    if (config.events.includes(signal)) {
      scores[style as LearningStyle].total += weight * config.weight
      if (!scores[style as LearningStyle].signals.includes(signal)) {
        scores[style as LearningStyle].signals.push(signal)
      }
    }
  }
}

function computeConfidence(dataDays: number, signalCount: number): number {
  // 基于数据天数和信号量的置信度
  const dayScore = Math.min(dataDays / 30, 1) * 0.6
  const signalScore = Math.min(signalCount / 50, 1) * 0.4
  return Math.round((dayScore + signalScore) * 100) / 100
}

function getConfidenceStage(confidence: number, dataDays: number): ConfidenceStage {
  if (dataDays >= 30 && confidence > 0.8) return 'confirmed'
  if (dataDays >= 7 && confidence > 0.5) return 'stable'
  if (dataDays >= 3 && confidence > 0.3) return 'emerging'
  return 'observing'
}

// ============================================================
// 兴趣图谱计算
// ============================================================

const ALL_THEMES = [
  'animals',
  'food',
  'family',
  'school',
  'sports',
  'nature',
  'space',
  'music',
  'art',
  'travel',
  'science',
  'history',
  'festivals',
  'daily_life',
  'technology',
]

/** 根据学习记录和单词进度计算兴趣图谱 */
export function computeInterests(
  wordProgressRecords: Array<{
    word: { theme?: string | null; word: string } | null
    reviewCount: number
    correctCount: number
    avgScore?: number | null
    lastReviewAt?: Date | null
  }>,
  dialogueTopics: string[],
  totalMinutes: number,
): { active: InterestItem[]; dormant: DormantInterest[]; recommendation: string[] } {
  // 按主题聚合单词进度
  const themeStats: Record<
    string,
    {
      wordCount: number
      totalReviews: number
      totalCorrect: number
      avgScoreSum: number
      lastActive: string
    }
  > = {}

  for (const wp of wordProgressRecords) {
    const theme = wp.word?.theme || 'daily_life'
    if (!themeStats[theme]) {
      themeStats[theme] = {
        wordCount: 0,
        totalReviews: 0,
        totalCorrect: 0,
        avgScoreSum: 0,
        lastActive: '',
      }
    }
    const ts = themeStats[theme]
    ts.wordCount++
    ts.totalReviews += wp.reviewCount || 0
    ts.totalCorrect += wp.correctCount || 0
    ts.avgScoreSum += wp.avgScore ?? 0.5
    if (wp.lastReviewAt && String(wp.lastReviewAt) > ts.lastActive) {
      ts.lastActive = String(wp.lastReviewAt)
    }
  }

  // 对话话题热度
  const dialogueThemes = new Set(dialogueTopics)
  for (const topic of dialogueTopics) {
    const theme = topic.toLowerCase().replace(/\s+/g, '_')
    if (ALL_THEMES.includes(theme)) {
      dialogueThemes.add(theme)
    }
  }

  // 计算兴趣分数
  const active: InterestItem[] = []
  const dormant: DormantInterest[] = []

  for (const theme of ALL_THEMES) {
    const stats = themeStats[theme]
    if (!stats || stats.wordCount === 0) continue

    const correctRate = stats.totalReviews > 0 ? stats.totalCorrect / stats.totalReviews : 0.5
    const reviewIntensity = Math.min(stats.totalReviews / 20, 1)
    const dialogueBonus = dialogueThemes.has(theme) ? 0.2 : 0
    const score =
      Math.round((correctRate * 0.4 + reviewIntensity * 0.4 + dialogueBonus) * 100) / 100

    const daysSinceLastActive = stats.lastActive
      ? Math.floor((Date.now() - new Date(stats.lastActive).getTime()) / 86400000)
      : 999

    if (score >= 0.3 || daysSinceLastActive < 14) {
      active.push({
        theme,
        score,
        lastActive: stats.lastActive || '',
        totalMinutes: Math.round(totalMinutes * score),
        wordCount: stats.wordCount,
      })
    } else {
      dormant.push({
        theme,
        lastScore: score,
        dormantSince: stats.lastActive || '',
      })
    }
  }

  active.sort((a, b) => b.score - a.score)

  // 推荐主题：高分主题 + 邻近低分主题
  const recommendation = active.slice(0, 3).map((i) => i.theme)
  if (active.length > 4) {
    recommendation.push(active[active.length - 2].theme) // 一个冷门但仍有活跃的主题
  }

  return { active: active.slice(0, 8), dormant, recommendation }
}

// ============================================================
// 学习节奏分析
// ============================================================

/** 分析学习时间分布，确定节奏类型 */
export function computeRhythmType(
  records: Array<{ startTime?: Date | null; endTime?: Date | null }>,
): string {
  const hourCounts: number[] = new Array(24).fill(0)

  for (const r of records) {
    if (r.startTime) {
      const hour = new Date(r.startTime).getHours()
      hourCounts[hour]++
    }
  }

  const morning = hourCounts.slice(6, 12).reduce((a, b) => a + b, 0)
  const afternoon = hourCounts.slice(12, 18).reduce((a, b) => a + b, 0)
  const evening = hourCounts.slice(18, 22).reduce((a, b) => a + b, 0)
  const night =
    hourCounts.slice(22, 24).reduce((a, b) => a + b, 0) +
    hourCounts.slice(0, 6).reduce((a, b) => a + b, 0)

  const max = Math.max(morning, afternoon, evening, night)
  const total = morning + afternoon + evening + night || 1

  if (max / total > 0.5) {
    if (max === morning) return 'morning_lark'
    if (max === afternoon) return 'afternoon'
    if (max === evening) return 'evening'
    if (max === night) return 'night_owl'
  }
  return 'scattered'
}

// ============================================================
// 主画像计算（聚合所有维度）
// ============================================================

export async function computeFullProfile(userId: string): Promise<ProfileResult> {
  // 查询学习记录（最近 60 天）
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const records = await db
    .select()
    .from(learningRecords)
    .where(
      and(
        eq(learningRecords.userId, userId),
        gte(learningRecords.sessionDate, sixtyDaysAgo.toISOString().split('T')[0]),
      ),
    )
    .orderBy(desc(learningRecords.sessionDate))

  // 查询情感日志（最近 60 天）
  const emotions = await db
    .select()
    .from(emotionLogs)
    .where(and(eq(emotionLogs.userId, userId), gte(emotionLogs.timestamp, sixtyDaysAgo)))
    .orderBy(desc(emotionLogs.timestamp))

  // 查询单词进度
  const wordProgressRecords = await db
    .select({
      word: { theme: words.theme, word: words.word },
      reviewCount: wordProgress.reviewCount,
      correctCount: wordProgress.correctCount,
      avgScore: wordProgress.avgScore,
      lastReviewAt: wordProgress.lastReviewAt,
    })
    .from(wordProgress)
    .leftJoin(words, eq(wordProgress.wordId, words.id))
    .where(eq(wordProgress.userId, userId))

  // 查询对话话题
  const dialogueRecords = await db
    .select({ messages: dialogueSessions.messages })
    .from(dialogueSessions)
    .where(eq(dialogueSessions.userId, userId))
    .orderBy(desc(dialogueSessions.startedAt))
    .limit(20)

  const dialogueTopics: string[] = []
  for (const d of dialogueRecords) {
    const msgs = (d.messages as any[]) || []
    for (const m of msgs) {
      if (m.topic && !dialogueTopics.includes(m.topic)) {
        dialogueTopics.push(m.topic)
      }
    }
  }

  // 计算各维度
  const dataDays = new Set(records.map((r) => r.sessionDate)).size
  const totalMinutes = records.reduce((sum, r) => sum + r.effectiveMinutes, 0)

  const learningStyle = computeLearningStyle(emotions, dataDays)
  const interests = computeInterests(wordProgressRecords, dialogueTopics, totalMinutes)
  const rhythmType = computeRhythmType(records)

  // 难度标记
  const weakThemes: string[] = []
  const weakSkills: string[] = []
  const themeErrors: Record<string, { wrong: number; total: number }> = {}
  for (const wp of wordProgressRecords) {
    const theme = wp.word?.theme || 'daily_life'
    if (!themeErrors[theme]) themeErrors[theme] = { wrong: 0, total: 0 }
    const te = themeErrors[theme]
    te.total += wp.reviewCount || 0
    te.wrong += (wp.reviewCount || 0) - (wp.correctCount || 0)
  }

  let totalWrong = 0
  let totalReviews = 0
  for (const [theme, stats] of Object.entries(themeErrors)) {
    if (stats.total >= 3 && stats.wrong / stats.total > 0.5) {
      weakThemes.push(theme)
    }
    totalWrong += stats.wrong
    totalReviews += stats.total
  }
  const avgCorrectRate = totalReviews > 0 ? 1 - totalWrong / totalReviews : 0.5

  // 技能弱点：基于 avgScore
  const lowScoreWords = wordProgressRecords.filter(
    (wp) => (wp.avgScore || 0) < 0.5 && (wp.reviewCount || 0) >= 2,
  )
  if (lowScoreWords.length > 3) {
    weakSkills.push('pronunciation') // 默认标记为发音薄弱（后续可根据具体数据细分）
  }

  const difficultyFlags = {
    weakThemes,
    weakSkills,
    avgCorrectRate: Math.round(avgCorrectRate * 100) / 100,
  }

  // 保存到 user_profiles
  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(userProfiles)
      .set({
        learningStyle: learningStyle.primary.style,
        styleConfidence: learningStyle.confidence,
        interestMap: { active: interests.active, dormant: interests.dormant },
        dormantInterests: interests.dormant,
        difficultyFlags,
        rhythmType,
        updatedAt: new Date(),
        dataVersion: (existing[0].dataVersion || 0) + 1,
      })
      .where(eq(userProfiles.userId, userId))
  } else {
    await db.insert(userProfiles).values({
      userId,
      learningStyle: learningStyle.primary.style,
      styleConfidence: learningStyle.confidence,
      interestMap: { active: interests.active, dormant: interests.dormant },
      dormantInterests: interests.dormant,
      difficultyFlags,
      rhythmType,
      dataVersion: 1,
    })
  }

  return {
    userId,
    learningStyle,
    interests,
    difficultyFlags,
    rhythmType,
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================
// 内容信号（供内容推荐系统使用）
// ============================================================

export async function getContentSignals(userId: string): Promise<ContentSignal> {
  const profile = await computeFullProfile(userId)

  // 从用户表中获取年级
  const [userRecord] = await db
    .select({ grade: users.grade })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const gradeLevel = userRecord?.grade || 3

  // 推荐主题：兴趣最高的 3 个
  const preferredThemes = profile.interests.active.slice(0, 3).map((i) => i.theme)

  // 薄弱主题
  const weakThemes = profile.difficultyFlags.weakThemes

  // 建议难度
  const avgCorrectRate = profile.difficultyFlags.avgCorrectRate
  let suggestedDifficulty: 'easy' | 'normal' | 'challenge' = 'normal'
  if (avgCorrectRate < 0.4) suggestedDifficulty = 'easy'
  else if (avgCorrectRate > 0.85) suggestedDifficulty = 'challenge'

  // 重点话题
  const focusTopics = [...new Set([...preferredThemes, ...weakThemes])]

  return {
    gradeLevel,
    preferredThemes,
    weakThemes,
    suggestedDifficulty,
    focusTopics,
  }
}
