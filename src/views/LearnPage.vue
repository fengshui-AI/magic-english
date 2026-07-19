<template>
  <div class="learn-page">
    <!-- 加载中 -->
    <div v-if="wordsLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>正在准备今天的单词...</p>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="wordsError" class="error-state">
      <p>😢 {{ wordsError }}</p>
      <button class="retry-btn" @click="loadTodayWords">重新加载</button>
    </div>

    <!-- 单词为空 -->
    <div v-else-if="words.length === 0" class="empty-state">
      <p>📭 今天还没有学习任务哦</p>
      <button class="retry-btn" @click="loadTodayWords">刷新试试</button>
    </div>

    <!-- 正常学习流程 -->
    <template v-else>
    <!-- 顶部导航栏 -->
    <div class="learn-header">
      <button class="back-btn" @click="handleBack">
        <span>←</span>
      </button>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <span class="progress-text">{{ currentIndex + 1 }} / {{ words.length }}</span>
    </div>

    <!-- 模式: word — 单词学习 -->
    <transition name="slide" mode="out-in">
      <div v-if="mode === 'word'" key="word" class="word-mode">
        <!-- 复习标记 -->
        <div v-if="currentWord?._isReview" class="review-badge">🔄 今日复习</div>
        <!-- 单词卡片 -->
        <div class="word-card">
          <div class="word-illustration" :style="{ background: wordBg }">
            <span class="word-emoji">{{ wordEmoji }}</span>
          </div>
          <div class="word-display">
            <h2 class="word-text">{{ currentWord?.word }}</h2>
            <p class="word-phonetic">{{ currentWord?.phonetic || '/fəˈnetɪk/' }}</p>
            <p class="word-meaning">{{ currentWord?.meaning || '单词释义' }}</p>
          </div>

          <!-- 例句 -->
          <div class="example-box">
            <p class="example-en">"{{ currentWord?.example || 'This is an example sentence.' }}"</p>
            <p class="example-cn">{{ currentWord?.exampleCn || '这是一个例句。' }}</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="word-actions">
          <button class="action-btn listen-btn" @click="playAudio"><span>🔊</span> 听发音</button>
          <button class="action-btn speak-btn" @click="startSpeaking"><span>🎤</span> 跟读</button>
          <button class="action-btn next-btn" @click="markKnown"><span>✅</span> 我认识了</button>
        </div>
      </div>

      <!-- 模式: speak — 跟读反馈 -->
      <div v-else-if="mode === 'speak'" key="speak" class="speak-mode">
        <div class="speak-card">
          <div class="speak-word">{{ currentWord?.word }}</div>

          <!-- 录音状态 -->
          <div class="recording-area" :class="{ recording: isRecording }">
            <div class="mic-ring" :class="{ active: isRecording }">
              <span class="mic-icon">🎤</span>
            </div>
            <p class="recording-hint">
              {{ isRecording ? '正在聆听...' : '点击麦克风开始跟读' }}
            </p>
            <div v-if="isRecording" class="audio-wave">
              <span
                v-for="i in 5"
                :key="i"
                class="wave-bar"
                :style="{ animationDelay: i * 0.1 + 's' }"
              ></span>
            </div>
          </div>

          <!-- 评分结果 -->
          <transition name="fade">
            <div v-if="score !== null" class="score-result">
              <div class="score-ring" :class="scoreLevel">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" class="score-bg" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    class="score-fill"
                    :style="{ strokeDashoffset: scoreOffset }"
                  />
                </svg>
                <div class="score-value">{{ score }}</div>
              </div>
              <div class="score-label">{{ scoreLabel }}</div>
              <div class="score-detail">
                <div class="detail-item">
                  <span class="detail-label">准确度</span>
                  <span class="detail-value">{{ accuracy }}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">流利度</span>
                  <span class="detail-value">{{ fluency }}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">完整度</span>
                  <span class="detail-value">{{ completeness }}%</span>
                </div>
              </div>
              <div class="feedback-msg" :class="scoreLevel">
                <span class="feedback-icon">{{ feedbackIcon }}</span>
                {{ feedbackText }}
              </div>
            </div>
          </transition>
        </div>

        <div class="speak-actions">
          <button v-if="score === null" class="action-btn listen-btn" @click="playAudio">
            <span>🔊</span> 听示范
          </button>
          <button v-if="speakFailed" class="action-btn retry-btn" @click="retrySpeak">
            <span>🔄</span> 再试一次
          </button>
          <button v-if="score !== null" class="action-btn retry-btn" @click="retrySpeak">
            <span>🔄</span> 再试一次
          </button>
          <button v-if="score !== null" class="action-btn next-btn" @click="afterSpeak">
            <span>→</span> 下一个
          </button>
        </div>
      </div>

      <!-- 模式: review — 复习测验 -->
      <div v-else-if="mode === 'review'" key="review" class="review-mode">
        <div v-if="reviewQuestion" class="review-card">
          <div class="quiz-type-badge">{{ quizTypeLabel }}</div>

          <!-- 看词选义 -->
          <template v-if="reviewQuestion.type === 'meaning'">
            <h2 class="quiz-word">{{ reviewQuestion.prompt }}</h2>
            <p class="quiz-hint">请选择正确的意思</p>
            <div class="options-grid">
              <button
                v-for="(opt, idx) in reviewQuestion.options"
                :key="idx"
                class="option-btn"
                :class="optionClass(idx)"
                :disabled="reviewAnswered"
                @click="selectOption(idx)"
              >
                {{ opt }}
              </button>
            </div>
          </template>

          <!-- 听音选词 -->
          <template v-if="reviewQuestion.type === 'listening'">
            <div class="listen-quiz">
              <button
                class="listen-btn-lg"
                :class="{ playing: isPlayingAudio }"
                @click="playQuizAudio"
              >
                <span>{{ isPlayingAudio ? '🔊' : '👂' }}</span>
                {{ isPlayingAudio ? '播放中...' : '点击听发音' }}
              </button>
            </div>
            <p class="quiz-hint">选出你听到的单词</p>
            <div class="options-grid">
              <button
                v-for="(opt, idx) in reviewQuestion.options"
                :key="idx"
                class="option-btn"
                :class="optionClass(idx)"
                :disabled="reviewAnswered"
                @click="selectOption(idx)"
              >
                {{ opt }}
              </button>
            </div>
          </template>

          <!-- 拼写 -->
          <template v-if="reviewQuestion.type === 'spelling'">
            <h2 class="quiz-word">{{ reviewQuestion.prompt }}</h2>
            <p class="quiz-hint">请输入正确的拼写</p>
            <div class="spell-input-wrap">
              <input
                ref="spellInput"
                v-model="spellAnswer"
                type="text"
                class="spell-input"
                :class="{ correct: spellResult === 'correct', wrong: spellResult === 'wrong' }"
                placeholder="输入单词拼写..."
                :disabled="reviewAnswered"
                @keyup.enter="submitSpelling"
              />
            </div>
            <button
              v-if="!reviewAnswered"
              class="btn btn-primary spell-submit"
              :disabled="!spellAnswer.trim()"
              @click="submitSpelling"
            >
              确认 ✓
            </button>
            <div v-if="spellResult" class="spell-feedback" :class="spellResult">
              {{
                spellResult === 'correct'
                  ? '✅ 回答正确！'
                  : `❌ 正确答案是: ${reviewQuestion.correctAnswer}`
              }}
            </div>
          </template>
        </div>

        <div class="review-actions">
          <button v-if="reviewAnswered" class="action-btn next-btn" @click="nextReview">
            <span>→</span> {{ isLastReview ? '完成复习' : '下一题' }}
          </button>
        </div>
      </div>

      <!-- 模式: dialogue — 专项对话训练 -->
      <div v-else-if="mode === 'dialogue'" key="dialogue" class="dialogue-mode">
        <div class="dialogue-card">
          <div class="dodo-avatar">🐣</div>
          <div class="dodo-bubble">
            <p class="dodo-sentence">{{ currentDodoSentence }}</p>
            <p class="dodo-cn">{{ currentDodoCn }}</p>
          </div>
        </div>

        <div class="dialogue-input-area">
          <input
            v-model="childReply"
            class="reply-input"
            placeholder="用英语回答，或点🎤说出～"
            @keyup.enter="submitReply"
          />
          <button class="icon-btn mic-btn" @click="startReplyRecognition">🎤</button>
          <button class="icon-btn send-btn" @click="submitReply">发送</button>
        </div>

        <transition name="fade">
          <div v-if="dodoFeedback" class="dodo-feedback" :class="dodoFeedbackLevel">
            {{ dodoFeedback }}
          </div>
        </transition>

        <div class="dialogue-actions">
          <button class="action-btn next-btn" @click="nextDialogue">
            <span>→</span> {{ isLastDialogue ? '完成学习' : '下一个词' }}
          </button>
        </div>
        <div class="dialogue-progress">专项对话 {{ dialogueIndex + 1 }} / {{ dialogueWords.length }}</div>
      </div>

      <!-- 模式: result — 学习结算 -->
      <div v-else-if="mode === 'result'" key="result" class="result-mode">
        <div class="result-header">
          <div class="result-badge">🎉</div>
          <h2 class="result-title">学习完成！</h2>
          <p class="result-sub">你又进步了一点点 ✨</p>
        </div>

        <div class="result-stats">
          <div class="stat-card">
            <span class="stat-icon">📝</span>
            <span class="stat-num">{{ words.length }}</span>
            <span class="stat-label">学习单词</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🎤</span>
            <span class="stat-num">{{ speakCount }}</span>
            <span class="stat-label">跟读次数</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">✅</span>
            <span class="stat-num">{{ correctCount }}</span>
            <span class="stat-label">正确率</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⭐</span>
            <span class="stat-num">{{ starsEarned }}</span>
            <span class="stat-label">获得星星</span>
          </div>
        </div>

        <!-- 豆豆鼓励 -->
        <div class="dodo-cheer">
          <div class="cheer-avatar animate-bounce">🐣</div>
          <div class="cheer-bubble">
            <p>{{ cheerMessage }}</p>
          </div>
        </div>

        <div class="result-actions">
          <button class="btn btn-secondary" @click="goHome">返回首页</button>
          <button class="btn btn-primary" @click="startNew">再学一组</button>
        </div>
      </div>
    </transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { petStore, feedPet } from '../stores/pet'
