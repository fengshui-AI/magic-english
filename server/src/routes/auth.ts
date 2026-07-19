import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { users } from '../db/schemas/index.js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { validateBody, getValidatedBody } from '../middleware/validate.js'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

export const authRoutes = Router()

// ============================================================
// Schema 定义
// ============================================================

export const registerSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().min(11).max(20).optional(),
  password: z.string().min(6).max(100),
  role: z.enum(['child', 'parent']).default('child'),
  grade: z.number().int().min(1).max(6).default(3),
  ageSegment: z.enum(['low', 'mid', 'high']).optional(),
})

export type RegisterBody = z.infer<typeof registerSchema>

const loginSchema = z.object({
  phone: z.string().min(11).max(20),
  password: z.string().min(1).max(100),
})

export type LoginBody = z.infer<typeof loginSchema>

// ============================================================
// 密码工具
// ============================================================

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return computed === hash
}

// ============================================================
// JWT 工具
// ============================================================

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

// ============================================================
// POST /api/v1/auth/register — 注册
// ============================================================
authRoutes.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const body = getValidatedBody<RegisterBody>(req)

  // Child 角色必须有 ageSegment
  if (body.role === 'child' && !body.ageSegment) {
    res.status(400).json({ error: 'Child registration requires ageSegment' })
    return
  }

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
      passwordHash: hashPassword(body.password),
      role: body.role,
      grade: body.grade,
      ageSegment: body.ageSegment,
    })
    .returning({
      id: users.id,
      phone: users.phone,
      role: users.role,
      name: users.name,
      ageSegment: users.ageSegment,
      grade: users.grade,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    })

  const token = signToken(user.id, user.role)
  res.status(201).json({ user, token })
})

// ============================================================
// POST /api/v1/auth/login — 登录（验证密码）
// ============================================================
authRoutes.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const body = getValidatedBody<LoginBody>(req)

  const [user] = await db.select().from(users).where(eq(users.phone, body.phone)).limit(1)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  // 验证密码
  if (!user.passwordHash) {
    // 老用户没有密码，不允许用密码登录，提示设置密码
    res.status(401).json({ error: 'Account needs password setup. Please contact support.' })
    return
  }
  
  if (!verifyPassword(body.password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))

  const token = signToken(user.id, user.role)
  res.json({ user, token })
})

// ============================================================
// GET /api/v1/auth/me — 获取当前用户
// ============================================================
authRoutes.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = getJwtPayload(req)
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({ user })
})

// ============================================================
// POST /api/v1/auth/refresh — Token 刷新
// ============================================================
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
