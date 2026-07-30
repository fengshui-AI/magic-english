// ============================================================
// 花园 API — PRD 10.3 星球建造系统
// ============================================================
import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { db } from '../db/index.js'
import { gardenLayouts, pets, wordProgress, words } from '../db/schemas/index.js'
import { eq, and, sql } from 'drizzle-orm'

export const gardenRoutes = Router()

gardenRoutes.use(authMiddleware)

// ============================================================
// 出生地配置
// ============================================================
const BIRTHPLACE_THEMES: Record<string, { sky: string; terrain: string; initialDecor: string[] }> = {
  '海边小村': { sky: 'linear-gradient(180deg, #87CEEB, #E0F0FF)', terrain: '#F5DEB3', initialDecor: ['🐚', '🐚', '🪸'] },
  '森林深处': { sky: 'linear-gradient(180deg, #228B22, #90EE90)', terrain: '#8B7355', initialDecor: ['🍄', '🍄', '🌿'] },
  '星空草原': { sky: 'linear-gradient(180deg, #191970, #4169E1)', terrain: '#7CFC00', initialDecor: ['💫', '💫', '🪨'] },
  '花田小丘': { sky: 'linear-gradient(180deg, #FFB6C1, #FFF0F5)', terrain: '#98FB98', initialDecor: ['🌸', '🌸', '🌻'] },
  '暖阳山谷': { sky: 'linear-gradient(180deg, #FFD700, #FFA500)', terrain: '#DEB887', initialDecor: ['🪨', '🌾', '🌾'] },
}

// ============================================================
// 地标建筑定义
// ============================================================
const BUILDINGS = [
  { id: 'library', type: 'functional', name: '魔法图书馆', emoji: '📚', route: '/learn', description: '单词学习' },
  { id: 'workshop', type: 'functional', name: '语音工坊', emoji: '🎤', route: '/chat', description: '跟读练习' },
  { id: 'story_house', type: 'functional', name: '故事小屋', emoji: '🏠', route: '/chat', description: '情景对话' },
  { id: 'crystal_tower', type: 'wonder', name: '水晶塔', emoji: '🔮', route: null, description: '奇迹建筑', unlockWords: 50 },
  { id: 'rainbow_bridge', type: 'wonder', name: '彩虹桥', emoji: '🌈', route: null, description: '奇迹建筑', unlockStreak: 30 },
  { id: 'mushroom_castle', type: 'wonder', name: '蘑菇城堡', emoji: '🏰', route: null, description: '奇迹建筑', unlockWords: 100 },
]

// ============================================================
// GET /api/v1/garden — 获取花园完整状态
// ============================================================
gardenRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    // 获取豆豆出生地
    const [pet] = await db
      .select({ birthPlace: pets.birthPlace, stage: pets.stage })
      .from(pets)
      .where(eq(pets.userId, userId))
      .limit(1)

    const birthplace = pet?.birthPlace || '暖阳山谷'
    const theme = BIRTHPLACE_THEMES[birthplace] || BIRTHPLACE_THEMES['暖阳山谷']

    // 获取已学会的单词（作为摆件）
    const learnedWords = await db
      .select({
        wordId: wordProgress.wordId,
        word: words.word,
        theme: words.theme,
      })
      .from(wordProgress)
      .innerJoin(words, eq(wordProgress.wordId, words.id))
      .where(
        and(
          eq(wordProgress.userId, userId),
          sql`${wordProgress.status} IN ('learned', 'mastered')`,
        ),
      )
      .limit(100)

    // 计算已学会单词总数（用于解锁建筑）
    const totalLearned = learnedWords.length

    // 获取花园布局
    const [layout] = await db
      .select()
      .from(gardenLayouts)
      .where(eq(gardenLayouts.userId, userId))
      .limit(1)

    const layoutData = (layout?.layoutData as any) || {}

    // 计算可解锁的建筑
    const buildings = BUILDINGS.map((b) => {
      let unlocked = true
      if (b.type === 'wonder') {
        if (b.id === 'crystal_tower') unlocked = totalLearned >= (b as any).unlockWords
        else if (b.id === 'rainbow_bridge') unlocked = false  // 需要 streak >= 30
        else if (b.id === 'mushroom_castle') unlocked = totalLearned >= (b as any).unlockWords
        else unlocked = false
      }
      return { ...b, unlocked }
    })

    // 单词摆件
    const items = learnedWords.map((w: any, i: number) => ({
      id: w.wordId,
      word: w.word,
      emoji: getWordEmoji(w.word, w.theme),
      position: layoutData.items?.[w.wordId] || { x: (i % 5) * 60 + 20, y: Math.floor(i / 5) * 60 + 20 },
      unlockedAt: null,
    }))

    res.json({
      birthplace,
      theme,
      stage: pet?.stage || 'incubating',
      buildings,
      items,
      layoutData,
      stats: {
        totalWords: totalLearned,
        totalItems: items.length,
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get garden' })
  }
})

// ============================================================
// PUT /api/v1/garden/layout — 保存花园布局
// ============================================================
gardenRoutes.put('/layout', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const { layoutData } = req.body as { layoutData: any }

    const [existing] = await db
      .select()
      .from(gardenLayouts)
      .where(eq(gardenLayouts.userId, userId))
      .limit(1)

    if (existing) {
      await db
        .update(gardenLayouts)
        .set({ layoutData, updatedAt: new Date() })
        .where(eq(gardenLayouts.userId, userId))
    } else {
      await db.insert(gardenLayouts).values({ userId, layoutData })
    }

    res.json({ saved: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save layout' })
  }
})

// ============================================================
// 简单 Emoji 映射（单词摆件用）
// ============================================================
function getWordEmoji(word: string, theme?: string | null): string {
  const map: Record<string, string> = {
    animal: '🐾', food: '🍎', school: '✏️', family: '👨‍👩‍👧',
    sports: '⚽', nature: '🌿', space: '⭐', color: '🎨',
    weather: '🌤️', body: '✋', transport: '🚗', music: '🎵',
    art: '🖌️', travel: '✈️', science: '🔬', festivals: '🎉',
    technology: '💻', daily_life: '🏠',
  }
  if (theme && map[theme]) return map[theme]

  // 按首字母简单映射
  const first = word.charAt(0).toLowerCase()
  const letterMap: Record<string, string> = {
    a: '🍎', b: '🐝', c: '🐱', d: '🐶', e: '🥚', f: '🐸',
    g: '🍇', h: '🏠', i: '🍦', j: '🫙', k: '🔑', l: '🦁',
    m: '🌙', n: '🥜', o: '🐙', p: '🐼', q: '👑', r: '🌹',
    s: '⭐', t: '🌳', u: '☂️', v: '🎻', w: '🐋', x: '❌',
    y: '☯️', z: '🦓',
  }
  return letterMap[first] || '📦'
}
