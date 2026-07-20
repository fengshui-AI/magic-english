// ============================================================
// 装饰品 API — PRD 10.2 豆豆装扮系统
// ============================================================
import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { db } from '../db/index.js'
import { decorations, userDecorations, users } from '../db/schemas/index.js'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { spendStarlight, earnStarlight } from '../services/starlight-service.js'

export const decorationRoutes = Router()

decorationRoutes.use(authMiddleware)

// ============================================================
// 装饰品种子数据（首次启动时自动插入）
// ============================================================

const SEED_DECORATIONS = [
  // ---- 头饰 (head) ----
  { type: 'head', name: '蝴蝶结', emoji: '🎀', unlockType: 'starlight', unlockValue: 20, slot: 'head', sortOrder: 1 },
  { type: 'head', name: '小皇冠', emoji: '👑', unlockType: 'starlight', unlockValue: 40, slot: 'head', sortOrder: 2 },
  { type: 'head', name: '花朵发卡', emoji: '🌸', unlockType: 'starlight', unlockValue: 15, slot: 'head', sortOrder: 3 },
  { type: 'head', name: '星星发卡', emoji: '⭐', unlockType: 'starlight', unlockValue: 15, slot: 'head', sortOrder: 4 },
  { type: 'head', name: '小帽子', emoji: '🎩', unlockType: 'starlight', unlockValue: 25, slot: 'head', sortOrder: 5 },
  { type: 'head', name: '小芽发卡', emoji: '🌱', unlockType: 'growth_milestone', unlockValue: 1, slot: 'head', sortOrder: 6 },
  { type: 'head', name: '坚持之星', emoji: '🌟', unlockType: 'streak_milestone', unlockValue: 7, slot: 'head', sortOrder: 7 },

  // ---- 面部 (face) ----
  { type: 'face', name: '圆眼镜', emoji: '👓', unlockType: 'starlight', unlockValue: 20, slot: 'face', sortOrder: 10 },
  { type: 'face', name: '墨镜', emoji: '😎', unlockType: 'starlight', unlockValue: 35, slot: 'face', sortOrder: 11 },
  { type: 'face', name: '小胡子', emoji: '👨', unlockType: 'starlight', unlockValue: 25, slot: 'face', sortOrder: 12 },

  // ---- 颈部 (neck) ----
  { type: 'neck', name: '温暖围巾', emoji: '🧣', unlockType: 'starlight', unlockValue: 25, slot: 'neck', sortOrder: 20 },
  { type: 'neck', name: '小领结', emoji: '🎀', unlockType: 'starlight', unlockValue: 20, slot: 'neck', sortOrder: 21 },
  { type: 'neck', name: '雪花围巾', emoji: '❄️', unlockType: 'easter_egg', unlockValue: 0, slot: 'neck', sortOrder: 22 },

  // ---- 背部 (back) ----
  { type: 'back', name: '蝴蝶翅膀', emoji: '🦋', unlockType: 'theme_mastery', unlockValue: 0, theme: 'animal', slot: 'back', sortOrder: 30 },
  { type: 'back', name: '小书包', emoji: '🎒', unlockType: 'starlight', unlockValue: 30, slot: 'back', sortOrder: 31 },
  { type: 'back', name: '小披风', emoji: '🦸', unlockType: 'starlight', unlockValue: 35, slot: 'back', sortOrder: 32 },

  // ---- 尾饰 (tail) ----
  { type: 'tail', name: '小铃铛', emoji: '🔔', unlockType: 'starlight', unlockValue: 20, slot: 'tail', sortOrder: 40 },
  { type: 'tail', name: '星星尾巴', emoji: '⭐', unlockType: 'starlight', unlockValue: 25, slot: 'tail', sortOrder: 41 },

  // ---- 手持 (hand) ----
  { type: 'hand', name: '魔法棒', emoji: '🪄', unlockType: 'starlight', unlockValue: 30, slot: 'hand', sortOrder: 50 },
  { type: 'hand', name: '小旗子', emoji: '🚩', unlockType: 'starlight', unlockValue: 20, slot: 'hand', sortOrder: 51 },
  { type: 'hand', name: '故事书', emoji: '📖', unlockType: 'starlight', unlockValue: 25, slot: 'hand', sortOrder: 52 },
  { type: 'hand', name: '小灯笼', emoji: '🏮', unlockType: 'easter_egg', unlockValue: 0, slot: 'hand', sortOrder: 53 },

  // ---- 特效 (effect) ----
  { type: 'effect', name: '金色光晕', emoji: '✨', unlockType: 'starlight', unlockValue: 50, slot: 'effect', sortOrder: 60 },
  { type: 'effect', name: '花瓣飘落', emoji: '🌸', unlockType: 'starlight', unlockValue: 40, slot: 'effect', sortOrder: 61 },
  { type: 'effect', name: '泡泡环绕', emoji: '🫧', unlockType: 'starlight', unlockValue: 35, slot: 'effect', sortOrder: 62 },
  { type: 'effect', name: '星光闪烁', emoji: '💫', unlockType: 'starlight', unlockValue: 45, slot: 'effect', sortOrder: 63 },
  { type: 'effect', name: '夜光蘑菇', emoji: '🍄', unlockType: 'easter_egg', unlockValue: 0, slot: 'effect', sortOrder: 64 },
]

