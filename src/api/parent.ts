// ============================================================
// 家长 API — 家长端绑定与设置
// ============================================================
import { apiRequest } from './client'

export interface ParentSettings {
  dailyLimitMinutes?: number // 每日学习时长上限（分钟）
  disabledStartHour?: number // 禁用时段开始（0-23）
  disabledEndHour?: number // 禁用时段结束（0-23）
  allowWeekend?: boolean // 周末是否允许
  notificationEnabled?: boolean // 周报推送
}

export interface ChildSummary {
  id: string
  name: string
  grade: number
  avatarUrl?: string | null
  petName: string
  petStage: string
  todayMinutes: number
  streak: number
  totalWords: number
}

export interface ParentLink {
  id: string
  childId: string
  childName: string
  relation: string
  isPrimary: boolean
  settings: ParentSettings
  createdAt: string
}

export const parentApi = {
  /** 获取绑定的孩子列表 */
  getChildren: () => apiRequest<{ children: ChildSummary[] }>('/users/children'),

  /** 获取家长-孩子关联设置 */
  getSettings: (childId: string) =>
    apiRequest<ParentSettings>(`/users/children/${childId}/settings`),

  /** 更新家长设置 */
  updateSettings: (childId: string, settings: Partial<ParentSettings>) =>
    apiRequest<ParentSettings>(`/users/children/${childId}/settings`, {
      method: 'PUT',
      body: settings,
    }),

  /** 获取孩子学习详情（最近30天） */
  getChildDetails: (childId: string) =>
    apiRequest<{
      child: ChildSummary
      recentRecords: Array<{
        date: string
        minutes: number
        wordsLearned: number
        sentencesSpoken: number
      }>
    }>(`/users/children/${childId}/details`),
}
