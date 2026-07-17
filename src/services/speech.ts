// ============================================================
// 语音服务 — 浏览器端 + 服务端混合方案
//
// TTS：优先服务端腾讯云（发音标准），降级 Web Speech API
// ASR：优先服务端腾讯云（准确率高），降级 Web Speech API
// 发音评测：必须通过服务端 API
// ============================================================

// TypeScript 类型声明
declare class SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

// ============================================================
// TTS — 文字转语音（浏览器端）
// ============================================================
export interface TTSOptions {
  text: string
  voice?: 'dodo' | 'teacher'
  rate?: number // 0.5-2.0
  pitch?: number // 0.5-2.0
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: Error) => void
}

export function speakText(options: TTSOptions): SpeechSynthesisUtterance | null {
  if (!('speechSynthesis' in window)) {
    options.onError?.(new Error('SpeechSynthesis not supported'))
    return null
  }

  // 取消当前播放
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(options.text)
  utterance.rate = options.rate || 0.85
  utterance.pitch = options.pitch || (options.voice === 'dodo' ? 1.3 : 1.0)
  utterance.lang = 'en-US'

  // 选择合适的语音
  const voices = window.speechSynthesis.getVoices()
  const preferredVoice =
    voices.find((v) => v.lang.startsWith('en') && v.name.includes('Female')) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0]

  if (preferredVoice) {
    utterance.voice = preferredVoice
  }

  utterance.onstart = () => options.onStart?.()
  utterance.onend = () => options.onEnd?.()
  utterance.onerror = (e) => {
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      options.onError?.(new Error(`TTS error: ${e.error}`))
    }
  }

  window.speechSynthesis.speak(utterance)
  return utterance
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

// ============================================================
// ASR — 语音识别（浏览器端 Web Speech API）
// ============================================================
export interface ASROptions {
  language?: 'en' | 'zh' | 'auto'
  continuous?: boolean
  interimResults?: boolean
  onResult?: (text: string, isFinal: boolean, confidence: number) => void
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: Error) => void
  onNoMatch?: () => void
}

export class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null
  private options: ASROptions
  private _isListening = false

  constructor(options: ASROptions = {}) {
    this.options = options
    this.init()
  }

  private init() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      this.options.onError?.(new Error('SpeechRecognition not supported'))
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = this.options.language === 'zh' ? 'zh-CN' : 'en-US'
    recognition.continuous = this.options.continuous ?? false
    recognition.interimResults = this.options.interimResults ?? true
    recognition.maxAlternatives = 3

    recognition.onstart = () => {
      this._isListening = true
      this.options.onStart?.()
    }

    recognition.onend = () => {
      this._isListening = false
      this.options.onEnd?.()
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        this.options.onNoMatch?.()
      } else if (event.error !== 'aborted') {
        this.options.onError?.(new Error(`ASR error: ${event.error}`))
      }
    }

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1]
      const text = last[0].transcript
      const isFinal = last.isFinal
      const confidence = last[0].confidence || 0.8
      this.options.onResult?.(text, isFinal, confidence)
    }

    this.recognition = recognition
  }

  get isListening(): boolean {
    return this._isListening
  }

  start(): void {
    if (!this.recognition) {
      this.options.onError?.(new Error('SpeechRecognition not available'))
      return
    }
    try {
      this.recognition.start()
    } catch (e: any) {
      if (e.name === 'InvalidStateError') {
        // 可能已经启动了，先停止再启动
        this.recognition.stop()
        setTimeout(() => this.recognition?.start(), 100)
      } else {
        this.options.onError?.(e)
      }
    }
  }

  stop(): void {
    this.recognition?.stop()
  }

  abort(): void {
    this.recognition?.abort()
  }

  setLanguage(lang: 'en' | 'zh'): void {
    if (this.recognition) {
      this.recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US'
    }
  }
}

// ============================================================
// 录音管理器 — MediaRecorder API（用于发送到后端评测）
// ============================================================
export interface RecordOptions {
  mimeType?: string
  onStart?: () => void
  onStop?: (blob: Blob) => void
  onError?: (err: Error) => void
  onDataAvailable?: (chunk: Blob) => void
  timeSlice?: number // ms，切片间隔
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private options: RecordOptions
  private _isRecording = false
  private analyser: AnalyserNode | null = null
  private audioContext: AudioContext | null = null

  constructor(options: RecordOptions = {}) {
    this.options = options
  }

  get isRecording(): boolean {
    return this._isRecording
  }

  /**
   * 获取当前音量级别 (0-1)，用于录音波形显示
   */
  getVolume(): number {
    if (!this.analyser) return 0
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
    return Math.min(1, average / 128)
  }

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // 设置音频分析器
      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(this.stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      const mimeType = this.options.mimeType || this.getSupportedMimeType()
      this.chunks = []
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 16000,
      })

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data)
          this.options.onDataAvailable?.(e.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType })
        this.options.onStop?.(blob)
        this.cleanup()
      }

      this.mediaRecorder.start(this.options.timeSlice || 100)
      this._isRecording = true
      this.options.onStart?.()
    } catch (err: any) {
      this.options.onError?.(err)
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    this._isRecording = false
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
    this.analyser = null
    this.mediaRecorder = null
    this._isRecording = false
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ]
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return 'audio/webm'
  }
}

// ============================================================
// 权限检测
// ============================================================
export async function checkAudioPermission(): Promise<
  'granted' | 'denied' | 'prompt' | 'unsupported'
> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'unsupported'
  }
  try {
    // 使用 permissions API
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      return result.state as 'granted' | 'denied' | 'prompt'
    }
    return 'prompt'
  } catch {
    return 'prompt'
  }
}

export async function requestAudioPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

// ============================================================
// 服务端语音 API 调用（腾讯云，主方案）
// ============================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

/** 调用服务端 TTS，返回 base64 音频 */
export async function serverTTS(
  text: string,
  voice: 'dodo' | 'teacher' = 'dodo',
  speed = 1.0,
): Promise<{ audioBase64: string; duration: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/speech/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { audioBase64: data.audioBase64 || '', duration: data.duration || 0 }
  } catch {
    return null
  }
}

/** 调用服务端 TTS 并直接播放 */
export async function speakServerTTS(
  text: string,
  voice: 'dodo' | 'teacher' = 'dodo',
): Promise<boolean> {
  const result = await serverTTS(text, voice)
  if (!result?.audioBase64) return false

  try {
    const audio = new Audio(`data:audio/mp3;base64,${result.audioBase64}`)
    await audio.play()
    return true
  } catch {
    return false
  }
}

/** 调用服务端 ASR 识别音频 */
export async function serverASR(
  audioBase64: string,
  language: 'en' | 'zh' | 'auto' = 'auto',
  context?: string[],
): Promise<{ text: string; confidence: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/speech/asr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioData: audioBase64, language, context }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 调用服务端发音评测 */
export async function serverEvaluate(
  referenceText: string,
  audioBase64: string,
): Promise<{
  overall: number
  accuracy: number
  fluency: number
  completeness: number
  feedback: string
  wordScores?: Array<{ word: string; score: number }>
} | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/speech/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceText, audioData: audioBase64 }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 智能 TTS：先尝试服务端，失败则降级到 Web Speech API */
export async function smartSpeak(
  text: string,
  voice: 'dodo' | 'teacher' = 'dodo',
  fallbackOptions?: Partial<TTSOptions>,
): Promise<void> {
  // 优先服务端
  const serverOk = await speakServerTTS(text, voice)
  if (serverOk) return

  // 降级到浏览器 TTS
  speakText({
    text,
    voice,
    ...fallbackOptions,
  })
}
