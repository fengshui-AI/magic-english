<template>
  <div class="notebook-page">
    <!-- 头部 -->
    <div class="nb-header animate-fade-in">
      <h1>📖 魔法手账本</h1>
      <p>收集你学过的每一个单词</p>
    </div>

    <!-- 统计概览 -->
    <div class="stats-bar animate-fade-in" style="animation-delay: 0.1s">
      <div class="stat-item">
        <span class="stat-num">{{ filteredWords.length }}</span>
        <span class="stat-label">已收集</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num">{{ masteredCount }}</span>
        <span class="stat-label">已掌握</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num">{{ learningCount }}</span>
        <span class="stat-label">学习中</span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar animate-fade-in" style="animation-delay: 0.15s">
      <!-- 主题筛选 -->
      <div class="filter-scroll">
        <button
          class="filter-chip"
          :class="{ active: activeTheme === 'all' }"
          @click="activeTheme = 'all'"
        >
          全部
        </button>
        <button
          v-for="theme in themes"
          :key="theme.id"
          class="filter-chip"
          :class="{ active: activeTheme === theme.id }"
          @click="activeTheme = theme.id"
        >
          {{ theme.icon }} {{ theme.name }}
        </button>
      </div>

      <!-- 排序切换 -->
      <div class="sort-row">
        <button
          class="sort-btn"
          :class="{ active: sortBy === 'recent' }"
          @click="sortBy = 'recent'"
        >
          🕐 最近
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortBy === 'alphabet' }"
          @click="sortBy = 'alphabet'"
        >
          🔤 字母
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortBy === 'mastery' }"
          @click="sortBy = 'mastery'"
        >
          ⭐ 掌握度
        </button>
      </div>
    </div>

    <!-- 单词网格 -->
    <div class="word-grid animate-fade-in" style="animation-delay: 0.2s">
      <transition-group name="flip-list" tag="div" class="grid-wrap">
        <div
          v-for="(word, idx) in sortedWords"
          :key="word.id"
          class="word-cell"
          :class="{ mastered: word.mastery >= 80 }"
          :style="{ animationDelay: idx * 0.03 + 's' }"
          @click="openDetail(word)"
        >
          <div class="cell-front">
            <span class="cell-emoji">{{ word.emoji }}</span>
            <span class="cell-word">{{ word.word }}</span>
            <span class="cell-meaning">{{ word.meaning }}</span>
          </div>
          <div class="cell-back">
            <div class="mastery-bar-wrap">
              <div class="mastery-bar" :style="{ width: word.mastery + '%' }"></div>
            </div>
            <span class="mastery-label">{{ word.mastery }}%</span>
          </div>
        </div>
      </transition-group>

      <div v-if="filteredWords.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>还没有收集到单词哦</p>
        <p class="empty-sub">去学习页收集你的第一个魔法单词吧！</p>
      </div>
    </div>

    <!-- 单词详情弹窗 -->
    <transition name="modal">
      <div v-if="detailWord" class="modal-overlay" @click.self="closeDetail">
        <div class="modal-card" :class="{ 'flip-in': detailWord }">
          <!-- 关闭按钮 -->
          <button class="modal-close" @click="closeDetail">✕</button>

          <!-- 单词头部 -->
          <div class="detail-header" :style="{ background: detailWord.bg || '#f0e6ff' }">
            <span class="detail-emoji">{{ detailWord.emoji }}</span>
            <h2 class="detail-word">{{ detailWord.word }}</h2>
            <p class="detail-phonetic">{{ detailWord.phonetic || '/fəˈnetɪk/' }}</p>
          </div>

          <!-- 单词信息 -->
          <div class="detail-body">
            <div class="detail-meaning">
              <span class="label">释义</span>
              <span class="value">{{ detailWord.meaning }}</span>
            </div>
            <div class="detail-example">
              <span class="label">例句</span>
              <p class="example-en">"{{ detailWord.example || 'No example available.' }}"</p>
              <p class="example-cn">{{ detailWord.exampleCn || '' }}</p>
            </div>

            <!-- 掌握度 -->
            <div class="mastery-section">
              <div class="mastery-header">
                <span class="label">掌握程度</span>
                <span class="mastery-pct">{{ detailWord.mastery }}%</span>
              </div>
              <div class="mastery-bar-lg">
                <div
                  class="mastery-fill"
                  :style="{ width: detailWord.mastery + '%' }"
                  :class="masteryLevel"
                ></div>
              </div>
              <p class="mastery-tip">{{ masteryTip }}</p>
            </div>

            <!-- 操作按钮 -->
            <div class="detail-actions">
              <button class="action-btn" @click="playWord(detailWord)">
                <span>🔊</span> 听发音
              </button>
              <button class="action-btn primary" @click="practiceWord(detailWord)">
                <span>🎤</span> 练习发音
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchWords, fetchTopics } from '../stores/words'

