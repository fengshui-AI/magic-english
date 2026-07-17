<script setup lang="ts">
// ============================================================
// FeedbackPage.vue — 学习反馈页（重构为对话入口 + 发音练习）
//
// Sprint 5 重构：
//   - 增加情景对话入口（→ ChatPage）
//   - 增加语音练习功能（Web Speech API）
//   - 保留薄弱词复习功能
// ============================================================
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { learningStore, fetchHistory, fetchToday, fetchDailyPlan } from '../stores/learning'
import { speakText, stopSpeaking } from '../services/speech'

const router = useRouter()

// 状态
const activeTab = ref<'review' | 'speak' | 'dialog'>('review')
const isSpeaking = ref(false)
const currentPracticeWord = ref('')
const practiceFeedback = ref('')

// 数据
const weakWords = computed(() => learningStore.weakWords || [])
const todayData = computed(() => learningStore.today)
const reviewQueue = computed(() => learningStore.dailyPlan?.plan?.reviewQueue || [])

// 口语练习词汇
const speakPracticeWords = [
  { word: 'apple', phonetic: '/ˈæp.əl/', translation: '苹果' },
  { word: 'hello', phonetic: '/həˈloʊ/', translation: '你好' },
  { word: 'school', phonetic: '/skuːl/', translation: '学校' },
  { word: 'happy', phonetic: '/ˈhæp.i/', translation: '开心的' },
  { word: 'family', phonetic: '/ˈfæm.əl.i/', translation: '家庭' },
  { word: 'friend', phonetic: '/frend/', translation: '朋友' },
  { word: 'beautiful', phonetic: '/ˈbjuː.tɪ.fəl/', translation: '美丽的' },
  { word: 'animal', phonetic: '/ˈæn.ɪ.məl/', translation: '动物' },
]

// 方法
function goToChat() {
  router.push('/chat')
}

function goToLearn() {
  router.push('/learn')
}

function playWord(word: string) {
  stopSpeaking()
  isSpeaking.value = true
  currentPracticeWord.value = word

  speakText({
    text: word,
    voice: 'dodo',
    onEnd: () => {
      isSpeaking.value = false
      practiceFeedback.value = `听听 ${word} 怎么读，试着跟读吧！`
    },
    onError: () => {
      isSpeaking.value = false
    },
  })
}

function startPractice(word: string) {
  practiceFeedback.value = `🎤 请跟读：${word}`
  playWord(word)

  // 使用 Web Speech API 进行跟读
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    practiceFeedback.value = '您的浏览器不支持语音识别，试试点击喇叭听发音吧'
    return
  }

  const recognition = new SpeechRecognition()
  recognition.lang = 'en-US'
  recognition.continuous = false
  recognition.interimResults = false

  recognition.onresult = (event: any) => {
    const spoken = event.results[0][0].transcript.toLowerCase().trim()
    const target = word.toLowerCase().trim()

    if (spoken === target || spoken.includes(target)) {
      practiceFeedback.value = `🎉 太棒了！"${spoken}" 发音很准确！`
    } else if (spoken.length > 0) {
      practiceFeedback.value = `你说的好像是 "${spoken}"，目标词是 "${word}"，再试试！💪`
    } else {
      practiceFeedback.value = '没有听到声音，请再试一次'
    }
  }

  recognition.onerror = (event: any) => {
    if (event.error !== 'aborted') {
      practiceFeedback.value = '语音识别失败，点击喇叭听标准发音吧'
    }
  }

  recognition.onnomatch = () => {
    practiceFeedback.value = '没有识别到单词，试试说得更清楚一些'
  }

  setTimeout(() => recognition.start(), 500)
}

onMounted(() => {
  fetchHistory()
  fetchToday()
  fetchDailyPlan()
})
</script>

