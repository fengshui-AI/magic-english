<template>
  <div class="magic-map-page">
    <!-- ============================================================
         深空星空背景层
         ============================================================ -->
    <div class="starfield">
      <div
        v-for="s in 50"
        :key="'star' + s"
        class="star"
        :style="starStyle(s)"
      />
    </div>

    <!-- ============================================================
         顶部状态栏：许愿瓶 + 魔法值 + 连胜火焰
         ============================================================ -->
    <header class="map-header">
      <div class="header-left">
        <!-- 星空许愿瓶 -->
        <div class="star-bottle" @click="$router.push('/notebook')">
          <span class="bottle-icon">🏺</span>
          <div class="bottle-glow" />
          <span class="bottle-count">{{ collectedWords }}</span>
        </div>
      </div>

      <div class="header-center">
        <StreakFlame v-if="streakStore.currentStreak > 0" />
      </div>

      <div class="header-right">
        <!-- 家长入口：仅家长角色可见 -->
        <button v-if="authStore.user?.role === 'parent'" class="parent-entry" @click="$router.push('/parent')" title="成长观察室">
          <span class="parent-entry-icon">🌿</span>
        </button>
        <!-- 魔法值 -->
        <div class="magic-power">
          <span class="mp-icon">💎</span>
          <span class="mp-value">{{ magicPower }}</span>
        </div>
      </div>
    </header>

    <!-- ============================================================
         问候语
         ============================================================ -->
    <div class="greeting">
      <p class="greeting-wave">{{ greetingIcon }} {{ greetingText }}</p>
      <p class="greeting-sub">{{ greetingSub }}</p>
    </div>

    <!-- ============================================================
         今日惊喜（70%概率触发，30%平淡日）
         ============================================================ -->
    <transition name="surprise-fade">
      <div v-if="todaySurprise" class="surprise-card" @click="todaySurprise = null">
        <div class="surprise-header">
          <span class="surprise-emoji">{{ todaySurprise.emoji }}</span>
          <span class="surprise-badge">{{ todaySurprise.badge }}</span>
        </div>
        <p class="surprise-text">{{ todaySurprise.text }}</p>
        <p class="surprise-hint">{{ todaySurprise.hint }}</p>
      </div>
    </transition>

    <!-- 平淡日提示 -->
    <div v-if="isQuietDay" class="quiet-day-hint">
      <span>🌿 今天是平静的一天，和豆豆轻松学两个单词就好～</span>
    </div>

    <!-- ============================================================
         魔法星球地图 — 7 区域
         ============================================================ -->
    <section class="world-map">
      <h2 class="map-title">
        <span class="map-title-icon">🌍</span>
        豆语星球
        <span class="map-subtitle">— 魔法英语大陆 —</span>
      </h2>

      <div class="region-grid">
        <div
          v-for="region in regions"
          :key="region.id"
          class="region-card"
          :class="{
            'region-locked': region.locked,
            'region-current': region.current,
            'region-cleared': region.cleared,
          }"
          :style="regionCardVars(region)"
          @click="!region.locked && selectRegion(region)"
        >
          <!-- 锁定遮罩 -->
          <div v-if="region.locked" class="region-fog">
            <span class="fog-icon">🔮</span>
            <span class="fog-text">尚未解锁</span>
          </div>

          <!-- 已通关标记 -->
          <div v-if="region.cleared" class="region-badge">⭐</div>

          <!-- 当前标记 -->
          <div v-if="region.current" class="region-current-marker">
            <span class="pulse-dot" />
          </div>

          <!-- 区域内容 -->
          <div class="region-content">
            <span class="region-emoji">{{ region.emoji }}</span>
            <h3 class="region-name">{{ region.name }}</h3>
            <p class="region-desc">{{ region.desc }}</p>

            <!-- 进度条 -->
            <div class="region-progress-wrap">
              <div class="region-progress-bar">
                <div
                  class="region-progress-fill"
                  :style="{ width: region.progress + '%' }"
                />
              </div>
              <span class="region-progress-text">{{ region.progress }}%</span>
            </div>

            <div class="region-words">{{ region.wordCount }} 词</div>
          </div>

          <!-- 光晕 -->
          <div class="region-aura" />
        </div>
      </div>
    </section>

    <!-- ============================================================
         开始学习 — CTA
         ============================================================ -->
    <div class="learn-cta-wrap">
      <button class="learn-cta-btn" @click="$router.push('/learn')">
        <span class="cta-sparkle">✨</span>
        <span class="cta-text">
          {{ reviewWords.length > 0 ? `开始学习 (含 ${reviewWords.length} 个复习)` : '开始今日学习' }}
        </span>
        <span class="cta-arrow">→</span>
      </button>
    </div>

    <!-- ============================================================
         今日单词预览
         ============================================================ -->
    <section class="today-preview">
      <div class="preview-tabs">
        <button
          :class="{ active: previewTab === 'new' }"
          @click="previewTab = 'new'"
        >
          🆕 新词 {{ newWords.length }}
        </button>
        <button
          :class="{ active: previewTab === 'review' }"
          @click="previewTab = 'review'"
        >
          🔄 复习 {{ reviewWords.length }}
        </button>
      </div>

      <div class="preview-chips">
        <template v-if="previewTab === 'new'">
          <button
            v-for="w in newWords"
            :key="w.wordId"
            class="word-chip"
            @click="previewWord(w)"
          >
            <span class="chip-emoji">{{ wordEmoji(w.theme) }}</span>
            <span class="chip-en">{{ w.word }}</span>
            <span class="chip-cn">{{ w.translation }}</span>
          </button>
          <p v-if="!newWords.length" class="empty-hint">今日新词加载中…</p>
        </template>

        <template v-else>
          <button
            v-for="w in reviewWords"
            :key="w.wordId"
            class="word-chip review"
            @click="previewWord(w)"
          >
            <span class="chip-emoji">{{ wordEmoji(w.theme) }}</span>
            <span class="chip-en">{{ w.word }}</span>
            <span class="chip-cn">{{ w.translation }}</span>
          </button>
          <p v-if="!reviewWords.length" class="empty-hint">暂无复习，今天先学新词吧 🌱</p>
        </template>
      </div>
    </section>

    <!-- ============================================================
         教材导航 — 折叠式
         ============================================================ -->
    <section class="book-section">
      <button class="book-toggle" @click="bookOpen = !bookOpen">
        <span>📖 教材学习 · 人教版</span>
        <span class="toggle-arrow" :class="{ open: bookOpen }">▾</span>
      </button>

      <div v-if="bookOpen" class="book-body">
        <div class="grade-tabs">
          <button
            v-for="g in 6"
            :key="g"
            class="grade-tab"
            :class="{ active: learningStore.grade === g }"
            @click="selectGrade(g)"
          >
            {{ g }}年级
          </button>
        </div>
        <div class="unit-grid">
          <div
            v-for="u in 6"
            :key="u"
            class="unit-card"
            :class="{ current: learningStore.unit === u, done: u < learningStore.unit }"
            @click="selectUnit(u)"
          >
            <div class="unit-num">Unit {{ u }}</div>
            <div class="unit-status">
              {{ u < learningStore.unit ? '✅' : u === learningStore.unit ? '📖' : '🔒' }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================
         豆豆伙伴入口
         ============================================================ -->
    <div class="dodo-entry" @click="$router.push('/pet')">
      <div class="dodo-card">
        <DodoEmotion :show-indicators="true" />
        <div class="dodo-text">
          <span class="dodo-label">去找豆豆玩 →</span>
          <span class="dodo-closeness">{{ closenessLabel }}</span>
        </div>
      </div>
    </div>

    <!-- ============================================================
         花园入口
         ============================================================ -->
    <div class="garden-entry" @click="$router.push('/garden')">
      <div class="garden-entry-card">
        <span class="garden-entry-emoji">🏡</span>
        <div class="garden-entry-text">
          <span class="garden-entry-title">豆豆家园</span>
          <span class="garden-entry-sub">装扮豆豆的小世界</span>
        </div>
        <span class="garden-entry-arrow">→</span>
      </div>
    </div>

    <!-- ============================================================
         底部留白 & 退出登录
         ============================================================ -->
    <div class="footer-area">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { logout, authStore } from '../stores/auth'
import { petStore } from '../stores/pet'
import { learningStore, fetchDailyPlan } from '../stores/learning'
import { streakStore, fetchStreakState } from '../stores/streak'
import { emotionStore, fetchEmotionState } from '../stores/emotion'
import { closenessLevel } from '../stores/emotion'
import DodoEmotion from '../components/DodoEmotion.vue'
import StreakFlame from '../components/StreakFlame.vue'

const router = useRouter()

// ============================================================
// 区域数据 — 7 个魔法大陆
// ============================================================
interface Region {
  id: number
  name: string
  emoji: string
  desc: string
  level: number
  locked: boolean
  current: boolean
  cleared: boolean
  progress: number
  wordCount: number
  primaryColor: string
  secondaryColor: string
  bgColor: string
}

const regions = computed<Region[]>(() => {
  const userUnit = learningStore.unit || 1
  // 用独立的 currentRegionId 跟踪当前关卡，不复用 grade
  const currentRegionId = activeRegionId.value

  return [
    {
      id: 1, name: '萌芽之森', emoji: '🌱', desc: '英语启蒙之地',
      level: 1, wordCount: 60,
      primaryColor: 'var(--region-l1-primary)',
      secondaryColor: 'var(--region-l1-secondary)',
      bgColor: 'var(--region-l1-bg)',
      ...regionState(1, currentRegionId, userUnit),
    },
    {
      id: 2, name: '回声山谷', emoji: '🏔️', desc: '聆听与发音',
      level: 2, wordCount: 80,
      primaryColor: 'var(--region-l2-primary)',
      secondaryColor: 'var(--region-l2-secondary)',
      bgColor: 'var(--region-l2-bg)',
      ...regionState(2, currentRegionId, userUnit),
    },
    {
      id: 3, name: '闪耀之海', emoji: '🌊', desc: '单词的海洋',
      level: 3, wordCount: 100,
      primaryColor: 'var(--region-l3-primary)',
      secondaryColor: 'var(--region-l3-secondary)',
      bgColor: 'var(--region-l3-bg)',
      ...regionState(3, currentRegionId, userUnit),
    },
    {
      id: 4, name: '云端之城', emoji: '☁️', desc: '句式与表达',
      level: 4, wordCount: 120,
      primaryColor: 'var(--region-l4-primary)',
      secondaryColor: 'var(--region-l4-secondary)',
      bgColor: 'var(--region-l4-bg)',
      ...regionState(4, currentRegionId, userUnit),
    },
    {
      id: 5, name: '永恒星空', emoji: '⭐', desc: '阅读与理解',
      level: 5, wordCount: 140,
      primaryColor: 'var(--region-l5-primary)',
      secondaryColor: 'var(--region-l5-secondary)',
      bgColor: 'var(--region-l5-bg)',
      ...regionState(5, currentRegionId, userUnit),
    },
    {
      id: 6, name: '时光回廊', emoji: '⏳', desc: '语法与写作',
      level: 6, wordCount: 160,
      primaryColor: 'var(--region-l6-primary)',
      secondaryColor: 'var(--region-l6-secondary)',
      bgColor: 'var(--region-l6-bg)',
      ...regionState(6, currentRegionId, userUnit),
    },
    {
      id: 7, name: '创世之核', emoji: '🔥', desc: '大师挑战',
      level: 7, wordCount: 200,
      primaryColor: 'var(--region-l7-primary)',
      secondaryColor: 'var(--region-l7-secondary)',
      bgColor: 'var(--region-l7-bg)',
      ...regionState(7, currentRegionId, userUnit),
    },
  ]
})

// 当前活跃的关卡 ID（默认为用户年级对应的关卡）
const activeRegionId = ref(Math.min(learningStore.grade || 3, 7))

function regionState(id: number, currentId: number, _unit: number) {
  if (id < currentId) {
    return { locked: false, current: false, cleared: true, progress: 100 }
  }
  if (id === currentId) {
    // 当前区域进度 = 基于 unit 内进度
    const p = _unit <= 1 ? 20 : Math.min((_unit / 6) * 100, 95)
    return { locked: false, current: true, cleared: false, progress: Math.round(p) }
  }
  return { locked: true, current: false, cleared: false, progress: 0 }
}

// ============================================================
// 星空粒子
// ============================================================
function starStyle(i: number) {
  const x = ((i * 17 + 3) % 100)
  const y = ((i * 23 + 7) % 100)
  const size = 1 + (i % 3) * 1.5
  const delay = (i * 0.7) % 5
  const opacity = 0.3 + (i % 5) * 0.15
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    opacity,
  }
}

