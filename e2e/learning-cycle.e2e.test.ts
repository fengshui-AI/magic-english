/**
 * 完整学习循环 E2E 测试
 *
 * 流程：获取单词 → 开始学习 → 发音评测 → 复习 → 结算
 * 需要后端运行中
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let token = ''
let wordId = ''

beforeAll(async () => {
  // 创建测试用户
  const phone = `1380001${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name: '学习循环测试', role: 'child', password: 'testpass', grade: 3, ageSegment: 'mid' }),
  })
  const regData = await regRes.json()
  token = regData.token

  // 获取一个单词用于测试
  const wordsRes = await fetch(`${BASE_URL}/words?grade=3&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const wordsData = await wordsRes.json()
  if (wordsData.items?.length > 0) {
    wordId = wordsData.items[0].id
  }
})

describe('完整学习循环 E2E', () => {
  // ============================================================
  // Phase 1: 单词获取
  // ============================================================
  describe('Phase 1: 单词获取', () => {
    it('GET /words 返回年级匹配的单词列表', async () => {
      const res = await fetch(`${BASE_URL}/words?grade=3`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.items.length).toBeGreaterThan(0)
      expect(data.pagination).toBeDefined()
      // 验证单词结构
      const word = data.items[0]
      expect(word.id).toBeTruthy()
      expect(word.word).toBeTruthy()
      expect(word.translation).toBeTruthy()
      expect(word.difficulty).toBeGreaterThanOrEqual(1)
    })

    it('GET /words?theme=animal 按主题筛选', async () => {
      const res = await fetch(`${BASE_URL}/words?theme=animal&limit=3`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.items.length).toBeGreaterThan(0)
      data.items.forEach((w: any) => {
        expect(w.theme).toBe('animal')
      })
    })

    it('GET /words/topics 返回主题列表', async () => {
      const res = await fetch(`${BASE_URL}/words/topics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(Array.isArray(data.topics)).toBe(true)
      expect(data.topics.length).toBeGreaterThan(0)
    })

    it('GET /words/:id 返回单词详情', async () => {
      if (!wordId) return
      const res = await fetch(`${BASE_URL}/words/${wordId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.word.id).toBe(wordId)
    })
  })

  // ============================================================
  // Phase 2: 学习会话
  // ============================================================
  describe('Phase 2: 学习会话', () => {
    let sessionId = ''

    it('POST /learning/session/start 创建学习会话', async () => {
      const res = await fetch(`${BASE_URL}/learning/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.session).toBeDefined()
      expect(data.session.id).toBeTruthy()
      sessionId = data.session.id
    })

    it('GET /learning/daily-plan 获取每日学习计划', async () => {
      const res = await fetch(`${BASE_URL}/learning/daily-plan`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.plan).toBeDefined()
    })

    it('GET /learning/review-queue 获取待复习队列', async () => {
      const res = await fetch(`${BASE_URL}/learning/review-queue`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.queue).toBeDefined()
    })
  })

  // ============================================================
  // Phase 3: 学习结算
  // ============================================================
  describe('Phase 3: 学习结算', () => {
    it('POST /streak/checkin 签到', async () => {
      const res = await fetch(`${BASE_URL}/streak/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data).toHaveProperty('currentStreak')
    })

    it('GET /learning/progress 学习进度汇总', async () => {
      const res = await fetch(`${BASE_URL}/learning/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.summary).toBeDefined()
      expect(data.summary).toHaveProperty('totalStars')
      expect(data.summary).toHaveProperty('currentStreak')
    })

    it('GET /learning/today 今日摘要', async () => {
      const res = await fetch(`${BASE_URL}/learning/today`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
    })

    it('GET /emotion/current 情感状态正常', async () => {
      const res = await fetch(`${BASE_URL}/emotion/current`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data).toHaveProperty('emotion')
    })
  })
})
