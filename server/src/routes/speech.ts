import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { validateBody, getValidatedBody } from '../middleware/validate.js'
import {
  synthesizeSpeech,
  recognizeSpeech,
  evaluatePronunciation,
} from '../services/speech-service.js'

export const speechRoutes = Router()

// ============================================================
// POST /api/v1/speech/tts — 文字转语音
// ============================================================
const ttsSchema = z.object({
  text: z.string().min(1).max(500),
  voice: z.enum(['dodo', 'teacher']).optional().default('dodo'),
  speed: z.number().min(0.5).max(2.0).optional().default(1.0),
})

speechRoutes.post('/tts', validateBody(ttsSchema), async (req: Request, res: Response) => {
  const body = getValidatedBody<typeof ttsSchema>(req)
  const result = await synthesizeSpeech({
    text: body.text,
    voice: body.voice,
    speed: body.speed,
  })
  res.json(result)
})

// ============================================================
// POST /api/v1/speech/asr — 语音识别
// ============================================================
const asrSchema = z.object({
  audioData: z.string().min(1),
  language: z.enum(['en', 'zh', 'auto']).optional().default('auto'),
  context: z.array(z.string()).optional(),
})

speechRoutes.post('/asr', validateBody(asrSchema), async (req: Request, res: Response) => {
  const body = getValidatedBody<typeof asrSchema>(req)
  const result = await recognizeSpeech({
    audioData: body.audioData,
    language: body.language,
    context: body.context,
  })
  res.json(result)
})

// ============================================================
// POST /api/v1/speech/evaluate — 发音评测
// ============================================================
const evaluateSchema = z.object({
  referenceText: z.string().min(1).max(200),
  audioData: z.string().min(1),
})

speechRoutes.post('/evaluate', validateBody(evaluateSchema), async (req: Request, res: Response) => {
  const body = getValidatedBody<typeof evaluateSchema>(req)
  const result = await evaluatePronunciation(body.referenceText, body.audioData)
  res.json(result)
})
