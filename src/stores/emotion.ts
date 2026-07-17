import { reactive } from 'vue'
import { emotionApi } from '../api/emotion'
import type { EmotionVector, GradientInfo, DodoResponse, EmotionEventType } from '../api/emotion'

// ============================================================
// 情感状态 Store
// ============================================================

interface EmotionStore {
  emotion: EmotionVector
  gradient: GradientInfo | null
  response: DodoResponse | null
  lastUpdated: string | null
  totalMinutes: number
  progressToNext: number
  loading: boolean
  error: string | null
  // 气泡展示
  bubbleVisible: boolean
  bubbleTimer: ReturnType<typeof setTimeout> | null
  // Toast 消息
  toastMessage: string
}

export const emotionStore = reactive<EmotionStore>({
  emotion: { pleasure: 0.6, arousal: 0.5, closeness: 0.2, focusMatch: 0.5 },
  gradient: null,
  toastMessage: '',
  response: null,
  lastUpdated: null,
  totalMinutes: 0,
  progressToNext: 0,
  loading: false,
  error: null,
  bubbleVisible: false,
  bubbleTimer: null,
})

/** 获取当前情感状态 */
export async function fetchEmotionState() {
  emotionStore.loading = true
  emotionStore.error = null
  try {
    const data = await emotionApi.current()
    emotionStore.emotion = data.emotion
    emotionStore.gradient = data.gradient
    emotionStore.response = data.response
    emotionStore.lastUpdated = data.lastUpdated
    // 展示气泡 5 秒
    showBubble(5000)
    return data
  } catch (err) {
    emotionStore.error = err instanceof Error ? err.message : '获取情感状态失败'
    // 降级使用默认值
    return null
  } finally {
    emotionStore.loading = false
  }
}

/** 上报情感事件 */
export async function triggerEmotionEvent(
  type: EmotionEventType,
  intensity?: number,
  context?: Record<string, unknown>,
) {
  try {
    const result = await emotionApi.event(type, intensity, context)
    emotionStore.emotion = result.emotion
    emotionStore.response = result.response
    emotionStore.lastUpdated = result.timestamp
    showBubble(4000)
    return result
  } catch {
    // 静默失败，不影响主流程
    return null
  }
}

/** 获取陪伴梯度 */
export async function fetchGradient() {
  try {
    const data = await emotionApi.gradient()
    emotionStore.gradient = data.gradient
    emotionStore.totalMinutes = data.totalMinutes
    emotionStore.progressToNext = data.progressToNext
    return data
  } catch {
    return null
  }
}

/** 获取豆豆响应 */
export async function fetchDodoResponse(context?: string) {
  try {
    const data = await emotionApi.dodoResponse(context)
    emotionStore.emotion = data.emotion
    emotionStore.gradient = data.gradient
    emotionStore.response = data.response
    showBubble(5000)
    return data
  } catch {
    return null
  }
}

/** 显示气泡 */
function showBubble(duration: number) {
  emotionStore.bubbleVisible = true
  if (emotionStore.bubbleTimer) clearTimeout(emotionStore.bubbleTimer)
  emotionStore.bubbleTimer = setTimeout(() => {
    emotionStore.bubbleVisible = false
  }, duration)
}

/** 隐藏气泡 */
export function hideBubble() {
  emotionStore.bubbleVisible = false
  if (emotionStore.bubbleTimer) clearTimeout(emotionStore.bubbleTimer)
}

// ============================================================
// 情感计算辅助
// ============================================================

/** 愉悦度 → 颜色 */
export function pleasureColor(pleasure: number): string {
  if (pleasure >= 0.8) return '#fdcb6e'
  if (pleasure >= 0.6) return '#74b9ff'
  if (pleasure >= 0.4) return '#a29bfe'
  return '#dfe6e9'
}

/** 唤醒度 → 动画强度 */
export function arousalScale(arousal: number): number {
  return 1 + arousal * 0.3 // 1.0 - 1.3
}

/** 亲密度 → 互动频率建议 */
export function closenessLevel(closeness: number): string {
  if (closeness >= 0.7) return '亲密无间'
  if (closeness >= 0.5) return '好朋友'
  if (closeness >= 0.3) return '认识中'
  return '初次见面'
}

/** 专注度 → 学习建议 */
export function focusAdvice(focusMatch: number): string {
  if (focusMatch >= 0.8) return '学习状态很好，继续！'
  if (focusMatch >= 0.6) return '保持专注～'
  if (focusMatch >= 0.4) return '需要休息一下吗？'
  return '今天状态不太好，放松一下吧'
}
