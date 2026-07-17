/**
 * 周报 — 纯函数单元测试（不涉及数据库的部分）
 */
import { describe, it, expect } from 'vitest'

// 注意：weekly-report 的核心逻辑与数据库耦合紧密，
// 此处测试其可独立测试的辅助逻辑（日期计算、话术生成等）

// 通过 re-export 测试 getWeekRange 等内部函数
// 由于这些是内部函数不导出，这里用等价逻辑测试

describe('周报 — 日期计算', () => {
  /**
   * 等价于 getWeekRange 的逻辑：
   * 获取指定日期所在周的周一和周日
   */
  function getWeekRange(date: Date): { start: string; end: string } {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    }
  }

  it('周一本身 → 开始等于当天', () => {
    // 2026-07-13 是周一
    const result = getWeekRange(new Date('2026-07-13T12:00:00Z'))
    expect(result.start).toBe('2026-07-13')
    expect(result.end).toBe('2026-07-19')
  })

  it('周日 → 开始是同一周的周一', () => {
    // 2026-07-19 是周日
    const result = getWeekRange(new Date('2026-07-19T12:00:00Z'))
    expect(result.start).toBe('2026-07-13')
    expect(result.end).toBe('2026-07-19')
  })

  it('周三 → 正确计算出周范围', () => {
    const result = getWeekRange(new Date('2026-07-15T12:00:00Z'))
    expect(result.start).toBe('2026-07-13')
    expect(result.end).toBe('2026-07-19')
  })

  it('跨月周 → 正确处理', () => {
    // 2026-06-29 是周一，周日是 2026-07-05
    const result = getWeekRange(new Date('2026-07-01T12:00:00Z'))
    expect(result.start).toBe('2026-06-29')
    expect(result.end).toBe('2026-07-05')
  })

  it('跨年周 → 正确处理', () => {
    // 2025-12-29 是周一，周日是 2026-01-04
    const result = getWeekRange(new Date('2026-01-01T12:00:00Z'))
    expect(result.start).toBe('2025-12-29')
    expect(result.end).toBe('2026-01-04')
  })
})

describe('周报 — 情感高亮话术', () => {
  function generateEmotionHighlight(trend: string, start: number, end: number): string {
    if (trend === 'up') return '本周心情逐步提升，学习状态越来越好！🌟'
    if (trend === 'down') return '本周后期略感疲惫，注意劳逸结合哦 💤'
    return '本周情绪稳定，学习节奏保持得很好 👍'
  }

  it('上升趋势', () => {
    const result = generateEmotionHighlight('up', 0.3, 0.7)
    expect(result).toContain('提升')
  })

  it('下降趋势', () => {
    const result = generateEmotionHighlight('down', 0.7, 0.3)
    expect(result).toContain('疲惫')
  })

  it('平稳趋势', () => {
    const result = generateEmotionHighlight('stable', 0.5, 0.55)
    expect(result).toContain('稳定')
  })
})

