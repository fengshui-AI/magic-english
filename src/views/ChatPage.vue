<script setup lang="ts">
// ============================================================
// ChatPage.vue — 英语情景对话页面 (Sprint 5)
//
// 功能：
//   - 对话气泡（豆豆/孩子双通道）
//   - 文字 + 语音双通道输入
//   - 翻译提示（点击气泡显示中文翻译）
//   - 话题切换 + 话题状态展示
//   - 英语使用率统计
//   - 对话阶段指示器（暖场→话题→练习→收尾）
// ============================================================
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { dialogueApi } from '../api/dialogue'
import { speakText } from '../services/speech'
import ChatBubble from '../components/ChatBubble.vue'
import VoiceInput from '../components/VoiceInput.vue'

const router = useRouter()

// ============================================================
// 状态
// ============================================================
interface ChatMessage {
  id: string
  speaker: 'dodo' | 'child'
  content: string
  translation?: string
  expression?: string
  animation?: string
  timestamp: number
  isNew?: boolean
}

const messages = ref<ChatMessage[]>([])
const textInput = ref('')
const isRecording = ref(false)
const isLoading = ref(false)
const sessionId = ref<string | null>(null)
const currentTopic = ref('')
const targetWords = ref<string[]>([])
const currentStage = ref('warmup')
const englishRatio = ref(0)
const totalTurns = ref(0)
const error = ref('')
const isDodoSpeaking = ref(false)
const showTopicSelector = ref(false)
const showEndConfirm = ref(false)

const chatContainer = ref<HTMLElement | null>(null)

// ============================================================
// 计算属性
// ============================================================
const stageLabels: Record<string, { name: string; icon: string; color: string }> = {
  warmup: { name: '暖场', icon: '👋', color: '#f59e0b' },
  topic: { name: '话题', icon: '💬', color: '#667eea' },
  practice: { name: '练习', icon: '🎯', color: '#10b981' },
  wrapup: { name: '收尾', icon: '🌟', color: '#f472b6' },
}

const currentStageInfo = computed(() => {
  return stageLabels[currentStage.value] || stageLabels.warmup
})

const stageProgress = computed(() => {
  const stages = ['warmup', 'topic', 'practice', 'wrapup']
  const idx = stages.indexOf(currentStage.value)
  return Math.min(100, ((idx + 1) / stages.length) * 100)
})

// 快捷回复
const quickReplies = computed(() => {
  if (currentStage.value === 'warmup') {
    return ["I'm happy! 😊", "I'm fine, thank you!", 'How are you?', 'Good!']
  }
  if (currentStage.value === 'topic') {
    return ['Yes, I like it!', 'Tell me more!', 'I know this word!', 'Let me try!']
  }
  if (currentStage.value === 'practice') {
    return targetWords.value.slice(0, 3).map((w) => `I like ${w}`)
  }
  return ['Thank you!', 'See you!', 'Goodbye!']
})

// ============================================================
// 方法
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

