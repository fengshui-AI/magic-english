import { reactive, computed } from 'vue'
import { petApi } from '../api'
import { authStore } from './auth'
import type { UpdatePetInput } from '../api/pet'

// 后端宠物数据格式
export interface PetData {
  id: string
  userId: string
  name: string
  birthPlace: string
  personality: string
  specialty: string
  stage: 'seed' | 'sprout' | 'bloom' | 'fruit'
  stageProgress: number
  totalLearningMinutes: number
  createdAt: string
  updatedAt: string
}

// UI 展示用的扁平化宠物状态（兼容旧视图）
export interface PetDisplay {
  name: string
  level: number
  stage: string
  exp: number
  expToNext: number
  mood: 'happy' | 'normal' | 'sad' | 'excited'
  hunger: number
  skin: string
  unlockedSkins: string[]
}

interface PetStore extends PetDisplay {
  // 后端原始数据
  pet: PetData | null
  loading: boolean
  error: string | null
}

// 默认 mock 数据（未登录或 API 不可用时使用）
const DEFAULT_PET: PetDisplay = {
  name: '小魔法',
  level: 1,
  stage: 'egg',
  exp: 0,
  expToNext: 100,
  mood: 'normal',
  hunger: 50,
  skin: 'default',
  unlockedSkins: ['default'],
}

const stageLevelMap: Record<string, { level: number; expToNext: number }> = {
  seed: { level: 1, expToNext: 300 },
  sprout: { level: 2, expToNext: 600 },
  bloom: { level: 3, expToNext: 1200 },
  fruit: { level: 4, expToNext: 2400 },
}

const stageLabelMap: Record<string, string> = {
  seed: 'egg',
  sprout: 'baby',
  bloom: 'young',
  fruit: 'adult',
}

// 核心 store — 同时包含 display 字段兼容旧视图
export const petStore = reactive<PetStore>({
  ...DEFAULT_PET,
  pet: null,
  loading: false,
  error: null,
})

export const petDisplay = computed<PetDisplay>(() => {
  const p = petStore.pet
  if (!p)
    return {
      name: petStore.name,
      level: petStore.level,
      stage: petStore.stage,
      exp: petStore.exp,
      expToNext: petStore.expToNext,
      mood: petStore.mood,
      hunger: petStore.hunger,
      skin: petStore.skin,
      unlockedSkins: petStore.unlockedSkins,
    }

  const info = stageLevelMap[p.stage] || stageLevelMap.seed
  return {
    name: p.name,
    level: info.level,
    stage: stageLabelMap[p.stage] || 'egg',
    exp: p.stageProgress,
    expToNext: info.expToNext,
    mood: petStore.mood,
    hunger: Math.min(100, Math.max(0, Math.round(p.stageProgress / 2))),
    skin: petStore.skin,
    unlockedSkins: petStore.unlockedSkins,
  }
})

/** 同步后端 pet → petStore display 字段 */
function syncDisplayFromPet() {
  const d = petDisplay.value
  petStore.name = d.name
  petStore.level = d.level
  petStore.stage = d.stage
  petStore.exp = d.exp
  petStore.expToNext = d.expToNext
  petStore.hunger = d.hunger
}

// ===================== API 操作 =====================

/** 获取当前用户的豆豆 */
export async function fetchMyPet() {
  if (!authStore.token) return
  petStore.loading = true
  petStore.error = null
  try {
    const res = await petApi.mine()
    petStore.pet = res.pet
    syncDisplayFromPet()
  } catch (e: any) {
    petStore.error = e.message || 'Failed to fetch pet'
  } finally {
    petStore.loading = false
  }
}

/** 创建豆豆 */
export async function createPet(input: {
  name: string
  birthPlace: string
  personality?: string
  specialty?: string
}) {
  petStore.loading = true
  petStore.error = null
  try {
    const res = await petApi.create({
      name: input.name,
      birthPlace: input.birthPlace as any,
      personality: input.personality as any,
      specialty: input.specialty as any,
    })
    petStore.pet = res.pet
    syncDisplayFromPet()
    return res.pet
  } catch (e: any) {
    petStore.error = e.message || 'Failed to create pet'
    throw e
  } finally {
    petStore.loading = false
  }
}

/** 更新豆豆 */
export async function updatePet(id: string, input: UpdatePetInput) {
  petStore.loading = true
  petStore.error = null
  try {
    const res = await petApi.update(id, input)
    petStore.pet = res.pet
    syncDisplayFromPet()
    return res.pet
  } catch (e: any) {
    petStore.error = e.message || 'Failed to update pet'
    throw e
  } finally {
    petStore.loading = false
  }
}

// ===================== 本地操作（兼容旧视图，不依赖 API） =====================

/** 喂食豆豆（本地 + 远程同步） */
export async function feedPet(exp: number) {
  petStore.exp += exp
  petStore.hunger = Math.min(100, petStore.hunger + exp / 2)

  // 进化判断（本地 mock）
  if (petStore.exp >= petStore.expToNext && petStore.level < 10) {
    petStore.level++
    petStore.exp -= petStore.expToNext
    petStore.expToNext = Math.floor(petStore.expToNext * 1.5)
    petStore.mood = 'excited'

    if (petStore.level >= 3) petStore.stage = 'baby'
    if (petStore.level >= 5) petStore.stage = 'young'
    if (petStore.level >= 8) petStore.stage = 'adult'
    if (petStore.level >= 10) petStore.stage = 'legend'
  }

  // 如果有远程 pet，也同步
  if (petStore.pet) {
    try {
      await updatePet(petStore.pet.id, {
        totalLearningMinutes: petStore.pet.totalLearningMinutes + Math.floor(exp / 2),
        stageProgress: Math.min(100, petStore.pet.stageProgress + exp),
      })
    } catch {
      // 忽略同步失败
    }
  }
}

/** 更新心情 */
export function updateMood(mood: PetDisplay['mood']) {
  petStore.mood = mood
}

/** 设置名称 */
export function setPetName(name: string) {
  petStore.name = name
  if (petStore.pet) {
    updatePet(petStore.pet.id, { name }).catch(() => {})
  }
}

// ===================== 进化检查 =====================

export async function checkEvolution() {
  if (!petStore.pet) return false
  const pet = petStore.pet

  const thresholds: Record<string, { next: string; min: number }> = {
    seed: { next: 'sprout', min: 300 },
    sprout: { next: 'bloom', min: 600 },
    bloom: { next: 'fruit', min: 1200 },
    fruit: { next: 'fruit', min: 999999 },
  }

  const t = thresholds[pet.stage]
  if (!t) return false

  if (pet.totalLearningMinutes >= t.min && pet.stageProgress >= 100) {
    await updatePet(pet.id, { stage: t.next as any, stageProgress: 0 })
    syncDisplayFromPet()
    return true
  }
  return false
}
