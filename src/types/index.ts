// 用户
export interface User {
  id: string
  phone?: string | null
  role: 'child' | 'parent'
  name?: string | null
  ageSegment?: 'low' | 'mid' | 'high' | null
  grade: number
  avatarUrl?: string | null
  createdAt: string
  updatedAt: string
  lastLoginAt?: string | null
}

// 宠物状态
export interface PetState {
  name: string
  level: number // 1-10 级
  stage: 'egg' | 'baby' | 'young' | 'adult' | 'legend'
  exp: number
  expToNext: number
  mood: 'happy' | 'normal' | 'sad' | 'excited'
  hunger: number // 0-100，通过学习来"喂食"
  skin: string // 当前皮肤
  unlockedSkins: string[]
}

// 学习进度
export interface LearningProgress {
  grade: number // 1-6 年级
  unit: number
  completedLessons: string[]
  streak: number // 连续学习天数
  todayMinutes: number
  totalStars: number
  weakWords: string[]
}

// 每日任务
export interface DailyTask {
  id: string
  title: string
  description: string
  type: 'speak' | 'listen' | 'word' | 'dialogue'
  completed: boolean
  stars: number // 0-3
}

// 发音评分结果
export interface PronounceResult {
  word: string
  score: number // 0-100
  accuracy: number
  fluency: number
  completeness: number
  feedback: string
}

// 对话消息
export interface DialogueMessage {
  role: 'user' | 'ai' | 'system'
  content: string
  translation?: string
}

// 学习记录
export interface LearningRecord {
  date: string
  minutes: number
  wordsLearned: number
  sentencesSpoken: number
  starsEarned: number
}