const router = useRouter()
const toast = ref('')
const loading = ref(true)
const error = ref<string | null>(null)

interface NotebookWord {
  id: string
  word: string
  meaning: string
  phonetic?: string
  emoji: string
  bg: string
  theme: string
  mastery: number
  learnedAt: string
  example?: string
  exampleCn?: string
}

const activeTheme = ref('all')
const sortBy = ref<'recent' | 'alphabet' | 'mastery'>('recent')
const detailWord = ref<NotebookWord | null>(null)

// 主题元数据
const THEME_META: Record<string, { name: string; icon: string }> = {
  animal: { name: '动物', icon: '🐱' },
  food: { name: '美食', icon: '🍕' },
  school: { name: '学校', icon: '📚' },
  nature: { name: '自然', icon: '🌿' },
  family: { name: '家庭', icon: '👨‍👩‍👧' },
  color: { name: '颜色', icon: '🎨' },
  body: { name: '身体', icon: '🦵' },
  weather: { name: '天气', icon: '🌤️' },
  sports: { name: '运动', icon: '⚽' },
  transport: { name: '交通', icon: '🚗' },
  space: { name: '太空', icon: '🚀' },
}

const THEME_STYLES: Record<string, { emoji: string; bg: string }> = {
  animal: { emoji: '🐱', bg: '#ffe8e0' },
  food: { emoji: '🍕', bg: '#ffe0e0' },
  school: { emoji: '📚', bg: '#e0f0ff' },
  nature: { emoji: '🌿', bg: '#e8ffe0' },
  family: { emoji: '👨‍👩‍👧', bg: '#ffe0f0' },
  color: { emoji: '🎨', bg: '#f0e0ff' },
  body: { emoji: '🦵', bg: '#fff8e0' },
  weather: { emoji: '🌤️', bg: '#e0f8ff' },
  sports: { emoji: '⚽', bg: '#e8ffe8' },
  transport: { emoji: '🚗', bg: '#ffe8e8' },
  space: { emoji: '🚀', bg: '#e8e0ff' },
}

const themes = ref<{ id: string; name: string; icon: string }[]>([
  { id: 'animal', name: '动物', icon: '🐱' },
  { id: 'food', name: '美食', icon: '🍕' },
  { id: 'school', name: '学校', icon: '📚' },
  { id: 'nature', name: '自然', icon: '🌿' },
  { id: 'family', name: '家庭', icon: '👨‍👩‍👧' },
  { id: 'color', name: '颜色', icon: '🎨' },
])

