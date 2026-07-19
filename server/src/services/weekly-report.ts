// ============================================================
// 周报生成服务
//
// 每周日自动生成上周学习周报
// 内容包含：学习天数、新词数、复习正确率、豆豆心情变化、正向话术
// ============================================================

import { db } from '../db/index.js'
import {
  learningRecords,
  wordProgress,
  emotionLogs,
  streakRecords,
  weeklyReports,
  pets,
  users,
} from '../db/schemas/index.js'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { computeFullProfile } from './profile-engine.js'
import { generateDodoResponse, getGradient, DEFAULT_EMOTION } from './emotion-engine.js'
import type { EmotionVector } from './emotion-engine.js'

// ============================================================
// 类型定义
// ============================================================

export interface WeeklyReport {
  childId: string
  childName: string
  weekStart: string
  weekEnd: string
  summary: {
    totalDays: number
    totalMinutes: number
    newWords: number
    wordsReviewed: number
    sentencesSpoken: number
    starsEarned: number
    avgCorrectRate: number
    currentStreak: number
    longestStreak: number
  }
  emotion: {
    startPleasure: number
    endPleasure: number
    avgPleasure: number
    trend: 'up' | 'down' | 'stable'
    highlight: string
  }
  pet: {
    name: string
    stage: string
    stageProgress: number
    totalMinutes: number
    gradient: string
  }
  learningHighlights: string[]
  focusAreas: string[]
  dodoMessage: string
  parentMessage: string // 给家长的温馨提示
  generatedAt: string
}

// ============================================================
// 周报生成逻辑
// ============================================================