// ============================================================
// 区域卡片 CSS 变量
// ============================================================
function regionCardVars(region: Region) {
  return {
    '--region-primary': region.primaryColor,
    '--region-secondary': region.secondaryColor,
    '--region-bg': region.bgColor,
  }
}

// ============================================================
// 数据
// ============================================================
const previewTab = ref<'new' | 'review'>('new')
const bookOpen = ref(false)

interface PlanWord {
  wordId: string
  word: string
  translation: string
  theme?: string | null
}

const newWords = computed<PlanWord[]>(() =>
  (learningStore.dailyPlan?.plan?.newWords || []).map((w: any) => ({
    wordId: w.wordId,
    word: w.word,
    translation: w.translation,
    theme: w.theme,
  })),
)

const reviewWords = computed<PlanWord[]>(() =>
  (learningStore.dailyPlan?.plan?.reviewQueue || []).map((w: any) => ({
    wordId: w.wordId,
    word: w.word,
    translation: w.translation,
    theme: w.theme ?? null,
  })),
)

// 收集单词数（从 notebook 统计，这里用已学区域词数近似）
const collectedWords = computed(() => {
  const rid = Math.min(learningStore.grade || 1, 7)
  return regions.value.filter(r => r.id <= rid).reduce((sum, r) => sum + r.wordCount, 0)
})