// Mock 单词数据
const allWords = ref<NotebookWord[]>([
  {
    id: '1',
    word: 'apple',
    meaning: '苹果',
    phonetic: '/ˈæp.əl/',
    emoji: '🍎',
    bg: '#ffe0e0',
    theme: 'food',
    mastery: 90,
    learnedAt: '2026-07-14',
    example: 'I eat an apple every day.',
    exampleCn: '我每天吃一个苹果。',
  },
  {
    id: '2',
    word: 'beautiful',
    meaning: '美丽的',
    phonetic: '/ˈbjuː.tɪ.fəl/',
    emoji: '🌸',
    bg: '#ffe0f0',
    theme: 'nature',
    mastery: 60,
    learnedAt: '2026-07-14',
    example: 'The flowers are beautiful.',
    exampleCn: '花很美。',
  },
  {
    id: '3',
    word: 'because',
    meaning: '因为',
    phonetic: '/bɪˈkɒz/',
    emoji: '💡',
    bg: '#e0f0ff',
    theme: 'school',
    mastery: 40,
    learnedAt: '2026-07-13',
    example: 'I am happy because I won.',
    exampleCn: '我很开心因为我赢了。',
  },
  {
    id: '4',
    word: 'favorite',
    meaning: '最喜欢的',
    phonetic: '/ˈfeɪ.vər.ɪt/',
    emoji: '💙',
    bg: '#e0e8ff',
    theme: 'school',
    mastery: 50,
    learnedAt: '2026-07-13',
    example: 'My favorite color is blue.',
    exampleCn: '我最喜欢的颜色是蓝色。',
  },
  {
    id: '5',
    word: 'dragon',
    meaning: '龙',
    phonetic: '/ˈdræɡ.ən/',
    emoji: '🐉',
    bg: '#e8ffe0',
    theme: 'animals',
    mastery: 85,
    learnedAt: '2026-07-12',
    example: 'The dragon flies high.',
    exampleCn: '龙飞得很高。',
  },
  {
    id: '6',
    word: 'cat',
    meaning: '猫',
    emoji: '🐱',
    bg: '#fff0e0',
    theme: 'animals',
    mastery: 95,
    learnedAt: '2026-07-12',
    example: 'The cat is sleeping.',
    exampleCn: '猫在睡觉。',
  },
  {
    id: '7',
    word: 'dog',
    meaning: '狗',
    emoji: '🐶',
    bg: '#ffe8d0',
    theme: 'animals',
    mastery: 88,
    learnedAt: '2026-07-11',
    example: 'I walk my dog every day.',
    exampleCn: '我每天遛狗。',
  },
  {
    id: '8',
    word: 'book',
    meaning: '书',
    emoji: '📖',
    bg: '#f0e6ff',
    theme: 'school',
    mastery: 75,
    learnedAt: '2026-07-11',
    example: 'I love reading books.',
    exampleCn: '我喜欢读书。',
  },
  {
    id: '9',
    word: 'blue',
    meaning: '蓝色',
    emoji: '🔵',
    bg: '#e0f0ff',
    theme: 'colors',
    mastery: 100,
    learnedAt: '2026-07-10',
    example: 'The sky is blue.',
    exampleCn: '天空是蓝色的。',
  },
  {
    id: '10',
    word: 'red',
    meaning: '红色',
    emoji: '🔴',
    bg: '#ffe0e0',
    theme: 'colors',
    mastery: 70,
    learnedAt: '2026-07-10',
    example: 'The apple is red.',
    exampleCn: '苹果是红色的。',
  },
  {
    id: '11',
    word: 'mother',
    meaning: '妈妈',
    emoji: '👩',
    bg: '#ffe0f0',
    theme: 'family',
    mastery: 92,
    learnedAt: '2026-07-09',
    example: 'My mother is kind.',
    exampleCn: '我妈妈很善良。',
  },
  {
    id: '12',
    word: 'father',
    meaning: '爸爸',
    emoji: '👨',
    bg: '#e0f0ff',
    theme: 'family',
    mastery: 80,
    learnedAt: '2026-07-09',
    example: 'My father is tall.',
    exampleCn: '我爸爸很高。',
  },
  {
    id: '13',
    word: 'tree',
    meaning: '树',
    emoji: '🌳',
    bg: '#e8ffe0',
    theme: 'nature',
    mastery: 65,
    learnedAt: '2026-07-08',
    example: 'The tree is green.',
    exampleCn: '树是绿色的。',
  },
  {
    id: '14',
    word: 'water',
    meaning: '水',
    emoji: '💧',
    bg: '#e0f4ff',
    theme: 'nature',
    mastery: 55,
    learnedAt: '2026-07-08',
    example: 'I drink water.',
    exampleCn: '我喝水。',
  },
  {
    id: '15',
    word: 'pizza',
    meaning: '披萨',
    emoji: '🍕',
    bg: '#ffe8d0',
    theme: 'food',
    mastery: 78,
    learnedAt: '2026-07-07',
    example: 'I like pizza.',
    exampleCn: '我喜欢披萨。',
  },
  {
    id: '16',
    word: 'happy',
    meaning: '快乐的',
    emoji: '😊',
    bg: '#fffbe0',
    theme: 'school',
    mastery: 82,
    learnedAt: '2026-07-07',
    example: 'I am very happy.',
    exampleCn: '我非常快乐。',
  },
])

