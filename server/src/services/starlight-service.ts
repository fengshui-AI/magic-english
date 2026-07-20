// ============================================================
// 星光服务 — PRD 10.1 星光体系
//
// 核心规则：
//   星光仅通过学习行为获得，不可付费、不可交易
//   儿童端全程无数字展示，仅通过"星光瓶"可视化
//   每日上限：低段20/中段30/高段40
//   成长时光过渡/彩蛋不计入每日上限
// ============================================================

import { db } from '../db/index.js'
import { starlightRecords, users, streakRecords } from '../db/schemas/index.js'
import { eq, and, gte, sql } from 'drizzle-orm'

// ============================================================
// 类型定义
// ============================================================

export type StarlightSource =
  | 'earn_review'        // 完成当日复习
  | 'earn_word'          // 学会新单词
  | 'earn_pronounce'     // 跟读完美评价
  | 'earn_dialogue'      // 完成情景对话
  | 'earn_streak'        // 连续打卡
  | 'earn_milestone'     // 成长时光过渡
  | 'earn_easter_egg'    // 隐藏彩蛋
  | 'spend_decoration'   // 消费解锁装饰品

interface StarlightResult {
  amount: number
  balance: number
  dailyEarned: number
  dailyLimit: number
  capped: boolean  // 是否已达每日上限
}

// ============================================================
// 星光获取规则（PRD 10.1.2）
// ============================================================

const EARN_RULES: Record<string, { amount: number; capped: boolean }> = {
  earn_review: { amount: 5, capped: true },
  earn_word: { amount: 3, capped: true },
  earn_pronounce: { amount: 2, capped: true },
  earn_dialogue: { amount: 5, capped: true },
  earn_streak: { amount: 0, capped: true },    // 动态计算：dayN → N
  earn_milestone: { amount: 50, capped: false },
  earn_easter_egg: { amount: 10, capped: false },
}

/** 获取分龄每日上限 */
function getDailyLimit(grade: number): number {
  if (grade <= 2) return 20
  if (grade <= 4) return 30
  return 40
}

// ============================================================
// 核心 API
// ============================================================

/** 获取用户当前星光余额 */
export async function getStarlightBalance(userId: string): Promise<number> {
  const [record] = await db
    .select({ balance: starlightRecords.balance })
    .from(starlightRecords)
    .where(eq(starlightRecords.userId, userId))
    .orderBy(sql`created_at DESC`)
    .limit(1)

  return record?.balance ?? 0
}

/** 获取今日已获取星光（计入上限的部分） */
export async function getDailyEarned(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(amount), 0)`,
    })
    .from(starlightRecords)
    .where(
      and(
        eq(starlightRecords.userId, userId),
        gte(starlightRecords.createdAt, new Date(today)),
        sql`source_type != 'earn_milestone'`,
        sql`source_type != 'earn_easter_egg'`,
        sql`amount > 0`,
      ),
    )

  return result[0]?.total ?? 0
}

/**
 * 获取星光（学习行为触发）
 * @returns 实际获得的星光数（可能因每日上限被截断）
 */
export async function earnStarlight(
  userId: string,
  source: StarlightSource,
  sourceRef?: string,
): Promise<StarlightResult> {
  // 获取用户年级
  const [user] = await db
    .select({ grade: users.grade })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const grade = user?.grade ?? 3

  const rule = EARN_RULES[source]
  if (!rule) throw new Error(`Unknown starlight source: ${source}`)

  let amount = rule.amount

  // 连续打卡动态计算
  if (source === 'earn_streak') {
    const [streak] = await db
      .select({ currentStreak: streakRecords.currentStreak })
      .from(streakRecords)
      .where(eq(streakRecords.userId, userId))
      .limit(1)
    amount = Math.min(streak?.currentStreak ?? 1, 7)  // 最高+7
  }

  // 检查每日上限
  const dailyLimit = getDailyLimit(grade)
  const dailyEarned = await getDailyEarned(userId)
  let capped = false

  if (rule.capped && dailyEarned >= dailyLimit) {
    return {
      amount: 0,
      balance: await getStarlightBalance(userId),
      dailyEarned,
      dailyLimit,
      capped: true,
    }
  }

  if (rule.capped && dailyEarned + amount > dailyLimit) {
    amount = dailyLimit - dailyEarned
    capped = true
  }

  if (amount <= 0) {
    return {
      amount: 0,
      balance: await getStarlightBalance(userId),
      dailyEarned,
      dailyLimit,
      capped: true,
    }
  }

  // 写入流水
  const currentBalance = await getStarlightBalance(userId)
  const newBalance = currentBalance + amount

  await db.insert(starlightRecords).values({
    userId,
    amount,
    sourceType: source,
    balance: newBalance,
    sourceRef: sourceRef || null as any,
  })

  return {
    amount,
    balance: newBalance,
    dailyEarned: dailyEarned + amount,
    dailyLimit,
    capped,
  }
}

/**
 * 消耗星光（解锁装饰品等）
 * @returns 剩余余额
 */
export async function spendStarlight(
  userId: string,
  amount: number,
  sourceRef?: string,
): Promise<{ success: boolean; balance: number }> {
  const currentBalance = await getStarlightBalance(userId)

  if (currentBalance < amount) {
    return { success: false, balance: currentBalance }
  }

  const newBalance = currentBalance - amount

  await db.insert(starlightRecords).values({
    userId,
    amount: -amount,
    sourceType: 'spend_decoration',
    balance: newBalance,
    sourceRef: sourceRef || null as any,
  })

  return { success: true, balance: newBalance }
}

/** 获取星光流水历史（家长端） */
export async function getStarlightHistory(userId: string, limit = 30) {
  return db
    .select()
    .from(starlightRecords)
    .where(eq(starlightRecords.userId, userId))
    .orderBy(sql`created_at DESC`)
    .limit(limit)
}
