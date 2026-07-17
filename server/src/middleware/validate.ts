import type { ZodSchema } from 'zod'
import type { Request, Response, NextFunction } from 'express'

/**
 * Zod body 校验中间件
 * 用法: router.post('/', validateBody(schema), handler)
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() })
      return
    }
    ;(req as any).validatedBody = result.data
    next()
  }
}

/**
 * 获取经过 validateBody 校验后的请求体
 */
export function getValidatedBody<T>(req: Request): T {
  return (req as any).validatedBody as T
}