/** 获取本周的起止日期（周一至周日） */
function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 周一
  const monday = new Date(d.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

/** 获取上周的起止日期 */
function getLastWeekRange(): { start: string; end: string } {
  const now = new Date()
  now.setDate(now.getDate() - 7)
  return getWeekRange(now)
}

/** 为指定孩子生成周报 */
export async function generateWeeklyReport(
  childId: string,
  weekRange?: { start: string; end: string },
): Promise<WeeklyReport> {
  const range = weekRange || getLastWeekRange()

  // 查询孩子信息
  const [child] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, childId))
    .limit(1)
  const childName = child?.name || '小朋友'

  // 查询本周学习记录
  const records = await db
    .select()
    .from(learningRecords)
    .where(
      and(
        eq(learningRecords.userId, childId),
        gte(learningRecords.sessionDate, range.start),
        lte(learningRecords.sessionDate, range.end),
      ),
    )
    .orderBy(desc(learningRecords.sessionDate))

  // 汇总
  const totalDays = new Set(records.map((r) => r.sessionDate)).size
  const totalMinutes = records.reduce((sum, r) => sum + r.effectiveMinutes, 0)
  const newWords = records.reduce((sum, r) => sum + r.wordsLearned, 0)
  const wordsReviewed = records.reduce((sum, r) => sum + r.wordsReviewed, 0)
  const sentencesSpoken = records.reduce((sum, r) => sum + r.sentencesSpoken, 0)
  const starsEarned = records.reduce((sum, r) => sum + r.starsEarned, 0)

  // 单词正确率
  const wpRecords = await db
    .select({
      reviewCount: wordProgress.reviewCount,
      correctCount: wordProgress.correctCount,
      lastReviewAt: wordProgress.lastReviewAt,
    })
    .from(wordProgress)
    .where(eq(wordProgress.userId, childId))

  const recentWp = wpRecords.filter((wp) => {
    if (!wp.lastReviewAt) return false
    const d = new Date(wp.lastReviewAt).toISOString().split('T')[0]
    return d >= range.start && d <= range.end
  })

  const totalReviews = recentWp.reduce((s: number, w) => s + (w.reviewCount || 0), 0)
  const totalCorrect = recentWp.reduce((s: number, w) => s + (w.correctCount || 0), 0)
  const avgCorrectRate = totalReviews > 0 ? totalCorrect / totalReviews : 0

  // 连胜信息
  const [streak] = await db
    .select({
      currentStreak: streakRecords.currentStreak,
      longestStreak: streakRecords.longestStreak,
    })
    .from(streakRecords)
    .where(eq(streakRecords.userId, childId))
    .limit(1)

  // 情感变化
  const emotions = await db
    .select({
      pleasure: emotionLogs.pleasure,
      timestamp: emotionLogs.timestamp,
    })
    .from(emotionLogs)
    .where(
      and(
        eq(emotionLogs.userId, childId),
        gte(emotionLogs.timestamp, new Date(range.start)),
        lte(emotionLogs.timestamp, new Date(range.end + 'T23:59:59')),
      ),
    )
    .orderBy(emotionLogs.timestamp)

  const startPleasure = emotions.length > 0 ? emotions[0].pleasure : 0.5
  const endPleasure = emotions.length > 0 ? emotions[emotions.length - 1].pleasure : 0.5
  const avgPleasure =
    emotions.length > 0 ? emotions.reduce((s: number, e) => s + (e.pleasure || 0), 0) / emotions.length : 0.5

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (endPleasure - startPleasure > 0.1) trend = 'up'
  else if (endPleasure - startPleasure < -0.1) trend = 'down'

  // 情感高亮
  const highlight = generateEmotionHighlight(trend, startPleasure, endPleasure)

  // 豆豆状态
  const [pet] = await db
    .select({
      name: pets.name,
      stage: pets.stage,
      stageProgress: pets.stageProgress,
      totalLearningMinutes: pets.totalLearningMinutes,
    })
    .from(pets)
    .where(eq(pets.userId, childId))
    .limit(1)

  const gradient = getGradient(pet?.totalLearningMinutes || 0)

  // 学习亮点
  const highlights = generateHighlights(
    totalDays,
    newWords,
    sentencesSpoken,
    starsEarned,
    streak?.currentStreak || 0,
  )

  // 关注领域（从画像获取）
  const profile = await computeFullProfile(childId).catch(() => null)
  const focusAreas = profile?.difficultyFlags?.weakThemes?.slice(0, 3).map((t) => themeName(t)) || [
    '继续坚持学习',
  ]

  // 豆豆的话
  const emotionVector: EmotionVector = {
    pleasure: endPleasure,
    arousal: 0.5,
    closeness: gradient.level >= 2 ? 0.7 : 0.4,
    focusMatch: 0.6,
  }
  const dodoResp = generateDodoResponse(emotionVector, gradient, {
    streak: streak?.currentStreak,
    timeOfDay: 'evening',
  })
  const dodoMessage = `这周${childName}学了${totalDays}天英语，${dodoResp.bubbleText}`

  // 给家长的话
  const parentMessage = generateParentMessage({
    totalDays,
    totalMinutes,
    newWords,
    avgCorrectRate,
    trend,
    streak: streak?.currentStreak || 0,
    focusAreas,
  })

  const report: WeeklyReport = {
    childId,
    childName,
    weekStart: range.start,
    weekEnd: range.end,
    summary: {
      totalDays,
      totalMinutes,
      newWords,
      wordsReviewed,
      sentencesSpoken,
      starsEarned,
      avgCorrectRate: Math.round(avgCorrectRate * 100) / 100,
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
    },
    emotion: {
      startPleasure: Math.round(startPleasure * 100) / 100,
      endPleasure: Math.round(endPleasure * 100) / 100,
      avgPleasure: Math.round(avgPleasure * 100) / 100,
      trend,
      highlight,
    },
    pet: {
      name: pet?.name || '豆豆',
      stage: pet?.stage || 'seed',
      stageProgress: pet?.stageProgress || 0,
      totalMinutes: pet?.totalLearningMinutes || 0,
      gradient: gradient.name,
    },
    learningHighlights: highlights,
    focusAreas,
    dodoMessage,
    parentMessage,
    generatedAt: new Date().toISOString(),
  }

  // 持久化到 weekly_reports
  await db
    .insert(weeklyReports)
    .values({
      childId,
      weekStart: range.start,
      weekEnd: range.end,
      reportContent: report as any,
      dodoMessage,
      parentViewed: false,
    })
    .onConflictDoUpdate({
      target: [weeklyReports.childId, weeklyReports.weekStart],
      set: {
        reportContent: report as any,
        dodoMessage,
        generatedAt: new Date(),
      },
    })

  return report
}

/** 获取已生成的周报 */
export async function getWeeklyReport(
  childId: string,
  weekStart: string,
): Promise<WeeklyReport | null> {
  const [report] = await db
    .select()
    .from(weeklyReports)
    .where(and(eq(weeklyReports.childId, childId), eq(weeklyReports.weekStart, weekStart)))
    .limit(1)

  if (!report) return null

  // 标记已读
  await db.update(weeklyReports).set({ parentViewed: true }).where(eq(weeklyReports.id, report.id))

  return report.reportContent as WeeklyReport
}

