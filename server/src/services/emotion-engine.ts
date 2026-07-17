// ============================================================
// 情感引擎 — 4 维情感状态计算
//
// 维度说明：
//   pleasure   — 愉悦度 (0-1)：答题正确+ 答错- 长时间无操作-
//   arousal    — 唤醒度 (0-1)：新内容+ 挑战+ 疲劳-
//   closeness  — 陪伴亲密度 (0-1)：连续互动+ 断签- 主动问候+
//   focusMatch — 专注匹配度 (0-1)：任务完成率+ 走神-
//
// 触发事件类型 → 各维度的 delta 变化
// ============================================================

export interface EmotionVector {
  pleasure: number // 0-1
  arousal: number // 0-1
  closeness: number // 0-1
  focusMatch: number // 0-1
}

export interface EmotionEvent {
  type: EmotionEventType
  intensity?: number // 0-1，默认 0.5
  context?: Record<string, unknown>
}

export type EmotionEventType =
  | 'correct_answer' // 答题正确
  | 'wrong_answer' // 答题错误
  | 'perfect_score' // 满分
  | 'streak_milestone' // 连胜里程碑 (3/7/15/30/60天)
  | 'new_word_mastered' // 掌握新词
  | 'session_start' // 开始学习
  | 'session_complete' // 完成学习
  | 'idle_too_long' // 长时间无操作 (>5min)
  | 'review_forgot' // 复习遗忘
  | 'review_correct' // 复习正确
  | 'level_up' // 升级/进化
  | 'daily_checkin' // 每日打卡
  | 'streak_lost' // 断签
  | 'freeze_used' // 使用冻结卡
  | 'greeting_response' // 主动问候互动

// 事件 → 情感 delta 映射表
const EVENT_DELTAS: Record<EmotionEventType, EmotionVector> = {
  correct_answer: { pleasure: 0.08, arousal: 0.02, closeness: 0.01, focusMatch: 0.05 },
  wrong_answer: { pleasure: -0.06, arousal: 0.04, closeness: 0.01, focusMatch: -0.03 },
  perfect_score: { pleasure: 0.15, arousal: 0.06, closeness: 0.03, focusMatch: 0.08 },
  streak_milestone: { pleasure: 0.12, arousal: 0.1, closeness: 0.06, focusMatch: 0.04 },
  new_word_mastered: { pleasure: 0.1, arousal: 0.03, closeness: 0.02, focusMatch: 0.06 },
  session_start: { pleasure: 0.02, arousal: 0.1, closeness: 0.02, focusMatch: 0.05 },
  session_complete: { pleasure: 0.08, arousal: -0.02, closeness: 0.04, focusMatch: 0.05 },
  idle_too_long: { pleasure: -0.03, arousal: -0.08, closeness: -0.01, focusMatch: -0.1 },
  review_forgot: { pleasure: -0.04, arousal: 0.06, closeness: 0.0, focusMatch: -0.04 },
  review_correct: { pleasure: 0.06, arousal: 0.01, closeness: 0.01, focusMatch: 0.03 },
  level_up: { pleasure: 0.15, arousal: 0.15, closeness: 0.05, focusMatch: 0.03 },
  daily_checkin: { pleasure: 0.04, arousal: 0.02, closeness: 0.04, focusMatch: 0.02 },
  streak_lost: { pleasure: -0.1, arousal: -0.04, closeness: -0.05, focusMatch: -0.02 },
  freeze_used: { pleasure: -0.02, arousal: 0.02, closeness: 0.06, focusMatch: 0.0 },
  greeting_response: { pleasure: 0.03, arousal: 0.01, closeness: 0.06, focusMatch: 0.01 },
}

/** 对当前情感向量施加事件 delta */
export function applyEmotionEvent(current: EmotionVector, event: EmotionEvent): EmotionVector {
  const deltas = EVENT_DELTAS[event.type]
  if (!deltas) return current

  const intensity = event.intensity ?? 0.5
  const clamp = (v: number) => Math.max(0, Math.min(1, v))

  return {
    pleasure: clamp(current.pleasure + deltas.pleasure * intensity),
    arousal: clamp(current.arousal + deltas.arousal * intensity),
    closeness: clamp(current.closeness + deltas.closeness * intensity),
    focusMatch: clamp(current.focusMatch + deltas.focusMatch * intensity),
  }
}

/** 自然衰减：随时间缓慢回归中性 */
export function decayEmotion(current: EmotionVector, minutesElapsed: number): EmotionVector {
  const rate = 0.002 * minutesElapsed // 每小时约衰减 0.12
  const clamp = (v: number, target: number) => {
    if (v > target) return Math.max(target, v - rate)
    if (v < target) return Math.min(target, v + rate)
    return v
  }

  return {
    pleasure: clamp(current.pleasure, 0.5),
    arousal: clamp(current.arousal, 0.5),
    closeness: clamp(current.closeness, current.closeness), // 亲密度不衰减
    focusMatch: clamp(current.focusMatch, 0.3),
  }
}

// ============================================================
// 陪伴梯度 — 4 级梯度
//
// 梯度 0 — 初识 (0-99 分钟)
// 梯度 1 — 朋友 (100-299 分钟)
// 梯度 2 — 密友 (300-599 分钟)
// 梯度 3 — 最佳拍档 (600+ 分钟)
// ============================================================

export type CompanionGradient = 0 | 1 | 2 | 3

export interface GradientInfo {
  level: CompanionGradient
  name: string
  minMinutes: number
  emoji: string
  description: string
  behaviors: string[]
}