// 魔法值（与学习天数相关）
const magicPower = computed(() => {
  const streak = streakStore.currentStreak || 0
  return 100 + streak * 10
})

const THEME_EMOJI: Record<string, string> = {
  animal: '🐾', space: '🚀', school: '📚', food: '🍎', body: '🦵',
  color: '🎨', weather: '🌤️', sports: '⚽', family: '👨‍👩‍👧', transport: '🚌', nature: '🌿',
}
function wordEmoji(theme?: string | null) { return THEME_EMOJI[theme || ''] || '📖' }

const toast = computed(() => emotionStore.toastMessage || '')

// 陪伴梯度标签（无数字，只有情感化表达）
const closenessLabel = computed(() => {
  const c = emotionStore.emotion?.closeness || 0.2
  if (c >= 0.7) return '💖 最好的朋友'
  if (c >= 0.5) return '🌟 好朋友'
  if (c >= 0.3) return '🌱 正在熟悉'
  return '👋 初次见面'
})

// 问候语
const greetingIcon = computed(() => {
  const h = new Date().getHours()
  if (h < 9) return '🌅'; if (h < 12) return '☀️'; if (h < 18) return '🌤️'; return '🌙'
})
const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 9) return '早上好，小魔法师！'; if (h < 12) return '上午好！'
  if (h < 18) return '下午好！'; return '晚上好！'
})
const greetingSub = computed(() => {
  const name = petStore.name || '豆豆'
  const closeness = emotionStore.emotion?.closeness || 0.2
  const level = closenessLevel(closeness)
  const streak = streakStore.currentStreak

  // 陪伴梯度融入问候语
  const gradientMessages: Record<string, string[]> = {
    '亲密无间': [
      `${name} 一看到你就超开心！今天也想和你一起学英语 💖`,
      `${name} 已经把你当成最好的朋友了！一起加油吧 🌟`,
    ],
    '好朋友': [
      `${name} 越来越喜欢和你在一起了～`,
      `${name} 说：和你学习是最快乐的时光！`,
    ],
    '认识中': [
      `${name} 在星球上等你探险呢 🚀`,
      `${name} 正在慢慢认识你，每天多了解一点点～`,
    ],
    '初次见面': [
      `${name} 有点害羞，但很期待和你做朋友 🌱`,
      `${name} 在星球上等你探险呢 🚀`,
    ],
  }

  const msgs = gradientMessages[level] || gradientMessages['初次见面']
  const baseMsg = msgs[Math.floor(Math.random() * msgs.length)]

  if (streak >= 7) return `${baseMsg}（连续 ${streak} 天啦 ✨）`
  if (streak >= 3) return `${baseMsg}（第 ${streak} 天连学！）`
  return baseMsg
})