import { triggerEmotionEvent } from '../stores/emotion'
import { fetchDailyPlan, completeTaskByType } from '../stores/learning'
import { fetchWords } from '../stores/words'
import { submitPronounce } from '../stores/session'

const router = useRouter()

// 模式: word | speak | review | dialogue | result
const mode = ref<'word' | 'speak' | 'review' | 'dialogue' | 'result'>('word')

interface LearnWord {
  wordId?: string
  word: string
  phonetic?: string
  meaning: string
  example?: string
  exampleCn?: string
  emoji?: string
  bg?: string
  _isReview?: boolean
}

// 主题 → emoji/bg 映射表
const THEME_STYLES: Record<string, { emoji: string; bg: string }> = {
  animal: { emoji: '🐾', bg: '#ffe0e0' },
  space: { emoji: '🚀', bg: '#e0e0ff' },
  school: { emoji: '📚', bg: '#e0f0ff' },
  food: { emoji: '🍎', bg: '#fff0e0' },
  body: { emoji: '🦵', bg: '#ffe8f0' },
  color: { emoji: '🎨', bg: '#f0e8ff' },
  weather: { emoji: '🌤️', bg: '#e0f8ff' },
  sports: { emoji: '⚽', bg: '#e8ffe0' },
  family: { emoji: '👨‍👩‍👧', bg: '#fff8e0' },
  transport: { emoji: '🚌', bg: '#e8f0ff' },
  nature: { emoji: '🌿', bg: '#e0ffe8' },
}

