/**
 * 情感引擎 — 单元测试
 */
import { describe, it, expect } from 'vitest'
import {
  applyEmotionEvent,
  decayEmotion,
  getGradient,
  generateDodoResponse,
  DEFAULT_EMOTION,
  type EmotionVector,
  type EmotionEvent,
} from '../services/emotion-engine.js'

describe('情感引擎 — 事件应用', () => {
  it('correct_answer 提升愉悦度和专注度', () => {
    const result = applyEmotionEvent(DEFAULT_EMOTION, { type: 'correct_answer', intensity: 1 })
    expect(result.pleasure).toBeGreaterThan(DEFAULT_EMOTION.pleasure)
    expect(result.focusMatch).toBeGreaterThan(DEFAULT_EMOTION.focusMatch)
    expect(result.pleasure).toBeCloseTo(0.68, 1)
  })

  it('wrong_answer 降低愉悦度但提升唤醒度', () => {
    const result = applyEmotionEvent(DEFAULT_EMOTION, { type: 'wrong_answer', intensity: 1 })
    expect(result.pleasure).toBeLessThan(DEFAULT_EMOTION.pleasure)
    expect(result.arousal).toBeGreaterThan(DEFAULT_EMOTION.arousal)
  })

  it('perfect_score 大幅提升所有维度', () => {
    const result = applyEmotionEvent(DEFAULT_EMOTION, { type: 'perfect_score', intensity: 1 })
    expect(result.pleasure).toBeCloseTo(0.75, 1)
    expect(result.arousal).toBeCloseTo(0.56, 1)
    expect(result.closeness).toBeCloseTo(0.23, 1)
  })

  it('streak_lost 大幅降低愉悦度', () => {
    const result = applyEmotionEvent(
      { pleasure: 0.7, arousal: 0.6, closeness: 0.5, focusMatch: 0.5 },
      { type: 'streak_lost', intensity: 1 },
    )
    expect(result.pleasure).toBeLessThan(0.7)
    expect(result.closeness).toBeLessThan(0.5)
  })

  it('freeze_used 降低愉悦但提升亲密度', () => {
    const result = applyEmotionEvent(DEFAULT_EMOTION, { type: 'freeze_used', intensity: 1 })
    expect(result.closeness).toBeGreaterThan(DEFAULT_EMOTION.closeness)
  })

  it('level_up 大幅提升所有维度', () => {
    const result = applyEmotionEvent(DEFAULT_EMOTION, { type: 'level_up', intensity: 1 })
    expect(result.pleasure).toBeCloseTo(0.75, 1)
    expect(result.arousal).toBeCloseTo(0.65, 1)
    expect(result.closeness).toBeCloseTo(0.25, 1)
  })

  it('intensity=0.5 时 delta 减半', () => {
    const fullIntensity = applyEmotionEvent(DEFAULT_EMOTION, {
      type: 'correct_answer',
      intensity: 1,
    })
    const halfIntensity = applyEmotionEvent(DEFAULT_EMOTION, {
      type: 'correct_answer',
      intensity: 0.5,
    })

    const fullDelta = fullIntensity.pleasure - DEFAULT_EMOTION.pleasure
    const halfDelta = halfIntensity.pleasure - DEFAULT_EMOTION.pleasure
    expect(halfDelta).toBeCloseTo(fullDelta / 2, 2)
  })

  it('未知事件类型不改变情感', () => {
    const result = applyEmotionEvent(DEFAULT_EMOTION, { type: 'unknown_event' as any })
    expect(result).toEqual(DEFAULT_EMOTION)
  })
})

describe('情感引擎 — 边界值', () => {
  it('所有维度不超过 1', () => {
    const highEmotion: EmotionVector = {
      pleasure: 0.99,
      arousal: 0.99,
      closeness: 0.99,
      focusMatch: 0.99,
    }
    const result = applyEmotionEvent(highEmotion, { type: 'perfect_score', intensity: 1 })
    expect(result.pleasure).toBeLessThanOrEqual(1)
    expect(result.arousal).toBeLessThanOrEqual(1)
    expect(result.closeness).toBeLessThanOrEqual(1)
    expect(result.focusMatch).toBeLessThanOrEqual(1)
  })

  it('所有维度不低于 0', () => {
    const lowEmotion: EmotionVector = {
      pleasure: 0.01,
      arousal: 0.01,
      closeness: 0.01,
      focusMatch: 0.01,
    }
    const result = applyEmotionEvent(lowEmotion, { type: 'streak_lost', intensity: 1 })
    expect(result.pleasure).toBeGreaterThanOrEqual(0)
    expect(result.arousal).toBeGreaterThanOrEqual(0)
    expect(result.closeness).toBeGreaterThanOrEqual(0)
    expect(result.focusMatch).toBeGreaterThanOrEqual(0)
  })
})

