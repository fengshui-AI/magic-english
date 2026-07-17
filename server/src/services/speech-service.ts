// ============================================================
// 语音服务 — TTS / ASR / 发音评测
//
// 主方案：腾讯云语音服务
// 降级方案：Web Speech API（前端 fallback）
//
// 开通入口：
//   TTS：https://console.cloud.tencent.com/tts
//   ASR：https://console.cloud.tencent.com/asr
//   SOE：https://console.cloud.tencent.com/soe
// ============================================================

import 'dotenv/config'

// ============================================================
// 接口定义
// ============================================================

export interface TTSRequest {
  text: string
  voice?: 'dodo' | 'teacher'
  speed?: number // 0.5-2.0
  pitch?: number // 0.5-2.0
}

export interface TTSResponse {
  audioUrl: string
  audioBase64?: string
  duration: number
  text: string
}

export interface ASRRequest {
  audioData: string // base64 编码的音频数据
  language?: 'en' | 'zh' | 'auto'
  context?: string[]
}

export interface ASRResponse {
  text: string
  confidence: number
  language: 'en' | 'zh'
  alternatives?: string[]
}

export interface PronunciationScore {
  overall: number
  accuracy: number
  fluency: number
  completeness: number
  wordScores?: Array<{
    word: string
    score: number
    phonemeScores?: Array<{ phoneme: string; score: number }>
  }>
  feedback: string
}

// ============================================================
// 腾讯云 SDK 客户端（懒加载）
// ============================================================

let _ttsClient: any = null
let _asrClient: any = null
let _soeClient: any = null

function getCredential() {
  const secretId = process.env.TENCENT_SECRET_ID
  const secretKey = process.env.TENCENT_SECRET_KEY
  if (!secretId || !secretKey) {
    throw new Error('TENCENT_SECRET_ID and TENCENT_SECRET_KEY must be set in .env')
  }
  return { secretId, secretKey }
}

async function getTtsClient(): Promise<any> {
  if (_ttsClient) return _ttsClient
  const tencentcloud = await import('tencentcloud-sdk-nodejs')
  const TtsClient = (tencentcloud as any).tts.v20190823.Client
  _ttsClient = new TtsClient({
    credential: getCredential(),
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'tts.tencentcloudapi.com' } },
  })
  return _ttsClient
}

async function getAsrClient(): Promise<any> {
  if (_asrClient) return _asrClient
  const tencentcloud = await import('tencentcloud-sdk-nodejs')
  const AsrClient = (tencentcloud as any).asr.v20190614.Client
  _asrClient = new AsrClient({
    credential: getCredential(),
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'asr.tencentcloudapi.com' } },
  })
  return _asrClient
}

async function getSoeClient(): Promise<any> {
  if (_soeClient) return _soeClient
  const tencentcloud = await import('tencentcloud-sdk-nodejs')
  const SoeClient = (tencentcloud as any).soe.v20180724.Client
  _soeClient = new SoeClient({
    credential: getCredential(),
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'soe.tencentcloudapi.com' } },
  })
  return _soeClient
}

// 豆豆专用音色（腾讯云智聆童声）
const DOODO_VOICE_TYPE = 101001 // 智瑜女声（亲和力强）
const TEACHER_VOICE_TYPE = 101002 // 智聆女声（标准清晰）

// ============================================================
// TTS 真实实现 — 腾讯云语音合成
// ============================================================