function themeStyle(theme?: string | null) {
  return THEME_STYLES[theme || ''] || { emoji: '📖', bg: '#f0e6ff' }
}

const words = ref<LearnWord[]>([])
const wordsLoading = ref(true)
const wordsError = ref<string | null>(null)

/** 从每日计划加载今日单词 */
async function loadTodayWords() {
  wordsLoading.value = true
  wordsError.value = null
  try {
    // 获取每日计划，后端已返回完整单词信息
    const plan = await fetchDailyPlan()
    const planWords = plan?.plan?.newWords || []

    if (planWords.length === 0) {
      // 没有新单词计划，直接从词库取 5 个
      const result = await fetchWords({ limit: 5 })
      if (result && result.items.length > 0) {
        words.value = result.items.map((w) => {
          const style = themeStyle(w.theme)
          return {
            wordId: w.id,
            word: w.word,
            phonetic: w.phonetic || undefined,
            meaning: w.translation,
            example: `Let's learn the word "${w.word}"!`,
            exampleCn: `我们来学单词"${w.translation}"吧！`,
            emoji: style.emoji,
            bg: style.bg,
          }
        })
      }
    } else {
    // 直接使用 daily-plan 返回的单词数据
      const reviewItems: any[] = plan?.plan?.reviewQueue || []
      const newItems: any[] = planWords
      const allItems = [
        ...reviewItems.map((r: any) => ({
          wordId: r.wordId,
          word: r.word,
          phonetic: r.phonetic || undefined,
          meaning: r.translation,
          example: `Review: do you remember "${r.word}"?`,
          exampleCn: `复习：还记得"${r.translation}"吗？`,
          emoji: '🔄',
          bg: '#fff8e0',
          _isReview: true,
        })),
        ...newItems.map((w: any) => {
          const style = themeStyle(w.theme)
          return {
            wordId: w.wordId,
            word: w.word,
            phonetic: w.phonetic || undefined,
            meaning: w.translation,
            example: `Let's learn the word "${w.word}"!`,
            exampleCn: `我们来学单词"${w.translation}"吧！`,
            emoji: style.emoji,
            bg: style.bg,
          }
        }),
      ]
      words.value = allItems.length > 0 ? allItems : newItems.map((w: any) => {
        const style = themeStyle(w.theme)
        return {
          wordId: w.wordId,
          word: w.word,
          phonetic: w.phonetic || undefined,
          meaning: w.translation,
          example: `Let's learn the word "${w.word}"!`,
          exampleCn: `我们来学单词"${w.translation}"吧！`,
          emoji: style.emoji,
          bg: style.bg,
        }
      })
    }
  } catch (e: any) {
    wordsError.value = e.message || '加载单词失败'
    console.error('Failed to load words:', e)
  } finally {
    wordsLoading.value = false
  }
}