// ============================================================
// 每日惊喜池（PRD 8.2-8.5）
// 70%概率触发惊喜事件，30%为平淡日
// ============================================================
interface Surprise {
  emoji: string
  badge: string
  text: string
  hint: string
}

const todaySurprise = ref<Surprise | null>(null)
const isQuietDay = ref(false)

// 惊喜池 — 根据性格/特长/时间/连胜动态选择
const SURPRISE_POOL: Surprise[] = [
  { emoji: '🎁', badge: '今日惊喜', text: '豆豆发现了一个神秘单词盲盒！打开看看是什么单词？', hint: '点击开始学习 →' },
  { emoji: '🌟', badge: '幸运日', text: '今天的星光翻倍！每次学习都能获得双倍星光哦～', hint: '快去赚星光吧！' },
  { emoji: '📖', badge: '新故事', text: '豆豆昨晚做了一个梦，梦里有一个关于英语单词的奇妙故事想讲给你听！', hint: '去学习页面听故事 →' },
  { emoji: '🎵', badge: '音乐时间', text: '豆豆今天心情特别好，想和你一起唱首英文歌！准备好了吗？', hint: '去对话页面一起唱 →' },
  { emoji: '🦋', badge: '发现彩蛋', text: '咦？豆豆的头上好像多了什么东西...是一只蝴蝶！它带来了一个秘密单词！', hint: '去找豆豆看看 →' },
  { emoji: '🌈', badge: '奇迹日', text: '天空中出现了一道彩虹！豆豆说这是"奇迹日"，今天学会的单词会记得特别牢！', hint: '趁现在多学几个单词！' },
  { emoji: '🍀', badge: '幸运草', text: '豆豆在花园里发现了一株四叶草！它说今天你会特别幸运～', hint: '幸运日适合挑战新单词！' },
  { emoji: '🔮', badge: '水晶预言', text: '豆豆的水晶球发光了！它预言你今天会解锁一个新成就！', hint: '试试完成学习目标 →' },
  { emoji: '🎪', badge: '迷你嘉年华', text: '豆豆在花园里搭了一个迷你嘉年华！每个单词摊位都有小惊喜～', hint: '去花园看看吧 →' },
  { emoji: '💫', badge: '流星之夜', text: '一颗流星划过！豆豆说快许愿——它帮你记住今天最难的那个单词！', hint: '今天最难的词也会变简单！' },
  { emoji: '🐚', badge: '海边来信', text: '海浪送来了一封信！里面是一个来自远方的新单词～', hint: '拆开看看是什么词 →' },
  { emoji: '🕯️', badge: '秘密时刻', text: '豆豆点了一根小蜡烛，悄悄告诉你一个记单词的小秘诀...', hint: '点击学习 →' },
]

