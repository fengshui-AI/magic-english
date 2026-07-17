/**
 * 家长端 E2E 测试
 *
 * 验证：画像查询 → 周报生成 → 设置管理 → 健康检查
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

describe('家长端 E2E', () => {
  // ============================================================
  // 画像 API
  // ============================================================
  describe('画像 API', () => {
    it('GET /profile/full 返回完整画像（含学习风格）', async () => {
      const res = await fetch(`${BASE_URL}/profile/full`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data).toHaveProperty('learningStyle')
      expect(data).toHaveProperty('interests')
    })

    it('GET /profile/learning-style 返回学习风格详情', async () => {
      const res = await fetch(`${BASE_URL}/profile/learning-style`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      expect(res.status).toBe(200)
    })

    it('GET /profile/interests 返回兴趣图谱', async () => {
      const res = await fetch(`${BASE_URL}/profile/interests`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      expect(res.status).toBe(200)
    })

    it('GET /profile/content-signals 返回内容信号', async () => {
      const res = await fetch(`${BASE_URL}/profile/content-signals`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
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
      // 没有学习数据时返回 404 是正常的
      expect([200, 404].includes(res.status)).toBe(true)
    })

    it('GET /reports/weekly/history 返回历史周报数组', async () => {
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
      // 可能因为缺少学习数据而失败，但不应该 500
      expect(res.status).not.toBe(500)
    })
  })

  // ============================================================
  // 家长设置
  // ============================================================
  describe('家长设置', () => {
    it('PATCH /users/:id 更新名称', async () => {
      const res = await fetch(`${BASE_URL}/users/${parentUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({ name: '家长测试(已更新)' }),
      })
      expect(res.status).toBe(200)
    })

    it('PATCH /users/:id 越权修改他人信息被拒绝', async () => {
      const res = await fetch(`${BASE_URL}/users/${childUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({ name: 'hacked' }),
      })
      // 应该拒绝：parent 不能修改 child 的 profile（除非有 parent_link）
      expect(res.status).not.toBe(200)
    })
  })

  // ============================================================
  // 健康检查
  // ============================================================
  describe('健康检查', () => {
    it('GET /health 返回 ok', async () => {
      const res = await fetch('http://localhost:3000/health')
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.status).toBe('ok')
    })
  })
})