onMounted(() => {
  loadTodayWords()
})

const currentIndex = ref(0)
const currentWord = computed(() => words.value[currentIndex.value] || null)
const wordEmoji = computed(() => currentWord.value?.emoji || '📖')
const wordBg = computed(() => currentWord.value?.bg || '#f0e6ff')
const progressPct = computed(() => (currentIndex.value / words.value.length) * 100)

// 跟读状态
const isRecording = ref(false)
const speakFailed = ref(false)
const score = ref<number | null>(null)
const accuracy = ref(0)
const fluency = ref(0)
const completeness = ref(0)

const scoreLevel = computed(() => {
  if (score.value === null) return ''
  if (score.value >= 90) return 'excellent'
  if (score.value >= 70) return 'good'
  if (score.value >= 50) return 'fair'
  return 'poor'
})

const scoreLabel = computed(() => {
  if (score.value === null) return ''
  if (score.value >= 90) return '太棒了！发音很标准'
  if (score.value >= 70) return '不错哦，继续加油'
  if (score.value >= 50) return '还需练习，再来一次'
  return '多听多练，会更好的'
})

const scoreOffset = computed(() => {
  if (score.value === null) return 327
  return 327 - (327 * score.value) / 100
})

const feedbackIcon = computed(() => {
  if (score.value === null) return '🤔'
  if (score.value >= 90) return '🌟'
  if (score.value >= 70) return '👍'
  return '💪'
})

const feedbackText = computed(() => {
  if (score.value === null) return ''
  if (score.value >= 90) return `${petStore.name} 为你感到骄傲！发音非常标准！`
  if (score.value >= 70) return '读得不错！再练习一下会更好哦～'
  return '没关系，多听几遍，慢慢来！'
})

// 复习状态
interface ReviewQuestion {
  type: 'meaning' | 'listening' | 'spelling'
  prompt: string
  options?: string[]
  correctAnswer: string
}

const reviewQuestions = ref<ReviewQuestion[]>([])
const reviewIndex = ref(0)
const reviewQuestion = computed(() => reviewQuestions.value[reviewIndex.value] || null)
const reviewAnswered = ref(false)
const selectedOption = ref<number | null>(null)
const correctOption = ref<number>(-1)
const spellAnswer = ref('')
const spellResult = ref<'correct' | 'wrong' | ''>('')
const spellInput = ref<HTMLInputElement | null>(null)
const isPlayingAudio = ref(false)
const correctCount = ref(0)
const reviewCorrectCount = ref(0)
const speakCount = ref(0)
const starsEarned = ref(0)

const quizTypeLabel = computed(() => {
  if (!reviewQuestion.value) return ''
  const map: Record<string, string> = {
    meaning: '看词选义',
    listening: '听音选词',
    spelling: '拼写挑战',
  }
  return map[reviewQuestion.value.type] || ''
})

const isLastReview = computed(() => reviewIndex.value >= reviewQuestions.value.length - 1)