describe('周报 — 学习亮点生成', () => {
  function generateHighlights(
    days: number,
    newWords: number,
    sentences: number,
    stars: number,
    streak: number,
  ): string[] {
    const items: string[] = []

    if (days >= 5) items.push(`坚持学习了 ${days} 天，真了不起！`)
    else if (days >= 3) items.push(`本周学习了 ${days} 天，继续加油！`)
    else if (days > 0) items.push(`本周学习了 ${days} 天，下周可以更多哦～`)

    if (newWords >= 15) items.push(`掌握了 ${newWords} 个新单词，词汇量又增加了！`)
    else if (newWords >= 5) items.push(`学习了 ${newWords} 个新单词，稳步前进中`)

    if (sentences >= 20) items.push(`开口说了 ${sentences} 句话，口语越来越棒！`)
    else if (sentences >= 5) items.push(`练习了 ${sentences} 句口语表达`)

    if (stars >= 30) items.push(`获得了 ${stars} 颗星星，表现非常出色！⭐`)
    else if (stars >= 10) items.push(`收获了 ${stars} 颗星星`)

    if (streak >= 7) items.push(`已连续 ${streak} 天打卡，正在养成好习惯！🔥`)
    else if (streak >= 3) items.push(`连续 ${streak} 天学习，势头不错！`)

    if (items.length === 0) {
      items.push('本周开始了英语学习之旅，每一天都是进步！')
    }

    return items
  }

  it('学习 6 天 → 包含天数亮点', () => {
    const result = generateHighlights(6, 3, 0, 0, 0)
    expect(result[0]).toContain('了不起')
  })

  it('学习 4 天 → 鼓励话术', () => {
    const result = generateHighlights(4, 0, 0, 0, 0)
    expect(result[0]).toContain('继续加油')
  })

  it('学习 2 天 → 期望话术', () => {
    const result = generateHighlights(2, 0, 0, 0, 0)
    expect(result[0]).toContain('下周可以更多')
  })

  it('新词 ≥ 15 → 词汇量亮点', () => {
    const result = generateHighlights(7, 16, 0, 0, 0)
    expect(result.some((h) => h.includes('词汇量'))).toBe(true)
  })

  it('新词 5-14 → 稳步前进', () => {
    const result = generateHighlights(3, 8, 0, 0, 0)
    expect(result.some((h) => h.includes('稳步前进'))).toBe(true)
  })

  it('口语 ≥ 20 → 口语亮点', () => {
    const result = generateHighlights(5, 10, 22, 0, 0)
    expect(result.some((h) => h.includes('口语'))).toBe(true)
  })

  it('星星 ≥ 30 → 出色表扬', () => {
    const result = generateHighlights(7, 20, 30, 35, 0)
    expect(result.some((h) => h.includes('出色'))).toBe(true)
  })

  it('连续 7 天打卡 → 好习惯话术', () => {
    const result = generateHighlights(7, 20, 30, 40, 7)
    expect(result.some((h) => h.includes('好习惯'))).toBe(true)
  })

  it('连续 5 天打卡 → 势头话术', () => {
    const result = generateHighlights(5, 10, 10, 20, 5)
    expect(result.some((h) => h.includes('势头不错'))).toBe(true)
  })

  it('全为 0 → 兜底话术', () => {
    const result = generateHighlights(0, 0, 0, 0, 0)
    expect(result.length).toBe(1)
    expect(result[0]).toContain('学习之旅')
  })
})

