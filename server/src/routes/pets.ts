import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import { pets, petEvolutions } from '../db/schemas/index.js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { validateBody, getValidatedBody } from '../middleware/validate.js'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'

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
    stage: z.enum(['seed', 'sprout', 'bloom', 'fruit']).optional(),
    stageProgress: z.number().int().min(0).max(100).optional(),
    totalLearningMinutes: z.number().int().min(0).optional(),
  })
  .strict()

export function validatePetUpdatePayload(
  body: z.infer<typeof updatePetSchema>,
  existing: { stage: 'seed' | 'sprout' | 'bloom' | 'fruit' },
) {
  if (body.name && existing.stage !== 'seed') {
    return 'Name may only be changed when the pet is in seed stage'
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

// GET /api/v1/pets/mine — 获取当前用户的豆豆（首次自动创建）
petRoutes.get('/mine', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    let [pet] = await db.select().from(pets).where(eq(pets.userId, userId)).limit(1)

    // 首次访问自动创建豆豆（默认 seed 阶段）
    if (!pet) {
      const [created] = await db
        .insert(pets)
        .values({
          userId,
          name: '豆豆',
          birthPlace: 'forest',
          personality: 'curious',
          specialty: 'balanced',
        })
        .returning()
      res.status(201).json({ pet: created })
      return
    }

    res.json({ pet })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get pet' })
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

// PATCH /api/v1/pets/:id
petRoutes.patch('/:id', validateBody(updatePetSchema), async (req: Request, res: Response) => {
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

    if (body.name && existing.stage !== 'seed') {
      res.status(400).json({ error: 'Name may only be changed when the pet is in seed stage' })
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
})

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

    // 计算是否升级
    let newStage = pet.stage
    let newProgress = pet.stageProgress + (body.exp || 30)
    const stages = ['seed', 'sprout', 'bloom', 'fruit'] as const
    const currentStageIdx = stages.indexOf(pet.stage as any)

    if (newProgress >= 100 && currentStageIdx < stages.length - 1) {
      newStage = stages[currentStageIdx + 1]
      newProgress = 0

      await db.insert(petEvolutions).values({
        petId: pet.id,
        fromStage: pet.stage,
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
