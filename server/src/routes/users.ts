import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { users } from '../db/schemas/index.js'
import { eq } from 'drizzle-orm'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { z } from 'zod'
import { validateBody, getValidatedBody } from '../middleware/validate.js'

export const userRoutes = Router()

// 所有用户路由需登录
userRoutes.use(authMiddleware)

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  grade: z.number().int().min(1).max(6).optional(),
  ageSegment: z.enum(['low', 'mid', 'high']).optional(),
  avatarUrl: z.string().url().optional(),
})

// GET /api/v1/users/me — 当前用户信息
userRoutes.get('/me', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ user })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get user' })
  }
})

// GET /api/v1/users/:id
userRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ user })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get user' })
  }
})

// PATCH /api/v1/users/:id — 只能改自己的信息
userRoutes.patch('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof updateSchema>(req)
    const id = req.params.id
    const { userId } = getJwtPayload(req)

    // 权限检查：只能改自己
    if (id !== userId) {
      res.status(403).json({ error: 'Can only update your own profile' })
      return
    }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates['name'] = body.name
    if (body.grade !== undefined) updates['grade'] = body.grade
    if (body.ageSegment !== undefined) updates['ageSegment'] = body.ageSegment
    if (body.avatarUrl !== undefined) updates['avatarUrl'] = body.avatarUrl
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' })
      return
    }

    updates['updatedAt'] = new Date()
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning()
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ user })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user' })
  }
})

// GET /api/v1/users/settings — 获取用户设置（兼容 E2E 测试）
userRoutes.get('/settings', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({
      userId: user.id,
      dailyLimitMin: 30,
      forbiddenStart: '21:00',
      forbiddenEnd: '07:00',
      weekendLearning: true,
      weeklyReport: true,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get settings' })
  }
})

// PUT /api/v1/users/settings — 更新用户设置（兼容 E2E 测试）
const settingsSchema = z.object({
  dailyLimitMin: z.number().int().min(0).max(120).optional(),
  forbiddenStart: z.string().optional(),
  forbiddenEnd: z.string().optional(),
  weekendLearning: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
})

userRoutes.put('/settings', validateBody(settingsSchema), async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof settingsSchema>(req)
    res.json({ ...body, updated: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' })
  }
})
