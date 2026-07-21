<template>
  <div class="notebook-page">
    <!-- ============================================================
         深空星空背景
         ============================================================ -->
    <div class="starfield">
      <div v-for="s in 30" :key="'star' + s" class="star" :style="starStyle(s)" />
    </div>

    <!-- ============================================================
         头部
         ============================================================ -->
    <header class="nb-header">
      <h1 class="nb-title">
        <span class="title-icon">📖</span>
        魔法手账本
      </h1>
      <p class="nb-subtitle">收集你征服的每一个单词卡牌</p>
    </header>

    <!-- ============================================================
         统计概览 + 稀有度图鉴
         ============================================================ -->
    <div class="stats-section">
      <!-- 统计 -->
      <div class="stats-row">
        <!-- 一年级：只显示已收集 -->
        <template v-if="isGrade1">
          <div class="stat-card grade1-stat">
            <span class="stat-num grade1-num">{{ filteredWords.length }}</span>
            <span class="stat-label grade1-label">个单词已收集 ✨</span>
          </div>
        </template>
        <!-- 高年级：3 个统计卡片 -->
        <template v-else>
        <div class="stat-card">
          <span class="stat-num">{{ filteredWords.length }}</span>
          <span class="stat-label">已收集</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ masteredCount }}</span>
          <span class="stat-label">已掌握</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ learningCount }}</span>
          <span class="stat-label">学习中</span>
        </div>
        </template>
      </div>

      <!-- 稀有度分布（一年级隐藏） -->
      <template v-if="!isGrade1">
      <div class="rarity-bar">
        <div
          v-for="r in rarityStats"
          :key="r.key"
          class="rarity-segment"
          :style="{ width: r.pct + '%', background: r.color }"
        >
          <span class="rarity-seg-icon">{{ r.icon }}</span>
        </div>
      </div>
      <div class="rarity-legend">
        <span v-for="r in rarityStats" :key="r.key" class="rarity-legend-item">
          <span class="legend-dot" :style="{ background: r.color }" />
          {{ r.name }} {{ r.count }}
        </span>
      </div>
      </template>
    </div>

    <!-- ============================================================
         筛选栏
         ============================================================ -->
    <div class="filter-bar">
      <div class="filter-scroll" :class="{ 'grade1-filters': isGrade1 }">
        <button
          class="filter-chip"
          :class="{ active: activeTheme === 'all' }"
          @click="activeTheme = 'all'"
        >全部</button>
        <template v-if="isGrade1">
          <!-- 一年级：仅 3 个主题 -->
          <button class="filter-chip" :class="{ active: activeTheme === 'animal' }" @click="activeTheme = 'animal'">🐱 动物</button>
          <button class="filter-chip" :class="{ active: activeTheme === 'food' }" @click="activeTheme = 'food'">🍕 美食</button>
          <button class="filter-chip" :class="{ active: activeTheme === 'school' }" @click="activeTheme = 'school'">📚 学校</button>
        </template>
        <template v-else>
        <button
          v-for="theme in themes"
          :key="theme.id"
          class="filter-chip"
          :class="{ active: activeTheme === theme.id }"
          @click="activeTheme = theme.id"
        >{{ theme.icon }} {{ theme.name }}</button>
        </template>
      </div>

      <div class="sort-row" :class="{ 'grade1-sort': isGrade1 }">
        <button :class="{ active: sortBy === 'recent' }" @click="sortBy = 'recent'">🕐 最近</button>
        <button :class="{ active: sortBy === 'mastery' }" @click="sortBy = 'mastery'">⭐ 掌握度</button>
        <template v-if="!isGrade1">
        <button :class="{ active: sortBy === 'alphabet' }" @click="sortBy = 'alphabet'">🔤 字母</button>
        <button :class="{ active: sortBy === 'rarity' }" @click="sortBy = 'rarity'">💎 稀有度</button>
        </template>
      </div>
    </div>

    <!-- ============================================================
         卡牌网格
         ============================================================ -->
    <div class="card-grid">
      <transition-group name="card-list" tag="div" class="grid-wrap" :class="{ 'grade1-grid': isGrade1 }">
        <div
          v-for="word in sortedWords"
          :key="word.id"
          class="word-card"
          :class="[
            'rarity-' + getRarity(word.mastery),
            { 'grade1-word-card': isGrade1 }
          ]"
          :style="cardGlow(word.mastery)"
          @click="openDetail(word)"
        >
          <!-- 稀有度边框光效（一年级隐藏） -->
          <div v-if="!isGrade1" class="card-border-glow" />

          <!-- 稀有度角标（一年级隐藏） -->
          <div v-if="!isGrade1" class="rarity-badge" :class="'rarity-' + getRarity(word.mastery)">
            {{ rarityIcon(word.mastery) }}
          </div>

          <!-- 卡牌内容 -->
          <div class="card-inner">
            <span class="card-emoji">{{ word.emoji }}</span>
            <span class="card-word">{{ word.word }}</span>
            <span class="card-meaning">{{ word.meaning }}</span>
          </div>

          <!-- 底部掌握条（一年级始终可见） -->
          <div class="card-mastery" :class="{ 'grade1-always-show': isGrade1 }">
            <div class="card-mastery-bar">
              <div
                class="card-mastery-fill"
                :style="{ width: word.mastery + '%' }"
                :class="'rarity-' + getRarity(word.mastery)"
              />
            </div>
            <span class="card-mastery-text">{{ word.mastery }}%</span>
          </div>

          <!-- 悬浮发光 -->
          <div class="card-hover-glow" />
        </div>
      </transition-group>

      <div v-if="filteredWords.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>还没有收集到单词卡牌</p>
        <p class="empty-sub">去学习页收集你的第一张魔法卡牌吧！</p>
      </div>
    </div>

    <!-- ============================================================
         单词详情弹窗
         ============================================================ -->
    <transition name="modal">
      <div v-if="detailWord" class="modal-overlay" @click.self="closeDetail">
        <div class="modal-card">
          <button class="modal-close" @click="closeDetail">✕</button>

          <!-- 稀有度光效 -->
          <div class="modal-rarity-glow" :class="'rarity-' + getRarity(detailWord.mastery)" />

          <!-- 头部 -->
          <div class="detail-header">
            <span v-if="!isGrade1" class="detail-rarity-badge" :class="'rarity-' + getRarity(detailWord.mastery)">
              {{ rarityName(detailWord.mastery) }}
            </span>
            <span class="detail-emoji">{{ detailWord.emoji }}</span>
            <h2 class="detail-word">{{ detailWord.word }}</h2>
            <p v-if="!isGrade1" class="detail-phonetic">{{ detailWord.phonetic || '/fəˈnetɪk/' }}</p>
          </div>

          <!-- 内容 -->
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
                  :class="'rarity-' + getRarity(detailWord.mastery)"
                />
              </div>
              <p class="mastery-tip">{{ masteryTip }}</p>
            </div>

            <div class="detail-actions" :class="{ 'grade1-actions': isGrade1 }">
              <button class="action-btn" :class="{ 'grade1-action-btn': isGrade1 }" @click="playWord(detailWord)">
                <span>🔊</span> 听发音
              </button>
              <button class="action-btn primary" :class="{ 'grade1-action-btn': isGrade1 }" @click="practiceWord(detailWord)">
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
import { learningStore } from '../stores/learning'

