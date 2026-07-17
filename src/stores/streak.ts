import { reactive } from 'vue'
import { streakApi } from '../api/streak'
import type { StreakState } from '../api/streak'

// ============================================================
// 连胜状态 Store
// ============================================================

interface StreakStore {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
  freezeCards: number
  streakLevel: number
  isFrozen: boolean
  status: 'active' | 'frozen' | 'idle'
  streakEmoji: string
  nextMilestone: { days: number; reward: string } | null
  loading: boolean
  error: string | null
  // 打卡结果
  lastCheckinResult: {
    milestoneHit: { days: number; reward: string } | null
    streakGained: boolean
  } | null
}

export const streakStore = reactive<StreakStore>({
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  freezeCards: 0,
  streakLevel: 0,
  isFrozen: false,
  status: 'idle',
  streakEmoji: '',
  nextMilestone: null,
  loading: false,
  error: null,
  lastCheckinResult: null,
})

/** 获取连胜状态 */
export async function fetchStreakState() {
  streakStore.loading = true
  streakStore.error = null
  try {
    const data = await streakApi.current()
    updateStreakStore(data)
    return data
  } catch (err) {
    streakStore.error = err instanceof Error ? err.message : '获取连胜状态失败'
    return null
  } finally {
    streakStore.loading = false
  }
}

/** 每日打卡 */
export async function checkin() {
  streakStore.loading = true
  streakStore.error = null
  try {
    const data = await streakApi.checkin()
    updateStreakStore(data)
    streakStore.lastCheckinResult = {
      milestoneHit: data.milestoneHit,
      streakGained: data.streakGained,
    }
    return data
  } catch (err) {
    streakStore.error = err instanceof Error ? err.message : '打卡失败'
    return null
  } finally {
    streakStore.loading = false
  }
}

/** 使用冻结卡 */
export async function useFreeze() {
  streakStore.loading = true
  streakStore.error = null
  try {
    const data = await streakApi.freeze()
    updateStreakStore(data)
    return data
  } catch (err) {
    streakStore.error = err instanceof Error ? err.message : '冻结失败'
    return null
  } finally {
    streakStore.loading = false
  }
}

/** 同步状态到 store */
function updateStreakStore(data: StreakState) {
  streakStore.currentStreak = data.currentStreak
  streakStore.longestStreak = data.longestStreak
  streakStore.lastActiveDate = data.lastActiveDate
  streakStore.freezeCards = data.freezeCards
  streakStore.streakLevel = data.streakLevel
  streakStore.isFrozen = data.isFrozen
  streakStore.status = data.status
  streakStore.streakEmoji = data.streakEmoji
  streakStore.nextMilestone = data.nextMilestone
}

// ============================================================
// 连胜辅助
// ============================================================

/** 连胜火焰等级（用于 UI 渲染） */
export function getFlameLevel(streak: number): number {
  if (streak >= 60) return 5
  if (streak >= 30) return 4
  if (streak >= 15) return 3
  if (streak >= 7) return 2
  if (streak >= 3) return 1
  return 0
}

/** 连胜火焰颜色 */
export function getFlameColor(streak: number): string {
  if (streak >= 60) return '#e17055' // 龙焰红
  if (streak >= 30) return '#fdcb6e' // 金色
  if (streak >= 15) return '#ff7675' // 深红
  if (streak >= 7) return '#fab1a0' // 粉红
  if (streak >= 3) return '#ffeaa7' // 浅黄
  return '#dfe6e9' // 灰
}

/** 距离下一里程碑的天数 */
export function daysToNextMilestone(
  streak: number,
  nextMilestone: { days: number } | null,
): number {
  if (!nextMilestone) return 0
  return nextMilestone.days - streak
}
