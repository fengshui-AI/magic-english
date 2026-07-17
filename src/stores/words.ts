import { reactive } from 'vue'
import { wordApi } from '../api/words'
import type { WordItem, StoryAnchor, WordsListResponse } from '../api/words'

interface WordsStore {
  items: WordItem[]
  topics: string[]
  currentWord: WordItem | null
  currentAnchor: StoryAnchor | null
  pagination: { page: number; limit: number; total: number; totalPages: number } | null
  loading: boolean
  error: string | null
}

export const wordsStore = reactive<WordsStore>({
  items: [],
  topics: [],
  currentWord: null,
  currentAnchor: null,
  pagination: null,
  loading: false,
  error: null,
})

/** 获取词库列表 */
export async function fetchWords(params?: {
  theme?: string
  grade?: number
  difficulty?: number
  page?: number
  limit?: number
}) {
  wordsStore.loading = true
  wordsStore.error = null
  try {
    const data: WordsListResponse = await wordApi.list(params)
    wordsStore.items = data.items
    wordsStore.pagination = data.pagination
    return data
  } catch (e: any) {
    wordsStore.error = e.message
    return null
  } finally {
    wordsStore.loading = false
  }
}

/** 获取主题列表 */
export async function fetchTopics() {
  try {
    const { topics } = await wordApi.topics()
    wordsStore.topics = topics
    return topics
  } catch (e: any) {
    wordsStore.error = e.message
    return []
  }
}

/** 按主题获取单词 */
export async function fetchWordsByTheme(theme: string) {
  wordsStore.loading = true
  wordsStore.error = null
  try {
    const { items } = await wordApi.byTheme(theme)
    wordsStore.items = items
    return items
  } catch (e: any) {
    wordsStore.error = e.message
    return []
  } finally {
    wordsStore.loading = false
  }
}

/** 获取单词详情 */
export async function fetchWordDetail(id: string) {
  wordsStore.loading = true
  wordsStore.error = null
  try {
    const { word } = await wordApi.detail(id)
    wordsStore.currentWord = word
    return word
  } catch (e: any) {
    wordsStore.error = e.message
    return null
  } finally {
    wordsStore.loading = false
  }
}

/** 获取故事锚点 */
export async function fetchStoryAnchor(wordId: string) {
  try {
    const anchor = await wordApi.storyAnchor(wordId)
    wordsStore.currentAnchor = anchor
    return anchor
  } catch (e: any) {
    wordsStore.error = e.message
    return null
  }
}