const router = useRouter()
const toast = ref('')
const loading = ref(true)
const error = ref<string | null>(null)

// 一年级简化模式
const isGrade1 = computed(() => learningStore.grade === 1)

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
const sortBy = ref<'recent' | 'alphabet' | 'mastery' | 'rarity'>('recent')
const detailWord = ref<NotebookWord | null>(null)

// ============================================================
// 稀有度系统
// ============================================================
type Rarity = 'white' | 'green' | 'blue' | 'gold'

function getRarity(mastery: number): Rarity {
  if (mastery >= 90) return 'gold'
  if (mastery >= 70) return 'blue'
  if (mastery >= 40) return 'green'
  return 'white'
}

function rarityIcon(mastery: number): string {
  const r = getRarity(mastery)
  return { white: '⬜', green: '🟢', blue: '🔵', gold: '👑' }[r]
}

function rarityName(mastery: number): string {
  const r = getRarity(mastery)
  return { white: '白卡', green: '绿卡', blue: '蓝卡', gold: '金卡' }[r]
}

const rarityStats = computed(() => {
  const counts = { white: 0, green: 0, blue: 0, gold: 0 }
  allWords.value.forEach(w => counts[getRarity(w.mastery)]++)
  const total = allWords.value.length || 1
  return [
    { key: 'white', name: '白', count: counts.white, pct: Math.round((counts.white / total) * 100), color: 'var(--rarity-white)', icon: '⬜' },
    { key: 'green', name: '绿', count: counts.green, pct: Math.round((counts.green / total) * 100), color: 'var(--rarity-green)', icon: '🟢' },
    { key: 'blue', name: '蓝', count: counts.blue, pct: Math.round((counts.blue / total) * 100), color: 'var(--rarity-blue)', icon: '🔵' },
    { key: 'gold', name: '金', count: counts.gold, pct: Math.round((counts.gold / total) * 100), color: 'var(--rarity-gold)', icon: '👑' },
  ]
})

