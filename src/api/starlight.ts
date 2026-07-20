// ============================================================
// 星光 API — 前端调用封装
// ============================================================
import { apiRequest } from './client'

export interface StarlightState {
  fillLevel: number   // 0-1 液位比例
  isFull: boolean
}

export interface StarlightEarnResult {
  amount: number
  balance: number
  dailyEarned: number
  dailyLimit: number
  capped: boolean
}

export const starlightApi = {
  get: () => apiRequest<StarlightState>('/starlight'),
  earn: (source: string, sourceRef?: string) =>
    apiRequest<StarlightEarnResult>('/starlight/earn', {
      method: 'POST',
      body: { source, sourceRef },
    }),
}