function generateDailySurprise() {
  // 30% 概率平淡日
  const roll = Math.random()
  if (roll < 0.3) {
    isQuietDay.value = true
    todaySurprise.value = null
    return
  }

  isQuietDay.value = false

  // 根据时间段和连胜调整惊喜池权重（预留后续加权）
  void new Date().getHours()
  void streakStore.currentStreak

  // 随机选一个惊喜（后续可根据性格/特长做加权）
  const idx = Math.floor(Math.random() * SURPRISE_POOL.length)
  todaySurprise.value = SURPRISE_POOL[idx]
}

// ============================================================
// 交互
// ============================================================
function selectRegion(region: Region) {
  if (region.locked) return
  learningStore.grade = region.level
  activeRegionId.value = region.id
  router.push('/learn')
}

function selectGrade(g: number) { learningStore.grade = g }
function selectUnit(u: number) { learningStore.unit = u }

function previewWord(w: { word: string }) {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(w.word)
      u.lang = 'en-US'; u.rate = 0.9
      window.speechSynthesis.speak(u)
    } catch { /* ignore */ }
  }
}

function handleLogout() { logout(); router.push({ name: 'login' }) }

onMounted(() => {
  fetchDailyPlan().catch(() => {})
  fetchStreakState().catch(() => {})
  fetchEmotionState().catch(() => {})
  generateDailySurprise()
})
</script>