// 卡牌发光
function cardGlow(mastery: number) {
  const r = getRarity(mastery)
  const glows: Record<Rarity, string> = {
    white: '0 0 8px rgba(229, 231, 235, 0.15)',
    green: '0 0 16px rgba(16, 185, 129, 0.25)',
    blue: '0 0 20px rgba(59, 130, 246, 0.35)',
    gold: '0 0 28px rgba(245, 158, 11, 0.5)',
  }
  return { '--card-glow': glows[r] }
}

// ============================================================
// 星空粒子
// ============================================================
function starStyle(i: number) {
  return {
    left: `${(i * 19 + 3) % 100}%`,
    top: `${(i * 29 + 7) % 100}%`,
    width: `${1 + (i % 3) * 1.2}px`,
    height: `${1 + (i % 3) * 1.2}px`,
    animationDelay: `${(i * 0.8) % 5}s`,
    opacity: 0.25 + (i % 5) * 0.12,
  }
}

// ============================================================
// 主题元数据
// ============================================================
const THEME_META: Record<string, { name: string; icon: string }> = {
  animal: { name: '动物', icon: '🐱' }, food: { name: '美食', icon: '🍕' },
  school: { name: '学校', icon: '📚' }, nature: { name: '自然', icon: '🌿' },
  family: { name: '家庭', icon: '👨‍👩‍👧' }, color: { name: '颜色', icon: '🎨' },
  body: { name: '身体', icon: '🦵' }, weather: { name: '天气', icon: '🌤️' },
  sports: { name: '运动', icon: '⚽' }, transport: { name: '交通', icon: '🚗' },
  space: { name: '太空', icon: '🚀' },
}

const THEME_STYLES: Record<string, { emoji: string; bg: string }> = {
  animal: { emoji: '🐱', bg: '#ffe8e0' }, food: { emoji: '🍕', bg: '#ffe0e0' },
  school: { emoji: '📚', bg: '#e0f0ff' }, nature: { emoji: '🌿', bg: '#e8ffe0' },
  family: { emoji: '👨‍👩‍👧', bg: '#ffe0f0' }, color: { emoji: '🎨', bg: '#f0e0ff' },
  body: { emoji: '🦵', bg: '#fff8e0' }, weather: { emoji: '🌤️', bg: '#e0f8ff' },
  sports: { emoji: '⚽', bg: '#e8ffe8' }, transport: { emoji: '🚗', bg: '#ffe8e8' },
  space: { emoji: '🚀', bg: '#e8e0ff' },
}

// ============================================================
// 单词专属 emoji 映射（从独立文件导入，492个词）
// ============================================================
import { WORD_EMOJI_MAP } from '../data/word-emoji'

const themes = ref<{ id: string; name: string; icon: string }[]>([
  { id: 'animal', name: '动物', icon: '🐱' }, { id: 'food', name: '美食', icon: '🍕' },
  { id: 'school', name: '学校', icon: '📚' }, { id: 'nature', name: '自然', icon: '🌿' },
  { id: 'family', name: '家庭', icon: '👨‍👩‍👧' }, { id: 'color', name: '颜色', icon: '🎨' },
])

