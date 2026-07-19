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
// 学习进度 Store
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
  grade: 3,
  unit: 1,
  completedLessons: [],
  streak: 0,
  todayMinutes: 0,
  totalStars: 0,
  weakWords: [],
})

// ============================================================
// API 调用
// ============================================================

/** 获取学习进度总览 */
export async function fetchProgress() {
  learningStore.loading = true
  learningStore.error = null
  try {
    const data = await learningApi.progress()
    learningStore.progress = data
    learningStore.streak = data.summary.currentStreak
    learningStore.totalStars = data.summary.totalStars
    return data
  } catch (e: any) {
    learningStore.error = e.message || '获取学习进度失败'
    return null
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
  } catch (e: any) {
    learningStore.error = e.message || '获取今日摘要失败'
    return null
  }
}

/** 获取每日学习计划 */
export async function fetchDailyPlan() {
  try {
    const data = await learningApi.dailyPlan()
    learningStore.dailyPlan = data
    return data
  } catch (e: any) {
    learningStore.error = e.message || '获取学习计划失败'
    return null
  }
}

/** 获取学习历史 */
export async function fetchHistory(from?: string, to?: string) {
  learningStore.loading = true
  try {
    const data = await learningApi.history({ from, to })
    learningStore.history = data.records
    return data
  } catch (e: any) {
    learningStore.error = e.message || '获取学习历史失败'
    learningStore.history = []
    return null
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

/**
 * 按任务类型批量标记完成（由真实学习行为驱动，而非点击即完成）。
 * 例如：完成一次学习 → completeTaskByType(['word','speak','listen'])
 */
export function completeTaskByType(types: string[], stars = 3) {
  let changed = false
  dailyTasks.forEach((t) => {
    if (types.includes(t.type) && !t.completed) {
      t.completed = true
      t.stars = stars
      if (learningStore.progress) {
        learningStore.progress.summary.totalStars += stars
      }
      learningStore.totalStars += stars
      changed = true
    }
  })
  if (changed) {
    learningStore.todayMinutes += 5
  }
}

export function resetDailyTasks() {
  dailyTasks.forEach((t) => {
    t.completed = false
    t.stars = 0
  })
}