/** 获取所有历史周报 */
export async function getWeeklyReports(childId: string): Promise<WeeklyReport[]> {
  const reports = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.childId, childId))
    .orderBy(desc(weeklyReports.weekStart))
    .limit(12)

  return reports.map((r: typeof weeklyReports.$inferSelect) => r.reportContent as WeeklyReport)
}

// ============================================================
// 辅助函数
// ============================================================

function generateEmotionHighlight(trend: string, start: number, end: number): string {
  if (trend === 'up') return '本周心情逐步提升，学习状态越来越好！🌟'
  if (trend === 'down') return '本周后期略感疲惫，注意劳逸结合哦 💤'
  return '本周情绪稳定，学习节奏保持得很好 👍'
}

function generateHighlights(
  days: number,
  newWords: number,
  sentences: number,
  stars: number,
  streak: number,
): string[] {
  const items: string[] = []

  if (days >= 5) items.push(`坚持学习了 ${days} 天，真了不起！`)
  else if (days >= 3) items.push(`本周学习了 ${days} 天，继续加油！`)
  else if (days > 0) items.push(`本周学习了 ${days} 天，下周可以更多哦～`)

  if (newWords >= 15) items.push(`掌握了 ${newWords} 个新单词，词汇量又增加了！`)
  else if (newWords >= 5) items.push(`学习了 ${newWords} 个新单词，稳步前进中`)

  if (sentences >= 20) items.push(`开口说了 ${sentences} 句话，口语越来越棒！`)
  else if (sentences >= 5) items.push(`练习了 ${sentences} 句口语表达`)

  if (stars >= 30) items.push(`获得了 ${stars} 颗星星，表现非常出色！⭐`)
  else if (stars >= 10) items.push(`收获了 ${stars} 颗星星`)

  if (streak >= 7) items.push(`已连续 ${streak} 天打卡，正在养成好习惯！🔥`)
  else if (streak >= 3) items.push(`连续 ${streak} 天学习，势头不错！`)

  if (items.length === 0) {
    items.push('本周开始了英语学习之旅，每一天都是进步！')
  }

  return items
}

function generateParentMessage(opts: {
  totalDays: number
  totalMinutes: number
  newWords: number
  avgCorrectRate: number
  trend: string
  streak: number
  focusAreas: string[]
}): string {
  const parts: string[] = []

  if (opts.totalDays >= 5) {
    parts.push(`孩子本周学习积极性很高，保持了良好的学习节奏。`)
  } else if (opts.totalDays >= 3) {
    parts.push(`孩子本周有 ${opts.totalDays} 天学习了英语，建议保持每天 10-15 分钟的短时高频学习。`)
  } else if (opts.totalDays > 0) {
    parts.push(`本周学习天数较少，建议下周设定一个小目标，比如每天学 5 个单词。`)
  } else {
    parts.push(`本周还没有学习记录，可以鼓励孩子从简单的单词卡片开始哦～`)
  }

  if (opts.newWords >= 10) {
    parts.push(`新学了 ${opts.newWords} 个单词，掌握情况不错。`)
  }

  if (opts.avgCorrectRate < 0.5) {
    parts.push(
      `复习正确率偏低（${Math.round(opts.avgCorrectRate * 100)}%），豆豆会重点陪伴${opts.focusAreas.join('、')}方面的学习。`,
    )
  } else if (opts.avgCorrectRate > 0.8) {
    parts.push(
      `复习正确率很高（${Math.round(opts.avgCorrectRate * 100)}%），可以适当挑战更难的内容了。`,
    )
  }

  if (opts.streak >= 7) {
    parts.push(`连续 ${opts.streak} 天打卡的习惯值得表扬！`)
  }

  if (opts.trend === 'down') {
    parts.push(
      `本周后期学习情绪有些下降，建议周末安排一些轻松有趣的英语活动（如英语动画片、英文绘本）。`,
    )
  }

  return parts.join('')
}

function themeName(theme: string): string {
  const map: Record<string, string> = {
    animals: '动物',
    food: '食物',
    family: '家庭',
    school: '学校',
    sports: '运动',
    nature: '自然',
    space: '太空',
    music: '音乐',
    art: '艺术',
    travel: '旅行',
    science: '科学',
    history: '历史',
    festivals: '节日',
    daily_life: '日常生活',
    technology: '科技',
  }
  return map[theme] || theme
}