// ============================================================
// Mock 数据 + 真实 API
// ============================================================
const allWords = ref<NotebookWord[]>([
  { id: '1', word: 'apple', meaning: '苹果', phonetic: '/ˈæp.əl/', emoji: '🍎', bg: '#ffe0e0', theme: 'food', mastery: 90, learnedAt: '2026-07-14', example: 'I eat an apple every day.', exampleCn: '我每天吃一个苹果。' },
  { id: '2', word: 'beautiful', meaning: '美丽的', phonetic: '/ˈbjuː.tɪ.fəl/', emoji: '🌸', bg: '#ffe0f0', theme: 'nature', mastery: 60, learnedAt: '2026-07-14', example: 'The flowers are beautiful.', exampleCn: '花很美。' },
  { id: '3', word: 'because', meaning: '因为', phonetic: '/bɪˈkɒz/', emoji: '💡', bg: '#e0f0ff', theme: 'school', mastery: 40, learnedAt: '2026-07-13', example: 'I am happy because I won.', exampleCn: '我很开心因为我赢了。' },
  { id: '4', word: 'favorite', meaning: '最喜欢的', phonetic: '/ˈfeɪ.vər.ɪt/', emoji: '💙', bg: '#e0e8ff', theme: 'school', mastery: 50, learnedAt: '2026-07-13', example: 'My favorite color is blue.', exampleCn: '我最喜欢的颜色是蓝色。' },
  { id: '5', word: 'dragon', meaning: '龙', phonetic: '/ˈdræɡ.ən/', emoji: '🐉', bg: '#e8ffe0', theme: 'animal', mastery: 85, learnedAt: '2026-07-12', example: 'The dragon flies high.', exampleCn: '龙飞得很高。' },
  { id: '6', word: 'cat', meaning: '猫', emoji: '🐱', bg: '#fff0e0', theme: 'animal', mastery: 95, learnedAt: '2026-07-12', example: 'The cat is sleeping.', exampleCn: '猫在睡觉。' },
  { id: '7', word: 'dog', meaning: '狗', emoji: '🐶', bg: '#ffe8d0', theme: 'animal', mastery: 88, learnedAt: '2026-07-11', example: 'I walk my dog every day.', exampleCn: '我每天遛狗。' },
  { id: '8', word: 'book', meaning: '书', emoji: '📖', bg: '#f0e6ff', theme: 'school', mastery: 75, learnedAt: '2026-07-11', example: 'I love reading books.', exampleCn: '我喜欢读书。' },
  { id: '9', word: 'blue', meaning: '蓝色', emoji: '🔵', bg: '#e0f0ff', theme: 'color', mastery: 100, learnedAt: '2026-07-10', example: 'The sky is blue.', exampleCn: '天空是蓝色的。' },
  { id: '10', word: 'red', meaning: '红色', emoji: '🔴', bg: '#ffe0e0', theme: 'color', mastery: 70, learnedAt: '2026-07-10', example: 'The apple is red.', exampleCn: '苹果是红色的。' },
  { id: '11', word: 'mother', meaning: '妈妈', emoji: '👩', bg: '#ffe0f0', theme: 'family', mastery: 92, learnedAt: '2026-07-09', example: 'My mother is kind.', exampleCn: '我妈妈很善良。' },
  { id: '12', word: 'father', meaning: '爸爸', emoji: '👨', bg: '#e0f0ff', theme: 'family', mastery: 80, learnedAt: '2026-07-09', example: 'My father is tall.', exampleCn: '我爸爸很高。' },
  { id: '13', word: 'tree', meaning: '树', emoji: '🌳', bg: '#e8ffe0', theme: 'nature', mastery: 65, learnedAt: '2026-07-08', example: 'The tree is green.', exampleCn: '树是绿色的。' },
  { id: '14', word: 'water', meaning: '水', emoji: '💧', bg: '#e0f4ff', theme: 'nature', mastery: 25, learnedAt: '2026-07-08', example: 'I drink water.', exampleCn: '我喝水。' },
  { id: '15', word: 'pizza', meaning: '披萨', emoji: '🍕', bg: '#ffe8d0', theme: 'food', mastery: 78, learnedAt: '2026-07-07', example: 'I like pizza.', exampleCn: '我喜欢披萨。' },
  { id: '16', word: 'happy', meaning: '快乐的', emoji: '😊', bg: '#fffbe0', theme: 'school', mastery: 82, learnedAt: '2026-07-07', example: 'I am very happy.', exampleCn: '我非常快乐。' },
])