const filteredWords = computed(() => {
  let words = [...allWords.value]
  if (activeTheme.value !== 'all') {
    words = words.filter((w) => w.theme === activeTheme.value)
  }
  return words
})

const sortedWords = computed(() => {
  const words = [...filteredWords.value]
  if (sortBy.value === 'alphabet') {
    words.sort((a, b) => a.word.localeCompare(b.word))
  } else if (sortBy.value === 'mastery') {
    words.sort((a, b) => b.mastery - a.mastery)
  } else {
    words.sort((a, b) => b.learnedAt.localeCompare(a.learnedAt))
  }
  return words
})

const masteredCount = computed(() => allWords.value.filter((w) => w.mastery >= 80).length)
const learningCount = computed(() => allWords.value.filter((w) => w.mastery < 80).length)

const masteryLevel = computed(() => {
  if (!detailWord.value) return ''
  if (detailWord.value.mastery >= 80) return 'high'
  if (detailWord.value.mastery >= 50) return 'mid'
  return 'low'
})

const masteryTip = computed(() => {
  if (!detailWord.value) return ''
  if (detailWord.value.mastery >= 80) return '掌握得很好！继续保持～'
  if (detailWord.value.mastery >= 50) return '正在进步中，多练习几次就能掌握啦！'
  return '这个单词还不太熟悉，多读多练吧！'
})

function openDetail(word: NotebookWord) {
  detailWord.value = word
}

function closeDetail() {
  detailWord.value = null
}

function playWord(word: NotebookWord) {
  showToast(`🔊 播放 "${word.word}" 的标准发音`)
}

function practiceWord(word: NotebookWord) {
  closeDetail()
  showToast(`🎤 正在跳转到练习页面（"${word.word}"）`)
  router.push('/learn')
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    toast.value = ''
  }, 2000)
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    // 加载主题列表
    const topicList = await fetchTopics()
    if (topicList.length > 0) {
      themes.value = topicList
        .map((t: string) => ({
          id: t,
          name: THEME_META[t]?.name || t,
          icon: THEME_META[t]?.icon || '📖',
        }))
    }

    // 加载用户已学单词（通过 progress API）
    const result = await fetchWords({ limit: 50 })
    if (result && result.items.length > 0) {
      allWords.value = result.items.map((w) => {
        const style = THEME_STYLES[w.theme || ''] || { emoji: '📖', bg: '#f0e6ff' }
        const progress = (w as any).progress
        return {
          id: w.id,
          word: w.word,
          meaning: w.translation,
          phonetic: w.phonetic || undefined,
          emoji: style.emoji,
          bg: style.bg,
          theme: w.theme || 'school',
          mastery: progress?.avgScore ? Math.round(progress.avgScore * 100) : 0,
          learnedAt: w.createdAt?.split('T')[0] || '',
          example: `Let's learn "${w.word}"!`,
          exampleCn: `我们来学"${w.translation}"吧！`,
        }
      })
    }
  } catch (e: any) {
    error.value = e.message || '加载生词本失败'
    console.error('Failed to load notebook:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.notebook-page {
  padding: 20px 16px 100px;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
}

.nb-header {
  text-align: center;
  margin-bottom: 16px;
}

.nb-header h1 {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #6c5ce7, #fd79a8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nb-header p {
  color: var(--text-light);
  font-size: 13px;
  margin-top: 4px;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 15px rgba(108, 92, 231, 0.08);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary);
  display: block;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: var(--border);
}

/* 筛选栏 */
.filter-bar {
  margin-bottom: 16px;
}