// ============================================================
// 种子数据初始化（幂等）
// ============================================================

async function ensureSeedDecorations() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(decorations)
  if ((existing[0]?.count ?? 0) > 0) return

  console.log('🌱 Seeding decorations...')
  for (const deco of SEED_DECORATIONS) {
    await db.insert(decorations).values({
      type: deco.type,
      name: deco.name,
      emoji: deco.emoji,
      theme: deco.theme || null as any,
      unlockType: deco.unlockType,
      unlockValue: deco.unlockValue,
      slot: deco.slot,
      sortOrder: deco.sortOrder,
    })
  }
  console.log(`✅ ${SEED_DECORATIONS.length} decorations seeded`)
}

// 首次调用时初始化
ensureSeedDecorations().catch((e) => console.warn('Decoration seed warning:', e.message))

// ============================================================
// GET /api/v1/decorations — 获取所有装饰品（含用户解锁/穿戴状态）
// ============================================================
decorationRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    // 获取用户年级
    const [user] = await db
      .select({ grade: users.grade })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    const grade = user?.grade ?? 3

    // 获取所有装饰品
    const allDecos = await db
      .select()
      .from(decorations)
      .where(
        and(
          sql`grade_min <= ${grade}`,
          sql`grade_max >= ${grade}`,
        ),
      )
      .orderBy(sql`sort_order`)

    // 获取用户已解锁的
    const owned = await db
      .select()
      .from(userDecorations)
      .where(eq(userDecorations.userId, userId))

    const ownedMap = new Map(owned.map((o: typeof userDecorations.$inferSelect) => [o.decorationId, o]))

    const list = allDecos.map((d: typeof decorations.$inferSelect) => ({
      id: d.id,
      type: d.type,
      name: d.name,
      emoji: d.emoji,
      theme: d.theme,
      unlockType: d.unlockType,
      unlockValue: d.unlockValue,
      slot: d.slot,
      owned: ownedMap.has(d.id),
      equipped: (ownedMap.get(d.id) as any)?.equipped ?? false,
    }))

    res.json({ decorations: list })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get decorations' })
  }
})

// ============================================================
// POST /api/v1/decorations/:id/unlock — 消耗星光解锁装饰品
// ============================================================
decorationRoutes.post('/:id/unlock', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const decorationId = req.params.id

    // 查找装饰品
    const [deco] = await db
      .select()
      .from(decorations)
      .where(sql`${decorations.id} = ${decorationId}::uuid`)
      .limit(1)

    if (!deco) {
      res.status(404).json({ error: 'Decoration not found' })
      return
    }

    // 检查是否已拥有
    const [owned] = await db
      .select()
      .from(userDecorations)
      .where(
        and(
          eq(userDecorations.userId, userId),
          sql`${userDecorations.decorationId} = ${decorationId}::uuid`,
        ),
      )
      .limit(1)

    if (owned) {
      res.status(400).json({ error: 'Already owned' })
      return
    }

    // 星光点亮类型：消耗星光
    if (deco.unlockType === 'starlight') {
      const result = await spendStarlight(userId, deco.unlockValue, Array.isArray(decorationId) ? decorationId[0] : decorationId)
      if (!result.success) {
        res.status(400).json({ error: 'Insufficient starlight', balance: result.balance })
        return
      }
    }

    // 其他类型（成就/里程碑）由后端自动触发，不通过此接口

    // 记录解锁
    await db.insert(userDecorations).values({
      userId,
      decorationId,
      equipped: false,
    })

    res.json({ unlocked: true, decorationId })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unlock decoration' })
  }
})