// ============================================================
// Computed
// ============================================================
const filteredWords = computed(() => {
  let words = [...allWords.value]
  if (activeTheme.value !== 'all') {
    words = words.filter(w => w.theme === activeTheme.value)
  }
  return words
})

const sortedWords = computed(() => {
  const words = [...filteredWords.value]
  switch (sortBy.value) {
    case 'alphabet':
      words.sort((a, b) => a.word.localeCompare(b.word))
      break
    case 'mastery':
      words.sort((a, b) => b.mastery - a.mastery)
      break
    case 'rarity':
      words.sort((a, b) => {
        const order: Rarity[] = ['gold', 'blue', 'green', 'white']
        return order.indexOf(getRarity(a.mastery)) - order.indexOf(getRarity(b.mastery))
      })
      break
    default:
      words.sort((a, b) => b.learnedAt.localeCompare(a.learnedAt))
  }
  return words
})

const masteredCount = computed(() => allWords.value.filter(w => w.mastery >= 80).length)
const learningCount = computed(() => allWords.value.filter(w => w.mastery < 80).length)

const masteryTip = computed(() => {
  if (!detailWord.value) return ''
  if (detailWord.value.mastery >= 90) return '金卡！已完全掌握，太厉害了 👑'
  if (detailWord.value.mastery >= 70) return '蓝卡品质，继续精进就能升金！'
  if (detailWord.value.mastery >= 40) return '绿卡阶段，每天练习会越来越强 💪'
  return '白卡起步，多读多练就能升级变绿卡！'
})

// ============================================================
// 交互
// ============================================================
function openDetail(word: NotebookWord) { detailWord.value = word }
function closeDetail() { detailWord.value = null }

function playWord(word: NotebookWord) {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(word.word)
      u.lang = 'en-US'; u.rate = 0.9
      window.speechSynthesis.speak(u)
    } catch { /* ignore */ }
  }
  showToast(`🔊 "${word.word}"`)
}

function practiceWord(word: NotebookWord) {
  closeDetail()
  showToast(`🎤 练习 "${word.word}"`)
  router.push('/learn')
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2000)
}

onMounted(async () => {
  loading.value = true; error.value = null
  try {
    const topicList = await fetchTopics()
    if (topicList.length > 0) {
      themes.value = topicList.map((t: string) => ({
        id: t, name: THEME_META[t]?.name || t, icon: THEME_META[t]?.icon || '📖',
      }))
    }
    const result = await fetchWords({ limit: 500 })
    if (result && result.items.length > 0) {
      allWords.value = result.items.map((w: any) => {
        const style = THEME_STYLES[w.theme || ''] || { emoji: '📖', bg: '#f0e6ff' }
        const wordEmoji = WORD_EMOJI_MAP[w.word?.toLowerCase()] || style.emoji
        const progress = w.progress
        return {
          id: w.id, word: w.word, meaning: w.translation,
          phonetic: w.phonetic || undefined, emoji: wordEmoji, bg: style.bg,
          theme: w.theme || 'school',
          mastery: progress?.avgScore ? Math.round(progress.avgScore * 100) : 0,
          learnedAt: w.createdAt?.split('T')[0] || '',
          example: `Let's learn "${w.word}"!`, exampleCn: `我们来学"${w.translation}"吧！`,
        }
      })
    }
  } catch (e: any) {
    error.value = e.message || '加载生词本失败'
    console.error('Failed to load notebook:', e)
  } finally { loading.value = false }
})
</script>

<style scoped>
/* ============================================================
   页面容器
   ============================================================ */
.notebook-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg-primary);
  max-width: 480px;
  margin: 0 auto;
  padding: 20px 16px 100px;
  position: relative;
  overflow-x: hidden;
}

