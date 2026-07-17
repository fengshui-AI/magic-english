<script setup lang="ts">
// ============================================================
// VoiceInput.vue — 语音输入组件
//
// 功能：
//   按住说话 / 点击录音 → ASR 语音识别 → 文本输出
//   录音动画（波形 + 脉冲）+ 权限检测
// ============================================================
import { ref, computed, onUnmounted } from 'vue'
import {
  SpeechRecognizer,
  AudioRecorder,
  checkAudioPermission,
  requestAudioPermission,
} from '../services/speech'

const props = defineProps<{
  disabled?: boolean
  language?: 'en' | 'zh'
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'recognize', text: string): void
  (e: 'recording', isRecording: boolean): void
  (e: 'error', error: string): void
}>()

// 状态
const isRecording = ref(false)
const isSupported = ref(true)
const hasPermission = ref(false)
const permissionChecked = ref(false)
const interimText = ref('')
const finalText = ref('')
const isProcessing = ref(false)
const volume = ref(0)

// 录音器
let recognizer: SpeechRecognizer | null = null
let recorder: AudioRecorder | null = null
let volumeInterval: ReturnType<typeof setInterval> | null = null

// 初始化检查
async function initCheck() {
  const perm = await checkAudioPermission()
  permissionChecked.value = true
  hasPermission.value = perm === 'granted'

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    isSupported.value = false
    emit('error', '您的浏览器不支持语音识别')
  }
}

initCheck()

// 请求权限并开始录音
async function startRecording() {
  if (isRecording.value || isProcessing.value || props.disabled) return

  if (!hasPermission.value) {
    const granted = await requestAudioPermission()
    if (!granted) {
      emit('error', '需要麦克风权限才能使用语音功能')
      return
    }
    hasPermission.value = true
  }

  isProcessing.value = true

  // 创建语音识别器
  recognizer = new SpeechRecognizer({
    language: props.language || 'en',
    continuous: false,
    interimResults: true,
    onStart: () => {
      isRecording.value = true
      isProcessing.value = false
      emit('recording', true)
    },
    onEnd: () => {
      isRecording.value = false
      emit('recording', false)
      // 有结果时提交
      if (finalText.value.trim()) {
        emit('recognize', finalText.value.trim())
        finalText.value = ''
        interimText.value = ''
      }
    },
    onResult: (text, isFinal, _confidence) => {
      if (isFinal) {
        finalText.value = text
      } else {
        interimText.value = text
      }
    },
    onError: (err) => {
      isRecording.value = false
      isProcessing.value = false
      emit('recording', false)
      emit('error', `语音识别失败：${err.message}`)
    },
    onNoMatch: () => {
      isRecording.value = false
      isProcessing.value = false
      emit('recording', false)
      emit('error', '没有听到声音，请再试一次')
    },
  })

  // 创建录音器（用于音量检测）
  recorder = new AudioRecorder({
    onStart: () => {
      // 开始音量检测
      volumeInterval = setInterval(() => {
        if (recorder) {
          volume.value = recorder.getVolume()
        }
      }, 50)
    },
    onStop: () => {
      if (volumeInterval) {
        clearInterval(volumeInterval)
        volumeInterval = null
      }
      volume.value = 0
    },
    onError: (err) => {
      isProcessing.value = false
      emit('error', `录音失败：${err.message}`)
    },
  })

  try {
    await recorder.start()
    recognizer.start()
  } catch (err: any) {
    isProcessing.value = false
    emit('error', `启动录音失败：${err.message}`)
  }
}

// 停止录音
function stopRecording() {
  recognizer?.stop()
  recorder?.stop()
  isRecording.value = false
  if (volumeInterval) {
    clearInterval(volumeInterval)
    volumeInterval = null
  }
  volume.value = 0
}

// 计算波形条数
const waveBars = computed(() => {
  const count = 7
  return Array.from({ length: count }, (_, i) => {
    const active = isRecording.value
    const barHeight = active ? 30 + Math.sin(Date.now() / 150 + i * 0.8) * volume.value * 25 : 12
    return { height: Math.max(8, barHeight), delay: i * 0.08 }
  })
})

onUnmounted(() => {
  stopRecording()
  recognizer?.abort()
})
</script>

<template>
  <div
    class="voice-input"
    :class="{ recording: isRecording, disabled: props.disabled, unsupported: !isSupported }"
  >
    <!-- 不支持提示 -->
    <div v-if="!isSupported" class="unsupported-msg">
      <span>🔇</span>
      <span>语音功能不可用</span>
    </div>

    <!-- 录音按钮 -->
    <button
      v-else
      class="voice-btn"
      :class="{ recording: isRecording, processing: isProcessing }"
      :disabled="props.disabled || isProcessing"
      :title="isRecording ? '松开发送' : '按住说话'"
      @mousedown.prevent="startRecording"
      @mouseup.prevent="stopRecording"
      @mouseleave.prevent="isRecording ? stopRecording() : undefined"
      @touchstart.prevent="startRecording"
      @touchend.prevent="stopRecording"
    >
      <!-- 脉冲环 -->
      <div v-if="isRecording" class="pulse-ring"></div>

      <!-- 麦克风图标 -->
      <div class="mic-icon">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>

      <!-- 波形动画 -->
      <div v-if="isRecording" class="wave-container">
        <div
          v-for="(bar, i) in waveBars"
          :key="i"
          class="wave-bar"
          :style="{
            height: bar.height + 'px',
            animationDelay: bar.delay + 's',
          }"
        ></div>
      </div>
    </button>

    <!-- 状态文字 -->
    <div class="status-text">
      <span v-if="isProcessing">准备中...</span>
      <span v-else-if="isRecording">松开发送</span>
      <span v-else-if="interimText" class="interim">{{ interimText }}</span>
      <span v-else class="hint">{{ props.placeholder || '按住说英语' }}</span>
    </div>
  </div>
</template>

<style scoped>
.voice-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.voice-input.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.unsupported-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #f0f0f0;
  border-radius: 12px;
  color: #999;
  font-size: 14px;
}

.voice-btn {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.voice-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.voice-btn:active:not(:disabled),
.voice-btn.recording {
  transform: scale(1.1);
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 6px 25px rgba(245, 87, 108, 0.5);
}

.voice-btn.processing {
  animation: pulse-subtle 1s infinite;
}

.mic-icon {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 脉冲环 */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid rgba(245, 87, 108, 0.6);
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    width: 64px;
    height: 64px;
    opacity: 1;
  }
  100% {
    width: 100px;
    height: 100px;
    opacity: 0;
  }
}

@keyframes pulse-subtle {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 波形 */
.wave-container {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 40px;
}

.wave-bar {
  width: 4px;
  background: linear-gradient(to top, #f5576c, #f093fb);
  border-radius: 2px;
  transition: height 0.1s ease;
  animation: wave-bounce 0.6s ease-in-out infinite alternate;
}

@keyframes wave-bounce {
  0% {
    transform: scaleY(0.6);
  }
  100% {
    transform: scaleY(1);
  }
}

/* 状态文字 */
.status-text {
  font-size: 13px;
  color: #888;
  min-height: 20px;
  text-align: center;
}

.status-text .interim {
  color: #764ba2;
  font-style: italic;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.status-text .hint {
  color: #bbb;
}
</style>