function generateReviewQuestions(): ReviewQuestion[] {
  return words.value.flatMap((w) => {
    const otherWords = words.value.filter((x) => x.word !== w.word)
    const distractors = otherWords.slice(0, 3).map((x) => x.meaning)
    return [
      {
        type: 'meaning' as const,
        prompt: w.word,
        options: shuffle([w.meaning, ...distractors]),
        correctAnswer: w.meaning,
      },
      {
        type: 'listening' as const,
        prompt: w.word,
        options: shuffle([w.word, ...otherWords.slice(0, 3).map((x) => x.word)]),
        correctAnswer: w.word,
      },
    ]
  })
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 真实语音播放（浏览器 TTS，免费）
function speakText(text: string) {
  if (!('speechSynthesis' in window)) {
    showToast(`🔊 ${text}`)
    return
  }
  try {
    window.speechSynthesis.cancel() // 停止上一段，避免叠加
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  } catch {
    showToast(`🔊 ${text}`)
  }
}

function playAudio() {
  const w = currentWord.value?.word
  if (w) speakText(w)
}

// 获取浏览器语音识别对象（webkit/chrome 支持）
function getRecognition(): any {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  return SR ? new SR() : null
}

function startSpeaking() {
  const recognition = getRecognition()
  if (!recognition) {
    showToast('当前浏览器不支持语音识别，请用 Chrome 试试～')
    return
  }
  mode.value = 'speak'
  score.value = null
  speakFailed.value = false
  speakCount.value++
  isRecording.value = true

  recognition.lang = 'en-US'
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event: any) => {
    const transcript = (event.results?.[0]?.[0]?.transcript || '').trim().toLowerCase()
    const target = (currentWord.value?.word || '').toLowerCase().trim()
    isRecording.value = false
    speakFailed.value = false

    // 没识别到任何内容 → 不给分，提示重试（修复"啥都没做都给分"）
    if (!transcript) {
      speakFailed.value = true
      showToast('没听清，再试一次吧～')
      return
    }

    // 真实评判标准：识别结果与目标词的比对
    let s: number
    if (transcript === target) {
      s = 92 + Math.floor(Math.random() * 9) // 92~100 完全正确
    } else if (transcript.includes(target) || target.includes(transcript)) {
      s = 72 + Math.floor(Math.random() * 12) // 72~83 基本正确
    } else {
      s = 45 + Math.floor(Math.random() * 15) // 45~59 读到了但不对
    }
    score.value = s
    accuracy.value = Math.min(100, Math.floor(s * (0.85 + Math.random() * 0.15)))
    fluency.value = Math.min(100, Math.floor(s * (0.8 + Math.random() * 0.2)))
    completeness.value = Math.min(100, Math.floor(s * (0.8 + Math.random() * 0.2)))
    triggerEmotionEvent(s >= 80 ? 'perfect_score' : 'correct_answer', s / 100, {
      word: currentWord.value?.word || '',
    })
  }

  recognition.onerror = () => {
    isRecording.value = false
    speakFailed.value = true
    showToast('没听清，再试一次吧～')
  }
  recognition.onnomatch = () => {
    isRecording.value = false
    speakFailed.value = true
    showToast('没听清，再试一次吧～')
  }

  try {
    recognition.start()
  } catch {
    isRecording.value = false
    speakFailed.value = true
  }
}

function retrySpeak() {
  startSpeaking()
}

function afterSpeak() {
  // 把本次跟读的掌握度回传后端，写入 word_progress，驱动艾宾浩斯复习队列
  const w = currentWord.value
  if (w?.wordId != null && score.value != null) {
    submitPronounce({
      wordId: w.wordId,
      score: score.value,
      accuracy: accuracy.value,
      fluency: fluency.value,
      completeness: completeness.value,
    }).catch(() => {})
  }
  score.value = null
  if (currentIndex.value < words.value.length - 1) {
    currentIndex.value++
    mode.value = 'word'
  } else {
    startReview()
  }
}

function markKnown() {
  triggerEmotionEvent('correct_answer', 0.8, { word: currentWord.value?.word || '' })
  feedPet(5)
  if (currentIndex.value < words.value.length - 1) {
    currentIndex.value++
  } else {
    startReview()
  }
}

function startReview() {
  reviewQuestions.value = generateReviewQuestions()
  reviewIndex.value = 0
  reviewAnswered.value = false
  selectedOption.value = null
  correctOption.value = -1
  spellAnswer.value = ''
  spellResult.value = ''
  reviewCorrectCount.value = 0
  mode.value = 'review'
}

function selectOption(idx: number) {
  if (reviewAnswered.value) return
  reviewAnswered.value = true
  selectedOption.value = idx
  if (reviewQuestion.value?.options) {
    correctOption.value = reviewQuestion.value.options.indexOf(reviewQuestion.value.correctAnswer)
  }
  if (idx === correctOption.value) {
    reviewCorrectCount.value++
    feedPet(3)
    triggerEmotionEvent('review_correct', 0.9, { word: reviewQuestion.value?.prompt || '' })
  } else {
    triggerEmotionEvent('review_forgot', 0.5, { word: reviewQuestion.value?.prompt || '' })
  }
}

function optionClass(idx: number) {
  if (!reviewAnswered.value) return ''
  if (idx === correctOption.value) return 'correct'
  if (idx === selectedOption.value && idx !== correctOption.value) return 'wrong'
  return 'dimmed'
}

function submitSpelling() {
  if (!spellAnswer.value.trim() || reviewAnswered.value) return
  reviewAnswered.value = true
  const isCorrect =
    spellAnswer.value.trim().toLowerCase() === reviewQuestion.value?.correctAnswer.toLowerCase()
  spellResult.value = isCorrect ? 'correct' : 'wrong'
  if (isCorrect) {
    reviewCorrectCount.value++
    feedPet(5)
    triggerEmotionEvent('review_correct', 1, { word: reviewQuestion.value?.prompt || '' })
  } else {
    triggerEmotionEvent('review_forgot', 0.3, { word: reviewQuestion.value?.prompt || '' })
  }
}

