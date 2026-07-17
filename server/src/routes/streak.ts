import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { streakRecords } from '../db/schemas/index.js'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { eq } from 'drizzle-orm'

export const streakRoutes = Router()
streakRoutes.use(authMiddleware)

// ============================================================
// GET /api/v1/streak/current — 获取当前连胜状态
// ============================================================
streakRoutes.get('/current', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    const [record] = await db
      .select()
      .from(streakRecords)
      .where(eq(streakRecords.userId, userId))
      .limit(1)

    if (!record) {
      const [created] = await db
        .insert(streakRecords)
        .values({
          userId,
          currentStreak: 0,
          longestStreak: 0,
          freezeCards: 1,
          streakLevel: 0,
        })
        .returning()

      res.json({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        freezeCards: 1,
        streakLevel: 0,
        isFrozen: false,
        status: 'idle' as const,
        streakEmoji: '',
        nextMilestone: { days: 3, reward: '额外冻结卡 ×1' } as const,
      })
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    let isFrozen = false

    if (record.lastActiveDate) {
      const lastDate = String(record.lastActiveDate).slice(0, 10)

      if (lastDate !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().slice(0, 10)

        if (lastDate !== yesterdayStr) {
          const lastActive = new Date(lastDate)
          const daysDiff = Math.floor((Date.now() - lastActive.getTime()) / 86400000)

          if (daysDiff === 2 && record.freezeCards > 0) {
            const [updated] = await db
              .update(streakRecords)
              .set({
                freezeCards: record.freezeCards - 1,
                lastActiveDate: today,
                updatedAt: new Date(),
              })
              .where(eq(streakRecords.userId, record.userId))
              .returning()
            isFrozen = true
            res.json(formatStreak({ ...updated, isFrozen }))
            return
          }

          if (daysDiff > 1) {
            const [updated] = await db
              .update(streakRecords)
              .set({
                currentStreak: 0,
                updatedAt: new Date(),
              })
              .where(eq(streakRecords.userId, record.userId))
              .returning()
            res.json(formatStreak({ ...updated, isFrozen: false }))
            return
          }
        }
      }
    }

    res.json(formatStreak({ ...record, isFrozen }))
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get streak' })
  }
})

// ============================================================
// POST /api/v1/streak/checkin — 每日打卡
// ============================================================
streakRoutes.post('/checkin', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const today = new Date().toISOString().slice(0, 10)

    let [record] = await db
      .select()
      .from(streakRecords)
      .where(eq(streakRecords.userId, userId))
      .limit(1)

    if (!record) {
      const [created] = await db
        .insert(streakRecords)
        .values({
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
          freezeCards: 1,
          streakLevel: 0,
        })
        .returning()
      record = created
    }

    const lastDate = record.lastActiveDate ? String(record.lastActiveDate).slice(0, 10) : null

    // 今天已打卡
    if (lastDate === today) {
      res.json({
        ...formatStreak({ ...record, isFrozen: false }),
        milestoneHit: null,
        streakGained: false,
      })
      return
    }

    // 计算是否连续
    let newStreak = record.currentStreak
    if (lastDate) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      newStreak = lastDate === yesterdayStr ? newStreak + 1 : 1
    } else {
      newStreak = 1
    }

    const newLongest = Math.max(record.longestStreak, newStreak)

    // 连胜等级
    let streakLevel = record.streakLevel
    const milestones = [3, 7, 15, 30, 60]
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (newStreak >= milestones[i]) {
        streakLevel = i + 1
        break
      }
    }

    // 奖励冻结卡
    let freezeCards = record.freezeCards
    if (newStreak % 7 === 0) freezeCards += 1

    const [updated] = await db
      .update(streakRecords)
      .set({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: today,
        freezeCards,
        streakLevel,
        updatedAt: new Date(),
      })
      .where(eq(streakRecords.userId, record.userId))
      .returning()

    const milestoneHit = milestones.includes(newStreak)
      ? { days: newStreak, reward: newStreak >= 7 ? '冻结卡 ×1' : '新成就解锁' }
      : null

    res.json({
      ...formatStreak({ ...updated, isFrozen: false }),
      milestoneHit,
      streakGained: newStreak > record.currentStreak,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to checkin' })
  }
})

// ============================================================
// POST /api/v1/streak/freeze — 使用冻结卡
// ============================================================
streakRoutes.post('/freeze', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    const [record] = await db
      .select()
      .from(streakRecords)
      .where(eq(streakRecords.userId, userId))
      .limit(1)

    if (!record || record.freezeCards <= 0) {
      res.status(400).json({ error: '没有可用的冻结卡' })
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const lastDate = record.lastActiveDate ? String(record.lastActiveDate).slice(0, 10) : null

    if (lastDate === today) {
      res.status(400).json({ error: '今天已打卡，无需使用冻结卡' })
      return
    }

    const [updated] = await db
      .update(streakRecords)
      .set({
        freezeCards: record.freezeCards - 1,
        lastActiveDate: today,
        updatedAt: new Date(),
      })
      .where(eq(streakRecords.userId, record.userId))
      .returning()

    res.json({
      ...formatStreak({ ...updated, isFrozen: true }),
      message: '已使用冻结卡，连胜得以保持！🧊',
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to freeze' })
  }
})

// ============================================================
// 格式化函数
// ============================================================

function formatStreak(record: {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | Date | null
  freezeCards: number
  streakLevel: number
  isFrozen: boolean
}) {
  const milestones = [3, 7, 15, 30, 60]
  const nextMilestoneDays = milestones.find((m) => m > record.currentStreak) ?? null

  const streakEmoji =
    record.currentStreak >= 60
      ? '🐲'
      : record.currentStreak >= 30
        ? '🔥🔥🔥'
        : record.currentStreak >= 15
          ? '🔥🔥'
          : record.currentStreak >= 7
            ? '🔥'
            : record.currentStreak >= 3
              ? '✨'
              : ''

  const status = record.isFrozen
    ? ('frozen' as const)
    : record.currentStreak === 0
      ? ('idle' as const)
      : ('active' as const)

  return {
    currentStreak: record.currentStreak,
    longestStreak: record.longestStreak,
    lastActiveDate: record.lastActiveDate,
    freezeCards: record.freezeCards,
    streakLevel: record.streakLevel,
    isFrozen: record.isFrozen,
    status,
    streakEmoji,
    nextMilestone: nextMilestoneDays
      ? { days: nextMilestoneDays, reward: getMilestoneReward(nextMilestoneDays) }
      : null,
  }
}

function getMilestoneReward(days: number): string {
  const rewards: Record<number, string> = {
    3: '豆豆特殊表情解锁',
    7: '冻结卡 ×1',
    15: '专属称号"坚持之星"',
    30: '冻结卡 ×2 + 限定皮肤',
    60: '传说成就"英语之王"',
  }
  return rewards[days] || '神秘奖励'
}
