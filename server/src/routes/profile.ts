import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { userProfiles } from '../db/schemas/index.js'
import { eq } from 'drizzle-orm'
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

// PUT /api/v1/profile/interests — 设置初始兴趣标签（Onboarding 时调用）
profileRoutes.put('/interests', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const { interests } = req.body as { interests: string[] }

    if (!interests || !Array.isArray(interests)) {
      res.status(400).json({ error: 'interests array required' })
      return
    }

    // 构建 interestMap（主题 → 初始权重）
    const interestMap: Record<string, number> = {}
    for (const theme of interests) {
      interestMap[theme] = 0.8  // 初始兴趣权重
    }

    const [existing] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)

    if (existing) {
      await db
        .update(userProfiles)
        .set({ interestMap, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId))
    } else {
      await db.insert(userProfiles).values({
        userId,
        interestMap,
        dormantInterests: [],
        difficultyFlags: {},
      })
    }

    res.json({ saved: true, interests })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save interests' })
  }
})
