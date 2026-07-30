import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { pets, petEvolutions, petLottery } from '../db/schemas/index.js'
import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'
import { validateBody, getValidatedBody } from '../middleware/validate.js'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { buildGrowthInfo, type PetStage, STAGE_ORDER, migrateLegacyStage } from '../services/growth-engine.js'
import { crackOnce, MAX_LOTTERY_CHANCES, CONTAINER_LABEL, RARITY_LABEL, type Container, type Rarity } from '../services/lottery-engine.js'

export const petRoutes = Router()

// 所有宠物路由需登录
petRoutes.use(authMiddleware)

export const createPetSchema = z.object({
  name: z.string().min(1).max(30),
  birthPlace: z.preprocess(
    (value) => (value === 'magic_garden' ? 'forest' : value),
    z.enum(['seaside', 'forest', 'stargrass', 'flower', 'valley']),
  ),
  personality: z.enum(['outgoing', 'focused', 'gentle', 'curious', 'quiet']).optional(),
  specialty: z.enum(['memory', 'pronounce', 'creative', 'persistent', 'balanced']).optional(),
})

export const updatePetSchema = z
  .object({
    name: z.string().min(1).max(30).optional(),
    stage: z.enum(['incubating', 'hatched', 'juvenile', 'growing', 'evolving', 'complete']).optional(),
    stageProgress: z.number().int().min(0).max(100).optional(),
    totalLearningMinutes: z.number().int().min(0).optional(),
  })
  .strict()

export function validatePetUpdatePayload(
  body: z.infer<typeof updatePetSchema>,
  existing: { stage: 'incubating' | 'hatched' | 'juvenile' | 'growing' | 'evolving' | 'complete' },
) {
  if (body.name && existing.stage !== 'incubating') {
    return 'Name may only be changed when the pet is in incubating stage'
  }
  return null
}

// POST /api/v1/pets — 创建豆豆（使用当前登录用户）
petRoutes.post('/', validateBody(createPetSchema), async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof createPetSchema>(req)
    const { userId } = getJwtPayload(req)

    const existing = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)
    if (existing.length > 0) {
      res.status(409).json({ error: 'User already has a pet' })
      return
    }

    const [pet] = await db
      .insert(pets)
      .values({
        userId,
        name: body.name,
        birthPlace: body.birthPlace,
        personality: body.personality || 'curious',
        specialty: body.specialty || 'balanced',
      })
      .returning()

    res.status(201).json({ pet })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create pet' })
  }
})

// GET /api/v1/pets/mine — 获取当前用户的豆豆
// Phase B 起：豆豆必须经"砸金蛋诞生仪式"才产生，此处不再自动创建。
// 没豆豆时返回 { pet: null }，前端据此显示"召唤金蛋"引导态。
petRoutes.get('/mine', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)

    // 还没砸蛋诞生豆豆 → 返回空，前端引导去砸蛋（不再自动建豆豆）
    if (!pet) {
      res.json({ pet: null, growth: null })
      return
    }

    // 返回豆豆 + 成长信息对象（守铁律：返回对象不返回裸值，hint 后端拼装）
    const growth = buildGrowthInfo(pet.totalLearningMinutes, migrateLegacyStage(pet.stage))
    res.json({ pet, growth })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get pet' })
  }
})

// ============================================================
// 砸金蛋诞生仪式（PRD V3.7 4.3.6）
// ⚠️ 必须放在 GET /:id 之前，否则 /lottery 会被 :id 通配拦截
// ============================================================
const chooseSchema = z.object({
  lotteryId: z.string().uuid(),
})

