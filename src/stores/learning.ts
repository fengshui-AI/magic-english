import { reactive } from 'vue'
import { learningApi } from '../api/learning'
import type {
  LearningSession,
  TodaySummary,
  DailyPlan,
  LearningProgressSummary,
} from '../api/learning'
import type { DailyTask, LearningRecord } from '../types'

// ============================================================
// 学习进度 Store（接入真实 API，保留 mock 降级）
// ============================================================

interface LearningStore {
  progress: LearningProgressSummary | null
  today: TodaySummary | null
  dailyPlan: DailyPlan | null
  history: LearningSession[]
  loading: boolean
  error: string | null
  // 兼容旧视图的快捷属性
  grade: number
  unit: number
  completedLessons: string[]
  streak: number
  todayMinutes: number
  totalStars: number
  weakWords: string[]
}

export const learningStore = reactive<LearningStore>({
  progress: null,
  today: null,
  dailyPlan: null,
  history: [],
  loading: false,
  error: null,
  // 兼容旧视图默认值
  grade: 3,
  unit: 1,
  completedLessons: [],
  streak: 5,
  todayMinutes: 15,
  totalStars: 42,
  weakWords: ['beautiful', 'because', 'favorite'],
})

// ============================================================
// Mock 降级数据（API 不可用时使用）
// ============================================================

const DEFAULT_PROGRESS = {
  summary: {
    totalMinutes: 45,
    totalWordsLearned: 23,
    totalSentencesSpoken: 12,
    totalStars: 42,
    currentStreak: 5,
    totalSessions: 7,
  },
  vocabulary: {
    new: 10,
    learning: 8,
    review: 5,
    mastered: 0,
    total: 23,
  },
  pendingReview: 5,
}

const DEFAULT_TODAY = {
  today: null,
  pendingReviews: 5,
  masteredWords: 0,
}

// ============================================================
// API 调用（带 mock 降级）
// ============================================================

/** 获取学习进度总览 */
export async function fetchProgress() {
  learningStore.loading = true
  learningStore.error = null
  try {
    const data = await learningApi.progress()
    learningStore.progress = data
    // 同步兼容属性
    learningStore.streak = data.summary.currentStreak
    learningStore.totalStars = data.summary.totalStars
    return data
  } catch {
    // mock 降级
    learningStore.progress = DEFAULT_PROGRESS as LearningProgressSummary
    return DEFAULT_PROGRESS as LearningProgressSummary
  } finally {
    learningStore.loading = false
  }
}

/** 获取今日摘要 */
export async function fetchToday() {
  try {
    const data = await learningApi.today()
    learningStore.today = data
    return data
  } catch {
    learningStore.today = DEFAULT_TODAY
    return DEFAULT_TODAY
  }
}

/** 获取每日学习计划 */
export async function fetchDailyPlan() {
  try {
    const data = await learningApi.dailyPlan()
    learningStore.dailyPlan = data
    return data
  } catch {
    // mock 降级
    learningStore.dailyPlan = {
      plan: {
        reviewCount: 5,
        newWordCount: 3,
        reviewQueue: [],
        newWords: [],
        suggestedOrder: [],
      },
    }
    return learningStore.dailyPlan
  }
}

/** 获取学习历史 */
export async function fetchHistory(from?: string, to?: string) {
  learningStore.loading = true
  try {
    const data = await learningApi.history({ from, to })
    learningStore.history = data.records
    return data
  } catch {
    learningStore.history = []
    return {
      records: [],
      summary: { totalSessions: 0, totalMinutes: 0, totalWords: 0, totalStars: 0 },
    }
  } finally {
    learningStore.loading = false
  }
}

// ============================================================
// 每日任务（mock，后续接入）
// ============================================================

export const dailyTasks = reactive<DailyTask[]>([
  {
    id: '1',
    title: '每日跟读',
    description: '跟读一句英语魔法咒语',
    type: 'speak',
    completed: false,
    stars: 0,
  },
  {
    id: '2',
    title: '听力挑战',
    description: '听音选词，练练耳朵',
    type: 'listen',
    completed: false,
    stars: 0,
  },
  {
    id: '3',
    title: '单词闯关',
    description: '学习 5 个新单词',
    type: 'word',
    completed: false,
    stars: 0,
  },
  {
    id: '4',
    title: '情景对话',
    description: '和宠物用英语聊聊天',
    type: 'dialogue',
    completed: false,
    stars: 0,
  },
])

export const learningHistory = reactive<LearningRecord[]>([
  { date: '2026-07-14', minutes: 25, wordsLearned: 8, sentencesSpoken: 5, starsEarned: 12 },
  { date: '2026-07-13', minutes: 20, wordsLearned: 6, sentencesSpoken: 4, starsEarned: 10 },
  { date: '2026-07-12', minutes: 15, wordsLearned: 5, sentencesSpoken: 3, starsEarned: 8 },
  { date: '2026-07-11', minutes: 30, wordsLearned: 10, sentencesSpoken: 7, starsEarned: 15 },
  { date: '2026-07-10', minutes: 18, wordsLearned: 4, sentencesSpoken: 2, starsEarned: 6 },
  { date: '2026-07-09', minutes: 22, wordsLearned: 7, sentencesSpoken: 5, starsEarned: 11 },
  { date: '2026-07-08', minutes: 0, wordsLearned: 0, sentencesSpoken: 0, starsEarned: 0 },
])

export function completeTask(taskId: string, stars: number) {
  const task = dailyTasks.find((t) => t.id === taskId)
  if (task) {
    task.completed = true
    task.stars = stars
    if (learningStore.progress) {
      learningStore.progress.summary.totalStars += stars
    }
    learningStore.totalStars += stars
    learningStore.todayMinutes += 5
  }
}

export function resetDailyTasks() {
  dailyTasks.forEach((t) => {
    t.completed = false
    t.stars = 0
  })
}