function playQuizAudio() {
  const w = reviewQuestion.value?.prompt
  if (w) speakText(w)
  isPlayingAudio.value = true
  setTimeout(() => {
    isPlayingAudio.value = false
  }, 1500)
}

function nextReview() {
  if (reviewIndex.value < reviewQuestions.value.length - 1) {
    reviewIndex.value++
    reviewAnswered.value = false
    selectedOption.value = null
    correctOption.value = -1
    spellAnswer.value = ''
    spellResult.value = ''
    nextTick(() => spellInput.value?.focus())
  } else {
    startDialogue()
  }
}

function showResult() {
  correctCount.value = reviewCorrectCount.value
  starsEarned.value = Math.floor(correctCount.value / 2) + speakCount.value
  mode.value = 'result'
  feedPet(starsEarned.value * 5)
  // 真实学习完成后，才把首页对应的每日任务标记为完成（由学习行为驱动）
  completeTaskByType(['word', 'speak', 'listen'], Math.max(3, starsEarned.value))
}

// ============================================================
// 专项对话训练（用今天学的词，加强记忆 + 成就感）
// ============================================================
const dialogueWords = computed(() => words.value.slice(0, 3).map((w) => w.word))
const dialogueIndex = ref(0)
const childReply = ref('')
const dodoFeedback = ref('')
const dodoFeedbackLevel = ref<'good' | 'try' | ''>('')
const currentDodoSentence = ref('')
const currentDodoCn = ref('')
const isLastDialogue = computed(() => dialogueIndex.value >= dialogueWords.value.length - 1)

function dodoSentenceFor(word: string) {
  const w = word.toLowerCase()
  return {
    en: `Look! I see a ${w}. Do you like ${w}s? Tell me yes or no!`,
    cn: `看！我看到了一只${w}。你喜欢${w}吗？用英语告诉我 yes 或 no！`,
  }
}

function startDialogue() {
  if (dialogueWords.value.length === 0) {
    showResult()
    return
  }
  dialogueIndex.value = 0
  childReply.value = ''
  dodoFeedback.value = ''
  dodoFeedbackLevel.value = ''
  showDodoSentence()
  mode.value = 'dialogue'
}

function showDodoSentence() {
  const word = dialogueWords.value[dialogueIndex.value]
  if (!word) return
  const s = dodoSentenceFor(word)
  currentDodoSentence.value = s.en
  currentDodoCn.value = s.cn
  speakText(s.en)
}

function submitReply() {
  const reply = childReply.value.trim().toLowerCase()
  const word = dialogueWords.value[dialogueIndex.value]
  if (!reply) {
    dodoFeedback.value = '再说一次吧～用英语试试看！'
    dodoFeedbackLevel.value = 'try'
    return
  }
  if (reply.includes(word) || reply.includes(word + 's')) {
    dodoFeedback.value = `Great! You said "${word}"! 🌟 You're doing amazing!`
    dodoFeedbackLevel.value = 'good'
    feedPet(5)
    triggerEmotionEvent('perfect_score', 1, { word })
  } else {
    dodoFeedback.value = `Good try! Let's say "${word}" together: ${word}!`
    dodoFeedbackLevel.value = 'try'
    feedPet(2)
    triggerEmotionEvent('correct_answer', 0.7, { word })
  }
}

function nextDialogue() {
  if (dialogueIndex.value < dialogueWords.value.length - 1) {
    dialogueIndex.value++
    childReply.value = ''
    dodoFeedback.value = ''
    dodoFeedbackLevel.value = ''
    showDodoSentence()
  } else {
    showResult()
  }
}

function startReplyRecognition() {
  const recognition = getRecognition()
  if (!recognition) {
    showToast('当前浏览器不支持语音，请直接打字～')
    return
  }
  recognition.lang = 'en-US'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onresult = (event: any) => {
    const text = (event.results?.[0]?.[0]?.transcript || '').trim()
    childReply.value = text
    submitReply()
  }
  recognition.onerror = () => showToast('没听清，再试一次～')
  try {
    recognition.start()
  } catch {
    /* ignore */
  }
}

const cheerMessage = computed(() => {
  const rate = words.value.length > 0 ? correctCount.value / (reviewQuestions.value.length || 1) : 0
  if (rate >= 0.9) return `太厉害了！${petStore.name} 为你感到骄傲！全部答对了！🌟`
  if (rate >= 0.7) return `非常棒！答对了很多呢！${petStore.name} 很开心！`
  if (rate >= 0.5) return '不错哦！继续努力，下次会更好的！'
  return '没关系，学习需要时间。再来一次吧！💪'
})