// GET /api/v1/pets/lottery — 查询当前砸蛋进度（剩余机会 + 已砸结果）
petRoutes.get('/lottery', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const rolls = await db
      .select()
      .from(petLottery)
      .where(eq(petLottery.userId, userId))
      .orderBy(asc(petLottery.chanceIndex))

    const chancesUsed = rolls.length
    const remainingChances = Math.max(MAX_LOTTERY_CHANCES - chancesUsed, 0)
    const finalized = rolls.some((r) => r.chosen)

    res.json({
      maxChances: MAX_LOTTERY_CHANCES,
      chancesUsed,
      remainingChances,
      finalized, // 是否已挑定容器（挑定后不可再砸）
      rolls: rolls.map((r) => ({
        id: r.id,
        chanceIndex: r.chanceIndex,
        container: r.container,
        containerLabel: CONTAINER_LABEL[r.container as Container] ?? r.container,
        rarity: r.rarity,
        rarityLabel: RARITY_LABEL[r.rarity as Rarity] ?? r.rarity,
        chosen: r.chosen,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get lottery state' })
  }
})

// POST /api/v1/pets/lottery/crack — 砸一次金蛋
// 无入参：服务端按已用次数自动推进 chanceIndex（1~3），首次保底 ≥ rare。
petRoutes.post('/lottery/crack', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    // 已挑定容器则不允许再砸
    const rolls = await db
      .select()
      .from(petLottery)
      .where(eq(petLottery.userId, userId))
      .orderBy(asc(petLottery.chanceIndex))

    if (rolls.some((r) => r.chosen)) {
      res.status(409).json({ error: '已经挑定容器，不能再砸啦' })
      return
    }
    if (rolls.length >= MAX_LOTTERY_CHANCES) {
      res.status(409).json({ error: '3 次机会已用完，请从结果里挑一个喜欢的' })
      return
    }

    // 取出生地做加权（若已有 pet 记录）
    const [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)
    const birthPlace = pet?.birthPlace ?? null

    const chanceIndex = rolls.length + 1
    const result = crackOnce(chanceIndex, birthPlace)

    const [saved] = await db
      .insert(petLottery)
      .values({
        userId,
        chanceIndex,
        container: result.container,
        rarity: result.rarity,
      })
      .returning()

    res.status(201).json({
      lotteryId: saved.id,
      chanceIndex,
      container: result.container,
      containerLabel: result.containerLabel,
      rarity: result.rarity,
      rarityLabel: result.rarityLabel,
      remainingChances: MAX_LOTTERY_CHANCES - chanceIndex,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to crack egg' })
  }
})

// POST /api/v1/pets/lottery/choose — 从已砸结果里挑定一个容器留下
// 入参 { lotteryId }：把该记录 chosen=true，写入 pets.container/rarity，stage=incubating。
petRoutes.post('/lottery/choose', validateBody(chooseSchema), async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const body = getValidatedBody<typeof chooseSchema>(req)

    // 校验该 lottery 记录属于本人
    const [roll] = await db
      .select()
      .from(petLottery)
      .where(and(eq(petLottery.id, body.lotteryId), eq(petLottery.userId, userId)))
      .limit(1)

    if (!roll) {
      res.status(404).json({ error: '找不到这次砸蛋记录' })
      return
    }

    // 已挑定则幂等返回
    const existingChosen = await db
      .select()
      .from(petLottery)
      .where(and(eq(petLottery.userId, userId), eq(petLottery.chosen, true)))
      .limit(1)
    if (existingChosen.length > 0 && existingChosen[0].id !== roll.id) {
      res.status(409).json({ error: '已经挑定过其它容器了' })
      return
    }

    // 标记选中
    await db.update(petLottery).set({ chosen: true }).where(eq(petLottery.id, roll.id))

    // 写入 pet：诞生 → 进入孵化。若无 pet 记录先建（出生地缺省 forest，后续引导可改）。
    let [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)
    if (!pet) {
      ;[pet] = await db
        .insert(pets)
        .values({
          userId,
          name: '豆豆',
          birthPlace: 'forest',
          personality: 'curious',
          specialty: 'balanced',
          container: roll.container,
          rarity: roll.rarity,
          stage: 'incubating',
          bornAt: new Date(),
        })
        .returning()
    } else {
      ;[pet] = await db
        .update(pets)
        .set({
          container: roll.container,
          rarity: roll.rarity,
          stage: 'incubating',
          bornAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pets.id, pet.id))
        .returning()
    }

    const growth = buildGrowthInfo(pet.totalLearningMinutes, migrateLegacyStage(pet.stage))
    res.json({
      pet,
      growth,
      container: roll.container,
      containerLabel: CONTAINER_LABEL[roll.container as Container] ?? roll.container,
      rarity: roll.rarity,
      rarityLabel: RARITY_LABEL[roll.rarity as Rarity] ?? roll.rarity,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to choose container' })
  }
})

// GET /api/v1/pets/:id
petRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const [pet] = await db.select().from(pets).where(eq(pets.id, id)).limit(1)
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' })
      return
    }
    res.json({ pet })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get pet' })
  }
})