.filter-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-light);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.filter-chip:hover {
  border-color: var(--primary-light);
}

.filter-chip.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.sort-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.sort-btn {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: white;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s;
}

.sort-btn.active {
  background: var(--bg);
  color: var(--primary);
  border-color: var(--primary-light);
  font-weight: 600;
}

/* 单词网格 */
.word-grid {
  min-height: 200px;
}

.grid-wrap {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.word-cell {
  aspect-ratio: 1;
  background: white;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  animation: cellAppear 0.5s ease-out both;
}

@keyframes cellAppear {
  from {
    opacity: 0;
    transform: scale(0.8) rotateY(90deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotateY(0);
  }
}

.word-cell:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 8px 25px rgba(108, 92, 231, 0.15);
}

.word-cell.mastered {
  border: 2px solid rgba(0, 184, 148, 0.3);
  background: linear-gradient(135deg, #f0fff8, white);
}

.cell-front {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.cell-emoji {
  font-size: 28px;
}

.cell-word {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.cell-meaning {
  font-size: 11px;
  color: var(--text-muted);
}

.cell-back {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  opacity: 0;
  transition: opacity 0.3s;
}

.word-cell:hover .cell-back {
  opacity: 1;
}

.mastery-bar-wrap {
  flex: 1;
  height: 3px;
  background: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.mastery-bar {
  height: 100%;
  background: var(--success);
  border-radius: 2px;
  transition: width 0.5s;
}

.mastery-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--success);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 16px;
  color: var(--text-light);
}

.empty-sub {
  font-size: 13px !important;
  color: var(--text-muted) !important;
  margin-top: 4px;
}

/* ============ 详情弹窗 ============ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  position: relative;
}

.flip-in {
  animation: flipIn 0.4s ease-out;
}

@keyframes flipIn {
  from {
    opacity: 0;
    transform: perspective(600px) rotateY(-20deg) scale(0.9);
  }
  to {
    opacity: 1;
    transform: perspective(600px) rotateY(0) scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  font-size: 16px;
  cursor: pointer;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background: white;
  transform: rotate(90deg);
}

.detail-header {
  padding: 40px 24px 24px;
  text-align: center;
  transition: background 0.5s;
}

.detail-emoji {
  font-size: 56px;
  display: block;
  margin-bottom: 8px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.detail-word {
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
}

.detail-phonetic {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
}

.detail-body {
  padding: 20px 24px 28px;
}

.detail-meaning {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.label {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg);
  padding: 3px 10px;
  border-radius: 8px;
  white-space: nowrap;
}

.detail-meaning .value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}

.detail-example {
  background: var(--bg);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 20px;
}

.detail-example .label {
  margin-bottom: 8px;
  display: inline-block;
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
  margin-top: 4px;
}

/* 掌握度 */
.mastery-section {
  margin-bottom: 20px;
}

.mastery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mastery-pct {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

.mastery-bar-lg {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.mastery-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.mastery-fill.high {
  background: var(--success);
}
.mastery-fill.mid {
  background: var(--warning);
}
.mastery-fill.low {
  background: var(--danger);
}

.mastery-tip {
  font-size: 12px;
  color: var(--text-muted);
}

/* 操作按钮 */
.detail-actions {
  display: flex;
  gap: 10px;
}

.detail-actions .action-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.detail-actions .action-btn:hover {
  border-color: var(--primary);
  background: var(--bg);
}

.detail-actions .action-btn.primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.detail-actions .action-btn.primary:hover {
  background: var(--primary-dark);
}

/* Toast */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  z-index: 999;
  pointer-events: none;
}

/* 列表动画 */
.flip-list-enter-active,
.flip-list-leave-active {
  transition: all 0.4s ease;
}

.flip-list-enter-from {
  opacity: 0;
  transform: scale(0.5) rotateY(90deg);
}

.flip-list-leave-to {
  opacity: 0;
  transform: scale(0.5) rotateY(-90deg);
}

.flip-list-move {
  transition: transform 0.4s ease;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card {
  transform: scale(0.8) translateY(20px);
}

.modal-leave-to .modal-card {
  transform: scale(0.8) translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
