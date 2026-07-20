// ============================================================
// 装饰品 API — 前端调用封装
// ============================================================
import { apiRequest } from './client'

export interface Decoration {
  id: string
  type: string       // head/face/neck/back/tail/hand/effect
  name: string
  emoji: string
  theme?: string
  unlockType: string  // starlight/theme_mastery/growth_milestone/streak_milestone/easter_egg
  unlockValue: number
  slot: string
  owned: boolean
  equipped: boolean
}

export const decorationApi = {
  getAll: () => apiRequest<{ decorations: Decoration[] }>('/decorations'),
  unlock: (id: string) => apiRequest<{ unlocked: boolean }>(`/decorations/${id}/unlock`, { method: 'POST' }),
  equip: (id: string) => apiRequest<{ equipped: boolean }>(`/decorations/${id}/equip`, { method: 'POST' }),
  unequip: (id: string) => apiRequest<{ unequipped: boolean }>(`/decorations/${id}/unequip`, { method: 'POST' }),
}
