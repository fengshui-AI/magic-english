import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware, getJwtPayload } from '../middleware/auth.js'
import { validateBody, getValidatedBody } from '../middleware/validate.js'
import { z } from 'zod'
import { db } from '../db/index.js'
import { dialogueSessions, users, streakRecords } from '../db/schemas/index.js'
import { eq, desc } from 'drizzle-orm'
import {
  createDialogueState,
  processChildMessage,
  generateGreeting,
  switchTopic,
  type DialogueState,
  type DodoReply,
} from '../services/dialogue-engine.js'
import { synthesizeSpeech } from '../services/speech-service.js'
import { emotionLogs } from '../db/schemas/index.js'

const dialogueRoutes = Router()

// 所有路由需要认证
dialogueRoutes.use(authMiddleware)

// ============================================================
// 内存中保存活跃对话状态（生产环境应使用 Redis）
// ============================================================
const activeSessions = new Map<string, DialogueState>()

// ============================================================
// POST /api/v1/dialogue/start — 开始对话会话
// ============================================================
const startSchema = z.object({
  grade: z.number().min(1).max(6).optional(),
  interestTags: z.array(z.string()).optional(),
})

dialogueRoutes.post('/start', validateBody(startSchema), async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof startSchema>(req)
    const { userId } = getJwtPayload(req)

    // 获取用户年级
    const [user] = await db
      .select({ grade: users.grade })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    const grade = body.grade || user?.grade || 3

    // 获取连胜数据
    const [streakRecord] = await db
      .select({ currentStreak: streakRecords.currentStreak })
      .from(streakRecords)
      .where(eq(streakRecords.userId, userId))
      .limit(1)
      .catch(() => [])

    const streak = streakRecord?.currentStreak || 0

    // 创建对话状态
    const state = createDialogueState(grade, body.interestTags)
    activeSessions.set(userId, state)

    // 创建数据库会话记录
    const [session] = await db
      .insert(dialogueSessions)
      .values({
        userId,
        sessionType: 'free_chat',
        messages: [],
        startedAt: new Date(),
      })
      .returning({ id: dialogueSessions.id })

    // 生成开场白
    const greeting = generateGreeting(grade, streak)

    // 合成开场白语音
    const tts = await synthesizeSpeech({ text: greeting.text, voice: 'dodo' })

    // 记录到历史
    if (greeting.stage) {
      state.history.push({
        speaker: 'dodo',
        content: greeting.text,
        translation: greeting.translation,
        timestamp: Date.now(),
      })
    }

    res.json({
      sessionId: session.id,
      message: greeting,
      audioUrl: tts.audioUrl,
      duration: tts.duration,
      topic: state.topic,
      targetWords: state.targetWords,
      stage: state.stage,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start dialogue' })
  }
})

// ============================================================
// POST /api/v1/dialogue/message — 发送孩子消息 + 获取回复
// ============================================================
const messageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(500),
  language: z.enum(['en', 'zh', 'mixed']).optional(),
})

dialogueRoutes.post(
  '/message',
  validateBody(messageSchema),
  async (req: Request, res: Response) => {
    try {
      const body = getValidatedBody<typeof messageSchema>(req)
      const { userId } = getJwtPayload(req)
      const state = activeSessions.get(userId)

      if (!state) {
        res.status(400).json({ error: 'No active dialogue session. Start one first.' })
        return
      }

      // 记录孩子的消息
      state.history.push({
        speaker: 'child',
        content: body.message,
        timestamp: Date.now(),
      })

      // 记录情感事件
      const hasEnglish = /[a-zA-Z]{2,}/.test(body.message)
      await db.insert(emotionLogs).values({
        userId,
        triggerEvent: hasEnglish ? 'greeting_response' : 'correct_answer',
        pleasure: 0.6 + Math.random() * 0.2,
        arousal: 0.5 + Math.random() * 0.3,
        closeness: 0.3 + Math.random() * 0.3,
        focusMatch: 0.5 + Math.random() * 0.3,
        rawSignals: { source: 'dialogue', messageLength: body.message.length, hasEnglish },
      })

      // 处理消息，生成 Dodo 回复
      const reply: DodoReply = processChildMessage(state, body.message)

      // 合成回复语音
      const tts = await synthesizeSpeech({ text: reply.text, voice: 'dodo' })

      // 记录到历史
      state.history.push({
        speaker: 'dodo',
        content: reply.text,
        translation: reply.translation,
        timestamp: Date.now(),
      })

      // 更新数据库会话
      await db
        .update(dialogueSessions)
        .set({
          messages: state.history,
          emotionSnapshot: { stage: state.stage, turn: state.turn },
        })
        .where(eq(dialogueSessions.id, body.sessionId))

      res.json({
        message: reply,
        audioUrl: tts.audioUrl,
        duration: tts.duration,
        stage: state.stage,
        childEnglishRatio: Math.round(state.childEnglishRatio * 100),
        turn: state.turn,
        totalTurns: state.totalTurns,
      })
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to process message' })
    }
  },
)

// ============================================================
// POST /api/v1/dialogue/end — 结束对话会话
// ============================================================
const endSchema = z.object({
  sessionId: z.string().uuid(),
})

