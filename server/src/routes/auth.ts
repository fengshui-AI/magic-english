import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { users } from '../db/schemas/index.js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { validateBody, getValidatedBody } from '../middleware/validate.js'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import jwt from 'jsonwebtoken'

export const authRoutes = Router()

export const registerSchema = z
  .object({
    name: z.string().min(1).max(50),
    phone: z.string().min(11).max(20).optional(),
    role: z.enum(['child', 'parent']).default('child'),
    grade: z.number().int().min(1).max(6).default(3),
    ageSegment: z.enum(['low', 'mid', 'high']).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === 'child' && !value.ageSegment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Child registration requires ageSegment',
        path: ['ageSegment'],
      })
    }
  })

const loginSchema = z.object({
  phone: z.string().min(11).max(20),
})

/**
 * 获取 JWT secret（与 auth middleware 共享逻辑）
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret && secret.length >= 32) {
    return secret
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable must be set in production (min 32 chars).',
    )
  }
  return 'magic-english-dev-secret-do-not-use-in-prod'
}

function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: '7d' })
}

// POST /api/v1/auth/register
authRoutes.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const body = getValidatedBody<typeof registerSchema>(req)

  if (body.phone) {
    const existing = await db.select().from(users).where(eq(users.phone, body.phone)).limit(1)
    if (existing.length > 0) {
      res.status(409).json({ error: 'Phone already registered' })
      return
    }
  }

  const [user] = await db
    .insert(users)
    .values({
      name: body.name,
      phone: body.phone,
      role: body.role,
      grade: body.grade,
      ageSegment: body.ageSegment,
    })
    .returning()

  const token = signToken(user.id, user.role)
  res.status(201).json({ user, token })
})

// POST /api/v1/auth/login
authRoutes.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const body = getValidatedBody<typeof loginSchema>(req)

  const [user] = await db.select().from(users).where(eq(users.phone, body.phone)).limit(1)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))

  const token = signToken(user.id, user.role)
  res.json({ user, token })
})

// GET /api/v1/auth/me — 需登录
authRoutes.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = getJwtPayload(req)
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({ user })
})

// POST /api/v1/auth/refresh — Token 刷新
authRoutes.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = getJwtPayload(req)
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  const token = signToken(user.id, user.role)
  res.json({ user, token })
})
