import { reactive } from 'vue'
import { learningApi } from '../api/learning'
import type { LearningSession } from '../api/learning'

interface SessionStore {
  current: LearningSession | null
  loading: boolean
  error: string | null
}

export const sessionStore = reactive<SessionStore>({
  current: null,
  loading: false,
  error: null,
})

/** 开始学习会话 */
export async function startSession() {
  sessionStore.loading = true
  sessionStore.error = null
  try {
    const { session } = await learningApi.startSession()
    sessionStore.current = session
    return session
  } catch (e: any) {
    sessionStore.error = e.message
    return null
  } finally {
    sessionStore.loading = false
  }
}

/** 结束学习会话 */
export async function endSession(data: {
  effectiveMinutes: number
  wordsLearned: number
  wordsReviewed: number
  sentencesSpoken: number
  starsEarned: number
  emotionSummary?: any
}) {
  if (!sessionStore.current) return null
  sessionStore.loading = true
  try {
    const { session } = await learningApi.endSession({
      sessionId: sessionStore.current.id,
      ...data,
    })
    sessionStore.current = session
    return session
  } catch (e: any) {
    sessionStore.error = e.message
    return null
  } finally {
    sessionStore.loading = false
  }
}

/** 提交跟读评分 */
export async function submitPronounce(data: {
  wordId: string
  score: number
  accuracy?: number
  fluency?: number
  completeness?: number
  feedback?: string
}) {
  try {
    const result = await learningApi.pronounce({
      ...data,
      sessionId: sessionStore.current?.id,
    })
    return result
  } catch (e: any) {
    sessionStore.error = e.message
    return null
  }
}
