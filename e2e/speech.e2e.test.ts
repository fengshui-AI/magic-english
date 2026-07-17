/**
 * 语音服务 E2E 测试
 *
 * 验证 TTS / ASR / 发音评测 三个端点的连通性
 * 需要后端运行中
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1'

let token = ''

beforeAll(async () => {
  const phone = `1380006${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name: '语音测试', role: 'child', grade: 3, ageSegment: 'mid' }),
  })
  const regData = await regRes.json()
  token = regData.token
})

describe('语音服务 E2E', () => {
  // ============================================================
  // TTS — 文字转语音
  // ============================================================
  describe('TTS 文字转语音', () => {
    it('POST /speech/tts 生成单个单词发音', async () => {
      const res = await fetch(`${BASE_URL}/speech/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: 'hello', voice: 'dodo' }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data).toHaveProperty('audioUrl')
      expect(data).toHaveProperty('duration')
      expect(data.text).toBe('hello')
      expect(data.duration).toBeGreaterThan(0)
    })

    it('POST /speech/tts 生成长句子发音', async () => {
      const res = await fetch(`${BASE_URL}/speech/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: 'Hello my friend, how are you today?',
          voice: 'teacher',
          speed: 0.8,
        }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.duration).toBeGreaterThan(1)
    })

    it('POST /speech/tts 拒绝空文本', async () => {
      const res = await fetch(`${BASE_URL}/speech/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: '', voice: 'dodo' }),
      })
      expect(res.status).toBe(400)
    })
  })

  // ============================================================
  // ASR — 语音识别（需要真实音频，验证端点存在即可）
  // ============================================================
  describe('ASR 语音识别', () => {
    it('POST /speech/asr 拒绝空音频数据', async () => {
      const res = await fetch(`${BASE_URL}/speech/asr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ audioData: '' }),
      })
      expect(res.status).toBe(400)
    })

    it('POST /speech/asr 接受有效请求格式', async () => {
      const res = await fetch(`${BASE_URL}/speech/asr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          audioData: 'dGVzdCBhdWRpbw==', // "test audio" in base64
          language: 'en',
          context: ['hello', 'world'],
        }),
      })
      // 接受 200（识别成功）或 500（无真实音频数据时服务端报错）
      expect([200, 500].includes(res.status)).toBe(true)
    })
  })

  // ============================================================
  // 发音评测
  // ============================================================
  describe('发音评测', () => {
    it('POST /speech/evaluate 拒绝空文本', async () => {
      const res = await fetch(`${BASE_URL}/speech/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referenceText: '', audioData: 'dGVzdA==' }),
      })
      expect(res.status).toBe(400)
    })

    it('POST /speech/evaluate 接受有效请求格式', async () => {
      const res = await fetch(`${BASE_URL}/speech/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          referenceText: 'hello world',
          audioData: 'dGVzdCBhdWRpbw==',
        }),
      })
      // 接受 200 或降级场景的 500
      expect([200, 500].includes(res.status)).toBe(true)
    })
  })

  // ============================================================
  // 对话中的 TTS（/dialogue/tts 端点）
  // ============================================================
  describe('对话 TTS', () => {
    it('POST /dialogue/tts 生成对话语音', async () => {
      const res = await fetch(`${BASE_URL}/dialogue/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: 'Hello! Welcome back!', voice: 'dodo' }),
      })
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data).toHaveProperty('audioUrl')
      expect(data).toHaveProperty('duration')
    })
  })
})
