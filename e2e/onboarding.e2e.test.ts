/**
 * T7.1.1: Day0 入学全流程 E2E 测试
 *
 * 测试策略：验证入学流程的 API 调用链路和数据落库
 * 需要后端运行中（npm run dev:server）
 *
 * 流程：注册 → 登录 → 创建豆豆 → 获取单词列表 → 完成首次学习 → 查看反馈
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let childToken = ''
let childUserId = ''

describe('Day0 入学全流程 E2E', () => {
  // ============================================================
  // Step 1: 注册子账号
  // ============================================================
  describe('Step 1: 注册子账号', () => {
    it('POST /auth/register 创建 child 用户', async () => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `1380000${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          name: '测试小朋友',
          password: 'testpass',
          role: 'child',
          grade: 3,
          ageSegment: 'mid',
        }),
      })
      const data = await res.json()
      expect([200, 201].includes(res.status)).toBe(true)
      expect(data.token).toBeTruthy()
      expect(data.user.role).toBe('child')
      childToken = data.token
      childUserId = data.user.id
    })
  })

  // ============================================================
  // Step 2: 验证 JWT
  // ============================================================
  describe('Step 2: JWT 认证验证', () => {
    it('GET /auth/me 返回用户信息', async () => {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.user.id).toBe(childUserId)
      expect(data.user.role).toBe('child')
    })

    it('无 token 返回 401', async () => {
      const res = await fetch(`${BASE_URL}/auth/me`)
      expect(res.status).toBe(401)
    })
  })

  // ============================================================
  // Step 3: 创建豆豆（宠物）
  // ============================================================
  describe('Step 3: 创建豆豆', () => {
    it('GET /pets/mine 首次应自动创建蛋', async () => {
      const res = await fetch(`${BASE_URL}/pets/mine`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect([200, 201].includes(res.status)).toBe(true)
      expect(data.pet.stage).toBe('seed')
      expect(data.pet.name).toBeTruthy()
    })
  })

  // ============================================================
  // Step 4: 获取单词列表
  // ============================================================
  describe('Step 4: 获取单词列表', () => {
    it('GET /words 返回年级匹配的单词', async () => {
      const res = await fetch(`${BASE_URL}/words?grade=3`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.items.length).toBeGreaterThan(0)
      // 验证单词结构
      const word = data.items[0]
      expect(word.word).toBeTruthy()
      expect(word.gradeLevel).toBe(3)
    })
  })

  // ============================================================
  // Step 5: 完成首次学习记录
  // ============================================================
  describe('Step 5: 完成首次学习', () => {
    it('POST /learning/session/start 创建学习记录', async () => {
      const res = await fetch(`${BASE_URL}/learning/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${childToken}`,
        },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.session).toBeTruthy()
      expect(data.session.effectiveMinutes).toBe(0)
    })
  })

  // ============================================================
  // Step 6: 验证情感引擎
  // ============================================================
  describe('Step 6: 情感引擎响应', () => {
    it('GET /emotion/current 返回情感状态', async () => {
      const res = await fetch(`${BASE_URL}/emotion/current`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.emotion).toBeDefined()
      expect(data.gradient).toBeDefined()
    })
  })

  // ============================================================
  // Step 7: 连胜打卡
  // ============================================================
  describe('Step 7: 连胜打卡', () => {
    it('POST /streak/checkin 签到成功', async () => {
      const res = await fetch(`${BASE_URL}/streak/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${childToken}`,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.currentStreak).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================
  // Step 8: 端到端一致性校验
  // ============================================================
  describe('Step 8: 端到端一致性', () => {
    it('GET /learning/progress 返回学习进度', async () => {
      const res = await fetch(`${BASE_URL}/learning/progress`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.summary).toBeDefined()
    })

    it('GET /profile/full 返回完整画像（含置信度）', async () => {
      const res = await fetch(`${BASE_URL}/profile/full`, {
        headers: { Authorization: `Bearer ${childToken}` },
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.learningStyle).toBeDefined()
      expect(data.interests).toBeDefined()
    })
  })
})
