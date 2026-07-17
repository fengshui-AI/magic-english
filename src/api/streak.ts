import { apiRequest } from './client'

// ============================================================
// 连胜状态类型
// ============================================================

export interface StreakState {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
  freezeCards: number
  streakLevel: number
  isFrozen: boolean
  status: 'active' | 'frozen' | 'idle'
  streakEmoji: string
  nextMilestone: {
    days: number
    reward: string
  } | null
}

export interface CheckinResult extends StreakState {
  milestoneHit: { days: number; reward: string } | null
  streakGained: boolean
}

export interface FreezeResult extends StreakState {
  message: string
}

// ============================================================
// Streak API
// ============================================================

export const streakApi = {
  /** 获取当前连胜状态 */
  current(): Promise<StreakState> {
    return apiRequest('/streak/current')
  },

  /** 每日打卡 */
  checkin(): Promise<CheckinResult> {
    return apiRequest('/streak/checkin', { method: 'POST' })
  },

  /** 使用冻结卡 */
  freeze(): Promise<FreezeResult> {
    return apiRequest('/streak/freeze', { method: 'POST' })
  },
}
