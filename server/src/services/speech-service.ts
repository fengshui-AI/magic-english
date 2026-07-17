// ============================================================
// 语音服务 — TTS（文字转语音）+ ASR（语音识别）模拟层
//
// 真实接入方案（按需替换）：
//   - 腾讯云 TTS：https://cloud.tencent.com/document/product/1073
//   - 腾讯云 ASR：https://cloud.tencent.com/document/product/1093
//   - Web Speech API（浏览器端直接调用）
//
// 当前为模拟实现，返回 mock 数据供前端联调
// ============================================================

export interface TTSRequest {
  text: string
  voice?: 'dodo' | 'teacher'
  speed?: number // 0.5-2.0
  pitch?: number // 0.5-2.0
}

export interface TTSResponse {
  audioUrl: string // 模拟音频 URL
  duration: number // 秒
  text: string
  wordTimestamps?: Array<{ word: string; start: number; end: number }>
}

export interface ASRRequest {
  audioData: string // base64 编码的音频数据
  language?: 'en' | 'zh' | 'auto'
  context?: string[] // 期望词汇列表，提升识别准确率
}

export interface ASRResponse {
  text: string
  confidence: number // 0-1
  language: 'en' | 'zh'
  alternatives?: string[]
}

export interface PronunciationScore {
  overall: number // 0-100 总体评分
  accuracy: number // 准确度
  fluency: number // 流利度
  completeness: number // 完整度
  wordScores?: Array<{
    word: string
    score: number
    phonemeScores?: Array<{ phoneme: string; score: number }>
  }>
  feedback: string
}

// ============================================================
// TTS 模拟实现
// ============================================================
const DOODO_VOICE_BASE = 'https://tts.mock.local/dodo'

export async function synthesizeSpeech(req: TTSRequest): Promise<TTSResponse> {
  // 模拟：计算文本朗读时长（英文约 150 词/分钟）
  const wordCount = req.text.split(/\s+/).length
  const baseDuration = (wordCount / 150) * 60
  const speedMultiplier = 1 / (req.speed || 1)
  const duration = Math.max(1, baseDuration * speedMultiplier)

  // 模拟逐词时间戳
  const words = req.text.split(/\s+/).filter((w) => w.length > 0)
  const wordDuration = duration / words.length
  const wordTimestamps = words.map((word, i) => ({
    word,
    start: parseFloat((i * wordDuration).toFixed(2)),
    end: parseFloat(((i + 1) * wordDuration).toFixed(2)),
  }))

  return {
    audioUrl: `${DOODO_VOICE_BASE}/${encodeURIComponent(req.text.substring(0, 30))}.mp3`,
    duration: parseFloat(duration.toFixed(1)),
    text: req.text,
    wordTimestamps,
  }
}

// ============================================================
// ASR 模拟实现
// ============================================================
export async function recognizeSpeech(req: ASRRequest): Promise<ASRResponse> {
  // 模拟：返回基于上下文的识别结果
  // 在生产环境中，这里调用腾讯云 ASR API
  const language =
    req.language === 'auto'
      ? req.context?.some((w) => /[a-zA-Z]/.test(w))
        ? 'en'
        : 'zh'
      : req.language || 'en'

  return {
    text: '',
    confidence: 0.85 + Math.random() * 0.14,
    language,
    alternatives: [],
  }
}

// ============================================================
// 发音评测模拟实现
// ============================================================
export async function evaluatePronunciation(
  referenceText: string,
  _audioData: string,
): Promise<PronunciationScore> {
  // 模拟：根据文本难度和随机因素生成评分
  const wordCount = referenceText.split(/\s+/).length

  // 基础分随词数略降
  const baseScore = 85 - wordCount * 2 + Math.random() * 20
  const overall = Math.min(100, Math.max(40, Math.round(baseScore)))
  const accuracy = Math.min(100, Math.max(30, overall + Math.round((Math.random() - 0.5) * 20)))
  const fluency = Math.min(100, Math.max(30, overall + Math.round((Math.random() - 0.5) * 15)))
  const completeness = Math.min(100, Math.max(50, overall + Math.round((Math.random() - 0.5) * 10)))

  // 逐词评分
  const words = referenceText.split(/\s+/).filter((w) => w.length > 0)
  const wordScores = words.map((word) => ({
    word,
    score: Math.min(100, Math.max(40, overall + Math.round((Math.random() - 0.5) * 30))),
  }))

  const feedback =
    overall >= 90
      ? 'Perfect! Your pronunciation is amazing! 🌟'
      : overall >= 75
        ? 'Very good! Just a little more practice!'
        : overall >= 60
          ? "Good try! Let's practice again!"
          : "Don't worry! Keep trying, you'll get better!"

  return {
    overall,
    accuracy,
    fluency,
    completeness,
    wordScores,
    feedback,
  }
}

// ============================================================
// 豆豆配音台词库（用于 TTS 情景化配音）
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