/* 星空 */
.starfield {
  position: fixed; inset: 0; z-index: var(--z-below); pointer-events: none;
}
.star {
  position: absolute; background: white; border-radius: 50%;
  animation: starTwinkle 3s ease-in-out infinite;
}
@keyframes starTwinkle {
  0%, 100% { opacity: 0.25; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.6); }
}

/* ============================================================
   头部
   ============================================================ */
.nb-header { text-align: center; margin-bottom: 20px; position: relative; z-index: var(--z-above); }
.nb-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-extrabold);
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.title-icon { font-size: 28px; -webkit-text-fill-color: initial; }
.nb-subtitle { color: var(--text-tertiary); font-size: var(--text-sm); margin-top: 4px; }

/* ============================================================
   统计区
   ============================================================ */
.stats-section {
  position: relative; z-index: var(--z-above);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-2xl);
  padding: 16px;
  margin-bottom: 16px;
}

.stats-row { display: flex; gap: 8px; margin-bottom: 14px; }
.stat-card {
  flex: 1; text-align: center; padding: 12px 8px;
  border-radius: var(--radius-xl);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-light);
}
.stat-num { font-size: var(--text-xl); font-weight: var(--font-extrabold); color: var(--color-primary-light); display: block; }
.stat-label { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; display: block; }

/* 稀有度条 */
.rarity-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
.rarity-segment {
  display: flex; align-items: center; justify-content: center;
  transition: width var(--transition-slower);
  min-width: 2px;
}
.rarity-seg-icon { font-size: 8px; }
.rarity-legend { display: flex; justify-content: center; gap: 12px; }
.rarity-legend-item { font-size: 10px; color: var(--text-tertiary); display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 6px; height: 6px; border-radius: 50%; }

/* ============================================================
   筛选栏
   ============================================================ */
.filter-bar { margin-bottom: 16px; position: relative; z-index: var(--z-above); }
.filter-scroll {
  display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px;
  scrollbar-width: none;
}
.filter-scroll::-webkit-scrollbar { display: none; }
.filter-chip {
  padding: 7px 14px; border-radius: var(--radius-full);
  border: 1px solid var(--border-light); background: transparent;
  font-size: var(--text-xs); font-weight: var(--font-medium);
  color: var(--text-secondary); cursor: pointer; white-space: nowrap;
  transition: all var(--transition-fast);
}
.filter-chip:hover { border-color: var(--color-primary); }
.filter-chip.active {
  background: rgba(107,92,231,0.2); border-color: var(--color-primary); color: var(--color-primary-light);
}

.sort-row { display: flex; gap: 6px; margin-top: 8px; }
.sort-row button {
  flex: 1; padding: 7px; border-radius: var(--radius-lg);
  border: 1px solid var(--border-light); background: transparent;
  font-size: 11px; font-weight: var(--font-medium); color: var(--text-secondary); cursor: pointer;
  transition: all var(--transition-fast);
}
.sort-row button.active {
  background: rgba(107,92,231,0.15); border-color: var(--color-primary); color: var(--color-primary-light);
}

/* ============================================================
   卡牌网格
   ============================================================ */
.card-grid { min-height: 200px; position: relative; z-index: var(--z-above); }
.grid-wrap { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

.word-card {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.05);
  border-radius: var(--radius-xl);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; cursor: pointer; position: relative; overflow: hidden;
  border: 1px solid var(--border-light);
  transition: all var(--transition-base);
  animation: cardAppear 0.5s ease-out both;
}

@keyframes cardAppear {
  from { opacity: 0; transform: scale(0.8) rotateY(90deg); }
  to { opacity: 1; transform: scale(1) rotateY(0); }
}

.word-card:hover { transform: translateY(-4px) scale(1.04); box-shadow: var(--card-glow); }

/* 稀有度边框 */
.word-card.rarity-gold { border-color: rgba(245,158,11,0.5); }
.word-card.rarity-blue { border-color: rgba(59,130,246,0.35); }
.word-card.rarity-green { border-color: rgba(16,185,129,0.25); }

.card-border-glow {
  position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
  opacity: 0; transition: opacity var(--transition-base);
}
.word-card.rarity-gold .card-border-glow {
  opacity: 0.6;
  box-shadow: inset 0 0 12px rgba(245,158,11,0.3);
}
.word-card.rarity-blue .card-border-glow {
  opacity: 0.4;
  box-shadow: inset 0 0 8px rgba(59,130,246,0.25);
}

