/**
 * 豆豆成长引擎（对齐 PRD 第四章 4.6.2 由易到难成长曲线 + 第十六章 16.5 落地口径）
 *
 * 设计铁律：
 * 1. 能写配置的不写死代码 —— 成长门槛全部放 GROWTH_CONFIG，改这里即调参，不动业务逻辑。
 * 2. 由易到难 —— 前期门槛小快给甜头，后期门槛递增拉长追求。
 * 3. 累计有效学习分钟驱动 —— 鼓励每天来，而非一次刷很久。
 *
 * A 阶段说明（已升级）：Phase B 起改为六阶段真身枚举（对齐 PRD V3.7 4.6.1）：
 * incubating(孵化) → hatched(破壳) → juvenile(幼体) → growing(成长期) → evolving(进化) → complete(终态/圆满)。
 * 旧四阶段(seed/sprout/bloom/fruit)已废弃，数据迁移映射见 migrateLegacyStage。
 */

import { db } from '../db/index.js'
import { pets, petEvolutions } from '../db/schemas/index.js'
import { eq } from 'drizzle-orm'

/** 成长阶段（六阶段真身枚举，PRD V3.7 4.6.1） */
export type PetStage = 'incubating' | 'hatched' | 'juvenile' | 'growing' | 'evolving' | 'complete'

/** 阶段顺序（用于跨级推进与查找下一阶段） */
export const STAGE_ORDER: PetStage[] = [
  'incubating',
  'hatched',
  'juvenile',
  'growing',
  'evolving',
  'complete',
]

/** 每个阶段的中文标签（后端拼装 hint 用，前端也可复用） */
export const STAGE_LABEL: Record<PetStage, string> = {
  incubating: '孵化中',
  hatched: '破壳',
  juvenile: '幼体',
  growing: '成长期',
  evolving: '进化',
  complete: '圆满',
}

/**
 * 旧四阶段 → 六阶段迁移映射（防止历史数据里残留 seed/sprout/bloom/fruit 导致 NaN）。
 * 语义对齐：seed(种子/未破壳)=incubating；sprout(刚发芽)=hatched；bloom(开花)=growing；fruit(圆满)=complete。
 * 传入未知值一律回落 incubating。
 */
const LEGACY_STAGE_MAP: Record<string, PetStage> = {
  seed: 'incubating',
  sprout: 'hatched',
  bloom: 'growing',
  fruit: 'complete',
}

/** 把任意来源的 stage 值规整为合法六阶段枚举 */
export function migrateLegacyStage(raw: string | null | undefined): PetStage {
  if (!raw) return 'incubating'
  if ((STAGE_ORDER as string[]).includes(raw)) return raw as PetStage
  return LEGACY_STAGE_MAP[raw] ?? 'incubating'
}

/**
 * 成长曲线配置（由易到难，可调，对齐 PRD 4.6.2 六阶段门槛）
 * threshold = 进入该阶段所需的「累计有效学习分钟」总量（非增量）。
 * incubating 是初始阶段，threshold=0。
 *
 * 递增设计：0 → 5 → 30 → 90 → 240 → 500（门槛递增，像打怪升级）
 * - incubating→hatched：5 分钟（首日秒回报，抓住孩子）
 * - hatched→juvenile：30 分钟（2~3 天，门槛小）
 * - juvenile→growing：90 分钟（1~2 周，拉长）
 * - growing→evolving：240 分钟（1 月+，有挑战）
 * - evolving→complete：500 分钟（长线追求，圆满）
 *
 * 注：数值是起始配置，上线后按真实流失数据调曲线，改这里即可。
 *
 * ⭐ DEV 测试开关：部署环境设环境变量 GROWTH_TEST_MODE=1 时，门槛压到 1/2/3/4/5 分钟，
 *    学一次即可看到跨阶段推进，用于真机快速验证。测完在 CloudBase 环境变量里删掉该变量
 *    即恢复正式门槛，无需改代码 / 重新 push。默认（不设该变量）= 正式门槛 5/30/90/240/500。
 */
const GROWTH_TEST_MODE = process.env.GROWTH_TEST_MODE === '1'

const GROWTH_CONFIG_PROD: { stage: PetStage; threshold: number }[] = [
  { stage: 'incubating', threshold: 0 },
  { stage: 'hatched', threshold: 5 },
  { stage: 'juvenile', threshold: 30 },
  { stage: 'growing', threshold: 90 },
  { stage: 'evolving', threshold: 240 },
  { stage: 'complete', threshold: 500 },
]

const GROWTH_CONFIG_TEST: { stage: PetStage; threshold: number }[] = [
  { stage: 'incubating', threshold: 0 },
  { stage: 'hatched', threshold: 1 },
  { stage: 'juvenile', threshold: 2 },
  { stage: 'growing', threshold: 3 },
  { stage: 'evolving', threshold: 4 },
  { stage: 'complete', threshold: 5 },
]

export const GROWTH_CONFIG = GROWTH_TEST_MODE ? GROWTH_CONFIG_TEST : GROWTH_CONFIG_PROD

