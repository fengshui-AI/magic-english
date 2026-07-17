// ============================================================
// 音频预加载 composable
//
// 用途：在对话页/学习页中预加载 TTS 返回的音频 URL，
//       减少用户等待时间，提升交互流畅度。
//
// 使用方式：
//   const { preload, preloadQueue, isPreloaded, clearCache } = useAudioPreload()
//   await preload('https://api.example.com/audio/word-cat.mp3')
//   if (isPreloaded('https://api.example.com/audio/word-cat.mp3')) { ... }
// ============================================================

import { ref, onUnmounted } from 'vue'

interface CacheEntry {
  blob: Blob
  objectUrl: string
  loadedAt: number
}

const MAX_CACHE_SIZE = 20 // 最多缓存 20 个音频
const CACHE_TTL_MS = 30 * 60 * 1000 // 缓存 30 分钟

export function useAudioPreload() {
  const cache = ref<Map<string, CacheEntry>>(new Map())
  const loadingUrls = ref<Set<string>>(new Set())
  const isLoading = ref(false)

  /**
   * 预加载单个音频 URL
   * 如果已缓存则直接返回 true
   */
  async function preload(url: string): Promise<boolean> {
    if (!url) return false

    // 已缓存 → 检查是否过期
    const existing = cache.value.get(url)
    if (existing) {
      if (Date.now() - existing.loadedAt < CACHE_TTL_MS) {
        return true
      }
      // 过期，清理
      revokeEntry(url, existing)
    }

    // 正在加载中 → 等待
    if (loadingUrls.value.has(url)) {
      return false
    }

    loadingUrls.value.add(url)
    isLoading.value = true

    try {
      const response = await fetch(url)
      if (!response.ok) {
        loadingUrls.value.delete(url)
        isLoading.value = loadingUrls.value.size > 0
        return false
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      // 超过缓存上限时删除最旧的
      if (cache.value.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.value.keys().next().value
        if (oldestKey) {
          const oldEntry = cache.value.get(oldestKey)
          if (oldEntry) revokeEntry(oldestKey, oldEntry)
          cache.value.delete(oldestKey)
        }
      }

      cache.value.set(url, {
        blob,
        objectUrl,
        loadedAt: Date.now(),
      })

      return true
    } catch {
      return false
    } finally {
      loadingUrls.value.delete(url)
      isLoading.value = loadingUrls.value.size > 0
    }
  }

  /**
   * 批量预加载音频 URL 列表
   * 按顺序逐个加载，避免并发过多
   */
  async function preloadQueue(
    urls: string[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<void> {
    const toLoad = urls.filter((u) => u && !cache.value.has(u))
    if (toLoad.length === 0) {
      onProgress?.(urls.length, urls.length)
      return
    }

    let done = urls.length - toLoad.length
    onProgress?.(done, urls.length)

    for (const url of toLoad) {
      await preload(url)
      done++
      onProgress?.(done, urls.length)
    }
  }

  /**
   * 检查 URL 是否已缓存且有效
   */
  function isPreloaded(url: string): boolean {
    const entry = cache.value.get(url)
    if (!entry) return false
    if (Date.now() - entry.loadedAt >= CACHE_TTL_MS) {
      revokeEntry(url, entry)
      cache.value.delete(url)
      return false
    }
    return true
  }

  /**
   * 获取缓存的 Object URL（用于直接播放）
   */
  function getCachedUrl(url: string): string | null {
    const entry = cache.value.get(url)
    if (!entry || Date.now() - entry.loadedAt >= CACHE_TTL_MS) {
      if (entry) {
        revokeEntry(url, entry)
        cache.value.delete(url)
      }
      return null
    }
    return entry.objectUrl
  }

  /**
   * 清除所有缓存
   */
  function clearCache(): void {
    for (const [url, entry] of cache.value.entries()) {
      revokeEntry(url, entry)
    }
    cache.value.clear()
  }

  /**
   * 获取缓存数量
   */
  function getCacheSize(): number {
    return cache.value.size
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    clearCache()
  })

  return {
    preload,
    preloadQueue,
    isPreloaded,
    getCachedUrl,
    clearCache,
    getCacheSize,
    isLoading,
  }
}

/**
 * 释放 blob URL
 */
function revokeEntry(_url: string, entry: CacheEntry): void {
  try {
    URL.revokeObjectURL(entry.objectUrl)
  } catch {
    // 忽略 revoke 失败
  }
}