dialogueRoutes.post('/end', validateBody(endSchema), async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof endSchema>(req)
    const { userId } = getJwtPayload(req)
    const state = activeSessions.get(userId)

    // 结束会话
    activeSessions.delete(userId)

    // 更新数据
    const stats = state
      ? {
          totalTurns: state.totalTurns,
          childEnglishRatio: Math.round(state.childEnglishRatio * 100),
          childSentenceCount: state.childSentenceCount,
          topic: state.topic,
          wordsUsed: state.targetWords.filter((w) =>
            state.lastChildMessage.toLowerCase().includes(w.toLowerCase()),
          ),
        }
      : null

    await db
      .update(dialogueSessions)
      .set({
        endedAt: new Date(),
        messages: state?.history || [],
        emotionSnapshot: {
          stats,
          ended: true,
        },
      })
      .where(eq(dialogueSessions.id, body.sessionId))

    // 记录完成事件
    await db.insert(emotionLogs).values({
      userId,
      triggerEvent: 'session_complete',
      pleasure: 0.7 + Math.random() * 0.2,
      arousal: 0.5 + Math.random() * 0.3,
      closeness: 0.5 + Math.random() * 0.3,
      focusMatch: 0.6 + Math.random() * 0.3,
      rawSignals: { source: 'dialogue', ...stats },
    })

    res.json({
      ended: true,
      stats: stats || { totalTurns: 0, childEnglishRatio: 0, childSentenceCount: 0 },
      message: {
        text: 'Great chat! See you next time! 💝',
        translation: '聊得很开心！下次再见�?',
        expression: 'happy',
        animation: 'wave',
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to end dialogue' })
  }
})

// ============================================================
// GET /api/v1/dialogue/history — 获取对话历史
// ============================================================
dialogueRoutes.get('/history', async (req: Request, res: Response) => {
  try {
    const { userId } = getJwtPayload(req)

    const sessions = await db
      .select({
        id: dialogueSessions.id,
        sessionType: dialogueSessions.sessionType,
        startedAt: dialogueSessions.startedAt,
        endedAt: dialogueSessions.endedAt,
        messages: dialogueSessions.messages,
        emotionSnapshot: dialogueSessions.emotionSnapshot,
      })
      .from(dialogueSessions)
      .where(eq(dialogueSessions.userId, userId))
      .orderBy(desc(dialogueSessions.startedAt))
      .limit(20)

    res.json({ sessions })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get dialogue history' })
  }
})

// ============================================================
// POST /api/v1/dialogue/switch-topic — 切换话题
// ============================================================
const switchTopicSchema = z.object({
  grade: z.number().min(1).max(6).optional(),
})

dialogueRoutes.post(
  '/switch-topic',
  validateBody(switchTopicSchema),
  async (req: Request, res: Response) => {
    try {
      const body = getValidatedBody<typeof switchTopicSchema>(req)
      const { userId } = getJwtPayload(req)
      const state = activeSessions.get(userId)

      if (!state) {
        res.status(400).json({ error: 'No active session' })
        return
      }

      const [user] = await db
        .select({ grade: users.grade })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      const grade = body.grade || user?.grade || 3

      const newTopic = switchTopic(grade, state.topic)
      state.topic = newTopic.topic
      state.targetWords = newTopic.words
      state.targetSentence = newTopic.sentence
      state.stage = 'topic'
      state.turn = 0

      const introText = `Let's talk about ${newTopic.topic}! I love ${newTopic.topic}! What do you think?`
      const tts = await synthesizeSpeech({ text: introText, voice: 'dodo' })

      state.history.push({
        speaker: 'dodo',
        content: introText,
        timestamp: Date.now(),
      })

      res.json({
        topic: newTopic.topic,
        targetWords: newTopic.words,
        message: {
          text: introText,
          translation: `我们聊聊${newTopic.topic}吧！你觉得呢？`,
          expression: 'excited',
          animation: 'sparkle',
          stage: 'topic',
        },
        audioUrl: tts.audioUrl,
      })
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to switch topic' })
    }
  },
)

// ============================================================
// POST /api/v1/dialogue/tts — 文字转语音
// ============================================================
const ttsSchema = z.object({
  text: z.string().min(1).max(500),
  voice: z.enum(['dodo', 'teacher']).optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
})

dialogueRoutes.post('/tts', validateBody(ttsSchema), async (req: Request, res: Response) => {
  try {
    const body = getValidatedBody<typeof ttsSchema>(req)
    const result = await synthesizeSpeech({
      text: body.text,
      voice: body.voice || 'dodo',
      speed: body.speed || 1,
    })

    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to synthesize speech' })
  }
})

// ============================================================
// POST /api/v1/dialogue/pronounce — 发音评测
// ============================================================
const pronounceSchema = z.object({
  referenceText: z.string().min(1).max(200),
  audioData: z.string().optional(),
})

dialogueRoutes.post(
  '/pronounce',
  validateBody(pronounceSchema),
  async (req: Request, res: Response) => {
    try {
      const body = getValidatedBody<typeof pronounceSchema>(req)
      const { evaluatePronunciation } = await import('../services/speech-service.js')
      const result = await evaluatePronunciation(body.referenceText, body.audioData || '')

      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to evaluate pronunciation' })
    }
  },
)

export { dialogueRoutes }