function handleBack() {
  if (mode.value === 'result') {
    router.push('/')
    return
  }
  if (mode.value === 'review') {
    mode.value = 'word'
    return
  }
  if (mode.value === 'speak') {
    mode.value = 'word'
    return
  }
  router.push('/')
}

function goHome() {
  router.push('/')
}

function startNew() {
  currentIndex.value = 0
  mode.value = 'word'
  // 刷新单词
  words.value = shuffle(words.value)
}

function showToast(msg: string) {
  // 简单的 toast 提示
  // eslint-disable-next-line no-console -- 临时 toast 提示
  console.log(msg)
}
</script>

<style scoped>
.learn-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f7ff 0%, #f0ecff 100%);
  padding-bottom: 40px;
}

/* 加载 / 错误 / 空状态 */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  color: var(--text-secondary, #666);
  font-size: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  padding: 10px 24px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #7c3aed;
}

/* 顶部导航 */
.learn-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--primary);
  color: white;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-light);
  min-width: 48px;
  text-align: right;
}

/* ============ 单词学习模式 ============ */
.word-mode {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;

.review-badge {
  background: #fff3cd;
  color: #856404;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 12px;
  margin-bottom: 12px;
}
  gap: 24px;
}

.word-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(108, 92, 231, 0.1);
}

.word-illustration {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.5s;
}

.word-emoji {
  font-size: 72px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

.word-display {
  padding: 20px 24px 0;
  text-align: center;
}

.word-text {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 4px;
}

.word-phonetic {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.word-meaning {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}

.example-box {
  margin: 16px 24px 24px;
  padding: 16px;
  background: var(--bg);
  border-radius: 12px;
}

.example-en {
  font-size: 15px;
  color: var(--text);
  font-style: italic;
  line-height: 1.6;
}

.example-cn {
  font-size: 13px;
  color: var(--text-light);
  margin-top: 6px;
}

.word-actions {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  border-radius: 16px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.listen-btn {
  background: #e8f4fd;
  color: #2980b9;
}

.listen-btn:hover {
  background: #d0e8f8;
  transform: translateY(-1px);
}

.speak-btn {
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  color: white;
  box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
}

.speak-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.4);
}

.next-btn {
  background: linear-gradient(135deg, #00b894, #55efc4);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 184, 148, 0.3);
}

.next-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 184, 148, 0.4);
}

/* ============ 跟读模式 ============ */
.speak-mode {
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.speak-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 20px;
  padding: 32px 24px;
  box-shadow: 0 8px 30px rgba(108, 92, 231, 0.1);
  text-align: center;
}

.speak-word {
  font-size: 42px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 32px;
}

.recording-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.mic-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 3px solid transparent;
}

.mic-ring:hover {
  border-color: var(--primary);
}

.mic-ring.active {
  border-color: var(--danger);
  background: #ffeaea;
  animation: micPulse 1s ease-in-out infinite;
}

@keyframes micPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(225, 112, 85, 0.4);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(225, 112, 85, 0);
  }
}

.mic-icon {
  font-size: 40px;
}

.recording-hint {
  font-size: 15px;
  color: var(--text-light);
}

.audio-wave {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 40px;
}

.wave-bar {
  width: 4px;
  background: var(--primary);
  border-radius: 2px;
  animation: waveAnim 0.6s ease-in-out infinite alternate;
}

@keyframes waveAnim {
  from {
    height: 8px;
  }
  to {
    height: 36px;
  }
}

/* 评分结果 */
.score-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.score-ring {
  position: relative;
  width: 120px;
  height: 120px;
}

.score-ring svg {
  transform: rotate(-90deg);
}

.score-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 8;
}

.score-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 327;
  transition: stroke-dashoffset 1s ease;
}

.excellent .score-fill {
  stroke: #00b894;
}
.good .score-fill {
  stroke: #6c5ce7;
}
.fair .score-fill {
  stroke: #f39c12;
}
.poor .score-fill {
  stroke: #e17055;
}

.score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: 700;
}

.excellent .score-value {
  color: #00b894;
}
.good .score-value {
  color: #6c5ce7;
}
.fair .score-value {
  color: #f39c12;
}
.poor .score-value {
  color: #e17055;
}

.score-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.score-detail {
  display: flex;
  gap: 20px;
  margin-top: 8px;
}

.detail-item {
  text-align: center;
}

.detail-label {
  font-size: 11px;
  color: var(--text-muted);
  display: block;
}

.detail-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.feedback-msg {
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.feedback-msg.excellent {
  background: #e6fff8;
  color: #00896c;
}
.feedback-msg.good {
  background: #f0ecff;
  color: #4a3db3;
}
.feedback-msg.fair {
  background: #fff8e6;
  color: #b8860b;
}
.feedback-msg.poor {
  background: #ffeaea;
  color: #c0392b;
}

.feedback-icon {
  font-size: 20px;
}

.speak-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 360px;
}

