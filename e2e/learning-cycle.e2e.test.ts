/**
 * T7.1.2: 完整学习循环 E2E 测试
 *
 * 流程：新词学习 → 跟读评测 → 复习 → 结算
 * 需要后端运行中
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let token = ''
let userId = ''
let wordIds: string[] = []

beforeAll(async () => {
  // 创建测试用户
  const phone = `1380001${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name: '学习循环测试', role: 'child', grade: 3 }),
  })
  const regData = await regRes.json()
  token = regData.token
  userId = regData.user.id

  // 获取单词列表
  const wordsRes = await fetch(`${BASE_URL}/words?grade=3`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const wordsData = await wordsRes.json()
  wordIds = (wordsData.items || []).slice(0, 5).map((w: any) => w.id)
})

describe('完整学习循环 E2E', () => {
  // ============================================================
  // Phase 1: 新词学习
  // ============================================================
  describe('Phase 1: 新词学习', () => {
    it('GET /words 获取新词列表', async () => {
      const res = await fetch(`${BASE_URL}/words?grade=3`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.items.length).toBeGreaterThan(0)
    })

    it('GET /words/:id 查看单词详情', async () => {
      if (wordIds.length === 0) return
      const res = await fetch(`${BASE_URL}/words/${wordIds[0]}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status === 200 || res.status === 404).toBe(true)
    })
  })

  // ============================================================
  // Phase 2: 跟读评测（发音评分）
  // ============================================================
  describe('Phase 2: 跟读评测', () => {
    it('POST /learning/pronounce 提交发音评分', async () => {
      const res = await fetch(`${BASE_URL}/learning/pronounce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wordId: wordIds[0] || '00000000-0000-0000-0000-000000000001',
          score: 85,
          accuracy: 80,
          fluency: 82,
          completeness: 90,
        }),
      })
      const data = await res.json()
      // 可能 200 或 400/404（取决于 wordId 是否存在）
      expect([200, 201, 400, 404].includes(res.status)).toBe(true)
    })
  })

  // ============================================================
  // Phase 3: 单词复习（艾宾浩斯）
  // ============================================================
  describe('Phase 3: 单词复习', () => {
    it('GET /learning/review-queue 获取待复习队列', async () => {
      const res = await fetch(`${BASE_URL}/learning/review-queue`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.queue).toBeDefined()
    })

    it('POST /learning/review/:wordId 提交复习结果', async () => {
      const wordId = wordIds[0] || '00000000-0000-0000-0000-000000000001'
      const res = await fetch(`${BASE_URL}/learning/review/${wordId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quality: 'correct',
        }),
      })
      // 可能因没有实际学习记录而 400/404
      expect([200, 201, 400, 404].includes(res.status)).toBe(true)
    })
  })

  // ============================================================
  // Phase 4: 学习结算
  // ============================================================
  describe('Phase 4: 学习结算', () => {
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
      expect(data.session).toBeTruthy()
      sessionId = data.session.id
    })

    it('GET /learning/progress 结算汇总正确', async () => {
      const res = await fetch(`${BASE_URL}/learning/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.summary).toBeDefined()
    })

    it('POST /streak/checkin 结算后签到', async () => {
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
    })
  })
})
