// ============================================================
// 花园 API — 前端调用封装
// ============================================================
import { apiRequest } from './client'

export interface GardenBuilding {
  id: string
  type: string
  name: string
  emoji: string
  route: string | null
  description: string
  unlocked: boolean
}

export interface GardenItem {
  id: string
  word: string
  emoji: string
  position: { x: number; y: number }
  unlockedAt: string | null
}

export interface GardenData {
  birthplace: string
  theme: {
    sky: string
    terrain: string
    initialDecor: string[]
  }
  stage: string
  buildings: GardenBuilding[]
  items: GardenItem[]
  layoutData: Record<string, any>
  stats: {
    totalWords: number
    totalItems: number
  }
}

export const gardenApi = {
  get: () => apiRequest<GardenData>('/garden'),
  saveLayout: (layoutData: Record<string, any>) =>
    apiRequest<{ saved: boolean }>('/garden/layout', {
      method: 'PUT',
      body: { layoutData },
    }),
}
