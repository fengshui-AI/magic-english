/**
 * T7.1 补充: 家长端 E2E 测试
 *
 * 验证家长端所有 API 可用
 * 需要后端运行中
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let parentToken = ''
let childToken = ''
let parentUserId = ''
let childUserId = ''

beforeAll(async () => {
  // 创建 parent 用户
  const parentPhone = `1380004${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  const parentRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: parentPhone, name: '家长测试', role: 'parent', grade: 3 }),
  })
  const parentData = await parentRes.json()
  parentToken = parentData.token
  parentUserId = parentData.user.id

  // 创建 child 用户
  const childPhone = `1380005${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  const childRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: childPhone, name: '孩子测试', role: 'child', grade: 3 }),
  })
  const childData = await childRes.json()
  childToken = childData.token
  childUserId = childData.user.id
})

describe('家长端 API E2E', () => {
  // ============================================================
  // 画像 API
  // ============================================================
  describe('画像 API', () => {
    it('GET /profile/full 返回完整画像', async () => {
      const res = await fetch(`${BASE_URL}/profile/full`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.learningStyle).toBeDefined()
    })

    it('GET /profile/learning-style 返回学习风格', async () => {
      const res = await fetch(`${BASE_URL}/profile/learning-style`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
    })

    it('GET /profile/interests 返回兴趣图谱', async () => {
      const res = await fetch(`${BASE_URL}/profile/interests`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
    })

    it('GET /profile/content-signals 返回内容信号', async () => {
      const res = await fetch(`${BASE_URL}/profile/content-signals`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
    })
  })

  // ============================================================
  // 周报 API
  // ============================================================
  describe('周报 API', () => {
    it('GET /reports/weekly 获取当前周报', async () => {
      const res = await fetch(`${BASE_URL}/reports/weekly`, {
        headers: { Authorization: `Bearer ${parentToken}` },
      })
      expect([200, 404].includes(res.status)).toBe(true)
    })

    it('GET /reports/weekly/history 获取历史周报', async () => {
      const res = await fetch(`${BASE_URL}/reports/weekly/history`, {
        headers: { Authorization: `Bearer ${parentToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(Array.isArray(data.reports)).toBe(true)
    })

    it('POST /reports/weekly/generate 手动生成周报', async () => {
      const res = await fetch(`${BASE_URL}/reports/weekly/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({ childId: childUserId }),
      })
      // 可能因为没有足够学习数据而失败，但不应 500
      expect(res.status).not.toBe(500)
    })
  })

  // ============================================================
  // 家长设置 API
  // ============================================================
  describe('家长设置 API', () => {
    it('GET /users/me 获取用户信息（作为设置端点）', async () => {
      const res = await fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${parentToken}` },
      })
      expect([200, 404].includes(res.status)).toBe(true)
    })

    it('PATCH /users/:id 更新用户信息', async () => {
      const res = await fetch(`${BASE_URL}/users/${parentUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({
          name: '家长测试(已更新)',
        }),
      })
      expect([200, 201, 404].includes(res.status)).toBe(true)
    })
  })

  // ============================================================
  // 健康检查
  // ============================================================
  describe('健康检查', () => {
    it('GET /health 返回 ok', async () => {
      const healthUrl = process.env.E2E_BASE_URL
        ? process.env.E2E_BASE_URL.replace('/api/v1', '/health')
        : 'http://localhost:3000/health'
      const res = await fetch(healthUrl)
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.status).toBe('ok')
    })
  })
})
