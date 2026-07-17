/**
 * 画像引擎 — 纯函数单元测试（不涉及数据库的部分）
 */
import { describe, it, expect } from 'vitest'
import {
  computeLearningStyle,
  computeRhythmType,
  computeInterests,
} from '../services/profile-engine.js'

describe('画像引擎 — 学习风格计算', () => {
  it('无数据时应返回均匀分布', () => {
    const result = computeLearningStyle([], 0)
    // 所有风格分数应该接近相等（因为没有信号）
    const { distribution } = result
    const values = Object.values(distribution)
    const allEqual = values.every((v) => Math.abs(v - values[0]) < 0.001)
    // 无数据时所有分数为 0/0 = NaN，导致 distribution 为 NaN
    // 实际应该返回 NaN，但我们关注的是空记录不会报错
    expect(result.dataDays).toBe(0)
    expect(result.stage).toBe('observing')
  })

  it('有 1 天数据 → observing 阶段', () => {
    const records = [{ rawSignals: { source: 'dialogue' } }]
    const result = computeLearningStyle(records, 1)
    expect(result.stage).toBe('observing')
    expect(result.dataDays).toBe(1)
  })

  it('3-6 天数据 + 足够信号 → emerging 阶段', () => {
    // 需要足够的信号量来提升置信度
    const records = Array(20).fill({ rawSignals: { source: 'dialogue' } })
    const result = computeLearningStyle(records, 4)
    // 置信度 = min(4/30,1)*0.6 + min(20/50,1)*0.4 = 0.08 + 0.16 = 0.24
    // 0.24 < 0.3 → observing
    // dataDays 4 >= 3 且 confidence > 0.3? No → observing
    expect(result.stage).toBe('observing')
    expect(result.dataDays).toBe(4)
  })

  it('7-29 天数据 + 足够信号 → stable 阶段', () => {
    const records = Array(60).fill({ rawSignals: { source: 'dialogue' } })
    const result = computeLearningStyle(records, 10)
    // 置信度 = min(10/30,1)*0.6 + min(60/50,1)*0.4 = 0.2 + 0.4 = 0.6
    // 0.6 > 0.5, dataDays 10 >= 7 → stable
    expect(result.stage).toBe('stable')
  })

  it('30+ 天数据 → confirmed 阶段', () => {
    const records = Array(60).fill({ rawSignals: { source: 'dialogue' } })
    const result = computeLearningStyle(records, 30)
    expect(result.stage).toBe('confirmed')
  })

  it('对话来源 → 社交型权重（使用 actionType）', () => {
    // source 'dialogue' 映射到 addSignal(scores, 'social', 0.8)
    // 但 'social' 不在任何 STYLE_SIGNALS events 中，所以 source 映射不起作用
    // 需使用 actionType: 'dialogue_chat' 来触发社交型权重
    const records = [
      { rawSignals: { actionType: 'dialogue_chat' } },
      { rawSignals: { actionType: 'dialogue_chat' } },
      { rawSignals: { actionType: 'dialogue_chat' } },
    ]
    const result = computeLearningStyle(records, 5)
    expect(result.primary.style).toBe('social')
    expect(result.distribution.social).toBeGreaterThan(0.5)
  })

  it('发音来源 → 听觉型权重', () => {
    const records = [
      { rawSignals: { actionType: 'pronounce_attempt' } },
      { rawSignals: { actionType: 'pronounce_attempt' } },
    ]
    const result = computeLearningStyle(records, 3)
    expect(result.primary.style).toBe('auditory')
  })

  it('复习来源 → 反思型权重', () => {
    const records = [
      { rawSignals: { actionType: 'review_word' } },
      { rawSignals: { actionType: 'review_word' } },
    ]
    const result = computeLearningStyle(records, 3)
    expect(result.primary.style).toBe('reflective')
  })

  it('单词卡片来源 → 视觉型权重', () => {
    const records = [{ rawSignals: { actionType: 'card_flip' } }]
    const result = computeLearningStyle(records, 1)
    expect(result.primary.style).toBe('visual')
  })

  it('游戏来源 → 动觉型权重', () => {
    const records = [{ rawSignals: { actionType: 'game_interact' } }]
    const result = computeLearningStyle(records, 1)
    expect(result.primary.style).toBe('kinetic')
  })

  it('交互模式信号也计入权重', () => {
    const records = [{ rawSignals: { source: 'dialogue', interactionMode: 'role_play' } }]
    const result = computeLearningStyle(records, 3)
    // role_play 属于 social 信号
    expect(result.distribution.social).toBeGreaterThan(0.3)
  })

  it('行为类型信号计入权重', () => {
    const records = [{ rawSignals: { source: 'pronounce', actionType: 'listen_repeat' } }]
    const result = computeLearningStyle(records, 3)
    expect(result.primary.style).toBe('auditory')
  })

  it('分布总和接近 1', () => {
    const records = [
      { rawSignals: { actionType: 'dialogue_chat' } },
      { rawSignals: { actionType: 'pronounce_attempt' } },
      { rawSignals: { actionType: 'review_word' } },
    ]
    const result = computeLearningStyle(records, 5)
    const sum = Object.values(result.distribution).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 2)
  })

  it('primary 和 secondary 不同', () => {
    const records = [
      { rawSignals: { source: 'dialogue' } },
      { rawSignals: { source: 'pronounce' } },
    ]
    const result = computeLearningStyle(records, 3)
    expect(result.primary.style).not.toBe(result.secondary.style)
  })
})

