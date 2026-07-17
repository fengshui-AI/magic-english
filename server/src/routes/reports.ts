import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import {
  generateWeeklyReport,
  getWeeklyReport,
  getWeeklyReports,
} from '../services/weekly-report.js'

export const reportRoutes = Router()

// 所有报告路由需要认证
reportRoutes.use(authMiddleware)

// GET /api/v1/reports/weekly?weekStart=2025-07-07 — 获取指定周报
reportRoutes.get('/weekly', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const weekStart = req.query.weekStart as string | undefined

    if (weekStart) {
      const report = await getWeeklyReport(userId, weekStart)
      if (!report) {
        res.status(404).json({ error: 'Report not found' })
        return
      }
      res.json(report)
      return
    }

    // 没有指定日期，返回最近一周的报告
    const reports = await getWeeklyReports(userId)
    if (reports.length === 0) {
      // 自动生成
      const report = await generateWeeklyReport(userId)
      res.json(report)
      return
    }
    res.json(reports[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get weekly report' })
  }
})

// GET /api/v1/reports/weekly/history — 获取历史周报列表
reportRoutes.get('/weekly/history', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const reports = await getWeeklyReports(userId)
    res.json({ reports })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get report history' })
  }
})

// POST /api/v1/reports/weekly/generate — 手动触发生成周报
reportRoutes.post('/weekly/generate', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const report = await generateWeeklyReport(userId)
    res.json(report)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate report' })
  }
})