<style scoped>
/* ============================================================
   页面容器
   ============================================================ */
.magic-map-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg-primary);
  max-width: 480px;
  margin: 0 auto;
  padding-bottom: 40px;
  position: relative;
  overflow-x: hidden;
}

/* ============================================================
   星空背景
   ============================================================ */
.starfield {
  position: fixed;
  inset: 0;
  z-index: var(--z-below);
  pointer-events: none;
}

.star {
  position: absolute;
  background: white;
  border-radius: 50%;
  animation: starTwinkle 3s ease-in-out infinite;
}

@keyframes starTwinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.5); }
}

/* ============================================================
   顶部状态栏
   ============================================================ */
.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
  position: relative;
  z-index: var(--z-above);
}

.header-left, .header-right {
  display: flex;
  align-items: center;
}

/* 星空许愿瓶 */
.star-bottle {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-base);
}

.star-bottle:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--color-accent);
  box-shadow: var(--glow-accent);
}

.bottle-icon {
  font-size: 22px;
}

.bottle-glow {
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(255, 224, 102, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.bottle-count {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-accent);
}

/* 家长入口 */
.parent-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-base);
  margin-right: 8px;
}

.parent-entry:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: var(--glow-accent);
}

.parent-entry-icon {
  font-size: 18px;
  line-height: 1;
}

/* 魔法值 */
.magic-power {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-full);
}

.mp-icon { font-size: 18px; }

.mp-value {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--color-primary-light);
}

/* ============================================================
   问候语
   ============================================================ */
.greeting {
  padding: 20px 20px 12px;
  position: relative;
  z-index: var(--z-above);
}

.greeting-wave {
  font-size: var(--text-2xl);
  font-weight: var(--font-extrabold);
  color: var(--text-primary);
  margin: 0;
}

.greeting-sub {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 6px 0 0;
  line-height: var(--leading-relaxed);
}

/* ============================================================
   每日惊喜卡片
   ============================================================ */
.surprise-card {
  margin: 8px 16px 0;
  padding: 16px;
  background: linear-gradient(135deg, #fff8e1, #fff3e0);
  border-radius: 16px;
  border: 1.5px solid rgba(255, 183, 77, 0.3);
  cursor: pointer;
  position: relative;
  z-index: var(--z-above);
  animation: surprise-in 0.5s ease;
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.1);
}

