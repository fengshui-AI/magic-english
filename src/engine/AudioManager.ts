/**
 * 三轨独立音频管理器
 * 轨道：BGM（背景音乐）、SFX（音效）、Voice（豆豆语音）
 * 特性：优先级控制、防重叠、淡入淡出、互斥 ducking
 */

export type AudioTrack = 'bgm' | 'sfx' | 'voice'

interface TrackState {
  audio: HTMLAudioElement | null
  volume: number
  muted: boolean
  /** 当前正在播放的音频 ID（用于防重叠） */
  currentId: string | null
}

interface PlayOptions {
  /** 音频 URL 或 public 路径 */
  src: string
  /** 是否循环 */
  loop?: boolean
  /** 音量 0-1 */
  volume?: number
  /** 淡入时长 ms（默认 300） */
  fadeIn?: number
  /** 淡出时长 ms（默认 300） */
  fadeOut?: number
  /** 播放完成回调 */
  onComplete?: () => void
}

const DEFAULT_FADE_MS = 300

export class AudioManager {
  private tracks: Record<AudioTrack, TrackState> = {
    bgm: { audio: null, volume: 0.5, muted: false, currentId: null },
    sfx: { audio: null, volume: 0.8, muted: false, currentId: null },
    voice: { audio: null, volume: 1.0, muted: false, currentId: null },
  }

  /** Voice 播放时自动 duck BGM */
  private duckBgmOnVoice = true
  private bgmDucked = false
  private originalBgmVolume = 0

  // ────────────────────────────────────────────
  //  公共 API
  // ────────────────────────────────────────────

  /**
   * 播放指定轨道音频
   * 同一轨道的新播放会中断当前音频（防重叠）
   */
  play(track: AudioTrack, options: PlayOptions): string {
    const state = this.tracks[track]
    const id = `${track}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    // 停止当前轨道（防重叠）
    this.stop(track, options.fadeOut ?? DEFAULT_FADE_MS)

    // 创建新 Audio 实例
    const audio = new Audio(options.src)
    audio.loop = options.loop ?? false
    audio.volume = 0 // 淡入从 0 开始

    const targetVolume = options.volume ?? state.volume
    const fadeIn = options.fadeIn ?? DEFAULT_FADE_MS

    state.audio = audio
    state.currentId = id

    // Voice 轨道 duck BGM
    if (track === 'voice' && this.duckBgmOnVoice) {
      this.duckBgm()
    }

    // 播放
    audio.play().catch((err) => {
      console.warn(`[AudioManager] Play failed for ${track}:`, err.message)
    })

    // 淡入
    if (fadeIn > 0) {
      this.fadeVolume(audio, 0, targetVolume, fadeIn)
    } else {
      audio.volume = state.muted ? 0 : targetVolume
    }

    // 完成回调
    audio.addEventListener('ended', () => {
      if (state.currentId === id) {
        state.currentId = null
        // Voice 结束 → 恢复 BGM
        if (track === 'voice' && this.duckBgmOnVoice) {
          this.unduckBgm()
        }
        options.onComplete?.()
      }
    })

    return id
  }

  /**
   * 停止指定轨道
   */
  stop(track: AudioTrack, fadeOutMs = DEFAULT_FADE_MS): void {
    const state = this.tracks[track]
    if (!state.audio) return

    const audio = state.audio

    if (fadeOutMs > 0 && audio.volume > 0) {
      this.fadeVolume(audio, audio.volume, 0, fadeOutMs, () => {
        audio.pause()
        audio.currentTime = 0
      })
    } else {
      audio.pause()
      audio.currentTime = 0
    }

    state.audio = null
    state.currentId = null
  }

  /**
   * 停止所有轨道
   */
  stopAll(): void {
    ;(Object.keys(this.tracks) as AudioTrack[]).forEach((track) => this.stop(track))
  }

  /**
   * 设置轨道音量
   */
  setVolume(track: AudioTrack, volume: number): void {
    const v = Math.max(0, Math.min(1, volume))
    this.tracks[track].volume = v
    if (this.tracks[track].audio && !this.tracks[track].muted) {
      this.tracks[track].audio!.volume = v
    }
  }

  /**
   * 静音/取消静音指定轨道
   */
  setMuted(track: AudioTrack, muted: boolean): void {
    this.tracks[track].muted = muted
    if (this.tracks[track].audio) {
      this.tracks[track].audio!.volume = muted ? 0 : this.tracks[track].volume
    }
  }

  /**
   * 全局静音（用于设置页/防误触）
   */
  setGlobalMute(muted: boolean): void {
    ;(Object.keys(this.tracks) as AudioTrack[]).forEach((track) =>
      this.setMuted(track, muted),
    )
  }

  /**
   * 预加载音频（减少首次播放延迟）
   */
  preload(src: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.preload = 'auto'
      audio.src = src
      audio.addEventListener('canplaythrough', () => resolve(), { once: true })
      audio.addEventListener('error', () => resolve(), { once: true })
      // 5 秒超时
      setTimeout(resolve, 5000)
    })
  }

  /**
   * 销毁所有音频资源
   */
  destroy(): void {
    this.stopAll()
    ;(Object.keys(this.tracks) as AudioTrack[]).forEach((track) => {
      this.tracks[track].audio = null
      this.tracks[track].currentId = null
    })
  }

  // ────────────────────────────────────────────
  //  内部方法
  // ────────────────────────────────────────────

  /**
   * 音量淡入淡出
   */
  private fadeVolume(
    audio: HTMLAudioElement,
    from: number,
    to: number,
    durationMs: number,
    onComplete?: () => void,
  ): void {
    if (durationMs <= 0) {
      audio.volume = to
      onComplete?.()
      return
    }

    const startTime = performance.now()
    const step = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      // ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * eased))

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        audio.volume = to
        onComplete?.()
      }
    }
    requestAnimationFrame(step)
  }

  /**
   * Duck BGM（降低背景音乐音量）
   */
  private duckBgm(): void {
    const bgm = this.tracks.bgm
    if (!bgm.audio || this.bgmDucked) return
    this.originalBgmVolume = bgm.audio.volume
    this.bgmDucked = true
    this.fadeVolume(bgm.audio, bgm.audio.volume, bgm.audio.volume * 0.3, 200)
  }

  /**
   * 恢复 BGM 音量
   */
  private unduckBgm(): void {
    const bgm = this.tracks.bgm
    if (!bgm.audio || !this.bgmDucked) return
    this.bgmDucked = false
    this.fadeVolume(bgm.audio, bgm.audio.volume, this.originalBgmVolume, 300)
  }
}

/** 全局单例 */
export const audioManager = new AudioManager()
