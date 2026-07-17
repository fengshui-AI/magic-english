/**
 * 对话交互 E2E 测试
 *
 * 流程：开启对话 → 多轮交流 → 话题切换 → 结束会话 → 查看历史
 * 需要后端运行中
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let token = ''
let sessionId = ''

beforeAll(async () => {
  const phone = `1380003${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name: '对话测试', role: 'child', grade: 3 }),
  })
  const regData = await regRes.json()
  token = regData.token
})

describe('对话交互 E2E', () => {
  // ============================================================
  // 开启对话
  // ============================================================
  describe('开启对话', () => {
    it('POST /dialogue/start 创建对话会话并返回开场白', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grade: 3 }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.sessionId).toBeDefined()
      expect(data.message).toBeDefined()
      expect(data.message.text).toBeTruthy()
      expect(data.message.stage).toBe('warmup')
      expect(data.topic).toBeTruthy()
      expect(Array.isArray(data.targetWords)).toBe(true)
      expect(data.targetWords.length).toBeGreaterThan(0)
      sessionId = data.sessionId
    })

    it('POST /dialogue/start 需要认证', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(401)
    })
  })

  // ============================================================
  // 多轮交流
  // ============================================================
  describe('多轮交流', () => {
    it('POST /dialogue/message 第1轮：孩子说英文', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          message: 'I like dogs very much!',
        }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.message).toBeDefined()
      expect(data.message.text).toBeTruthy()
      expect(data.stage).toBeDefined()
      // 应该返回孩子的英文使用比例
      expect(data.childEnglishRatio).toBeGreaterThanOrEqual(0)
    })

    it('POST /dialogue/message 第2轮：继续对话', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          message: 'I have a big brown dog',
        }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.message.text).toBeTruthy()
    })

    it('POST /dialogue/message 第3轮：推进阶段', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          message: 'My dog likes to run and play',
        }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      // 3轮后应该进入 topic 或 practice 阶段
      expect(['topic', 'practice'].includes(data.stage)).toBe(true)
    })

    it('POST /dialogue/message 拒绝不存在的会话', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: '00000000-0000-0000-0000-000000000000',
          message: 'hello',
        }),
      })
      expect(res.status).toBe(400)
    })
  })

  // ============================================================
  // 话题切换
  // ============================================================
  describe('话题切换', () => {
    it('POST /dialogue/switch-topic 切换到新话题', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/switch-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grade: 3 }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.topic).toBeTruthy()
      expect(Array.isArray(data.targetWords)).toBe(true)
      expect(data.message.text).toBeTruthy()
    })
  })

  // ============================================================
  // 结束会话 + 历史
  // ============================================================
  describe('结束会话与历史', () => {
    it('POST /dialogue/end 正常结束会话', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.ended).toBe(true)
      expect(data.stats).toBeDefined()
      expect(data.stats.totalTurns).toBeGreaterThan(0)
    })

    it('GET /dialogue/history 获取对话历史', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(Array.isArray(data.sessions)).toBe(true)
    })
  })
})
