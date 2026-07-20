import { apiRequest } from './client'

// ============================================================
// 情感状态类型
// ============================================================

export interface EmotionVector {
  pleasure: number // 0-1
  arousal: number // 0-1
  closeness: number // 0-1
  focusMatch: number // 0-1
}

export interface GradientInfo {
  level: number // 0-3
  name: string
  minMinutes: number
  emoji: string
  description: string
  behaviors: string[]
}

export interface DodoResponse {
  expression: string
  animation: string
  bubbleText: string
  moodLabel: string
  gradientAware: boolean
}

export interface EmotionState {
  emotion: EmotionVector
  gradient: GradientInfo
  response: DodoResponse
  lastUpdated: string | null
}

export interface EmotionEventResult {
  emotion: EmotionVector
  previousEmotion: EmotionVector
  response: DodoResponse
  logId: string
  timestamp: string
}

export interface EmotionHistoryItem {
  id: string
  timestamp: string
  pleasure: number
  arousal: number
  closeness: number
  focusMatch: number
  triggerEvent: string
}

export type EmotionEventType =
  | 'correct_answer'
  | 'wrong_answer'
  | 'perfect_score'
  | 'streak_milestone'
  | 'new_word_mastered'
  | 'session_start'
  | 'session_complete'
  | 'idle_too_long'
  | 'review_forgot'
  | 'review_correct'
  | 'level_up'
  | 'daily_checkin'
  | 'streak_lost'
  | 'freeze_used'
  | 'greeting_response'

// ============================================================
// Emotion API
// ============================================================

export const emotionApi = {
  /** 获取当前情感状态 */
  current(): Promise<EmotionState> {
    return apiRequest('/emotion/current')
  },

  /** 上报情感事件 */
  event(
    type: EmotionEventType,
    intensity?: number,
    context?: Record<string, unknown>,
  ): Promise<EmotionEventResult> {
    return apiRequest('/emotion/event', {
      method: 'POST',
      body: { type, intensity, context },
    })
  },

  /** 获取豆豆情感响应 */
  dodoResponse(context?: string): Promise<EmotionState> {
    const params = context ? `?context=${context}` : ''
    return apiRequest(`/emotion/dodo-response${params}`)
  },

  /** 获取陪伴梯度 */
  gradient(): Promise<{
    gradient: GradientInfo
    totalMinutes: number
    nextGradientMinutes: number | null
    progressToNext: number
  }> {
    return apiRequest('/emotion/gradient')
  },

  /** 获取情感历史 */
  history(limit = 50): Promise<{ logs: EmotionHistoryItem[] }> {
    return apiRequest(`/emotion/history?limit=${limit}`)
  },
}