/* 稀有度角标 */
.rarity-badge {
  position: absolute; top: 6px; right: 6px; font-size: 12px; z-index: 1;
}
.rarity-badge.rarity-gold { filter: drop-shadow(0 0 4px rgba(245,158,11,0.6)); }

/* 卡牌内容 */
.card-inner { display: flex; flex-direction: column; align-items: center; gap: 2px; z-index: 1; }
.card-emoji { font-size: 28px; }
.card-word { font-size: var(--text-sm); font-weight: var(--font-bold); color: var(--text-primary); }
.card-meaning { font-size: 10px; color: var(--text-tertiary); }

/* 掌握条 */
.card-mastery {
  position: absolute; bottom: 0; left: 0; right: 0; padding: 4px 8px;
  display: flex; align-items: center; gap: 4px;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  opacity: 0; transition: opacity var(--transition-fast);
}
.word-card:hover .card-mastery { opacity: 1; }

.card-mastery-bar { flex: 1; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.card-mastery-fill { height: 100%; border-radius: 2px; transition: width var(--transition-slower); }
.card-mastery-fill.rarity-gold { background: var(--rarity-gold); }
.card-mastery-fill.rarity-blue { background: var(--rarity-blue); }
.card-mastery-fill.rarity-green { background: var(--rarity-green); }
.card-mastery-fill.rarity-white { background: var(--rarity-white); }

.card-mastery-text { font-size: 9px; font-weight: var(--font-bold); color: var(--text-secondary); }

/* ============================================================
   空状态
   ============================================================ */
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
.empty-state p { font-size: var(--text-base); color: var(--text-secondary); }
.empty-sub { font-size: var(--text-sm) !important; color: var(--text-tertiary) !important; margin-top: 4px; }

/* ============================================================
   详情弹窗
   ============================================================ */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: var(--z-modal); padding: 20px;
}

.modal-card {
  width: 100%; max-width: 360px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  position: relative;
  animation: modalIn 0.35s var(--ease-spring);
}

@keyframes modalIn {
  from { opacity: 0; transform: perspective(600px) rotateY(-15deg) scale(0.9); }
  to { opacity: 1; transform: perspective(600px) rotateY(0) scale(1); }
}

.modal-rarity-glow {
  position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
}
.modal-rarity-glow.rarity-gold { box-shadow: inset 0 0 40px rgba(245,158,11,0.15); }
.modal-rarity-glow.rarity-blue { box-shadow: inset 0 0 30px rgba(59,130,246,0.12); }

.modal-close {
  position: absolute; top: 12px; right: 12px;
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.1); backdrop-filter: blur(5px);
  font-size: 16px; color: var(--text-secondary); cursor: pointer;
  z-index: 1; display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.modal-close:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }

.detail-header {
  padding: 36px 24px 20px; text-align: center; position: relative;
}
.detail-rarity-badge {
  display: inline-block; padding: 3px 12px; border-radius: var(--radius-full);
  font-size: 10px; font-weight: var(--font-bold); margin-bottom: 10px;
}
.detail-rarity-badge.rarity-gold { background: rgba(245,158,11,0.2); color: var(--rarity-gold); }
.detail-rarity-badge.rarity-blue { background: rgba(59,130,246,0.2); color: var(--rarity-blue); }
.detail-rarity-badge.rarity-green { background: rgba(16,185,129,0.2); color: var(--rarity-green); }
.detail-rarity-badge.rarity-white { background: rgba(229,231,235,0.15); color: var(--rarity-white); }