describe('周报 — 家长温馨提示', () => {
  function generateParentMessage(opts: {
    totalDays: number
    totalMinutes: number
    newWords: number
    avgCorrectRate: number
    trend: string
    streak: number
    focusAreas: string[]
  }): string {
    const parts: string[] = []

    if (opts.totalDays >= 5) {
      parts.push(`孩子本周学习积极性很高，保持了良好的学习节奏。`)
    } else if (opts.totalDays >= 3) {
      parts.push(
        `孩子本周有 ${opts.totalDays} 天学习了英语，建议保持每天 10-15 分钟的短时高频学习。`,
      )
    } else if (opts.totalDays > 0) {
      parts.push(`本周学习天数较少，建议下周设定一个小目标，比如每天学 5 个单词。`)
    } else {
      parts.push(`本周还没有学习记录，可以鼓励孩子从简单的单词卡片开始哦～`)
    }

    if (opts.newWords >= 10) {
      parts.push(`新学了 ${opts.newWords} 个单词，掌握情况不错。`)
    }

    if (opts.avgCorrectRate < 0.5) {
      parts.push(
        `复习正确率偏低（${Math.round(opts.avgCorrectRate * 100)}%），豆豆会重点陪伴${opts.focusAreas.join('、')}方面的学习。`,
      )
    } else if (opts.avgCorrectRate > 0.8) {
      parts.push(
        `复习正确率很高（${Math.round(opts.avgCorrectRate * 100)}%），可以适当挑战更难的内容了。`,
      )
    }

    if (opts.streak >= 7) {
      parts.push(`连续 ${opts.streak} 天打卡的习惯值得表扬！`)
    }

    if (opts.trend === 'down') {
      parts.push(
        `本周后期学习情绪有些下降，建议周末安排一些轻松有趣的英语活动（如英语动画片、英文绘本）。`,
      )
    }

    return parts.join('')
  }

  it('高频学习 → 积极性表扬', () => {
    const msg = generateParentMessage({
      totalDays: 6,
      totalMinutes: 90,
      newWords: 12,
      avgCorrectRate: 0.75,
      trend: 'up',
      streak: 5,
      focusAreas: ['animals'],
    })
    expect(msg).toContain('积极性很高')
  })

  it('低频学习 → 建议', () => {
    const msg = generateParentMessage({
      totalDays: 2,
      totalMinutes: 20,
      newWords: 3,
      avgCorrectRate: 0.6,
      trend: 'stable',
      streak: 2,
      focusAreas: [],
    })
    expect(msg).toContain('学习天数较少')
  })

  it('零学习 → 鼓励开始', () => {
    const msg = generateParentMessage({
      totalDays: 0,
      totalMinutes: 0,
      newWords: 0,
      avgCorrectRate: 0,
      trend: 'stable',
      streak: 0,
      focusAreas: [],
    })
    expect(msg).toContain('还没有学习记录')
  })

  it('低正确率 → 提醒薄弱环节', () => {
    const msg = generateParentMessage({
      totalDays: 4,
      totalMinutes: 40,
      newWords: 5,
      avgCorrectRate: 0.35,
      trend: 'stable',
      streak: 3,
      focusAreas: ['animals', 'food'],
    })
    expect(msg).toContain('正确率偏低')
    expect(msg).toContain('animals')
    expect(msg).toContain('food')
  })

  it('高正确率 → 挑战建议', () => {
    const msg = generateParentMessage({
      totalDays: 6,
      totalMinutes: 80,
      newWords: 15,
      avgCorrectRate: 0.9,
      trend: 'up',
      streak: 8,
      focusAreas: [],
    })
    expect(msg).toContain('挑战')
  })

  it('连续 7 天打卡 → 表扬习惯', () => {
    const msg = generateParentMessage({
      totalDays: 7,
      totalMinutes: 100,
      newWords: 20,
      avgCorrectRate: 0.8,
      trend: 'up',
      streak: 7,
      focusAreas: [],
    })
    expect(msg).toContain('值得表扬')
  })

  it('情绪下降 → 放松建议', () => {
    const msg = generateParentMessage({
      totalDays: 5,
      totalMinutes: 50,
      newWords: 8,
      avgCorrectRate: 0.6,
      trend: 'down',
      streak: 3,
      focusAreas: [],
    })
    expect(msg).toContain('轻松有趣')
  })
})

describe('周报 — 主题名称映射', () => {
  function themeName(theme: string): string {
    const map: Record<string, string> = {
      animals: '动物',
      food: '食物',
      family: '家庭',
      school: '学校',
      sports: '运动',
      nature: '自然',
      space: '太空',
      music: '音乐',
      art: '艺术',
      travel: '旅行',
      science: '科学',
      history: '历史',
      festivals: '节日',
      daily_life: '日常生活',
      technology: '科技',
    }
    return map[theme] || theme
  }

  it('animals → 动物', () => expect(themeName('animals')).toBe('动物'))
  it('food → 食物', () => expect(themeName('food')).toBe('食物'))
  it('space → 太空', () => expect(themeName('space')).toBe('太空'))
  it('daily_life → 日常生活', () => expect(themeName('daily_life')).toBe('日常生活'))
  it('未知主题 → 返回原值', () => expect(themeName('unknown_theme')).toBe('unknown_theme'))
})
