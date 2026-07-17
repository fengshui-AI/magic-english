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
 * JWT 认证中间件 — 解析 Bearer token 并将 payload 存入 req.jwtPayload
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
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
