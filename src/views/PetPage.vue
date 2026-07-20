<template>
  <div class="page">
    <!-- 头部 -->
    <div class="page-header animate-fade-in">
      <h1>🐾 我的宠物</h1>
      <p>陪伴你学习英语的魔法伙伴</p>
    </div>

    <!-- 宠物展示区 -->
    <div class="pet-stage card animate-fade-in" style="animation-delay: 0.1s">
      <div class="pet-display" :class="'stage-' + (petStore.pet?.stage || 'seed')">
        <!-- 阶段 Emoji（根据成长阶段变化） -->
        <div class="stage-emoji">{{ stageEmoji }}</div>
        <!-- PixiJS 豆豆渲染画布（背景装饰） -->
        <div class="dodo-canvas-wrap">
          <canvas ref="dodoCanvas" class="dodo-canvas"></canvas>
        </div>
        <div class="pet-level-badge">Lv.{{ petStore.level }}</div>
      </div>

      <div class="pet-name-row">
        <h2 class="pet-name">{{ petStore.name }}</h2>
        <span class="pet-stage-badge" :class="petStore.stage">
          {{ stageLabel }}
        </span>
      </div>

      <!-- 进化进度条 -->
      <div class="evo-section">
        <div class="evo-labels">
          <span>经验值</span>
          <span>{{ petStore.exp }} / {{ petStore.expToNext }}</span>
        </div>
        <div class="evo-bar-wrap">
          <div class="evo-bar" :style="{ width: evoPercent + '%' }"></div>
        </div>
        <div class="evo-timeline">
          <span :class="{ reached: stageReached('seed') }">🌰</span>
          <span class="line" :class="{ active: stageReached('sprout') }"></span>
          <span :class="{ reached: stageReached('sprout') }">🌱</span>
          <span class="line" :class="{ active: stageReached('bloom') }"></span>
          <span :class="{ reached: stageReached('bloom') }">🌸</span>
          <span class="line" :class="{ active: stageReached('fruit') }"></span>
          <span :class="{ reached: stageReached('fruit') }">🌟</span>
        </div>
      </div>
    </div>

    <!-- 宠物状态 -->
    <div class="stats-row animate-fade-in" style="animation-delay: 0.2s">
      <div class="stat-card card">
        <div class="stat-icon">{{ moodEmoji }}</div>
        <div class="stat-label">心情</div>
        <div class="stat-value">{{ moodText }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-icon">🍖</div>
        <div class="stat-label">饱腹度</div>
        <div class="stat-value">{{ petStore.hunger }}%</div>
      </div>
      <div class="stat-card card">
        <div class="stat-icon">⭐</div>
        <div class="stat-label">总星星</div>
        <div class="stat-value">{{ learningStore.totalStars }}</div>
      </div>
    </div>

    <!-- 互动区域 -->
    <section class="section animate-fade-in" style="animation-delay: 0.3s">
      <h2 class="section-title">🎮 和 {{ petStore.name }} 互动</h2>
      <div class="interact-grid">
        <button class="interact-btn card" @click="doSpeak">
          <span class="interact-icon">🎤</span>
          <span class="interact-label">英语对话</span>
          <span class="interact-desc">练习口语</span>
        </button>
        <button class="interact-btn card" @click="doPlay">
          <span class="interact-icon">🎾</span>
          <span class="interact-label">单词游戏</span>
          <span class="interact-desc">边玩边学</span>
        </button>
        <button class="interact-btn card" @click="doFeed">
          <span class="interact-icon">🍎</span>
          <span class="interact-label">喂食学习</span>
          <span class="interact-desc">+经验值</span>
        </button>
        <button class="interact-btn card" @click="doStory">
          <span class="interact-icon">📖</span>
          <span class="interact-label">英语故事</span>
          <span class="interact-desc">磨耳朵</span>
        </button>
      </div>
    </section>

    <!-- 装扮系统 -->
    <section class="section animate-fade-in" style="animation-delay: 0.4s">
      <h2 class="section-title">🎨 豆豆装扮</h2>
      <div class="deco-categories">
        <button
          v-for="cat in decoCategories"
          :key="cat.type"
          class="deco-cat-btn"
          :class="{ active: activeDecoType === cat.type }"
          @click="activeDecoType = cat.type"
        >{{ cat.label }}</button>
      </div>
      <div class="deco-grid">
        <div
          v-for="d in equippedDecorations"
          :key="d.id"
          class="deco-equipped-card"
          @click="unequipDecoration(d.id)"
        >
          <span class="deco-emoji">{{ d.emoji }}</span>
          <span class="deco-name">{{ d.name }}</span>
        </div>
        <div
          v-for="d in availableDecorations"
          :key="d.id"
          class="deco-card"
          :class="{ owned: d.owned }"
          @click="handleDecoClick(d)"
        >
          <span class="deco-emoji">{{ d.owned ? d.emoji : '❓' }}</span>
          <span class="deco-name">{{ d.owned ? d.name : '???' }}</span>
          <span v-if="!d.owned" class="deco-cost">
            {{ d.unlockType === 'starlight' ? '⭐' + d.unlockValue : '🔒' }}
          </span>
        </div>
      </div>
    </section>

    <!-- 花园入口 -->
    <section class="section animate-fade-in" style="animation-delay: 0.5s">
      <button class="garden-entry-btn" @click="$router.push('/garden')">
        <span class="garden-entry-emoji">🏡</span>
        <div class="garden-entry-text">
          <span class="garden-entry-title">豆豆家园</span>
          <span class="garden-entry-desc">装扮豆豆的小空间</span>
        </div>
        <span class="garden-entry-arrow">→</span>
      </button>
    </section>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { petStore, feedPet, updateMood, fetchMyPet } from '../stores/pet'
import { gardenStore, fetchGarden, equipDecoration, unequipDecoration, unlockDecoration } from '../stores/garden'
import type { Decoration } from '../api/decorations'
import { learningStore } from '../stores/learning'
import { usePixiDodo } from '../composables/usePixiDodo'

const dodoCanvas = ref<HTMLCanvasElement | null>(null)
const { playAnimation } = usePixiDodo(dodoCanvas)

onMounted(() => {
  fetchMyPet()
  fetchGarden()
})

const activeDecoType = ref('head')

const decoCategories = [
  { type: 'head', label: '👑' },
  { type: 'face', label: '😊' },
  { type: 'neck', label: '🧣' },
  { type: 'back', label: '🦋' },
  { type: 'tail', label: '🔔' },
  { type: 'hand', label: '🪄' },
  { type: 'effect', label: '✨' },
]

// 已穿戴的装饰品
const equippedDecorations = computed(() =>
  gardenStore.decorations.filter((d) => d.owned && d.equipped)
)

// 当前分类下可选装饰品
const availableDecorations = computed(() =>
  gardenStore.decorations.filter((d) => d.type === activeDecoType.value)
)

async function handleDecoClick(d: Decoration) {
  if (!d.owned) {
    const ok = await unlockDecoration(d.id)
    if (!ok) {
      showToast('星光不足～再多多学习就能解锁啦！')
    } else {
      showToast(`解锁了 ${d.name}！`)
    }
  } else {
    await equipDecoration(d.id)
    showToast(`穿上了 ${d.name}！`)
  }
}

const toast = ref('')
const showToast = (msg: string) => {
  toast.value = msg
  setTimeout(() => {
    toast.value = ''
  }, 2000)
}

const stageLabel = computed(() => {
  const map: Record<string, string> = {
    egg: '魔法蛋',
    baby: '幼崽期',
    young: '成长期',
    adult: '成熟期',
    legend: '传说级',
  }
  return map[petStore.stage] || '魔法蛋'
})

// 根据后端 stage 显示不同的阶段 emoji
const stageEmoji = computed(() => {
  const map: Record<string, string> = {
    seed: '🌰',
    sprout: '🌱',
    bloom: '🌸',
    fruit: '🌟',
  }
  return map[petStore.pet?.stage || ''] || '🌰'
})

const moodEmoji = computed(() => {
  const map: Record<string, string> = {
    happy: '😊',
    normal: '😐',
    sad: '😢',
    excited: '🤩',
  }
  return map[petStore.mood] || '😐'
})

const moodText = computed(() => {
  const map: Record<string, string> = {
    happy: '开心',
    normal: '一般',
    sad: '饿了',
    excited: '兴奋',
  }
  return map[petStore.mood] || '一般'
})

const evoPercent = computed(() => {
  return Math.round((petStore.exp / petStore.expToNext) * 100)
})

// 判断是否到达某个阶段（用于进化时间线高亮）
const stageOrder = ['seed', 'sprout', 'bloom', 'fruit']
function stageReached(stage: string): boolean {
  const currentIdx = stageOrder.indexOf(petStore.pet?.stage || 'seed')
  const targetIdx = stageOrder.indexOf(stage)
  return currentIdx >= targetIdx
}

function doSpeak() {
  updateMood('excited')
  feedPet(15)
  playAnimation('excited')
  showToast(`🗣️ "${petStore.name} 想和你聊一聊！"（功能开发中）`)
}

function doPlay() {
  updateMood('happy')
  feedPet(10)
  playAnimation('happy')
  showToast(`🎮 单词大冒险开始！（功能开发中）`)
}

function doFeed() {
  feedPet(20)
  updateMood('happy')
  playAnimation('eat')
  showToast(`🍎 喂食成功！+20 经验值`)
}

function doStory() {
  feedPet(10)
  updateMood('normal')
  playAnimation('idle')
  showToast(`📖 今天的故事：《The Magic Forest》（功能开发中）`)
}
</script>

<style scoped>
/* 宠物展示 */
.pet-stage {
  text-align: center;
  padding: 32px 20px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff5f5, #f0e6ff);
}

.pet-display {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  transition: background 0.8s ease;
  overflow: hidden;
}

/* 各阶段背景色 */
.pet-display.stage-seed {
  background: radial-gradient(circle, #f5e6d3 0%, #e8d5b7 100%);
}

.pet-display.stage-sprout {
  background: radial-gradient(circle, #d4f5d4 0%, #a8e6a8 100%);
}

.pet-display.stage-bloom {
  background: radial-gradient(circle, #fce4ec 0%, #f8bbd0 100%);
}

.pet-display.stage-fruit {
  background: radial-gradient(circle, #fff9c4 0%, #ffe082 100%);
}

/* 阶段 emoji */
.stage-emoji {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 80px;
  z-index: 2;
  animation: stage-float 3s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

@keyframes stage-float {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-8px); }
}

.pet-avatar {
  font-size: 80px;
  line-height: 1;
}

/* PixiJS 豆豆画布 */
.dodo-canvas-wrap {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  position: relative;
}

.dodo-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.pet-level-badge {
  position: absolute;
  top: -4px;
  right: -12px;
  background: var(--accent);
  color: #333;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.pet-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.pet-name {
  font-size: 22px;
  font-weight: 700;
}

.pet-stage-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.pet-stage-badge.egg {
  background: #ffeaa7;
  color: #8b6914;
}
.pet-stage-badge.baby {
  background: #fd79a8;
  color: white;
}
.pet-stage-badge.young {
  background: #a29bfe;
  color: white;
}
.pet-stage-badge.adult {
  background: #6c5ce7;
  color: white;
}
.pet-stage-badge.legend {
  background: linear-gradient(135deg, #fdcb6e, #e17055);
  color: white;
}

/* 进化进度 */
.evo-section {
  margin-top: 8px;
}

.evo-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 6px;
}

.evo-bar-wrap {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.evo-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.evo-timeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  font-size: 18px;
}

.evo-timeline span:not(.line) {
  opacity: 0.3;
  transition: all 0.3s;
}

.evo-timeline span.reached {
  opacity: 1;
  transform: scale(1.15);
}

.line {
  width: 24px;
  height: 2px;
  background: #ddd;
  transition: background 0.3s;
}

.line.active {
  background: var(--primary);
}

/* 状态卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
  padding: 16px 8px;
}

.stat-icon {
  font-size: 24px;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-light);
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--primary);
}

/* 互动按钮 */
.interact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.interact-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  border: none;
  cursor: pointer;
  text-align: center;
}

.interact-icon {
  font-size: 32px;
}

.interact-label {
  font-weight: 600;
  font-size: 14px;
}

.interact-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* 装扮系统 */
.deco-categories {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.deco-cat-btn {
  padding: 6px 14px;
  border-radius: 16px;
  border: 1.5px solid #e8e4da;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.deco-cat-btn.active {
  background: linear-gradient(135deg, #f5f0e8, #ede4d3);
  border-color: #c9a96e;
}

.deco-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.deco-card, .deco-equipped-card {
  text-align: center;
  padding: 12px 8px;
  background: #fafafa;
  border-radius: 12px;
  border: 2px solid #e8e4da;
  cursor: pointer;
  transition: all 0.2s;
}

.deco-card.owned {
  background: #fef9e7;
  border-color: #e8d5b7;
}

.deco-equipped-card {
  background: linear-gradient(135deg, #f0e6d3, #e8d5b7);
  border-color: #c9a96e;
}

.deco-emoji {
  font-size: 28px;
  display: block;
  margin-bottom: 4px;
}

.deco-name {
  font-size: 11px;
  font-weight: 600;
  color: #5c5544;
}

.deco-cost {
  font-size: 10px;
  color: #c9a96e;
  font-weight: 600;
}

/* 花园入口 */
.garden-entry-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.garden-entry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(76,175,80,0.2);
}

.garden-entry-emoji {
  font-size: 32px;
}

.garden-entry-text {
  flex: 1;
  text-align: left;
}

.garden-entry-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #2e7d32;
}

.garden-entry-desc {
  display: block;
  font-size: 12px;
  color: #558b2f;
  margin-top: 2px;
}

.garden-entry-arrow {
  font-size: 22px;
  color: #4caf50;
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
</style>
