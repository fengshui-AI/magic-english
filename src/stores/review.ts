import { reactive } from 'vue'
import { learningApi } from '../api/learning'
import type { ReviewQueueItem } from '../api/learning'

interface ReviewStore {
  queue: ReviewQueueItem[]
  loading: boolean
  error: string | null
}

export const reviewStore = reactive<ReviewStore>({
  queue: [],
  loading: false,
  error: null,
})

/** 获取复习队列 */
export async function fetchReviewQueue(limit?: number) {
  reviewStore.loading = true
  reviewStore.error = null
  try {
    const { queue } = await learningApi.reviewQueue(limit)
    reviewStore.queue = queue
    return queue
  } catch (e: any) {
    reviewStore.error = e.message
    return []
  } finally {
    reviewStore.loading = false
  }
}

/** 提交复习结果 */
export async function submitReview(
  wordId: string,
  quality: 'correct' | 'fuzzy' | 'forgot',
  score?: number,
) {
  try {
    const result = await learningApi.review(wordId, { quality, score })
    // 从队列中移除已复习的
    reviewStore.queue = reviewStore.queue.filter((item) => item.word.id !== wordId)
    return result
  } catch (e: any) {
    reviewStore.error = e.message
    return null
  }
}

/** 检查是否全部复习完成 */
export function allReviewed(): boolean {
  return reviewStore.queue.length === 0 && !reviewStore.loading
}
