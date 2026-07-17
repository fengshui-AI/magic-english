// ============================================================
// 对话 API — 前端调用封装
// ============================================================
import { apiRequest } from './client'
import type { DialogueMessage } from '../types'

export interface DialogueStartRequest {
  grade?: number
  interestTags?: string[]
}

export interface DodoMessage {
  text: string
  translation?: string
  expression: 'happy' | 'excited' | 'thinking' | 'encouraging' | 'proud' | 'normal'
  animation: 'bounce' | 'wave' | 'nod' | 'sparkle' | 'clap' | 'idle'
  followUp?: string
  stage?: string
}

export interface DialogueStartResponse {
  sessionId: string
  message: DodoMessage
  audioUrl: string
  duration: number
  topic: string
  targetWords: string[]
  stage: string
}

export interface DialogueMessageResponse {
  message: DodoMessage
  audioUrl: string
  duration: number
  stage: string
  childEnglishRatio: number
  turn: number
  totalTurns: number
}

export interface DialogueEndResponse {
  ended: boolean
  stats: {
    totalTurns: number
    childEnglishRatio: number
    childSentenceCount: number
    topic?: string
    wordsUsed?: string[]
  }
  message: DodoMessage
}

export interface DialogueSession {
  id: string
  sessionType: string
  startedAt: string
  endedAt: string | null
  messages: DialogueMessage[]
  emotionSnapshot?: any
}

export interface TTSResponse {
  audioUrl: string
  duration: number
  text: string
}

export interface PronounceScore {
  overall: number
  accuracy: number
  fluency: number
  completeness: number
  wordScores?: Array<{ word: string; score: number }>
  feedback: string
}

export const dialogueApi = {
  /** 开始对话 */
  start: (data: DialogueStartRequest) =>
    apiRequest<DialogueStartResponse>('/dialogue/start', { method: 'POST', body: data }),

  /** 发送消息 */
  sendMessage: (sessionId: string, message: string, language?: string) =>
    apiRequest<DialogueMessageResponse>('/dialogue/message', {
      method: 'POST',
      body: { sessionId, message, language: language || 'mixed' },
    }),

  /** 结束对话 */
  end: (sessionId: string) =>
    apiRequest<DialogueEndResponse>('/dialogue/end', { method: 'POST', body: { sessionId } }),

  /** 获取历史会话 */
  getHistory: () => apiRequest<{ sessions: DialogueSession[] }>('/dialogue/history'),

  /** 切换话题 */
  switchTopic: (grade?: number) =>
    apiRequest<{
      topic: string
      targetWords: string[]
      message: DodoMessage
      audioUrl: string
    }>('/dialogue/switch-topic', { method: 'POST', body: { grade } }),

  /** TTS */
  tts: (text: string, voice?: 'dodo' | 'teacher', speed?: number) =>
    apiRequest<TTSResponse>('/dialogue/tts', {
      method: 'POST',
      body: { text, voice: voice || 'dodo', speed: speed || 1 },
    }),

  /** 发音评测 */
  evaluatePronunciation: (referenceText: string, audioData?: string) =>
    apiRequest<PronounceScore>('/dialogue/pronounce', {
      method: 'POST',
      body: { referenceText, audioData },
    }),
}