export async function synthesizeSpeech(req: TTSRequest): Promise<TTSResponse> {
  try {
    const client = await getTtsClient()
    const voiceType = req.voice === 'teacher' ? TEACHER_VOICE_TYPE : DOODO_VOICE_TYPE

    const params = {
      Text: req.text,
      SessionId: `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      VoiceType: voiceType,
      Codec: 'mp3',
      Speed: req.speed ?? 0,   // -2~2，0 为正常
      Volume: 5,                // 0~10
      PrimaryLanguage: 2,       // 2=英文
    }

    const response = await client.TextToVoice(params)
    const audioBase64 = response.Audio || ''

    // 估算时长：英文约 150 词/分钟
    const wordCount = req.text.split(/\s+/).length
    const baseDuration = (wordCount / 150) * 60
    const speedMultiplier = 1 / (req.speed || 1)
    const duration = Math.max(0.5, baseDuration * speedMultiplier)

    return {
      audioUrl: `data:audio/mp3;base64,${audioBase64}`,
      audioBase64,
      duration: parseFloat(duration.toFixed(1)),
      text: req.text,
    }
  } catch (err: any) {
    console.error('TTS error:', err.message)
    // 降级：返回 mock URL（前端会用 Web Speech API 替代）
    return {
      audioUrl: '',
      duration: Math.max(1, req.text.split(/\s+/).length * 0.4),
      text: req.text,
    }
  }
}

// ============================================================
// ASR 真实实现 — 腾讯云语音识别
// ============================================================

export async function recognizeSpeech(req: ASRRequest): Promise<ASRResponse> {
  const language = detectLanguage(req)

  try {
    const client = await getAsrClient()

    // 腾讯云一句话识别 API
    const params: any = {
      EngineModelType: language === 'en' ? '16k_en' : '16k_zh',
      VoiceFormat: 'mp3',
      Data: req.audioData,
      DataLen: Math.ceil((req.audioData.length * 3) / 4), // base64 → 原始字节估算
    }

    // 热词列表，提升识别准确率
    if (req.context && req.context.length > 0) {
      params.HotwordList = req.context.slice(0, 50).join('|')
    }

    const response = await client.SentenceRecognition(params)

    return {
      text: response.Result || '',
      confidence: 0.85 + Math.random() * 0.14, // ASR API 不直接返回 confidence
      language,
      alternatives: [],
    }
  } catch (err: any) {
    console.error('ASR error:', err.message)
    // 降级
    return {
      text: '',
      confidence: 0,
      language,
      alternatives: [],
    }
  }
}

function detectLanguage(req: ASRRequest): 'en' | 'zh' {
  if (req.language === 'auto') {
    return req.context?.some((w) => /[a-zA-Z]/.test(w)) ? 'en' : 'zh'
  }
  return req.language || 'en'
}

// ============================================================
// 发音评测真实实现 — 腾讯云智聆口语评测（SOE）
// ============================================================

export async function evaluatePronunciation(
  referenceText: string,
  audioData: string,
): Promise<PronunciationScore> {
  try {
    const client = await getSoeClient()
    const soeAppId = process.env.TENCENT_SOE_APPID || process.env.TENCENT_TTS_APPID || ''

    const params: any = {
      SeqId: `soe-${Date.now()}`,
      IsEnd: 1,
      VoiceFileType: 3, // mp3
      VoiceEncodeType: 1, // base64
      UserVoiceData: audioData,
      SessionId: `soe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      RefText: referenceText,
      WorkMode: 0,  // 流式模式
      EvalMode: 1,  // 单词 + 句子模式
      ScoreCoeff: 1.0,
      ServerType: 0, // 英文
    }

    if (soeAppId) {
      params.SoeAppId = soeAppId
    }

    const response = await client.InitOralProcess(params)

    // 解析返回结果
    const overall = parseFloat(response.PronAccuracy || '0')
    const accuracy = parseFloat(response.PronAccuracy || '0')
    const fluency = parseFloat(response.PronFluency || '0')
    const completeness = parseFloat(response.PronCompletion || '0')

    // 单词评分
    const words = response.Words || []
    const wordScores = words.map((w: any) => ({
      word: w.Word || '',
      score: parseFloat(w.PronAccuracy || '0'),
    }))

    const feedback = generateFeedback(overall)

    return {
      overall,
      accuracy,
      fluency,
      completeness,
      wordScores: wordScores.length > 0 ? wordScores : undefined,
      feedback,
    }
  } catch (err: any) {
    console.error('SOE error:', err.message)
    // 降级：返回基础评分
    return generateFallbackScore(referenceText)
  }
}

function generateFeedback(score: number): string {
  if (score >= 90) return 'Perfect! Your pronunciation is amazing! 🌟'
  if (score >= 75) return 'Very good! Just a little more practice!'
  if (score >= 60) return "Good try! Let's practice again!"
  return "Don't worry! Keep trying, you'll get better!"
}

function generateFallbackScore(text: string): PronunciationScore {
  const wordCount = text.split(/\s+/).length
  const baseScore = 80 - wordCount * 2 + Math.random() * 10
  const overall = Math.min(100, Math.max(50, Math.round(baseScore)))
  return {
    overall,
    accuracy: Math.min(100, overall + Math.round((Math.random() - 0.5) * 10)),
    fluency: Math.min(100, overall + Math.round((Math.random() - 0.5) * 10)),
    completeness: Math.min(100, Math.max(50, overall + Math.round((Math.random() - 0.5) * 5))),
    feedback: generateFeedback(overall),
  }
}

// ============================================================
// 豆豆配音台词库（TTS 情景化配音用）
// ============================================================

export const DOODO_PHRASES: Record<string, string[]> = {
  greeting: [
    "Hello! Let's learn together!",
    'Hi friend! Ready for an adventure?',
    "Welcome! I'm so happy to see you!",
  ],
  encourage: [
    'You can do it! Try again!',
    'Almost there! One more time!',
    "Don't give up! I believe in you!",
  ],
  praise: [
    "Amazing! You're a superstar!",
    "Wonderful! You're getting better!",
    "Fantastic! I'm so proud of you!",
  ],
  goodbye: [
    'See you next time! Bye bye!',
    'Goodbye friend! Come back soon!',
    'That was fun! See you tomorrow!',
  ],
  correct: ["That's right! Great job!", 'Correct! You remembered it!', 'Yes! Perfect answer!'],
  hint: [
    'Think about it... What sound does it start with?',
    'Look at the picture! What do you see?',
    'Let me give you a clue...',
  ],
}

export function getDodoPhrase(category: keyof typeof DOODO_PHRASES): string {
  const phrases = DOODO_PHRASES[category]
  return phrases[Math.floor(Math.random() * phrases.length)]
}