// ============================================================
// POST /api/v1/decorations/:id/equip — 穿戴装饰品
// ============================================================
decorationRoutes.post('/:id/equip', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const decorationId = req.params.id

    // 查找装饰品
    const [deco] = await db
      .select()
      .from(decorations)
      .where(sql`${decorations.id} = ${decorationId}::uuid`)
      .limit(1)

    if (!deco) {
      res.status(404).json({ error: 'Decoration not found' })
      return
    }

    // 检查是否拥有
    const [owned] = await db
      .select()
      .from(userDecorations)
      .where(
        and(
          eq(userDecorations.userId, userId),
          sql`${userDecorations.decorationId} = ${decorationId}::uuid`,
        ),
      )
      .limit(1)

    if (!owned) {
      res.status(400).json({ error: 'Not owned' })
      return
    }

    // 同部位只能穿一件，先卸下同部位的其他装饰品
    const sameSlot = await db
      .select({
        id: decorations.id,
        udId: userDecorations.id,
      })
      .from(userDecorations)
      .innerJoin(decorations, sql`${userDecorations.decorationId} = ${decorations.id}`)
      .where(
        and(
          eq(userDecorations.userId, userId),
          eq(decorations.slot, deco.slot || ''),
          eq(userDecorations.equipped, true),
        ),
      )

    for (const item of sameSlot) {
      await db
        .update(userDecorations)
        .set({ equipped: false })
        .where(eq(userDecorations.id, item.udId))
    }

    // 穿戴
    await db
      .update(userDecorations)
      .set({ equipped: true })
      .where(eq(userDecorations.id, owned.id))

    res.json({ equipped: true, decorationId })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to equip decoration' })
  }
})

// ============================================================
// POST /api/v1/decorations/:id/unequip — 卸下装饰品
// ============================================================
decorationRoutes.post('/:id/unequip', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const decorationId = req.params.id

    const [owned] = await db
      .select()
      .from(userDecorations)
      .where(
        and(
          eq(userDecorations.userId, userId),
          sql`${userDecorations.decorationId} = ${decorationId}::uuid`,
        ),
      )
      .limit(1)

    if (!owned) {
      res.status(404).json({ error: 'Not owned' })
      return
    }

    await db
      .update(userDecorations)
      .set({ equipped: false })
      .where(eq(userDecorations.id, owned.id))

    res.json({ unequipped: true, decorationId })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unequip decoration' })
  }
})

// ============================================================
// POST /api/v1/decorations/auto-unlock — 自动解锁（成就/里程碑触发）
// 由其他服务调用，不暴露给前端
// ============================================================
decorationRoutes.post('/auto-unlock', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)
    const { unlockType, unlockValue, theme } = req.body as {
      unlockType: string
      unlockValue?: number
      theme?: string
    }

    // 查找匹配的装饰品
    const conditions = [eq(decorations.unlockType, unlockType)]
    if (theme) {
      conditions.push(eq(decorations.theme, theme))
    }

    const matching = await db
      .select()
      .from(decorations)
      .where(and(...conditions))

    let unlocked = 0
    for (const deco of matching) {
      // 检查是否已拥有
      const [owned] = await db
        .select()
        .from(userDecorations)
        .where(
          and(
            eq(userDecorations.userId, userId),
            sql`${userDecorations.decorationId} = ${deco.id}::uuid`,
          ),
        )
        .limit(1)

      if (owned) continue

      // 检查条件是否满足（streak_milestone / growth_milestone）
      if (unlockType === 'streak_milestone' && unlockValue && unlockValue >= deco.unlockValue) {
        await db.insert(userDecorations).values({
          userId,
          decorationId: deco.id,
          equipped: false,
        })
        unlocked++
      } else if (unlockType === 'growth_milestone' && unlockValue && unlockValue >= deco.unlockValue) {
        await db.insert(userDecorations).values({
          userId,
          decorationId: deco.id,
          equipped: false,
        })
        unlocked++
      } else if (unlockType === 'theme_mastery' && theme) {
        await db.insert(userDecorations).values({
          userId,
          decorationId: deco.id,
          equipped: false,
        })
        unlocked++
      }
    }

    res.json({ unlocked })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to auto-unlock' })
  }
})