<template>
  <div class="feedback-page">
    <!-- 顶部栏 -->
    <header class="page-header">
      <h1>📝 学习反馈</h1>
      <p class="subtitle">看看今天的学习成果吧</p>
    </header>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'review' }"
        @click="activeTab = 'review'"
      >
        📋 薄弱词复习
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'speak' }"
        @click="activeTab = 'speak'"
      >
        🎤 口语练习
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'dialog' }"
        @click="activeTab = 'dialog'"
      >
        💬 情景对话
      </button>
    </div>

    <!-- 薄弱词复习 -->
    <section v-if="activeTab === 'review'" class="tab-content">
      <div v-if="weakWords.length === 0" class="empty-state">
        <span class="empty-icon">🎉</span>
        <p>太棒了！没有薄弱词</p>
        <p class="empty-hint">继续保持哦</p>
      </div>

      <div v-else class="word-list">
        <div v-for="word in weakWords" :key="word" class="word-card" @click="playWord(word)">
          <div class="word-info">
            <span class="word-text">{{ word }}</span>
            <span class="word-status">需要复习</span>
          </div>
          <div class="word-actions">
            <button
              class="play-btn-sm"
              :class="{ playing: isSpeaking && currentPracticeWord === word }"
              @click.stop="playWord(word)"
            >
              {{ isSpeaking && currentPracticeWord === word ? '⏸' : '🔊' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 待复习队列 -->
      <div v-if="reviewQueue.length > 0" class="review-section">
        <h3>📅 待复习 ({{ reviewQueue.length }})</h3>
        <div class="review-list">
          <div v-for="item in reviewQueue.slice(0, 5)" :key="item.wordId" class="review-item">
            <span>{{ item.word }}</span>
            <span v-if="item.status" class="review-due">
              {{ item.status }}
            </span>
          </div>
        </div>
        <button class="start-review-btn" @click="goToLearn">开始复习 →</button>
      </div>
    </section>

    <!-- 口语练习 -->
    <section v-if="activeTab === 'speak'" class="tab-content">
      <div class="speak-intro">
        <span class="intro-icon">🎤</span>
        <p>点击单词听发音，然后跟读练习</p>
      </div>

      <div class="speak-grid">
        <div
          v-for="item in speakPracticeWords"
          :key="item.word"
          class="speak-card"
          :class="{ active: currentPracticeWord === item.word }"
        >
          <div class="speak-word">{{ item.word }}</div>
          <div class="speak-phonetic">{{ item.phonetic }}</div>
          <div class="speak-translation">{{ item.translation }}</div>
          <div class="speak-actions">
            <button
              class="listen-btn"
              :class="{ playing: isSpeaking && currentPracticeWord === item.word }"
              @click="playWord(item.word)"
            >
              🔊 听发音
            </button>
            <button class="practice-btn" @click="startPractice(item.word)">🎤 跟读</button>
          </div>
        </div>
      </div>

      <!-- 反馈区域 -->
      <div v-if="practiceFeedback" class="practice-feedback">
        {{ practiceFeedback }}
      </div>
    </section>

    <!-- 情景对话 -->
    <section v-if="activeTab === 'dialog'" class="tab-content">
      <div class="dialog-hero">
        <div class="dodo-illustration">
          <span class="dodo-big">🦕</span>
          <div class="speech-bubble">
            想和我用英语聊天吗？我们可以聊动物、美食、学校...任何你感兴趣的话题！
          </div>
        </div>

        <button class="start-chat-btn" @click="goToChat">
          <span class="btn-icon">💬</span>
          <span class="btn-text">
            <strong>和豆豆聊天</strong>
            <small>英语情景对话练习</small>
          </span>
          <span class="btn-arrow">→</span>
        </button>

        <div class="chat-features">
          <div class="feature-item">
            <span>🎯</span>
            <span>分级话题</span>
          </div>
          <div class="feature-item">
            <span>🔊</span>
            <span>语音输入</span>
          </div>
          <div class="feature-item">
            <span>🔄</span>
            <span>中英提示</span>
          </div>
          <div class="feature-item">
            <span>📊</span>
            <span>英语占比</span>
          </div>
        </div>

        <div v-if="todayData" class="today-stats">
          <h3>📊 今日学习数据</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-value">{{ todayData.today?.wordsLearned || 0 }}</span>
              <span class="stat-label">新词</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ todayData.pendingReviews || 0 }}</span>
              <span class="stat-label">待复习</span>
            </div>
            <div class="stat-card">
              <span class="stat-value"
                >{{ Math.round(todayData.today?.effectiveMinutes || 0) }}min</span
              >
              <span class="stat-label">学习时长</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ todayData.today?.sentencesSpoken || 0 }}</span>
              <span class="stat-label">开口次数</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.feedback-page {
  min-height: 100vh;
  padding-bottom: 80px;
  background: linear-gradient(180deg, #f8f9ff 0%, #f0f4ff 100%);
}

.page-header {
  padding: 24px 20px 12px;
  text-align: center;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.subtitle {
  margin: 4px 0 0;
  color: #888;
  font-size: 14px;
}

/* Tab 切换 */
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 0 16px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  border: none;
  border-radius: 12px;
  background: white;
  color: #888;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.tab-btn:hover:not(.active) {
  background: #f0f3ff;
  color: #667eea;
}

.tab-content {
  padding: 0 16px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 48px 20px;
}

.empty-icon {
  font-size: 48px;
}

.empty-state p {
  margin: 8px 0 0;
  color: #888;
  font-size: 15px;
}

.empty-hint {
  font-size: 13px !important;
  color: #bbb !important;
}

/* 薄弱词列表 */
.word-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.word-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
}