async function startDialogue() {
  isLoading.value = true
  error.value = ''
  messages.value = []

  try {
    const res = await dialogueApi.start({})
    sessionId.value = res.sessionId
    currentTopic.value = res.topic
    targetWords.value = res.targetWords
    currentStage.value = res.stage

    // 添加豆豆开场白
    addMessage({
      speaker: 'dodo',
      content: res.message.text,
      translation: res.message.translation,
      expression: res.message.expression,
      animation: res.message.animation,
      isNew: true,
    })

    // 播放开场白语音
    if (res.audioUrl) {
      isDodoSpeaking.value = true
      speakText({
        text: res.message.text,
        voice: 'dodo',
        onEnd: () => {
          isDodoSpeaking.value = false
        },
        onError: () => {
          isDodoSpeaking.value = false
        },
      })
    }
  } catch (err: any) {
    error.value = err?.message || '开始对话失败'
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
  const newMsg: ChatMessage = {
    ...msg,
    id: generateId(),
    timestamp: Date.now(),
  }
  messages.value.push(newMsg)
  scrollToBottom()
}

async function sendMessage(content: string) {
  if (!sessionId.value || !content.trim() || isLoading.value) return

  // 添加孩子消息
  addMessage({
    speaker: 'child',
    content: content.trim(),
  })
  textInput.value = ''

  isLoading.value = true
  error.value = ''

  try {
    const res = await dialogueApi.sendMessage(sessionId.value, content.trim())
    currentStage.value = res.stage
    englishRatio.value = res.childEnglishRatio
    totalTurns.value = res.totalTurns

    // 添加豆豆回复
    addMessage({
      speaker: 'dodo',
      content: res.message.text,
      translation: res.message.translation,
      expression: res.message.expression,
      animation: res.message.animation,
      isNew: true,
    })

    // 播放语音
    if (res.audioUrl) {
      isDodoSpeaking.value = true
      speakText({
        text: res.message.text,
        voice: 'dodo',
        onEnd: () => {
          isDodoSpeaking.value = false
        },
        onError: () => {
          isDodoSpeaking.value = false
        },
      })
    }
  } catch (err: any) {
    error.value = err?.message || '发送失败'
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function handleVoiceRecognize(text: string) {
  sendMessage(text)
}

function handleQuickReply(text: string) {
  sendMessage(text)
}

function selectTopic(t: string) {
  currentTopic.value = t
  handleSwitchTopic()
}

async function handleSwitchTopic() {
  showTopicSelector.value = false
  if (!sessionId.value) return

  try {
    const res = await dialogueApi.switchTopic()
    currentTopic.value = res.topic
    targetWords.value = res.targetWords
    currentStage.value = 'topic'

    addMessage({
      speaker: 'dodo',
      content: res.message.text,
      translation: res.message.translation,
      expression: res.message.expression,
      animation: res.message.animation,
      isNew: true,
    })

    speakText({
      text: res.message.text,
      voice: 'dodo',
      onEnd: () => {
        isDodoSpeaking.value = false
      },
      onError: () => {
        isDodoSpeaking.value = false
      },
    })
    isDodoSpeaking.value = true
  } catch (err: any) {
    error.value = '切换话题失败'
  }
}

async function endDialogue() {
  showEndConfirm.value = false
  if (!sessionId.value) return

  try {
    await dialogueApi.end(sessionId.value)
  } catch {
    /* ignore */
  }

  // 添加结束消息
  addMessage({
    speaker: 'dodo',
    content: 'Great chat! See you next time! 💝',
    translation: '聊得很开心！下次再见！',
    expression: 'happy',
    isNew: true,
  })

  sessionId.value = null
}

function goBack() {
  if (sessionId.value) {
    showEndConfirm.value = true
  } else {
    router.back()
  }
}

onMounted(() => {
  startDialogue()
})
</script>

<template>
  <div class="chat-page">
    <!-- 顶部栏 -->
    <header class="chat-header">
      <button class="back-btn" @click="goBack">←</button>

      <div class="header-center">
        <!-- 豆豆状态 -->
        <div class="dodo-status" :class="{ speaking: isDodoSpeaking }">
          <span class="dodo-icon">🦕</span>
          <div class="dodo-info">
            <span class="dodo-name">豆豆</span>
            <span class="dodo-state">{{ isDodoSpeaking ? '正在说话...' : '在线' }}</span>
          </div>
        </div>

        <!-- 阶段指示器 -->
        <div v-if="sessionId" class="stage-indicator">
          <div class="stage-dot" :style="{ background: currentStageInfo.color }"></div>
          <span class="stage-name">{{ currentStageInfo.icon }} {{ currentStageInfo.name }}</span>
          <div class="stage-bar">
            <div
              class="stage-fill"
              :style="{ width: stageProgress + '%', background: currentStageInfo.color }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 右侧操作 -->
      <div class="header-actions">
        <button
          v-if="sessionId"
          class="icon-btn"
          title="切换话题"
          @click="showTopicSelector = true"
        >
          🔄
        </button>
        <button v-if="sessionId" class="icon-btn end-btn" title="结束对话" @click="endDialogue">
          ✕
        </button>
      </div>
    </header>

    <!-- 话题信息条 -->
    <div v-if="sessionId && currentTopic" class="topic-bar">
      <span class="topic-label">📖 {{ currentTopic }}</span>
      <div v-if="targetWords.length" class="target-words">
        <span v-for="word in targetWords" :key="word" class="word-tag">{{ word }}</span>
      </div>
      <div v-if="totalTurns > 2" class="english-ratio">
        英语使用率：<strong>{{ englishRatio }}%</strong>
      </div>
    </div>

    <!-- 消息列表 -->
    <div ref="chatContainer" class="chat-messages">
      <!-- 空状态 -->
      <div v-if="isLoading && messages.length === 0" class="loading-state">
        <div class="loading-anim">
          <span class="dodo-loading">🦕</span>
          <div class="loading-dots"><span></span><span></span><span></span></div>
        </div>
        <p>豆豆正在赶来...</p>
      </div>

      <!-- 消息列表 -->
      <ChatBubble
        v-for="msg in messages"
        :key="msg.id"
        :speaker="msg.speaker"
        :content="msg.content"
        :translation="msg.translation"
        :expression="msg.expression"
        :animation="msg.animation"
        :timestamp="msg.timestamp"
        :is-new="msg.isNew"
      />

      <!-- 打字中指示器 -->
      <div v-if="isLoading && messages.length > 0" class="typing-indicator">
        <span class="dodo-typing">🦕</span>
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-bar" @click="error = ''">⚠️ {{ error }}（点击关闭）</div>

    <!-- 快捷回复 -->
    <div v-if="sessionId && !isRecording" class="quick-replies">
      <button
        v-for="(reply, i) in quickReplies"
        :key="i"
        class="quick-reply-btn"
        :disabled="isLoading"
        @click="handleQuickReply(reply)"
      >
        {{ reply }}
      </button>
    </div>

    <!-- 输入区域 -->
    <div v-if="sessionId" class="input-area">
      <!-- 文字输入 -->
      <div class="text-input-row">
        <input
          v-model="textInput"
          class="text-input"
          placeholder="输入英语..."
          :disabled="isLoading"
          @keyup.enter="sendMessage(textInput)"
        />
        <button
          class="send-btn"
          :disabled="!textInput.trim() || isLoading"
          @click="sendMessage(textInput)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </button>
      </div>

      <!-- 语音输入 -->
      <div class="voice-row">
        <VoiceInput
          :disabled="isLoading"
          language="en"
          placeholder="按住说英语"
          @recognize="handleVoiceRecognize"
          @recording="isRecording = $event"
          @error="error = $event"
        />
      </div>
    </div>

    <!-- 未开始对话状态 -->
    <div v-if="!sessionId && !isLoading" class="start-prompt">
      <button class="start-btn" @click="startDialogue">🦕 和豆豆开始聊天</button>
    </div>

    <!-- 话题选择器弹窗 -->
    <Teleport to="body">
      <div v-if="showTopicSelector" class="modal-overlay" @click="showTopicSelector = false">
        <div class="topic-modal" @click.stop>
          <h3>🔄 换个话题聊聊</h3>
          <p class="modal-subtitle">点击切换，豆豆会带新话题和你聊</p>
          <div class="topic-grid">
            <button
              v-for="t in ['My Family', 'Animals', 'Food', 'Sports', 'School', 'Colors']"
              :key="t"
              class="topic-card"
              :class="{ active: currentTopic === t }"
              @click="selectTopic(t)"
            >
              <span>{{ t }}</span>
            </button>
          </div>
          <button class="modal-close" @click="showTopicSelector = false">取消</button>
        </div>
      </div>
    </Teleport>

    <!-- 结束确认弹窗 -->
    <Teleport to="body">
      <div v-if="showEndConfirm" class="modal-overlay" @click="showEndConfirm = false">
        <div class="confirm-modal" @click.stop>
          <h3>结束对话？</h3>
          <p>豆豆会记住这次聊天的内容</p>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="showEndConfirm = false">继续聊天</button>
            <button class="btn-confirm" @click="endDialogue">结束对话</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: linear-gradient(180deg, #f8f9ff 0%, #f0f4ff 50%, #e8f0fe 100%);
}

/* 顶部栏 */
.chat-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #eee;
  gap: 12px;
  flex-shrink: 0;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f0f0f0;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #e0e0e0;
}

.header-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.dodo-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dodo-icon {
  font-size: 28px;
  animation: dodo-bounce 2s ease-in-out infinite;
}

.dodo-status.speaking .dodo-icon {
  animation: dodo-speak 0.4s ease-in-out infinite;
}

@keyframes dodo-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes dodo-speak {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.dodo-info {
  display: flex;
  flex-direction: column;
}

.dodo-name {
  font-weight: 600;
  font-size: 15px;
  color: #333;
}

.dodo-state {
  font-size: 12px;
  color: #10b981;
}

.dodo-status.speaking .dodo-state {
  color: #667eea;
  animation: pulse-text 1s ease-in-out infinite;
}

@keyframes pulse-text {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 阶段指示器 */
.stage-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #f5f5f5;
  border-radius: 20px;
}

.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stage-name {
  font-size: 12px;
  color: #666;
}

.stage-bar {
  width: 40px;
  height: 3px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.stage-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #e0e0e0;
}

.end-btn {
  color: #ef4444;
}

.end-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* 话题信息条 */
.topic-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 10px;
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.topic-label {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
}

.target-words {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.word-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: #e8f5e9;
  color: #388e3c;
  border-radius: 10px;
  font-weight: 500;
}

.english-ratio {
  margin-left: auto;
  font-size: 12px;
  color: #888;
}

.english-ratio strong {
  color: #667eea;
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scroll-behavior: smooth;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: #888;
}

.loading-anim {
  position: relative;
}

.dodo-loading {
  font-size: 48px;
  animation: dodo-bounce 0.6s ease-in-out infinite;
}

.loading-dots {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 12px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  animation: loading-dot 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading-dot {
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

/* 打字中指示器 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.dodo-typing {
  font-size: 24px;
  animation: dodo-bounce 1s ease-in-out infinite;
}

.typing-dots {
  display: flex;
  gap: 4px;
  padding: 8px 14px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #aaa;
  animation: loading-dot 1.4s ease-in-out infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

/* 错误提示 */
.error-bar {
  padding: 8px 16px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  cursor: pointer;
  text-align: center;
  flex-shrink: 0;
}

/* 快捷回复 */
.quick-replies {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}

.quick-replies::-webkit-scrollbar {
  display: none;
}

.quick-reply-btn {
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid #d0d5ff;
  background: white;
  color: #667eea;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.quick-reply-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.quick-reply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 输入区域 */
.input-area {
  padding: 8px 16px 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid #eee;
  flex-shrink: 0;
}

.text-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.text-input {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 24px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  background: #fafafa;
}

.text-input:focus {
  border-color: #667eea;
  background: white;
}

.text-input:disabled {
  opacity: 0.6;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.voice-row {
  display: flex;
  justify-content: center;
}

/* 开始对话按钮 */
.start-prompt {
  display: flex;
  justify-content: center;
  padding: 16px;
  flex-shrink: 0;
}

.start-btn {
  padding: 14px 40px;
  border-radius: 30px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.topic-modal,
.confirm-modal {
  background: white;
  border-radius: 20px;
  padding: 24px;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: modal-in 0.3s ease;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.topic-modal h3,
.confirm-modal h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #333;
}

.modal-subtitle {
  color: #888;
  font-size: 13px;
  margin: 0 0 16px;
}

.topic-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.topic-card {
  padding: 14px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.topic-card:hover {
  border-color: #667eea;
  color: #667eea;
}

.topic-card.active {
  border-color: #667eea;
  background: #f0f3ff;
  color: #667eea;
}

.modal-close {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: #f0f0f0;
  color: #666;
  font-size: 14px;
  cursor: pointer;
}

.modal-close:hover {
  background: #e0e0e0;
}

.confirm-modal p {
  color: #888;
  font-size: 14px;
  margin: 0 0 20px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
</style>
