// ============================================================
// 星光 API — PRD 10.1 星光体系
// ============================================================
import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import {
  getStarlightBalance,
  getDailyEarned,
  earnStarlight,
  spendStarlight,
  getStarlightHistory,
} from '../services/starlight-service.js'

export const starlightRoutes = Router()

starlightRoutes.use(authMiddleware)

// GET /api/v1/starlight — 获取当前星光状态（儿童端：只返回液位，不返回数字）
starlightRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const balance = await getStarlightBalance(userId)
    const dailyEarned = await getDailyEarned(userId)

    // 儿童端不展示数字，只返回液位比例（0-1）
    res.json({
      fillLevel: Math.min(balance / 200, 1),  // 满瓶=200星光
      isFull: balance >= 200,
      // 以下字段仅家长端可用
      ...(req.query.showDetails === 'true' ? { balance, dailyEarned } : {}),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get starlight' })
  }
})

// GET /api/v1/starlight/history — 星光流水（家长端）
starlightRoutes.get('/history', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const history = await getStarlightHistory(userId)
    res.json({ history })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get starlight history' })
  }
})

// POST /api/v1/starlight/earn — 学习行为触发获取星光（内部调用）
starlightRoutes.post('/earn', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const { source, sourceRef } = req.body as { source: string; sourceRef?: string }

    const validSources = [
      'earn_review', 'earn_word', 'earn_pronounce',
      'earn_dialogue', 'earn_streak', 'earn_milestone', 'earn_easter_egg',
    ]
    if (!validSources.includes(source)) {
      res.status(400).json({ error: 'Invalid starlight source' })
      return
    }

    const result = await earnStarlight(userId, source as any, sourceRef)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to earn starlight' })
  }
})

// POST /api/v1/starlight/spend — 消耗星光
starlightRoutes.post('/spend', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const { amount, sourceRef } = req.body as { amount: number; sourceRef?: string }

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' })
      return
    }

    const result = await spendStarlight(userId, amount, sourceRef)
    if (!result.success) {
      res.status(400).json({ error: 'Insufficient starlight', balance: result.balance })
      return
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to spend starlight' })
  }
})