.word-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateX(4px);
}

.word-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.word-text {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.word-status {
  font-size: 12px;
  color: #ef4444;
}

.play-btn-sm {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f0f0f0;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.play-btn-sm:hover {
  background: #e0e0e0;
}
.play-btn-sm.playing {
  background: #667eea;
}

/* 复习队列 */
.review-section {
  margin-top: 20px;
}

.review-section h3 {
  font-size: 15px;
  color: #666;
  margin: 0 0 10px;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.review-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
}

.review-due {
  color: #ef4444;
  font-size: 12px;
}

.start-review-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.start-review-btn:hover {
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

/* 口语练习 */
.speak-intro {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}

.intro-icon {
  font-size: 28px;
}

.speak-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.speak-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}

.speak-card.active {
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
  border: 2px solid #667eea;
}

.speak-word {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.speak-phonetic {
  font-size: 12px;
  color: #999;
  margin: 2px 0;
}

.speak-translation {
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
}

.speak-actions {
  display: flex;
  gap: 6px;
}

.listen-btn,
.practice-btn {
  flex: 1;
  padding: 6px 8px;
  border-radius: 8px;
  border: none;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.listen-btn {
  background: #f0f0f0;
  color: #555;
}

.listen-btn:hover {
  background: #e0e0e0;
}
.listen-btn.playing {
  background: #667eea;
  color: white;
}

.practice-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.practice-btn:hover {
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.practice-feedback {
  padding: 14px 16px;
  background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
  border-radius: 12px;
  font-size: 14px;
  color: #388e3c;
  text-align: center;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 情景对话 */
.dialog-hero {
  text-align: center;
}

.dodo-illustration {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.dodo-big {
  font-size: 64px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.speech-bubble {
  position: relative;
  padding: 16px 20px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  max-width: 300px;
}

.speech-bubble::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 12px solid white;
}

.start-chat-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 320px;
  margin: 0 auto 24px;
  padding: 16px 20px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
  transition: all 0.3s;
  text-align: left;
}

.start-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);
}

.btn-icon {
  font-size: 32px;
}

.btn-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.btn-text strong {
  font-size: 17px;
}

.btn-text small {
  font-size: 12px;
  opacity: 0.8;
}

.btn-arrow {
  font-size: 24px;
  font-weight: 300;
}

.chat-features {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  background: white;
  border-radius: 12px;
  font-size: 12px;
  color: #666;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.feature-item span:first-child {
  font-size: 20px;
}

/* 今日数据 */
.today-stats {
  margin-top: 8px;
}

.today-stats h3 {
  font-size: 15px;
  color: #666;
  margin: 0 0 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}
</style>
