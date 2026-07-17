// ============================================================
// 周报 API — 前端调用封装
// ============================================================
import { apiRequest } from './client'

export interface WeeklyReportSummary {
  totalDays: number
  totalMinutes: number
  newWords: number
  wordsReviewed: number
  sentencesSpoken: number
  starsEarned: number
  avgCorrectRate: number
  currentStreak: number
  longestStreak: number
}

export interface WeeklyEmotion {
  startPleasure: number
  endPleasure: number
  avgPleasure: number
  trend: 'up' | 'down' | 'stable'
  highlight: string
}

export interface WeeklyPetStatus {
  name: string
  stage: string
  stageProgress: number
  totalMinutes: number
  gradient: string
}

export interface WeeklyReport {
  childId: string
  childName: string
  weekStart: string
  weekEnd: string
  summary: WeeklyReportSummary
  emotion: WeeklyEmotion
  pet: WeeklyPetStatus
  learningHighlights: string[]
  focusAreas: string[]
  dodoMessage: string
  parentMessage: string
  generatedAt: string
}

export const reportApi = {
  /** 获取本周周报 */
  getWeekly: () => apiRequest<WeeklyReport>('/reports/weekly'),

  /** 获取指定周报 */
  getWeekReport: (weekStart: string) =>
    apiRequest<WeeklyReport>(`/reports/weekly?weekStart=${weekStart}`),

  /** 获取历史周报列表 */
  getHistory: () => apiRequest<{ reports: WeeklyReport[] }>('/reports/weekly/history'),

  /** 手动生成周报 */
  generate: () => apiRequest<WeeklyReport>('/reports/weekly/generate', { method: 'POST' }),
}