@keyframes surprise-in {
  from { opacity: 0; transform: translateY(-10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.surprise-card:hover {
  border-color: rgba(255, 152, 0, 0.5);
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.15);
  transform: translateY(-1px);
}

.surprise-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.surprise-emoji {
  font-size: 24px;
  animation: bounce 1s ease-in-out infinite;
}

.surprise-badge {
  font-size: 11px;
  font-weight: 600;
  color: #e65100;
  background: rgba(255, 152, 0, 0.12);
  padding: 2px 10px;
  border-radius: 10px;
}

.surprise-text {
  font-size: 14px;
  color: #5d4037;
  line-height: 1.6;
  margin: 0 0 6px;
}

.surprise-hint {
  font-size: 12px;
  color: #ff8f00;
  font-weight: 500;
  margin: 0;
}

.surprise-fade-leave-active {
  transition: all 0.3s ease;
}

.surprise-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 平淡日 */
.quiet-day-hint {
  margin: 8px 16px 0;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  z-index: var(--z-above);
  text-align: center;
}

.quiet-day-hint span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

/* ============================================================
   世界地图标题
   ============================================================ */
.world-map {
  padding: 8px 16px 16px;
  position: relative;
  z-index: var(--z-above);
}

.map-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin: 0 0 16px;
}

.map-title-icon {
  font-size: 24px;
  animation: float 3s ease-in-out infinite;
}

.map-subtitle {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: var(--font-normal);
}

/* ============================================================
   区域网格 — 7 卡片
   ============================================================ */
.region-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.region-card {
  position: relative;
  padding: 16px 14px;
  border-radius: var(--radius-xl);
  background: var(--region-bg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all var(--transition-slow);
  overflow: hidden;
  min-height: 160px;
}

.region-card:hover:not(.region-locked) {
  transform: translateY(-3px);
  border-color: var(--region-primary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px var(--region-primary);
}

.region-card.region-locked {
  cursor: not-allowed;
  opacity: 0.55;
}

.region-card.region-current {
  border-color: var(--region-primary);
  box-shadow: 0 0 24px rgba(255, 255, 255, 0.08), 0 0 12px var(--region-primary);
}

.region-card.region-cleared {
  border-color: rgba(255, 255, 255, 0.06);
}

/* 光晕 */
.region-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, var(--region-primary) 0%, transparent 70%);
  opacity: 0.08;
  pointer-events: none;
}

/* 锁定迷雾 */
.region-fog {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(15, 15, 35, 0.7);
  backdrop-filter: blur(4px);
  border-radius: inherit;
  z-index: 2;
}

.fog-icon { font-size: 28px; margin-bottom: 4px; }
.fog-text { font-size: var(--text-xs); color: var(--text-tertiary); }

/* 已通关标记 */
.region-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 18px;
  z-index: 1;
}

/* 当前区域标记 */
.region-current-marker {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.pulse-dot {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--region-primary);
  box-shadow: 0 0 12px var(--region-primary);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: 0.5; }
}

/* 区域内容 */
.region-content {
  position: relative;
  z-index: 1;
}

.region-emoji {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.region-name {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin: 0 0 2px;
}

.region-desc {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0 0 12px;
}

/* 进度条 */
.region-progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.region-progress-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.region-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--region-primary), var(--region-secondary));
  transition: width var(--transition-slower);
}

.region-progress-text {
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: var(--font-semibold);
  min-width: 32px;
}

.region-words {
  margin-top: 10px;
  font-size: 10px;
  color: var(--text-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.06);
  display: inline-block;
}

/* ============================================================
   开始学习 CTA
   ============================================================ */
.learn-cta-wrap {
  padding: 8px 16px 16px;
  position: relative;
  z-index: var(--z-above);
}

.learn-cta-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  font-family: var(--font-display);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: 0 8px 30px rgba(107, 92, 231, 0.4);
  position: relative;
  overflow: hidden;
}

.learn-cta-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
  animation: shimmer 2.5s infinite;
}

.learn-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 36px rgba(107, 92, 231, 0.5);
}

.learn-cta-btn:active {
  transform: translateY(0);
}

