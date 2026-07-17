import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { computeFullProfile, getContentSignals } from '../services/profile-engine.js'

export const profileRoutes = Router()

// 所有画像路由需要认证
profileRoutes.use(authMiddleware)

// GET /api/v1/profile/learning-style — 获取学习风格画像
profileRoutes.get('/learning-style', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const profile = await computeFullProfile(userId)
    res.json({ learningStyle: profile.learningStyle })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compute profile' })
  }
})

// GET /api/v1/profile/interests — 获取兴趣图谱
profileRoutes.get('/interests', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const profile = await computeFullProfile(userId)
    res.json({ interests: profile.interests })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compute interests' })
  }
})

// GET /api/v1/profile/content-signals — 内容需求信号
profileRoutes.get('/content-signals', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const signals = await getContentSignals(userId)
    res.json(signals)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compute content signals' })
  }
})

// GET /api/v1/profile/full — 获取完整画像
profileRoutes.get('/full', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const profile = await computeFullProfile(userId)
    res.json(profile)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compute profile' })
  }
})
