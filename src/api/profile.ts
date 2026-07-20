// ============================================================
// 画像 API — 前端调用封装
// ============================================================
import { apiRequest } from './client'

export interface LearningStyle {
  primary: {
    style: string
    score: number
    signals: string[]
  }
  secondary: {
    style: string
    score: number
    signals: string[]
  }
  distribution: Record<string, number>
  confidence: number
  stage: string
  dataDays: number
}

export interface InterestItem {
  theme: string
  score: number
  lastActive: string
  totalMinutes: number
  wordCount: number
}

export interface DormantInterest {
  theme: string
  lastScore: number
  dormantSince: string
}

export interface Interests {
  active: InterestItem[]
  dormant: DormantInterest[]
  recommendation: string[]
}

export interface DifficultyFlags {
  weakThemes: string[]
  weakSkills: string[]
  avgCorrectRate: number
}

export interface FullProfile {
  userId: string
  learningStyle: LearningStyle
  interests: Interests
  difficultyFlags: DifficultyFlags
  rhythmType: string
  updatedAt: string
}

export const profileApi = {
  /** 获取完整画像 */
  getFull: () => apiRequest<FullProfile>('/profile/full'),

  /** 获取学习风格 */
  getLearningStyle: () => apiRequest<{ learningStyle: LearningStyle }>('/profile/learning-style'),

  /** 获取兴趣图谱 */
  getInterests: () => apiRequest<{ interests: Interests }>('/profile/interests'),

  /** 获取内容信号 */
  getContentSignals: () =>
    apiRequest<{
      gradeLevel: number
      preferredThemes: string[]
      weakThemes: string[]
      suggestedDifficulty: string
      focusTopics: string[]
    }>('/profile/content-signals'),

  /** 保存初始兴趣标签（Onboarding） */
  saveInterests: (interests: string[]) =>
    apiRequest<{ saved: boolean }>('/profile/interests', {
      method: 'PUT',
      body: { interests },
    }),
}
