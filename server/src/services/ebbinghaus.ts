/**
 * 艾宾浩斯遗忘曲线复习调度算法
 *
 * 间隔规则（天数）：1, 2, 4, 7, 15, 30
 * 阶段索引对应：
 *   stage 0: 新学 → 1天后复习
 *   stage 1: 第1次复习 → 2天后复习
 *   stage 2: 第2次复习 → 4天后复习
 *   stage 3: 第3次复习 → 7天后复习
 *   stage 4: 第4次复习 → 15天后复习
 *   stage 5: 第5次复习 → 30天后复习
 *   stage 6: 第6次复习 → 已掌握（无需再复习）
 */

const INTERVALS_DAYS = [1, 2, 4, 7, 15, 30]
const MAX_STAGE = INTERVALS_DAYS.length // stage 6 = mastered

export interface ReviewResult {
  nextReviewAt: Date
  newStage: number
  status: 'new' | 'learning' | 'review' | 'mastered'
}

/**
 * 计算下次复习时间
 * @param currentStage 当前复习阶段 (0-based，对应已完成的复习次数)
 * @param quality 复习质量: 'correct'=记住, 'fuzzy'=模糊, 'forgot'=遗忘
 * @param now 当前时间
 */
export function calculateNextReview(
  currentStage: number,
  quality: 'correct' | 'fuzzy' | 'forgot',
  now: Date = new Date(),
): ReviewResult {
  let nextStage: number

  switch (quality) {
    case 'correct':
      // 记住 → 进入下一阶段
      nextStage = Math.min(currentStage + 1, MAX_STAGE)
      break
    case 'fuzzy':
      // 模糊 → 保持当前阶段
      nextStage = Math.max(0, currentStage)
      break
    case 'forgot':
      // 遗忘 → 退回阶段 0（重新学习）
      nextStage = 0
      break
  }

  // 已掌握，无需下次复习
  if (nextStage >= MAX_STAGE) {
    return {
      nextReviewAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 远未来
      newStage: MAX_STAGE,
      status: 'mastered',
    }
  }

  const intervalDays = INTERVALS_DAYS[nextStage]
  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)

  // 确定当前状态标签
  let status: ReviewResult['status']
  if (nextStage === 0) status = 'new'
  else if (nextStage < 3) status = 'learning'
  else status = 'review'

  return { nextReviewAt, newStage: nextStage, status }
}

/**
 * 获取指定阶段对应的间隔天数
 */
export function getIntervalDays(stage: number): number {
  if (stage >= MAX_STAGE) return 0
  return INTERVALS_DAYS[stage] || INTERVALS_DAYS[INTERVALS_DAYS.length - 1]
}

/**
 * 判断指定阶段的复习是否到期
 */
export function isReviewDue(nextReviewAt: Date, now: Date = new Date()): boolean {
  return nextReviewAt <= now
}
