import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { emotionLogs, pets } from '../db/schemas/index.js'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { eq, desc, and, sql } from 'drizzle-orm'
import {
  DEFAULT_EMOTION,
  applyEmotionEvent,
  decayEmotion,
  getGradient,
  generateDodoResponse,
  type EmotionVector,
  type EmotionEventType,
} from '../services/emotion-engine.js'

export const emotionRoutes = Router()
emotionRoutes.use(authMiddleware)

// ============================================================
// GET /api/v1/emotion/current — 获取当前情感状态
// ============================================================
emotionRoutes.get('/current', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    // 取最近一条情感日志
    const [latestLog] = await db
      .select()
      .from(emotionLogs)
      .where(eq(emotionLogs.userId, userId))
      .orderBy(desc(emotionLogs.timestamp))
      .limit(1)

    let currentEmotion: EmotionVector

    if (latestLog) {
      currentEmotion = {
        pleasure: latestLog.pleasure,
        arousal: latestLog.arousal,
        closeness: latestLog.closeness,
        focusMatch: latestLog.focusMatch,
      }

      // 计算时间衰减
      const minutesElapsed = (Date.now() - new Date(latestLog.timestamp).getTime()) / 60000
      currentEmotion = decayEmotion(currentEmotion, minutesElapsed)
    } else {
      currentEmotion = { ...DEFAULT_EMOTION }
    }

    // 陪伴梯度
    const [pet] = await db
      .select({ totalLearningMinutes: pets.totalLearningMinutes })
      .from(pets)
      .where(eq(pets.userId, userId))
      .limit(1)

    const totalMinutes = pet?.totalLearningMinutes ?? 0
    const gradient = getGradient(totalMinutes)

    // 生成豆豆响应
    const hour = new Date().getHours()
    const timeOfDay =
      hour < 11 ? 'morning' : hour < 14 ? 'afternoon' : hour < 19 ? 'evening' : 'night'
    const response = generateDodoResponse(currentEmotion, gradient, { timeOfDay })

    res.json({
      emotion: currentEmotion,
      gradient,
      response,
      lastUpdated: latestLog?.timestamp ?? null,
    })
  } catch (err: any) {
    console.error('Emotion /current error:', err.stack || err.message)
    res.status(500).json({ error: err.message || 'Failed to get emotion' })
  }
})

// ============================================================
// POST /api/v1/emotion/event — 上报情感事件
// ============================================================
emotionRoutes.post('/event', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const raw = req.body

    // 健壮校验：防御前端重复 JSON.stringify 等异常
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      res.status(400).json({
        error: 'Invalid request body',
        hint: 'Expected JSON object with { type, intensity?, context? }',
      })
      return
    }

    const body = raw as {
      type: EmotionEventType
      intensity?: number
      context?: Record<string, unknown>
    }

    // 校验事件类型
    const VALID_TYPES = [
      'correct_answer', 'wrong_answer', 'perfect_score', 'streak_milestone',
      'new_word_mastered', 'session_start', 'session_complete', 'idle_too_long',
      'review_forgot', 'review_correct', 'level_up', 'daily_checkin',
      'streak_lost', 'freeze_used', 'greeting_response',
    ]
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      res.status(400).json({
        error: 'Missing or invalid event type',
        validTypes: VALID_TYPES,
      })
      return
    }

    // 校验 intensity（可选，需在 0-1 范围）
    if (body.intensity !== undefined && (typeof body.intensity !== 'number' || body.intensity < 0 || body.intensity > 1)) {
      res.status(400).json({
        error: 'intensity must be a number between 0 and 1',
      })
      return
    }

    // 获取当前情感（取最新日志）
    const [latestLog] = await db
      .select()
      .from(emotionLogs)
      .where(eq(emotionLogs.userId, userId))
      .orderBy(desc(emotionLogs.timestamp))
      .limit(1)

    let currentEmotion: EmotionVector
    if (latestLog) {
      const minutesElapsed = (Date.now() - new Date(latestLog.timestamp).getTime()) / 60000
      currentEmotion = {
        pleasure: latestLog.pleasure,
        arousal: latestLog.arousal,
        closeness: latestLog.closeness,
        focusMatch: latestLog.focusMatch,
      }
      currentEmotion = decayEmotion(currentEmotion, minutesElapsed)
    } else {
      currentEmotion = { ...DEFAULT_EMOTION }
    }

    // 应用事件 delta
    const newEmotion = applyEmotionEvent(currentEmotion, {
      type: body.type,
      intensity: body.intensity ?? 0.5,
      context: body.context,
    })

    // 写入情感日志
    const [inserted] = await db
      .insert(emotionLogs)
      .values({
        userId,
        pleasure: newEmotion.pleasure,
        arousal: newEmotion.arousal,
        closeness: newEmotion.closeness,
        focusMatch: newEmotion.focusMatch,
        triggerEvent: body.type,
        rawSignals: body.context ?? {},
      })
      .returning({ id: emotionLogs.id, timestamp: emotionLogs.timestamp })

    // 生成豆豆响应
    const [pet] = await db
      .select({ totalLearningMinutes: pets.totalLearningMinutes })
      .from(pets)
      .where(eq(pets.userId, userId))
      .limit(1)
    const gradient = getGradient(pet?.totalLearningMinutes ?? 0)
    const response = generateDodoResponse(newEmotion, gradient, { lastEvent: body.type })

    res.json({
      emotion: newEmotion,
      previousEmotion: currentEmotion,
      response,
      logId: inserted.id,
      timestamp: inserted.timestamp,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process emotion event' })
  }
})

