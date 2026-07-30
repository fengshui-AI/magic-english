/**
 * 砸金蛋诞生引擎（对齐 PRD V3.7 4.3.6 砸金蛋诞生仪式）
 *
 * 设计铁律：
 * 1. 能写配置的不写死代码 —— 容器池、稀有度概率、出生地加权全放配置常量，改这里即调参。
 * 2. 接口返回对象不返回裸值 —— crack/choose 均返回结构化对象。
 * 3. 稀有度只影响外观品质，不影响学习功能（保证公平）。
 *
 * 核心玩法：
 * - 孩子完成出生地选择 + 新手引导后，获得 3 次砸蛋机会。
 * - 每次砸出一个「容器 + 稀有度」，可自己决定停在第几次（掌控感 + 盲盒）。
 * - 首次砸蛋保底：第 1 次机会强制 ≥ rare（不给最差体验）。
 * - 3 次砸完从结果里挑最喜欢的留 1 个（禀赋效应，天然容错）。
 */

/** 稀有度枚举 */
export type Rarity = 'common' | 'rare' | 'mythic'

/** 容器类型（盲盒外壳，孵化后涌现真身） */
export type Container = 'egg' | 'roe' | 'seed' | 'cocoon' | 'crystal' | 'bud'

/** 砸蛋总机会数（PRD 4.3.6：3 次机会） */
export const MAX_LOTTERY_CHANCES = 3

/**
 * 稀有度基础概率配置（可调）。
 * 出生地匹配时对 rare/mythic 追加加权（见 BIRTHPLACE_RARITY_BONUS）。
 */
const RARITY_BASE_WEIGHT: Record<Rarity, number> = {
  common: 70,
  rare: 25,
  mythic: 5,
}

/**
 * 出生地对稀有度的加权（匹配倾向时提升稀有概率，PRD 4.3 出生地"加权不锁死"）。
 * 数值为在基础权重上叠加的百分点，仅示意起始值，上线后按数据调。
 */
const BIRTHPLACE_RARITY_BONUS: Record<string, Partial<Record<Rarity, number>>> = {
  seaside: { rare: 5, mythic: 2 },
  forest: { rare: 5, mythic: 2 },
  stargrass: { rare: 5, mythic: 2 },
  flower: { rare: 5, mythic: 2 },
  valley: { rare: 5, mythic: 2 },
}

/**
 * 各稀有度对应的容器池（涌现外壳）。稀有度越高，容器越梦幻。
 * 从对应池中等概率随机取一个容器。
 */
const CONTAINER_POOL: Record<Rarity, Container[]> = {
  common: ['egg', 'seed', 'bud'],
  rare: ['roe', 'cocoon'],
  mythic: ['crystal'],
}

/** 稀有度中文标签（前端展示用，也守"返回对象"铁律带上 label） */
export const RARITY_LABEL: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  mythic: '神话',
}

/** 容器中文标签 */
export const CONTAINER_LABEL: Record<Container, string> = {
  egg: '蛋',
  roe: '卵',
  seed: '种子',
  cocoon: '茧',
  crystal: '水晶',
  bud: '花苞',
}

/**
 * 按权重随机抽取稀有度。
 * @param birthPlace 出生地（用于加权，可空）
 * @param guaranteeMin 保底最低稀有度（首次砸蛋传 'rare'，即结果不低于 rare）
 */
export function rollRarity(birthPlace?: string | null, guaranteeMin?: Rarity): Rarity {
  const bonus = (birthPlace && BIRTHPLACE_RARITY_BONUS[birthPlace]) || {}
  const weights: Record<Rarity, number> = {
    common: RARITY_BASE_WEIGHT.common,
    rare: RARITY_BASE_WEIGHT.rare + (bonus.rare ?? 0),
    mythic: RARITY_BASE_WEIGHT.mythic + (bonus.mythic ?? 0),
  }

  // 保底：把低于 guaranteeMin 的档位权重清零
  if (guaranteeMin) {
    const order: Rarity[] = ['common', 'rare', 'mythic']
    const minIdx = order.indexOf(guaranteeMin)
    order.forEach((r, i) => {
      if (i < minIdx) weights[r] = 0
    })
  }

  const total = weights.common + weights.rare + weights.mythic
  let r = Math.random() * total
  if ((r -= weights.common) < 0) return 'common'
  if ((r -= weights.rare) < 0) return 'rare'
  return 'mythic'
}

/** 从对应稀有度容器池随机取一个容器 */
export function rollContainer(rarity: Rarity): Container {
  const pool = CONTAINER_POOL[rarity]
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * 砸一次蛋：返回容器 + 稀有度（含中文标签）。
 * @param chanceIndex 第几次机会（1~3），第 1 次保底 ≥ rare。
 * @param birthPlace 出生地，用于加权。
 */
export function crackOnce(
  chanceIndex: number,
  birthPlace?: string | null,
): { container: Container; rarity: Rarity; containerLabel: string; rarityLabel: string } {
  const guaranteeMin: Rarity | undefined = chanceIndex === 1 ? 'rare' : undefined
  const rarity = rollRarity(birthPlace, guaranteeMin)
  const container = rollContainer(rarity)
  return {
    container,
    rarity,
    containerLabel: CONTAINER_LABEL[container],
    rarityLabel: RARITY_LABEL[rarity],
  }
}