.cta-sparkle { font-size: 22px; }
.cta-arrow { font-size: 20px; transition: transform var(--transition-base); }
.learn-cta-btn:hover .cta-arrow { transform: translateX(4px); }

/* ============================================================
   今日单词预览
   ============================================================ */
.today-preview {
  padding: 0 16px 16px;
  position: relative;
  z-index: var(--z-above);
}

.preview-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.preview-tabs button {
  padding: 7px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preview-tabs button.active {
  background: rgba(107, 92, 231, 0.2);
  border-color: var(--color-primary);
  color: var(--color-primary-light);
}

.preview-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.word-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
  color: var(--text-primary);
}

.word-chip:hover {
  border-color: var(--color-primary);
  background: rgba(107, 92, 231, 0.1);
  transform: translateY(-1px);
}

.word-chip.review {
  border-color: rgba(255, 224, 102, 0.3);
  background: rgba(255, 224, 102, 0.06);
}

.chip-emoji { font-size: 18px; }
.chip-en { font-size: var(--text-sm); font-weight: var(--font-bold); color: var(--color-primary-light); }
.chip-cn { font-size: var(--text-xs); color: var(--text-tertiary); }

.empty-hint {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  padding: 8px 0;
}

/* ============================================================
   教材导航 — 折叠
   ============================================================ */
.book-section {
  padding: 0 16px 16px;
  position: relative;
  z-index: var(--z-above);
}

.book-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.book-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
}

.toggle-arrow {
  transition: transform var(--transition-base);
  font-size: 14px;
}

.toggle-arrow.open {
  transform: rotate(180deg);
}

.book-body {
  margin-top: 10px;
  padding: 14px;
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-light);
}

.grade-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.grade-tab {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.grade-tab.active {
  background: rgba(107, 92, 231, 0.25);
  border-color: var(--color-primary);
  color: var(--color-primary-light);
}

.unit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.unit-card {
  padding: 14px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-lg);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.unit-card:hover { background: rgba(255, 255, 255, 0.08); }

.unit-card.current {
  border-color: var(--color-primary);
  background: rgba(107, 92, 231, 0.12);
}

.unit-card.done { opacity: 0.35; }

.unit-num {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: 4px;
}

.unit-status { font-size: var(--text-sm); }

/* ============================================================
   豆豆入口
   ============================================================ */
.dodo-entry {
  padding: 8px 16px 16px;
  position: relative;
  z-index: var(--z-above);
}

.dodo-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, rgba(107, 92, 231, 0.1), rgba(255, 107, 157, 0.1));
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all var(--transition-base);
}

.dodo-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--glow-primary);
  transform: translateY(-2px);
}

.dodo-text { flex: 1; }
.dodo-label {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.dodo-closeness {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 2px;
}

/* ============================================================
   花园入口
   ============================================================ */
.garden-entry {
  padding: 0 16px 16px;
  position: relative;
  z-index: var(--z-above);
}

.garden-entry-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(139, 195, 74, 0.1));
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all var(--transition-base);
}

.garden-entry-card:hover {
  border-color: #4caf50;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.15);
  transform: translateY(-2px);
}

.garden-entry-emoji { font-size: 32px; }

.garden-entry-text { flex: 1; }

.garden-entry-title {
  display: block;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.garden-entry-sub {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 2px;
}

.garden-entry-arrow {
  font-size: 20px;
  color: #4caf50;
}

/* ============================================================
   底部 & 退出登录
   ============================================================ */
.footer-area {
  text-align: center;
  padding: 24px 16px 40px;
  position: relative;
  z-index: var(--z-above);
}

.logout-btn {
  padding: 8px 24px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.logout-btn:hover {
  color: var(--color-error-light);
  border-color: rgba(255, 87, 87, 0.3);
}

/* ============================================================
   Toast
   ============================================================ */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  color: white;
  padding: 14px 24px;
  border-radius: var(--radius-xl);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  z-index: var(--z-toast);
  pointer-events: none;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