const GRADIENT_TABLE: GradientInfo[] = [
  {
    level: 0,
    name: '初识',
    minMinutes: 0,
    emoji: '🌱',
    description: '豆豆刚认识你，还有点害羞呢',
    behaviors: ['简单问候', '鼓励学习', '基础表情'],
  },
  {
    level: 1,
    name: '朋友',
    minMinutes: 100,
    emoji: '🌿',
    description: '豆豆和你成为好朋友了！',
    behaviors: ['主动互动', '学习提醒', '分享趣事', '中阶表情'],
  },
  {
    level: 2,
    name: '密友',
    minMinutes: 300,
    emoji: '🌳',
    description: '豆豆和你无话不谈！',
    behaviors: ['个性化鼓励', '学习策略建议', '丰富表情包', '小秘密分享'],
  },
  {
    level: 3,
    name: '最佳拍档',
    minMinutes: 600,
    emoji: '🌟',
    description: '豆豆是你最棒的学习伙伴！',
    behaviors: ['专属称呼', '智能学习规划', '全部表情', '惊喜彩蛋', '成就庆祝'],
  },
]

export function getGradient(totalMinutes: number): GradientInfo {
  for (let i = GRADIENT_TABLE.length - 1; i >= 0; i--) {
    if (totalMinutes >= GRADIENT_TABLE[i].minMinutes) {
      return GRADIENT_TABLE[i]
    }
  }
  return GRADIENT_TABLE[0]
}

// ============================================================
// 豆豆情感响应生成器
// ============================================================

export interface DodoResponse {
  expression: string // 表情 emoji
  animation: string // 动画类型
  bubbleText: string // 气泡话术
  moodLabel: string // 心情标签
  gradientAware: boolean // 是否根据梯度变化
}

// 根据情感向量生成豆豆响应
export function generateDodoResponse(
  emotion: EmotionVector,
  gradient: GradientInfo,
  context?: {
    lastEvent?: EmotionEventType
    streak?: number
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  },
): DodoResponse {
  const { pleasure, arousal, closeness, focusMatch } = emotion

  // 表情选择
  let expression: string
  let moodLabel: string

  if (pleasure >= 0.8 && arousal >= 0.7) {
    expression = '🤩'
    moodLabel = '超开心'
  } else if (pleasure >= 0.7) {
    expression = '😊'
    moodLabel = '开心'
  } else if (pleasure >= 0.5) {
    expression = '😌'
    moodLabel = '平静'
  } else if (pleasure >= 0.3) {
    expression = '😐'
    moodLabel = '一般'
  } else if (arousal < 0.3) {
    expression = '😴'
    moodLabel = '困倦'
  } else {
    expression = '😟'
    moodLabel = '低落'
  }

  // 动画类型
  let animation: string
  if (arousal >= 0.7) animation = 'bounce'
  else if (focusMatch >= 0.7) animation = 'focus'
  else if (pleasure >= 0.7) animation = 'sway'
  else if (closeness >= 0.7) animation = 'cuddle'
  else animation = 'idle'

  // 气泡话术生成
  const bubbleText = generateBubbleText(emotion, gradient, context)

  return {
    expression,
    animation,
    bubbleText,
    moodLabel,
    gradientAware: gradient.level >= 2,
  }
}

function generateBubbleText(
  emotion: EmotionVector,
  gradient: GradientInfo,
  context?: { lastEvent?: EmotionEventType; streak?: number; timeOfDay?: string },
): string {
  const { pleasure, closeness } = emotion
  const timeOfDay = context?.timeOfDay

  // 时间问候
  const timeGreetings: Record<string, string[]> = {
    morning: ['早上好呀！☀️', '新的一天开始啦！', '早安！今天也要加油哦～'],
    afternoon: ['下午好！', '学习累了就休息一下吧～', '今天学得真棒！'],
    evening: ['晚上好呀～', '今天的学习快结束了呢', '该准备休息啦'],
    night: ['晚安咯～', '明天见！', '做个好梦 🌙'],
  }

  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

  // 高愉悦度
  if (pleasure >= 0.8) {
    if (gradient.level >= 2) {
      return pick([
        '哇！你今天太棒了！我超级开心！🤩',
        '和你一起学习真是太好了！',
        '今天是最棒的一天！对吧对吧？',
      ])
    }
    return pick(['好开心呀！✨', '今天学得真好！', '继续加油哦～'])
  }

  // 中等愉悦
  if (pleasure >= 0.5) {
    if (gradient.level >= 1) {
      return pick(['嗯嗯，感觉不错呢～', '我们一起继续努力吧！', '今天学到了好多新东西！'])
    }
    return pick(['还不错呢', '继续加油～', '今天也要学英语哦'])
  }

  // 低愉悦度
  if (closeness >= 0.6 && gradient.level >= 1) {
    return pick(['没关系的，我一直在你身边 💕', '要不要休息一下再继续？', '累了就摸摸我吧～'])
  }

  // 时间问候
  if (timeOfDay && Math.random() > 0.5) {
    return pick(timeGreetings[timeOfDay] || timeGreetings.morning)
  }

  return pick(['嗨！', '今天要学英语吗？', '我一直在这儿哦～'])
}

// ============================================================
// 默认情感向量
// ============================================================

export const DEFAULT_EMOTION: EmotionVector = {
  pleasure: 0.6,
  arousal: 0.5,
  closeness: 0.2,
  focusMatch: 0.5,
}
