import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface JwtPayload {
  userId: string
  role: 'child' | 'parent'
}

// Extend Express Request to carry JWT payload
declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload
    }
  }
}

/**
 * 获取 JWT secret，生产环境强制要求环境变量
 * 开发环境可使用默认值方便本地调试
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret && secret.length >= 32) {
    return secret
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable must be set in production (min 32 chars). ' +
        'Generate one with: openssl rand -hex 64',
    )
  }
  // 开发环境使用固定默认值（仅用于本地开发！）
  console.warn('⚠️  Using default JWT_SECRET for development. DO NOT use in production!')
  return 'magic-english-dev-secret-do-not-use-in-prod'
}

/**
 * JWT 认证中间件 — 解析 Bearer token 并将 payload 存入 req.jwtPayload
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  try {
    const secret = getJwtSecret()
    const payload = jwt.verify(authHeader.slice(7), secret) as JwtPayload
    req.jwtPayload = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * 获取当前请求的 JWT payload
 */
export function getJwtPayload(req: Request): JwtPayload {
  if (!req.jwtPayload) {
    throw new Error('JWT payload not found — did you forget authMiddleware?')
  }
  return req.jwtPayload
}