// ============================================================
// GET /api/v1/emotion/dodo-response — 获取豆豆情感响应
// ============================================================
emotionRoutes.get('/dodo-response', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const contextType = req.query.context as EmotionEventType | undefined

    const [latestLog] = await db
      .select()
      .from(emotionLogs)
      .where(eq(emotionLogs.userId, userId))
      .orderBy(desc(emotionLogs.timestamp))
      .limit(1)

    let currentEmotion: EmotionVector
    if (latestLog) {
      const minutesElapsed = (Date.now() - new Date(latestLog.timestamp).getTime()) / 60000
      currentEmotion = {
        pleasure: latestLog.pleasure,
        arousal: latestLog.arousal,
        closeness: latestLog.closeness,
        focusMatch: latestLog.focusMatch,
      }
      currentEmotion = decayEmotion(currentEmotion, minutesElapsed)
    } else {
      currentEmotion = { ...DEFAULT_EMOTION }
    }

    const [pet] = await db
      .select({ totalLearningMinutes: pets.totalLearningMinutes })
      .from(pets)
      .where(eq(pets.userId, userId))
      .limit(1)
    const gradient = getGradient(pet?.totalLearningMinutes ?? 0)

    const hour = new Date().getHours()
    const timeOfDay =
      hour < 11 ? 'morning' : hour < 14 ? 'afternoon' : hour < 19 ? 'evening' : 'night'
    const response = generateDodoResponse(currentEmotion, gradient, {
      lastEvent: contextType,
      timeOfDay,
    })

    res.json({
      emotion: currentEmotion,
      gradient,
      response,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get dodo response' })
  }
})

// ============================================================
// GET /api/v1/emotion/gradient — 陪伴梯度
// ============================================================
emotionRoutes.get('/gradient', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    const [pet] = await db
      .select({ totalLearningMinutes: pets.totalLearningMinutes })
      .from(pets)
      .where(eq(pets.userId, userId))
      .limit(1)

    const totalMinutes = pet?.totalLearningMinutes ?? 0
    const gradient = getGradient(totalMinutes)

    // 距下一梯度还差多少分钟
    const nextGradient = getGradient(totalMinutes + 1)
    let nextThreshold: number | null = null
    if (nextGradient.level > gradient.level) {
      nextThreshold = nextGradient.minMinutes
    } else {
      // 找更高一级
      const allGradients = [0, 1, 2, 3].map((g) => getGradient(g * 100))
      const higher = allGradients.find((g) => g.level > gradient.level)
      if (higher) nextThreshold = higher.minMinutes
    }

    res.json({
      gradient,
      totalMinutes,
      nextGradientMinutes: nextThreshold,
      progressToNext: nextThreshold ? Math.round((totalMinutes / nextThreshold) * 100) : 100,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get gradient' })
  }
})

// ============================================================
// GET /api/v1/emotion/history — 情感历史（用于调试/图表）
// ============================================================
emotionRoutes.get('/history', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const limit = Math.min(parseInt((req.query.limit as string) || '50'), 200)

    const logs = await db
      .select({
        id: emotionLogs.id,
        timestamp: emotionLogs.timestamp,
        pleasure: emotionLogs.pleasure,
        arousal: emotionLogs.arousal,
        closeness: emotionLogs.closeness,
        focusMatch: emotionLogs.focusMatch,
        triggerEvent: emotionLogs.triggerEvent,
      })
      .from(emotionLogs)
      .where(eq(emotionLogs.userId, userId))
      .orderBy(desc(emotionLogs.timestamp))
      .limit(limit)

    res.json({ logs: logs.reverse() })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get emotion history' })
  }
})