/** 根据累计分钟计算「应该处于」的阶段 */
export function stageForMinutes(totalMinutes: number): PetStage {
  let result: PetStage = 'incubating'
  for (const item of GROWTH_CONFIG) {
    if (totalMinutes >= item.threshold) result = item.stage
  }
  return result
}

/** 取某阶段的门槛分钟 */
function thresholdOf(stage: PetStage): number {
  return GROWTH_CONFIG.find((c) => c.stage === stage)?.threshold ?? 0
}

/** 取下一阶段（已是最高阶返回 null） */
function nextStageOf(stage: PetStage): PetStage | null {
  const idx = STAGE_ORDER.indexOf(stage)
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

/**
 * 成长信息对象（供 pets/mine 返回，守「返回对象不返回裸值」铁律）
 * - current：当前阶段已累计分钟（在本阶段内的进度基准用总分钟表达）
 * - next：下一阶段门槛分钟（已圆满则为 null）
 * - toNextStage：距离下一阶段还差多少分钟（已圆满为 0）
 * - progressPercent：当前阶段内进度百分比 0-100（前端进度条可用，但首页不展示数字）
 * - hint：后端拼装的情感化钩子文案（前端直接用，不写死）
 * - stage / stageLabel：当前阶段 key 与中文标签
 */
export interface GrowthInfo {
  stage: PetStage
  stageLabel: string
  current: number
  next: number | null
  toNextStage: number
  progressPercent: number
  hint: string
}

/** 计算成长信息（纯函数，不查库） */
export function buildGrowthInfo(totalMinutes: number, stage: PetStage): GrowthInfo {
  const next = nextStageOf(stage)
  const curThreshold = thresholdOf(stage)

  if (!next) {
    // 已圆满
    return {
      stage,
      stageLabel: STAGE_LABEL[stage],
      current: totalMinutes,
      next: null,
      toNextStage: 0,
      progressPercent: 100,
      hint: '豆豆已经长成独一无二的模样，圆满啦！它会一直陪着你～',
    }
  }

  const nextThreshold = thresholdOf(next)
  const toNext = Math.max(nextThreshold - totalMinutes, 0)
  const span = Math.max(nextThreshold - curThreshold, 1)
  const progressPercent = Math.min(
    Math.round(((totalMinutes - curThreshold) / span) * 100),
    100,
  )

  // hint 情感化钩子，守 PRD 4.7 铁律：不含任何数字（分钟/进度都不露）
  // 按接近程度分档给不同期待感文案
  const nextLabel = STAGE_LABEL[next]
  let hint: string
  if (toNext <= 0 || progressPercent >= 100) {
    hint = `豆豆马上就要${nextLabel}啦，快来看看它！`
  } else if (progressPercent >= 60) {
    hint = `豆豆快要${nextLabel}啦，再陪它一会儿就好～`
  } else {
    hint = `再多陪陪豆豆，它就会${nextLabel}哦～`
  }

  return {
    stage,
    stageLabel: STAGE_LABEL[stage],
    current: totalMinutes,
    next: nextThreshold,
    toNextStage: toNext,
    progressPercent,
    hint,
  }
}

/**
 * 推进豆豆阶段（核心）：在累计分钟更新后调用。
 * - 按最新累计分钟算出应处阶段，若比当前高则推进（可跨级），逐级写进化历史表。
 * - 若无变化则只返回当前 growth 信息，不写库。
 *
 * @param userId 用户 id
 * @param totalMinutes 已更新后的累计有效学习分钟
 * @returns 推进后的 GrowthInfo（含是否升级、跨了哪些阶段）
 */
export async function advancePetStage(
  userId: string,
  totalMinutes: number,
): Promise<{ growth: GrowthInfo; stageChanged: boolean; from: PetStage | null; to: PetStage } | null> {
  const [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)
  if (!pet) return null

  const currentStage = migrateLegacyStage(pet.stage)
  const targetStage = stageForMinutes(totalMinutes)

  const curIdx = STAGE_ORDER.indexOf(currentStage)
  const tgtIdx = STAGE_ORDER.indexOf(targetStage)

  // 只前进不后退（防御：万一配置调低也不让豆豆缩回去）
  if (tgtIdx <= curIdx) {
    const growth = buildGrowthInfo(totalMinutes, currentStage)
    return { growth, stageChanged: false, from: null, to: currentStage }
  }

  // 逐级写进化历史（种子→开花可能跨级，一次学习时长很大时）
  for (let i = curIdx; i < tgtIdx; i++) {
    await db.insert(petEvolutions).values({
      petId: pet.id,
      fromStage: STAGE_ORDER[i],
      toStage: STAGE_ORDER[i + 1],
      totalMinutesAtTrigger: totalMinutes,
    })
  }

  // 更新 pets：新阶段 + 阶段内进度百分比
  const growth = buildGrowthInfo(totalMinutes, targetStage)
  await db
    .update(pets)
    .set({
      stage: targetStage,
      stageProgress: growth.progressPercent,
      updatedAt: new Date(),
    })
    .where(eq(pets.id, pet.id))

  return { growth, stageChanged: true, from: currentStage, to: targetStage }
}