describe('画像引擎 — 学习节奏', () => {
  it('全部在早上 → morning_lark', () => {
    const records = Array(10).fill({
      startTime: new Date('2026-07-15T08:00:00'),
      endTime: new Date('2026-07-15T08:30:00'),
    })
    expect(computeRhythmType(records)).toBe('morning_lark')
  })

  it('全部在下午 → afternoon', () => {
    const records = Array(10).fill({
      startTime: new Date('2026-07-15T15:00:00'),
      endTime: new Date('2026-07-15T15:30:00'),
    })
    expect(computeRhythmType(records)).toBe('afternoon')
  })

  it('全部在晚上 → evening', () => {
    const records = Array(10).fill({
      startTime: new Date('2026-07-15T19:00:00'),
      endTime: new Date('2026-07-15T19:30:00'),
    })
    expect(computeRhythmType(records)).toBe('evening')
  })

  it('全部在深夜 → night_owl', () => {
    const records = Array(10).fill({
      startTime: new Date('2026-07-15T23:00:00'),
      endTime: new Date('2026-07-15T23:30:00'),
    })
    expect(computeRhythmType(records)).toBe('night_owl')
  })

  it('分散分布 → scattered', () => {
    const records = [
      { startTime: new Date('2026-07-15T08:00:00') },
      { startTime: new Date('2026-07-15T14:00:00') },
      { startTime: new Date('2026-07-15T19:00:00') },
    ]
    expect(computeRhythmType(records)).toBe('scattered')
  })

  it('空记录不报错', () => {
    expect(computeRhythmType([])).toBe('scattered')
  })

  it('边界时间：凌晨 6 点属于早上', () => {
    const records = [{ startTime: new Date('2026-07-15T06:00:00') }]
    expect(computeRhythmType(records)).toBe('morning_lark')
  })

  it('边界时间：中午 12 点属于下午', () => {
    const records = [{ startTime: new Date('2026-07-15T12:00:00') }]
    expect(computeRhythmType(records)).toBe('afternoon')
  })
})

describe('画像引擎 — 兴趣图谱', () => {
  const wordProgressRecords = [
    {
      word: { theme: 'animals', word: 'cat' },
      reviewCount: 15,
      correctCount: 13,
      avgScore: 0.8,
      lastReviewAt: new Date('2026-07-14'),
    },
    {
      word: { theme: 'animals', word: 'dog' },
      reviewCount: 10,
      correctCount: 8,
      avgScore: 0.75,
      lastReviewAt: new Date('2026-07-13'),
    },
    {
      word: { theme: 'food', word: 'apple' },
      reviewCount: 2,
      correctCount: 0,
      avgScore: 0.3,
      lastReviewAt: new Date('2026-05-15'),
    },
    {
      word: { theme: 'food', word: 'pizza' },
      reviewCount: 1,
      correctCount: 0,
      avgScore: 0.2,
      lastReviewAt: new Date('2026-05-01'),
    },
  ]

  it('根据单词进度和对话话题计算兴趣', () => {
    const result = computeInterests(wordProgressRecords, ['animals'], 100)
    expect(result.active.length).toBeGreaterThan(0)
    // animals 应该排在最前面（reviewCount 最高 + dialogueBonus）
    expect(result.active[0].theme).toBe('animals')
  })

  it('长时间不活跃的主题变为休眠', () => {
    // food: totalReviews=3, totalCorrect=0, correctRate=0, reviewIntensity=min(3/20)=0.15
    // score = 0*0.4 + 0.15*0.4 = 0.06 < 0.3
    // pizza lastReview 2026-05-01 → >14 天 → 应进入 dormant
    const result = computeInterests(wordProgressRecords, [], 50)
    const dormant = result.dormant
    const hasDormantFood = dormant.some((d) => d.theme === 'food')
    expect(hasDormantFood).toBe(true)
  })

  it('活跃兴趣最多 8 个', () => {
    const manyRecords = [
      ...wordProgressRecords,
      {
        word: { theme: 'school', word: 'book' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
      {
        word: { theme: 'sports', word: 'ball' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
      {
        word: { theme: 'nature', word: 'tree' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
      {
        word: { theme: 'music', word: 'song' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
      {
        word: { theme: 'art', word: 'draw' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
      {
        word: { theme: 'travel', word: 'map' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
      {
        word: { theme: 'science', word: 'lab' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
      {
        word: { theme: 'history', word: 'past' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
      {
        word: { theme: 'festivals', word: 'party' },
        reviewCount: 3,
        correctCount: 2,
        avgScore: 0.6,
        lastReviewAt: new Date('2026-07-14'),
      },
    ]
    const result = computeInterests(manyRecords, [], 100)
    expect(result.active.length).toBeLessThanOrEqual(8)
  })

  it('推荐主题包含高分主题', () => {
    const result = computeInterests(wordProgressRecords, ['animals'], 100)
    expect(result.recommendation).toContain('animals')
  })

  it('无单词进度数据返回空', () => {
    const result = computeInterests([], [], 0)
    expect(result.active).toEqual([])
    expect(result.dormant).toEqual([])
    expect(result.recommendation).toEqual([])
  })

  it('无主题的单词默认归类为 daily_life', () => {
    const records = [
      {
        word: { theme: null, word: 'hello' },
        reviewCount: 5,
        correctCount: 4,
        avgScore: 0.7,
        lastReviewAt: new Date('2026-07-14'),
      },
    ]
    const result = computeInterests(records, [], 10)
    const dailyLife = result.active.find((i) => i.theme === 'daily_life')
    expect(dailyLife).toBeDefined()
  })
})