.detail-emoji { font-size: 52px; display: block; margin-bottom: 8px; animation: float 3s ease-in-out infinite; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.detail-word { font-size: 30px; font-weight: var(--font-extrabold); color: var(--text-primary); margin: 0; }
.detail-phonetic { font-size: var(--text-sm); color: var(--text-tertiary); margin-top: 4px; }

.detail-body { padding: 16px 24px 28px; }

.detail-meaning { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.label {
  font-size: 11px; color: var(--text-tertiary);
  background: rgba(255,255,255,0.06); padding: 3px 10px;
  border-radius: var(--radius-lg); white-space: nowrap;
}
.detail-meaning .value { font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--text-primary); }

.detail-example {
  background: rgba(255,255,255,0.04); border-radius: var(--radius-xl);
  padding: 14px; margin-bottom: 20px;
}
.detail-example .label { margin-bottom: 8px; display: inline-block; }
.example-en { font-size: var(--text-base); color: var(--text-primary); font-style: italic; line-height: 1.6; margin: 0; }
.example-cn { font-size: var(--text-sm); color: var(--text-tertiary); margin-top: 4px; }

.mastery-section { margin-bottom: 20px; }
.mastery-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.mastery-pct { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-primary-light); }
.mastery-bar-lg { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.mastery-fill { height: 100%; border-radius: 4px; transition: width var(--transition-slower); }
.mastery-fill.rarity-gold { background: var(--rarity-gold); }
.mastery-fill.rarity-blue { background: var(--rarity-blue); }
.mastery-fill.rarity-green { background: var(--rarity-green); }
.mastery-fill.rarity-white { background: var(--rarity-white); }
.mastery-tip { font-size: var(--text-xs); color: var(--text-tertiary); margin: 0; }

.detail-actions { display: flex; gap: 10px; }
.detail-actions .action-btn {
  flex: 1; padding: 12px; border-radius: var(--radius-xl);
  border: 1px solid var(--border-light); background: rgba(255,255,255,0.04);
  font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--text-primary);
  cursor: pointer; transition: all var(--transition-fast);
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.detail-actions .action-btn:hover { border-color: var(--color-primary); background: rgba(107,92,231,0.1); }
.detail-actions .action-btn.primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white; border-color: transparent;
}
.detail-actions .action-btn.primary:hover { opacity: 0.9; }

/* ============================================================
   Toast & Transitions
   ============================================================ */
.toast {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
  color: white; padding: 14px 24px; border-radius: var(--radius-xl);
  font-size: var(--text-base); font-weight: var(--font-semibold);
  z-index: var(--z-toast); pointer-events: none;
}

.card-list-enter-active, .card-list-leave-active { transition: all 0.4s ease; }
.card-list-enter-from { opacity: 0; transform: scale(0.5) rotateY(90deg); }
.card-list-leave-to { opacity: 0; transform: scale(0.5) rotateY(-90deg); }
.card-list-move { transition: transform 0.4s ease; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-card { transform: scale(0.8) translateY(20px); }
.modal-leave-to .modal-card { transform: scale(0.8) translateY(20px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ============================================================
   一年级简化模式样式
   ============================================================ */

/* 统计卡片 */
.stat-card.grade1-stat {
  padding: 16px;
}
.stat-num.grade1-num {
  font-size: 36px;
  color: var(--color-accent);
}
.stat-label.grade1-label {
  font-size: var(--text-base);
  color: var(--text-secondary);
}

/* 筛选栏 */
.filter-scroll.grade1-filters {
  gap: 10px;
}
.filter-scroll.grade1-filters .filter-chip {
  padding: 10px 18px;
  font-size: var(--text-base);
}

.sort-row.grade1-sort button {
  font-size: var(--text-sm);
  padding: 10px;
}

/* 卡牌网格 2 列 */
.grid-wrap.grade1-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.word-card.grade1-word-card {
  aspect-ratio: auto;
  min-height: 140px;
  padding: 14px 10px;
}

.word-card.grade1-word-card .card-emoji {
  font-size: 36px;
}
.word-card.grade1-word-card .card-word {
  font-size: var(--text-base);
}
.word-card.grade1-word-card .card-meaning {
  font-size: var(--text-sm);
}

/* 掌握条常显 */
.card-mastery.grade1-always-show {
  opacity: 1;
  padding: 6px 8px;
  background: rgba(0,0,0,0.6);
}

/* 弹窗按钮加大 */
.detail-actions.grade1-actions {
  gap: 12px;
}
.action-btn.grade1-action-btn {
  padding: 16px;
  font-size: var(--text-base);
  border-radius: var(--radius-xl);
}
</style>
