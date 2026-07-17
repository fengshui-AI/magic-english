<template>
  <div class="page">
    <!-- 头部 -->
    <div class="page-header animate-fade-in">
      <h1>🐾 我的宠物</h1>
      <p>陪伴你学习英语的魔法伙伴</p>
    </div>

    <!-- 宠物展示区 -->
    <div class="pet-stage card animate-fade-in" style="animation-delay: 0.1s">
      <div class="pet-display">
        <!-- PixiJS 豆豆渲染画布 -->
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
          <span :class="{ reached: petStore.level >= 1 }">🥚</span>
          <span class="line" :class="{ active: petStore.level >= 3 }"></span>
          <span :class="{ reached: petStore.level >= 3 }">🐣</span>
          <span class="line" :class="{ active: petStore.level >= 5 }"></span>
          <span :class="{ reached: petStore.level >= 5 }">🦎</span>
          <span class="line" :class="{ active: petStore.level >= 8 }"></span>
          <span :class="{ reached: petStore.level >= 8 }">🐉</span>
          <span class="line" :class="{ active: petStore.level >= 10 }"></span>
          <span :class="{ reached: petStore.level >= 10 }">🐲</span>
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

    <!-- 皮肤 -->
    <section class="section animate-fade-in" style="animation-delay: 0.4s">
      <h2 class="section-title">🎨 宠物装扮</h2>
      <div class="skin-list">
        <div
          v-for="skin in skins"
          :key="skin.id"
          class="skin-item"
          :class="{ owned: skin.owned, active: skin.id === petStore.skin }"
        >
          <div class="skin-preview">{{ skin.emoji }}</div>
          <div class="skin-name">{{ skin.name }}</div>
          <div class="skin-status">
            {{ skin.owned ? (skin.id === petStore.skin ? '使用中' : '已拥有') : '🔒' }}
          </div>
        </div>
      </div>
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
import { learningStore } from '../stores/learning'
import { usePixiDodo } from '../composables/usePixiDodo'

const dodoCanvas = ref<HTMLCanvasElement | null>(null)
const { playAnimation } = usePixiDodo(dodoCanvas)

onMounted(() => {
  fetchMyPet()
})

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

const skins = [
  { id: 'default', name: '原皮', emoji: '🥚', owned: true },
  { id: 'fire', name: '火焰', emoji: '🔥', owned: false },
  { id: 'ice', name: '冰霜', emoji: '❄️', owned: false },
  { id: 'star', name: '星空', emoji: '🌟', owned: false },
]

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

/* 皮肤列表 */
.skin-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.skin-item {
  text-align: center;
  padding: 14px 8px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.skin-item.owned {
  cursor: pointer;
}

.skin-item.active {
  border-color: var(--primary);
  background: rgba(108, 92, 231, 0.06);
}

.skin-preview {
  font-size: 28px;
  margin-bottom: 6px;
}

.skin-name {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
}

.skin-status {
  font-size: 11px;
  color: var(--text-muted);
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
