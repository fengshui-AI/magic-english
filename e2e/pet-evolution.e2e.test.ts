/**
 * 豆豆成长 E2E 测试
 *
 * 流程：创建豆豆 → 喂养升级 → 进化 → 状态一致性验证
 * 需要后端运行中
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let token = ''
let petId = ''

beforeAll(async () => {
  const phone = `1380002${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name: '豆豆成长测试', role: 'child', grade: 3, ageSegment: 'mid' }),
  })
  const regData = await regRes.json()
  token = regData.token
})

describe('豆豆成长 E2E', () => {
  // ============================================================
  // 豆豆初始化
  // ============================================================
  describe('豆豆初始化', () => {
    it('GET /pets/mine 首次访问自动创建种子期豆豆', async () => {
      const res = await fetch(`${BASE_URL}/pets/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.pet).toBeDefined()
      expect(data.pet.stage).toBe('seed')
      expect(data.pet.name).toBeTruthy()
      expect(data.pet.stageProgress).toBeGreaterThanOrEqual(0)
      expect(data.pet.totalLearningMinutes).toBeGreaterThanOrEqual(0)
      petId = data.pet.id
    })

    it('GET /pets/mine 需要认证', async () => {
      const res = await fetch(`${BASE_URL}/pets/mine`)
      expect(res.status).toBe(401)
    })
  })

  // ============================================================
  // 喂养升级
  // ============================================================
  describe('喂养升级', () => {
    it('PATCH /pets/:id 更新学习时长', async () => {
      const res = await fetch(`${BASE_URL}/pets/${petId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ totalLearningMinutes: 50, stageProgress: 20 }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.pet.totalLearningMinutes).toBe(50)
      expect(data.pet.stageProgress).toBe(20)
    })

    it('PATCH /pets/:id 升级阶段到 sprout', async () => {
      const res = await fetch(`${BASE_URL}/pets/${petId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage: 'sprout', stageProgress: 0 }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.pet.stage).toBe('sprout')
    })

    it('PATCH /pets/:id 拒绝无效阶段名', async () => {
      const res = await fetch(`${BASE_URL}/pets/${petId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage: 'invalid_stage' }),
      })
      expect(res.status).toBe(400)
    })
  })

  // ============================================================
  // 状态一致性
  // ============================================================
  describe('状态一致性', () => {
    it('GET /pets/mine 所有必要字段完整', async () => {
      const res = await fetch(`${BASE_URL}/pets/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.pet).toHaveProperty('id')
      expect(data.pet).toHaveProperty('name')
      expect(data.pet).toHaveProperty('stage')
      expect(data.pet).toHaveProperty('stageProgress')
      expect(data.pet).toHaveProperty('totalLearningMinutes')
      expect(data.pet).toHaveProperty('createdAt')
      // 确认我们的更新已持久化
      expect(data.pet.stage).toBe('sprout')
      expect(data.pet.totalLearningMinutes).toBe(50)
    })
  })
})