.retry-btn {
  flex: 1;
  background: var(--bg);
  color: var(--text);
}

.retry-btn:hover {
  background: #e8e4f8;
}

/* ============ 复习模式 ============ */
.review-mode {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.review-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 20px;
  padding: 28px 20px;
  box-shadow: 0 8px 30px rgba(108, 92, 231, 0.1);
  text-align: center;
}

.quiz-type-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  background: var(--bg);
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}

.quiz-word {
  font-size: 36px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.quiz-hint {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.option-btn {
  padding: 16px 12px;
  border-radius: 12px;
  border: 2px solid var(--border);
  background: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover:not(:disabled) {
  border-color: var(--primary);
  background: rgba(108, 92, 231, 0.05);
}

.option-btn.correct {
  border-color: #00b894;
  background: #e6fff8;
  color: #00896c;
  font-weight: 700;
}

.option-btn.wrong {
  border-color: #e17055;
  background: #ffeaea;
  color: #c0392b;
}

.option-btn.dimmed {
  opacity: 0.4;
}

.listen-quiz {
  margin-bottom: 20px;
}

.listen-btn-lg {
  padding: 16px 32px;
  border-radius: 50px;
  border: 2px solid var(--primary);
  background: white;
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
}

.listen-btn-lg:hover {
  background: var(--primary);
  color: white;
}

.listen-btn-lg.playing {
  background: var(--primary);
  color: white;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 拼写 */
.spell-input-wrap {
  margin-bottom: 16px;
}

.spell-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 2px solid var(--border);
  font-size: 18px;
  text-align: center;
  outline: none;
  transition: all 0.3s;
  letter-spacing: 2px;
}

.spell-input:focus {
  border-color: var(--primary);
}

.spell-input.correct {
  border-color: #00b894;
  background: #e6fff8;
}

.spell-input.wrong {
  border-color: #e17055;
  background: #ffeaea;
}

.spell-submit {
  width: 100%;
}

.spell-feedback {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
}

.spell-feedback.correct {
  color: #00b894;
}
.spell-feedback.wrong {
  color: #e17055;
}

.review-actions {
  width: 100%;
  max-width: 360px;
}

/* ============ 专项对话训练 ============ */
.dialogue-mode {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.dialogue-card {
  width: 100%;
  max-width: 360px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.dodo-avatar {
  font-size: 48px;
  flex-shrink: 0;
  animation: bounce 1.5s ease-in-out infinite;
}

.dodo-bubble {
  flex: 1;
  background: white;
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: 0 8px 30px rgba(108, 92, 231, 0.1);
}

.dodo-sentence {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.5;
}

.dodo-cn {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 6px;
}

.dialogue-input-area {
  width: 100%;
  max-width: 360px;
  display: flex;
  gap: 8px;
}

.reply-input {
  flex: 1;
  padding: 14px 16px;
  border-radius: 14px;
  border: 2px solid var(--border);
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
}

.reply-input:focus {
  border-color: var(--primary);
}

.icon-btn {
  width: 48px;
  border-radius: 14px;
  border: none;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.mic-btn {
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  color: white;
}

.send-btn {
  background: linear-gradient(135deg, #00b894, #55efc4);
  color: white;
}

.dodo-feedback {
  width: 100%;
  max-width: 360px;
  padding: 14px 18px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
}

.dodo-feedback.good {
  background: #e6fff8;
  color: #00896c;
}

.dodo-feedback.try {
  background: #fff8e6;
  color: #b8860b;
}

.dialogue-actions {
  width: 100%;
  max-width: 360px;
}

.dialogue-progress {
  font-size: 13px;
  color: var(--text-muted);
}

/* ============ 结算模式 ============ */
.result-mode {
  padding: 40px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.result-header {
  text-align: center;
}

.result-badge {
  font-size: 56px;
  margin-bottom: 8px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.result-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.result-sub {
  font-size: 15px;
  color: var(--text-light);
  margin-top: 4px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 360px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 16px 8px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(108, 92, 231, 0.08);
}

.stat-icon {
  font-size: 24px;
  display: block;
  margin-bottom: 6px;
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary);
  display: block;
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
}

.dodo-cheer {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, #fff9e6, #ffe0f0);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 360px;
}

.cheer-avatar {
  font-size: 48px;
  flex-shrink: 0;
}

.animate-bounce {
  animation: bounce 1.5s ease-in-out infinite;
}

.cheer-bubble {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
}

.result-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 360px;
}

.result-actions .btn {
  flex: 1;
}

.btn-primary {
  padding: 14px 24px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.3);
}

.btn-secondary {
  padding: 14px 24px;
  border-radius: 14px;
  border: 2px solid var(--border);
  background: white;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.35s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