// PATCH / PUT /api/v1/pets/:id
// 注：微信小程序 wx.request 不支持 PATCH，故同时注册 PUT 供小程序端调用（改名等），逻辑完全一致。
const updatePetHandler = async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof updatePetSchema>(req)
    const id = req.params.id
    const { userId } = getJwtPayload(req)

    // 权限检查：只能改自己的豆豆
    const [existing] = await db.select().from(pets).where(eq(pets.id, id)).limit(1)
    if (!existing) {
      res.status(404).json({ error: 'Pet not found' })
      return
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: 'Can only update your own pet' })
      return
    }

    if (body.name && migrateLegacyStage(existing.stage) !== 'incubating') {
      res.status(400).json({ error: 'Name may only be changed when the pet is in incubating stage' })
      return
    }

    if (body.stage && existing.stage !== body.stage) {
      await db.insert(petEvolutions).values({
        petId: id,
        fromStage: existing.stage,
        toStage: body.stage,
        totalMinutesAtTrigger: existing.totalLearningMinutes,
      })
    }

    const updates = { ...body, updatedAt: new Date() }
    const [pet] = await db.update(pets).set(updates).where(eq(pets.id, id)).returning()
    res.json({ pet })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update pet' })
  }
}

petRoutes.patch('/:id', validateBody(updatePetSchema), updatePetHandler)
petRoutes.put('/:id', validateBody(updatePetSchema), updatePetHandler)

// GET /api/v1/pets/:id/stage-history
petRoutes.get('/:id/stage-history', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const history = await db
      .select()
      .from(petEvolutions)
      .where(eq(petEvolutions.petId, id))
      .orderBy(petEvolutions.triggeredAt)
    res.json({ history })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get stage history' })
  }
})

// POST /api/v1/pets/feed — 喂养豆豆（增加学习时长，兼容 E2E 测试）
const feedSchema = z.object({
  exp: z.number().int().min(1).optional(),
  minutes: z.number().int().min(1).optional(),
})

petRoutes.post('/feed', validateBody(feedSchema), async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof feedSchema>(req)
    const { userId } = getJwtPayload(req)
    const [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)
    if (!pet) {
      res.status(404).json({ error: 'Pet not found. Create one first via POST /pets' })
      return
    }

    const addedMinutes = body.minutes || Math.floor((body.exp || 30) / 2)
    const newTotal = pet.totalLearningMinutes + addedMinutes

    // 计算是否升级（六阶段 STAGE_ORDER，兼容历史旧枚举）
    const curStage = migrateLegacyStage(pet.stage)
    let newStage: PetStage = curStage
    let newProgress = pet.stageProgress + (body.exp || 30)
    const currentStageIdx = STAGE_ORDER.indexOf(curStage)

    if (newProgress >= 100 && currentStageIdx < STAGE_ORDER.length - 1) {
      newStage = STAGE_ORDER[currentStageIdx + 1]
      newProgress = 0

      await db.insert(petEvolutions).values({
        petId: pet.id,
        fromStage: curStage,
        toStage: newStage,
        totalMinutesAtTrigger: newTotal,
      })
    }

    const [updated] = await db
      .update(pets)
      .set({
        totalLearningMinutes: newTotal,
        stage: newStage,
        stageProgress: Math.min(newProgress, 100),
        updatedAt: new Date(),
      })
      .where(eq(pets.id, pet.id))
      .returning()

    res.json({
      pet: updated,
      addedMinutes,
      expGained: body.exp || 30,
      stageChanged: newStage !== pet.stage,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to feed pet' })
  }
})

// POST /api/v1/pets/action — 互动操作（兼 E2E 测试）
const actionSchema = z.object({
  type: z.enum(['feed', 'speak', 'play']),
})

petRoutes.post('/action', validateBody(actionSchema), async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof actionSchema>(req)
    const { userId } = getJwtPayload(req)
    const [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' })
      return
    }

    // 互动增加少量进度
    const progressGain = body.type === 'feed' ? 5 : body.type === 'speak' ? 3 : 8
    const newProgress = Math.min(pet.stageProgress + progressGain, 100)

    const [updated] = await db
      .update(pets)
      .set({ stageProgress: newProgress, updatedAt: new Date() })
      .where(eq(pets.id, pet.id))
      .returning()

    res.json({
      pet: updated,
      action: body.type,
      progressGain,
      message:
        body.type === 'feed'
          ? 'Yum! 谢谢你的食物~'
          : body.type === 'speak'
            ? '豆豆开心地回应了你'
            : '豆豆玩得很开心！',
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to perform action' })
  }
})

// GET /api/v1/pets/evolution — 获取当前宠物进化历史（兼 E2E 测试）
petRoutes.get('/evolution', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' })
      return
    }

    const history = await db
      .select()
      .from(petEvolutions)
      .where(eq(petEvolutions.petId, pet.id))
      .orderBy(petEvolutions.triggeredAt)
    res.json({ history })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get evolution history' })
  }
})

