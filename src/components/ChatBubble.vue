<script setup lang="ts">
// ============================================================
// ChatBubble.vue — 对话气泡组件
//
// 支持：
//   dodo（豆豆）和 child（孩子）两种样式
//   翻译提示（长按/点击显示）
//   语音播放按钮
//   打字机动画效果
// ============================================================
import { ref, computed, onMounted, nextTick } from 'vue'
import { speakText } from '../services/speech'

const props = defineProps<{
  speaker: 'dodo' | 'child'
  content: string
  translation?: string
  expression?: string
  animation?: string
  timestamp?: number
  isNew?: boolean
}>()

const emit = defineEmits<{
  (e: 'play'): void
}>()

const showTranslation = ref(false)
const isPlaying = ref(false)
const displayText = ref('')
const typed = ref(false)

// 打字机效果
const shouldAnimate = computed(() => props.isNew && props.speaker === 'dodo')

onMounted(async () => {
  if (shouldAnimate.value) {
    await nextTick()
    const chars = props.content.split('')
    for (let i = 0; i < chars.length; i++) {
      displayText.value += chars[i]
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 20))
      }
    }
    typed.value = true
  } else {
    displayText.value = props.content
    typed.value = true
  }
})

// 播放语音
function playAudio() {
  if (isPlaying.value) return
  isPlaying.value = true

  speakText({
    text: props.content,
    voice: props.speaker === 'dodo' ? 'dodo' : 'teacher',
    onEnd: () => {
      isPlaying.value = false
    },
    onError: () => {
      isPlaying.value = false
    },
  })

  emit('play')
}

// 表情映射
const expressionEmoji = computed(() => {
  const map: Record<string, string> = {
    happy: '😊',
    excited: '🤩',
    thinking: '🤔',
    encouraging: '💪',
    proud: '🥳',
    normal: '😊',
  }
  return map[props.expression || ''] || '😊'
})

function formatTime(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="chat-bubble-wrapper" :class="[speaker, { 'with-anim': isNew && !typed }]">
    <!-- 豆豆头像 -->
    <div v-if="speaker === 'dodo'" class="avatar dodo-avatar">
      <span class="expression">{{ expressionEmoji }}</span>
    </div>

    <!-- 气泡主体 -->
    <div class="bubble-container">
      <div
        class="bubble"
        :class="[speaker, expression || 'normal', { typing: !typed }]"
        @click="showTranslation = !showTranslation"
        @contextmenu.prevent="showTranslation = !showTranslation"
      >
        <!-- 气泡尖角 -->
        <div class="bubble-tail"></div>

        <!-- 内容 -->
        <div class="bubble-content">
          <span v-if="!typed && speaker === 'dodo'" class="typing-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
          <span v-else>{{ displayText }}</span>
        </div>

        <!-- 翻译提示（长按/点击显示） -->
        <div v-if="translation && showTranslation" class="translation-popup">
          {{ translation }}
        </div>

        <!-- 操作栏 -->
        <div class="bubble-actions">
          <!-- 语音播放 -->
          <button
            class="action-btn play-btn"
            :class="{ playing: isPlaying }"
            title="听发音"
            @click.stop="playAudio"
          >
            <svg v-if="!isPlaying" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <rect x="4" y="4" width="6" height="16" rx="1" />
              <rect x="14" y="4" width="6" height="16" rx="1" />
            </svg>
          </button>

          <!-- 翻译提示图标 -->
          <span
            v-if="translation"
            class="translation-hint"
            :class="{ active: showTranslation }"
            @click.stop="showTranslation = !showTranslation"
          >
            译
          </span>
        </div>
      </div>

      <!-- 时间戳 -->
      <div v-if="timestamp" class="bubble-time">{{ formatTime(timestamp) }}</div>
    </div>

    <!-- 孩子头像 -->
    <div v-if="speaker === 'child'" class="avatar child-avatar">
      <span>🧒</span>
    </div>
  </div>
</template>

<style scoped>
.chat-bubble-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 12px;
  max-width: 100%;
}

.chat-bubble-wrapper.dodo {
  flex-direction: row;
}

.chat-bubble-wrapper.child {
  flex-direction: row-reverse;
}

/* 头像 */
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.dodo-avatar {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  box-shadow: 0 2px 8px rgba(168, 237, 234, 0.3);
}

.child-avatar {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  box-shadow: 0 2px 8px rgba(252, 182, 159, 0.3);
}

.expression {
  line-height: 1;
}

/* 气泡容器 */
.bubble-container {
  max-width: calc(100% - 60px);
  display: flex;
  flex-direction: column;
}

.chat-bubble-wrapper.dodo .bubble-container {
  align-items: flex-start;
}

.chat-bubble-wrapper.child .bubble-container {
  align-items: flex-end;
}

/* 气泡 */
.bubble {
  position: relative;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
  transition: all 0.3s ease;
  cursor: pointer;
}

.bubble.dodo {
  background: #ffffff;
  color: #333;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.bubble.dodo.happy {
  background: linear-gradient(135deg, #ffffff 0%, #fff9e6 100%);
}

.bubble.dodo.excited {
  background: linear-gradient(135deg, #ffffff 0%, #ffe0f0 100%);
}

.bubble.dodo.encouraging {
  background: linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%);
}

.bubble.dodo.proud {
  background: linear-gradient(135deg, #ffffff 0%, #fff3e0 100%);
}

.bubble.child {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 气泡尖角 */
.bubble-tail {
  position: absolute;
  bottom: 0;
  width: 0;
  height: 0;
}

.bubble.dodo .bubble-tail {
  left: -8px;
  border-right: 10px solid #ffffff;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
}

.bubble.child .bubble-tail {
  right: -8px;
  border-left: 10px solid #667eea;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
}

/* 打字机动画 */
.typing-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
}

.typing-dots .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #aaa;
  animation: typing-dot 1.4s ease-in-out infinite;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-dot {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 翻译弹窗 */
.translation-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  white-space: nowrap;
  z-index: 10;
  animation: fade-in-up 0.2s ease;
}

.translation-popup::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 操作按钮 */
.bubble-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.bubble:hover .bubble-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.bubble.dodo .action-btn {
  background: #f0f0f0;
  color: #666;
}

.bubble.dodo .action-btn:hover {
  background: #e0e0e0;
}

.bubble.child .action-btn {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.bubble.child .action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.play-btn.playing {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

.translation-hint {
  font-size: 10px;
  font-weight: 700;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.bubble.dodo .translation-hint {
  background: #f0f0f0;
  color: #999;
}

.bubble.dodo .translation-hint.active {
  background: #667eea;
  color: white;
}

.bubble.child .translation-hint {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
}

.bubble.child .translation-hint.active {
  background: rgba(255, 255, 255, 0.4);
  color: white;
}

/* 时间戳 */
.bubble-time {
  font-size: 11px;
  color: #bbb;
  margin-top: 2px;
  padding: 0 4px;
}

/* 入场动画 */
.chat-bubble-wrapper.with-anim.dodo .bubble {
  animation: slide-in-left 0.4s ease;
}

.chat-bubble-wrapper.with-anim.child .bubble {
  animation: slide-in-right 0.4s ease;
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
