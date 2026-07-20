import { apiRequest } from './client'

export interface LearningSession {
  id: string
  userId: string
  sessionDate: string
  startTime?: string | null
  endTime?: string | null
  effectiveMinutes: number
  wordsLearned: number
  wordsReviewed: number
  sentencesSpoken: number
  starsEarned: number
  streakContinued: boolean
  emotionSummary?: any
}

export interface PronounceRequest {
  wordId: string
  score: number
  accuracy?: number
  fluency?: number
  completeness?: number
  feedback?: string
  sessionId?: string
}

export interface PronounceResponse {
  progress: {
    id: string
    status: string
    reviewCount: number
    correctCount: number
    avgScore: number
    nextReviewAt: string
  }
  quality: 'correct' | 'fuzzy' | 'forgot'
  nextStage: number
  nextReviewInDays: number
}

export interface ReviewQueueItem {
  progress: any
  word: {
    id: string
    word: string
    translation: string
    phonetic: string | null
    difficulty: number
  }
}

export interface TodaySummary {
  today: LearningSession | null
  pendingReviews: number
  masteredWords: number
}

export interface DailyPlan {
  plan: {
    reviewCount: number
    newWordCount: number
    reviewQueue: Array<{
      wordId: string
      word: string
      translation: string
      phonetic: string | null
      difficulty: number
      status: string
      reviewCount: number
      avgScore: number | null
    }>
    newWords: Array<{
      wordId: string
      word: string
      translation: string
      phonetic: string | null
      difficulty: number
      theme: string | null
    }>
    suggestedOrder: Array<{ type: 'review' | 'new'; wordId: string }>
  }
}

export interface LearningProgressSummary {
  summary: {
    totalMinutes: number
    totalWordsLearned: number
    totalSentencesSpoken: number
    totalStars: number
    currentStreak: number
    totalSessions: number
  }
  vocabulary: {
    new: number
    learning: number
    review: number
    mastered: number
    total: number
  }
  pendingReview: number
}

export const learningApi = {
  /** 开始学习会话 */
  startSession(): Promise<{ session: LearningSession }> {
    return apiRequest('/learning/session/start', { method: 'POST' })
  },

  /** 结束学习会话 */
  endSession(data: {
    sessionId: string
    effectiveMinutes: number
    wordsLearned: number
    wordsReviewed: number
    sentencesSpoken: number
    starsEarned: number
    emotionSummary?: any
  }): Promise<{ session: LearningSession }> {
    return apiRequest('/learning/session/end', {
      method: 'POST',
      body: data,
    })
  },

  /** 提交跟读评分 */
  pronounce(data: PronounceRequest): Promise<PronounceResponse> {
    return apiRequest('/learning/pronounce', {
      method: 'POST',
      body: data,
    })
  },

  /** 学习历史 */
  history(params?: { from?: string; to?: string; limit?: number }): Promise<{
    records: LearningSession[]
    summary: { totalSessions: number; totalMinutes: number; totalWords: number; totalStars: number }
  }> {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const qs = searchParams.toString()
    return apiRequest(`/learning/history${qs ? `?${qs}` : ''}`)
  },

  /** 今日学习摘要 */
  today(): Promise<TodaySummary> {
    return apiRequest('/learning/today')
  },

  /** 复习队列 */
  reviewQueue(limit?: number): Promise<{ queue: ReviewQueueItem[]; total: number }> {
    const qs = limit ? `?limit=${limit}` : ''
    return apiRequest(`/learning/review-queue${qs}`)
  },

  /** 提交复习结果 */
  review(
    wordId: string,
    data: { quality: 'correct' | 'fuzzy' | 'forgot'; score?: number },
  ): Promise<{
    progress: any
    newStage: number
    status: string
    nextReviewInDays: number
  }> {
    return apiRequest(`/learning/review/${wordId}`, {
      method: 'POST',
      body: data,
    })
  },

  /** 每日学习计划 */
  dailyPlan(): Promise<DailyPlan> {
    return apiRequest('/learning/daily-plan')
  },

  /** 学习进度总览 */
  progress(): Promise<LearningProgressSummary> {
    return apiRequest('/learning/progress')
  },
}
