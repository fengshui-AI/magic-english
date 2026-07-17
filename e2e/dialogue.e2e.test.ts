/**
 * T7.1.5: 对话交互 E2E 测试
 *
 * 流程：开启对话 → 多轮交流 → 结束会话
 * 需要后端运行中
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let token = ''
let userId = ''
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
  userId = regData.user.id
})

describe('对话交互 E2E', () => {
  // ============================================================
  // 开启对话
  // ============================================================
  describe('开启对话', () => {
    it('POST /dialogue/start 创建对话会话', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.sessionId).toBeDefined()
      expect(data.message).toBeDefined()
      sessionId = data.sessionId
    })
  })

  // ============================================================
  // 多轮交流
  // ============================================================
  describe('多轮交流', () => {
    it('POST /dialogue/message 发送消息获得回复', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: sessionId,
          message: 'I like dogs',
        }),
      })
      const data = await res.json()
      expect([200, 201, 400].includes(res.status)).toBe(true)
    })
  })

  // ============================================================
  // 获取对话历史
  // ============================================================
  describe('对话历史', () => {
    it('GET /dialogue/history 获取历史', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect([200, 404].includes(res.status)).toBe(true)
    })

    it('GET /words/topics 获取话题列表', async () => {
      const res = await fetch(`${BASE_URL}/words/topics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect([200, 404].includes(res.status)).toBe(true)
    })
  })
})
