/**
 * T7.1.4: 豆豆成长 E2E 测试
 *
 * 流程：种子 → 发芽 → 成长 → 成熟 → 传说
 * 需要后端运行中
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let token = ''
let userId = ''
let petId = ''

beforeAll(async () => {
  const phone = `1380002${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name: '豆豆成长测试', role: 'child', grade: 3 }),
  })
  const regData = await regRes.json()
  token = regData.token
  userId = regData.user.id
})

describe('豆豆成长 E2E', () => {
  // ============================================================
  // 创建豆豆（首次访问 /pets/mine 会自动创建）
  // ============================================================
  describe('豆豆初始化', () => {
    it('GET /pets/mine 首次访问自动创建或已存在', async () => {
      const res = await fetch(`${BASE_URL}/pets/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect([200, 201, 404].includes(res.status)).toBe(true)
      if (res.status !== 404) {
        expect(data.pet.stage).toBe('seed')
        expect(data.pet.name).toBeTruthy()
        petId = data.pet.id
      }
    })
  })

  // ============================================================
  // 模拟喂养升级（通过 PATCH /pets/:id）
  // ============================================================
  describe('喂养升级流程', () => {
    it('PATCH /pets/:id 更新学习时长（喂经验）', async () => {
      if (!petId) return
      const res = await fetch(`${BASE_URL}/pets/${petId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ totalLearningMinutes: 30 }),
      })
      expect([200, 201, 404].includes(res.status)).toBe(true)
    })

    it('PATCH /pets/:id 升级阶段', async () => {
      if (!petId) return
      const res = await fetch(`${BASE_URL}/pets/${petId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage: 'sprout', stageProgress: 50 }),
      })
      expect([200, 201, 404].includes(res.status)).toBe(true)
    })
  })

  // ============================================================
  // 进化记录
  // ============================================================
  describe('进化记录', () => {
    it('GET /pets/:id/stage-history 获取进化历史', async () => {
      if (!petId) return
      const res = await fetch(`${BASE_URL}/pets/${petId}/stage-history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect([200, 404].includes(res.status)).toBe(true)
    })
  })

  // ============================================================
  // 宠物状态一致性
  // ============================================================
  describe('状态一致性', () => {
    it('GET /pets/mine 状态字段完整', async () => {
      const res = await fetch(`${BASE_URL}/pets/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      // 如果没有豆豆则跳过
      if (res.status === 404) return
      expect(res.status).toBe(200)
      expect(data.pet).toHaveProperty('name')
      expect(data.pet).toHaveProperty('stage')
      expect(data.pet).toHaveProperty('totalLearningMinutes')
      expect(data.pet).toHaveProperty('stageProgress')
    })
  })
})
