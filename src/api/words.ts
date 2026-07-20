import { apiRequest } from './client'

export interface WordItem {
  id: string
  word: string
  translation: string
  phonetic?: string | null
  difficulty: number
  gradeLevel?: number | null
  theme?: string | null
  storyAnchor?: string | null
  sentence?: string | null
  sentenceCn?: string | null
  imageUrl?: string | null
  audioUrl?: string | null
  createdAt: string
  progress?: {
    status: string
    reviewCount: number
    avgScore: number | null
  } | null
}

export interface StoryAnchor {
  wordId: string
  word: string
  translation?: string
  storyAnchor: {
    scene: string
    character: string
    emotion: string
    sentence: string
    hint: string
  } | null
}

export interface WordsListResponse {
  items: WordItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const wordApi = {
  /** 获取词库列表 */
  list(params?: {
    theme?: string
    grade?: number
    difficulty?: number
    page?: number
    limit?: number
  }): Promise<WordsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.theme) searchParams.set('theme', params.theme)
    if (params?.grade) searchParams.set('grade', String(params.grade))
    if (params?.difficulty) searchParams.set('difficulty', String(params.difficulty))
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const qs = searchParams.toString()
    return apiRequest(`/words${qs ? `?${qs}` : ''}`)
  },

  /** 获取主题列表 */
  topics(): Promise<{ topics: string[] }> {
    return apiRequest('/words/topics')
  },

  /** 按主题获取单词 */
  byTheme(theme: string): Promise<{ theme: string; items: WordItem[] }> {
    return apiRequest(`/words/themes/${theme}`)
  },

  /** 获取单词详情 */
  detail(id: string): Promise<{ word: WordItem }> {
    return apiRequest(`/words/${id}`)
  },

  /** 获取故事锚点 */
  storyAnchor(id: string): Promise<StoryAnchor> {
    return apiRequest(`/words/${id}/story-anchor`)
  },
}
