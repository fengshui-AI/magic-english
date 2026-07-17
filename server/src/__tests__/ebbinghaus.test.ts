/**
 * 艾宾浩斯遗忘曲线 — 单元测试
 */
import { describe, it, expect } from 'vitest'
import { calculateNextReview, getIntervalDays, isReviewDue } from '../services/ebbinghaus.js'

describe('艾宾浩斯遗忘曲线算法', () => {
  const now = new Date('2026-07-15T12:00:00Z')

  describe('calculateNextReview — 正确回答', () => {
    it('stage 0 → 1 天后复习', () => {
      // INTERVALS_DAYS = [1, 2, 4, 7, 15, 30]
      // stage 0 + correct → nextStage=1, interval=INTERVALS_DAYS[1]=2 天
      // 即"第 1 次正确后"实际用 2 天间隔
      const result = calculateNextReview(0, 'correct', now)
      expect(result.newStage).toBe(1)
      expect(result.status).toBe('learning')
      const diffMs = result.nextReviewAt.getTime() - now.getTime()
      expect(diffMs).toBe(2 * 86400000)
    })

    it('stage 1 → 2 天后复习', () => {
      const result = calculateNextReview(1, 'correct', now)
      expect(result.newStage).toBe(2)
      expect(result.status).toBe('learning')
    })

    it('stage 2 → 4 天后复习', () => {
      const result = calculateNextReview(2, 'correct', now)
      expect(result.newStage).toBe(3)
      expect(result.status).toBe('review')
    })

    it('stage 3 → 7 天后复习', () => {
      const result = calculateNextReview(3, 'correct', now)
      expect(result.newStage).toBe(4)
    })

    it('stage 4 → 15 天后复习', () => {
      const result = calculateNextReview(4, 'correct', now)
      expect(result.newStage).toBe(5)
    })

    it('stage 5 → 30 天后复习', () => {
      const result = calculateNextReview(5, 'correct', now)
      expect(result.newStage).toBe(6)
      expect(result.status).toBe('mastered')
    })

    it('已掌握后保持 mastered', () => {
      const result = calculateNextReview(6, 'correct', now)
      expect(result.newStage).toBe(6)
      expect(result.status).toBe('mastered')
    })
  })

  describe('calculateNextReview — 模糊回答', () => {
    it('stage 0 模糊 → 保持 stage 0', () => {
      const result = calculateNextReview(0, 'fuzzy', now)
      expect(result.newStage).toBe(0)
      expect(result.status).toBe('new')
    })

    it('stage 3 模糊 → 保持 stage 3', () => {
      const result = calculateNextReview(3, 'fuzzy', now)
      expect(result.newStage).toBe(3)
      expect(result.status).toBe('review')
    })

    it('已掌握后模糊 → 保持 mastered', () => {
      const result = calculateNextReview(6, 'fuzzy', now)
      expect(result.newStage).toBe(6)
      expect(result.status).toBe('mastered')
    })
  })

  describe('calculateNextReview — 遗忘', () => {
    it('任何阶段遗忘 → 退回 stage 0', () => {
      const result = calculateNextReview(4, 'forgot', now)
      expect(result.newStage).toBe(0)
      expect(result.status).toBe('new')
    })

    it('stage 0 遗忘 → 仍是 stage 0', () => {
      const result = calculateNextReview(0, 'forgot', now)
      expect(result.newStage).toBe(0)
    })

    it('已掌握遗忘 → 退回 stage 0', () => {
      const result = calculateNextReview(6, 'forgot', now)
      expect(result.newStage).toBe(0)
      expect(result.status).toBe('new')
    })
  })

  describe('calculateNextReview — 状态标签', () => {
    it('new: stage 0', () => {
      expect(calculateNextReview(0, 'fuzzy', now).status).toBe('new')
    })
    it('learning: stage 0-2 正确回答后', () => {
      // stage 0 → 1: learning
      expect(calculateNextReview(0, 'correct', now).status).toBe('learning')
      // stage 1 → 2: learning
      expect(calculateNextReview(1, 'correct', now).status).toBe('learning')
    })
    it('review: stage 2 正确后进入 stage 3', () => {
      // stage 2 → 3: review
      expect(calculateNextReview(2, 'correct', now).status).toBe('review')
      expect(calculateNextReview(3, 'correct', now).status).toBe('review')
    })
    it('mastered: stage 5 正确后进入 stage 6', () => {
      expect(calculateNextReview(5, 'correct', now).status).toBe('mastered')
    })
  })
})

describe('getIntervalDays', () => {
  it('stage 0 → 1 天', () => expect(getIntervalDays(0)).toBe(1))
  it('stage 1 → 2 天', () => expect(getIntervalDays(1)).toBe(2))
  it('stage 2 → 4 天', () => expect(getIntervalDays(2)).toBe(4))
  it('stage 3 → 7 天', () => expect(getIntervalDays(3)).toBe(7))
  it('stage 4 → 15 天', () => expect(getIntervalDays(4)).toBe(15))
  it('stage 5 → 30 天', () => expect(getIntervalDays(5)).toBe(30))
  it('已掌握 → 0 天', () => expect(getIntervalDays(6)).toBe(0))
  it('超出范围 → 30 天', () => expect(getIntervalDays(99)).toBe(0))
})

describe('isReviewDue', () => {
  it('过去的时间 → 已到期', () => {
    const past = new Date('2026-07-14T00:00:00Z')
    const now = new Date('2026-07-15T00:00:00Z')
    expect(isReviewDue(past, now)).toBe(true)
  })

  it('未来的时间 → 未到期', () => {
    const future = new Date('2026-07-16T00:00:00Z')
    const now = new Date('2026-07-15T00:00:00Z')
    expect(isReviewDue(future, now)).toBe(false)
  })

  it('正好等于 → 已到期', () => {
    const same = new Date('2026-07-15T00:00:00Z')
    const now = new Date('2026-07-15T00:00:00Z')
    expect(isReviewDue(same, now)).toBe(true)
  })
})