describe('情感引擎 — 自然衰减', () => {
  it('长时间不操作后愉悦度向 0.5 回归', () => {
    const highPleasure: EmotionVector = {
      pleasure: 0.9,
      arousal: 0.7,
      closeness: 0.5,
      focusMatch: 0.8,
    }
    const result = decayEmotion(highPleasure, 60) // 60 分钟
    expect(result.pleasure).toBeLessThan(0.9)
    expect(result.focusMatch).toBeLessThan(0.8)
  })

  it('低愉悦度向 0.5 回升', () => {
    const lowPleasure: EmotionVector = {
      pleasure: 0.2,
      arousal: 0.3,
      closeness: 0.5,
      focusMatch: 0.1,
    }
    const result = decayEmotion(lowPleasure, 120)
    expect(result.pleasure).toBeGreaterThan(0.2)
    expect(result.focusMatch).toBeGreaterThan(0.1)
  })

  it('亲密度不衰减', () => {
    const emotion: EmotionVector = { pleasure: 0.8, arousal: 0.5, closeness: 0.7, focusMatch: 0.5 }
    const result = decayEmotion(emotion, 120)
    expect(result.closeness).toBe(0.7)
  })

  it('衰减速率：60 分钟约衰减 0.12', () => {
    const high: EmotionVector = { pleasure: 0.9, arousal: 0.9, closeness: 0.5, focusMatch: 0.9 }
    const result = decayEmotion(high, 60)
    // 60 * 0.002 = 0.12
    expect(result.pleasure).toBeCloseTo(0.78, 0)
  })
})

describe('陪伴梯度', () => {
  it('0 分钟 → 初识', () => {
    expect(getGradient(0).level).toBe(0)
    expect(getGradient(0).name).toBe('初识')
  })

  it('99 分钟 → 初识', () => {
    expect(getGradient(99).level).toBe(0)
  })

  it('100 分钟 → 朋友', () => {
    expect(getGradient(100).level).toBe(1)
    expect(getGradient(100).name).toBe('朋友')
  })

  it('299 分钟 → 朋友', () => {
    expect(getGradient(299).level).toBe(1)
  })

  it('300 分钟 → 密友', () => {
    expect(getGradient(300).level).toBe(2)
  })

  it('599 分钟 → 密友', () => {
    expect(getGradient(599).level).toBe(2)
  })

  it('600 分钟 → 最佳拍档', () => {
    expect(getGradient(600).level).toBe(3)
    expect(getGradient(600).name).toBe('最佳拍档')
  })

  it('1000 分钟 → 最佳拍档', () => {
    expect(getGradient(1000).level).toBe(3)
  })
})

describe('豆豆情感响应', () => {
  it('高愉悦高唤醒 → 超开心', () => {
    const emotion: EmotionVector = { pleasure: 0.9, arousal: 0.8, closeness: 0.5, focusMatch: 0.5 }
    const gradient = getGradient(0)
    const response = generateDodoResponse(emotion, gradient)
    expect(response.moodLabel).toBe('超开心')
    expect(response.animation).toBe('bounce')
  })

  it('高愉悦低唤醒 → 开心', () => {
    const emotion: EmotionVector = { pleasure: 0.75, arousal: 0.4, closeness: 0.5, focusMatch: 0.5 }
    const gradient = getGradient(0)
    const response = generateDodoResponse(emotion, gradient)
    expect(response.moodLabel).toBe('开心')
    expect(response.animation).toBe('sway')
  })

  it('中等愉悦 → 平静', () => {
    const emotion: EmotionVector = { pleasure: 0.55, arousal: 0.5, closeness: 0.5, focusMatch: 0.5 }
    const gradient = getGradient(0)
    const response = generateDodoResponse(emotion, gradient)
    expect(response.moodLabel).toBe('平静')
  })

  it('低愉悦低唤醒 → 困倦', () => {
    const emotion: EmotionVector = { pleasure: 0.2, arousal: 0.2, closeness: 0.5, focusMatch: 0.5 }
    const gradient = getGradient(0)
    const response = generateDodoResponse(emotion, gradient)
    expect(response.moodLabel).toBe('困倦')
    expect(response.animation).toBe('idle')
  })

  it('低愉悦中等唤醒 → 低落', () => {
    const emotion: EmotionVector = { pleasure: 0.2, arousal: 0.5, closeness: 0.5, focusMatch: 0.5 }
    const gradient = getGradient(0)
    const response = generateDodoResponse(emotion, gradient)
    expect(response.moodLabel).toBe('低落')
  })

  it('高专注 → focus 动画', () => {
    const emotion: EmotionVector = { pleasure: 0.5, arousal: 0.5, closeness: 0.5, focusMatch: 0.8 }
    const gradient = getGradient(0)
    const response = generateDodoResponse(emotion, gradient)
    expect(response.animation).toBe('focus')
  })

  it('高亲密度 → cuddle 动画', () => {
    const emotion: EmotionVector = { pleasure: 0.5, arousal: 0.5, closeness: 0.8, focusMatch: 0.3 }
    const gradient = getGradient(0)
    const response = generateDodoResponse(emotion, gradient)
    expect(response.animation).toBe('cuddle')
  })

  it('密友以上 gradientAware=true', () => {
    const emotion: EmotionVector = { pleasure: 0.6, arousal: 0.5, closeness: 0.5, focusMatch: 0.5 }
    const gradient = getGradient(600) // 最佳拍档
    const response = generateDodoResponse(emotion, gradient)
    expect(response.gradientAware).toBe(true)
  })

  it('朋友以下 gradientAware=false', () => {
    const emotion: EmotionVector = { pleasure: 0.6, arousal: 0.5, closeness: 0.5, focusMatch: 0.5 }
    const gradient = getGradient(50) // 初识
    const response = generateDodoResponse(emotion, gradient)
    expect(response.gradientAware).toBe(false)
  })
})

describe('DEFAULT_EMOTION', () => {
  it('默认情感向量各维度在 0-1 之间', () => {
    expect(DEFAULT_EMOTION.pleasure).toBe(0.6)
    expect(DEFAULT_EMOTION.arousal).toBe(0.5)
    expect(DEFAULT_EMOTION.closeness).toBe(0.2)
    expect(DEFAULT_EMOTION.focusMatch).toBe(0.5)
  })
})
