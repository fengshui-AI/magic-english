<template>
  <div class="garden-page">
    <!-- 花园场景 -->
    <div class="garden-scene">
      <!-- 天空背景 -->
      <div class="sky">
        <div class="clouds">
          <span class="cloud cloud-1">☁️</span>
          <span class="cloud cloud-2">☁️</span>
          <span class="cloud cloud-3">☁️</span>
        </div>
        <div class="sun">☀️</div>
      </div>

      <!-- 草地和装饰 -->
      <div class="ground">
        <div class="grass-layer">
          <span v-for="i in 12" :key="'g' + i" class="grass-blade" :style="grassStyle(i)">🌿</span>
        </div>
        <div class="flowers">
          <span v-for="i in 8" :key="'f' + i" class="flower" :style="flowerStyle(i)">{{
            flowerEmoji(i)
          }}</span>
        </div>

        <!-- 豆豆在场景中 -->
        <div class="dodo-area" @click="$router.push('/pet')">
          <DodoEmotion />
        </div>
      </div>
    </div>

    <!-- 连胜火焰 -->
    <div
      v-if="streakStore.currentStreak > 0"
      class="streak-bar animate-fade-in"
      style="animation-delay: 0.2s"
    >
      <StreakFlame />
    </div>

    <!-- 问候卡片 -->
    <div class="greeting-card card animate-fade-in" style="animation-delay: 0.25s">
      <div class="greeting-content">
        <span class="greeting-icon">{{ greetingIcon }}</span>
        <div>
          <h2 class="greeting-text">{{ greetingText }}</h2>
          <p class="greeting-sub">{{ greetingSub }}</p>
        </div>
      </div>
    </div>

    <!-- 今日学习计划 -->
    <section class="plan-section animate-fade-in" style="animation-delay: 0.3s">
      <div class="section-header">
        <h2 class="section-title">📋 今日学习计划</h2>
        <button class="start-btn" @click="startLearning">
          <span>开始学习</span>
          <span>→</span>
        </button>
      </div>

      <div class="plan-cards">
        <div class="plan-card new-words">
          <div class="plan-icon">🆕</div>
          <div class="plan-info">
            <span class="plan-num">{{ newWordCount }}</span>
            <span class="plan-label">新单词</span>
          </div>
        </div>
        <div class="plan-card review-words">
          <div class="plan-icon">🔄</div>
          <div class="plan-info">
            <span class="plan-num">{{ reviewCount }}</span>
            <span class="plan-label">待复习</span>
          </div>
        </div>
        <div class="plan-card daily-goal">
          <div class="plan-icon">🎯</div>
          <div class="plan-info">
            <span class="plan-num">{{ dailyGoal }}min</span>
            <span class="plan-label">今日目标</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 每日任务 -->
    <section class="tasks-section animate-fade-in" style="animation-delay: 0.35s">
      <h2 class="section-title">🎯 每日任务</h2>
      <div class="task-list">
        <div
          v-for="task in dailyTasks"
          :key="task.id"
          class="task-item card"
          :class="{ completed: task.completed }"
          @click="handleTaskClick(task)"
        >
          <div class="task-icon-wrap" :class="task.type">
            <span>{{ taskIcons[task.type] }}</span>
          </div>
          <div class="task-body">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-desc">{{ task.description }}</div>
          </div>
          <div class="task-reward">
            <template v-if="task.completed">
              <span class="reward-done">✅</span>
            </template>
            <template v-else>
              <span class="reward-stars">⭐×{{ task.stars || 3 }}</span>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- 教材导航 -->
    <section class="book-section animate-fade-in" style="animation-delay: 0.4s">
      <div class="section-header">
        <h2 class="section-title">📖 教材学习</h2>
        <span class="book-badge">人教版</span>
      </div>
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
    </section>

    <!-- 底部快捷入口 -->
    <div class="quick-links animate-fade-in" style="animation-delay: 0.45s">
      <router-link to="/notebook" class="quick-link card">
        <span class="ql-icon">📖</span>
        <span class="ql-label">手账本</span>
      </router-link>
      <router-link to="/growth" class="quick-link card">
        <span class="ql-icon">🌱</span>
        <span class="ql-label">成长记</span>
      </router-link>
      <router-link to="/pet" class="quick-link card">
        <span class="ql-icon">🐾</span>
        <span class="ql-label">宠物</span>
      </router-link>
      <router-link v-if="isParent" to="/parent" class="quick-link card parent-link">
        <span class="ql-icon">👨‍👩‍👧</span>
        <span class="ql-label">家长</span>
      </router-link>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authStore } from '../stores/auth'
import { petStore, feedPet } from '../stores/pet'
import { learningStore, dailyTasks, completeTask } from '../stores/learning'
import { streakStore, fetchStreakState, checkin } from '../stores/streak'
import { emotionStore, fetchEmotionState } from '../stores/emotion'
import DodoEmotion from '../components/DodoEmotion.vue'
import StreakFlame from '../components/StreakFlame.vue'
import type { DailyTask } from '../types'

const router = useRouter()

const isParent = computed(() => authStore.user?.role === 'parent')

const taskIcons: Record<string, string> = {
  speak: '🎤',
  listen: '🎧',
  word: '📝',
  dialogue: '💬',
}

const newWordCount = computed(() => learningStore.dailyPlan?.plan?.newWordCount || 3)
const reviewCount = computed(() => learningStore.dailyPlan?.plan?.reviewCount || 5)
const dailyGoal = computed(() => 20)

const greetingIcon = computed(() => {
  const hour = new Date().getHours()
  if (hour < 9) return '🌅'
  if (hour < 12) return '☀️'
  if (hour < 18) return '🌤️'
  return '🌙'
})

const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour < 9) return '早上好！'
  if (hour < 12) return '上午好！'
  if (hour < 18) return '下午好！'
  return '晚上好！'
})

const greetingSub = computed(() => {
  const name = petStore.name || '豆豆'
  if (streakStore.currentStreak >= 7)
    return `${name} 说：你已经连续学习 ${streakStore.currentStreak} 天了，太厉害了！`
  if (streakStore.currentStreak >= 3)
    return `${name} 说：连续 ${streakStore.currentStreak} 天，继续加油！`
  return `${name} 在花园等你呢，快来学习吧～`
})

const toast = computed(() => emotionStore.toastMessage || '')

function grassStyle(i: number) {
  const x = 5 + ((i * 8) % 90)
  const s = 0.7 + (i % 4) * 0.15
  const r = ((i % 3) - 1) * 10
  return {
    left: `${x}%`,
    bottom: `${2 + (i % 3) * 4}px`,
    transform: `scale(${s}) rotate(${r}deg)`,
    animationDelay: `${i * 0.3}s`,
  }
}

function flowerStyle(i: number) {
  const x = 8 + ((i * 13 + 5) % 85)
  return {
    left: `${x}%`,
    bottom: `${18 + (i % 4) * 10}px`,
    animationDelay: `${i * 0.4}s`,
  }
}

function flowerEmoji(i: number) {
  const flowers = ['🌸', '🌼', '🌻', '🌺', '💐', '🌷', '🪻', '🌾']
  return flowers[i % flowers.length]
}

function selectGrade(g: number) {
  learningStore.grade = g
}

function selectUnit(u: number) {
  learningStore.unit = u
}

function startLearning() {
  router.push('/learn')
}

function handleTaskClick(task: DailyTask) {
  if (task.completed) return
  const stars = Math.floor(Math.random() * 3) + 1
  completeTask(task.id, stars)
  feedPet(stars * 10)
  // 触发打卡
  checkin().catch(() => {})
}

onMounted(() => {
  fetchStreakState().catch(() => {})
  fetchEmotionState().catch(() => {})
})
</script>

<style scoped>
.garden-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #e8f4fd 0%, #f0f8e8 40%, #f8f7ff 100%);
  padding-bottom: 100px;
  max-width: 480px;
  margin: 0 auto;
}

/* ============ 花园场景 ============ */
.garden-scene {
  position: relative;
  height: 280px;
  overflow: hidden;
}

.sky {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 70%;
  background: linear-gradient(180deg, #87ceeb 0%, #c8e6f5 60%, #e8f4fd 100%);
}

.sun {
  position: absolute;
  top: 16px;
  right: 32px;
  font-size: 42px;
  animation: sunPulse 4s ease-in-out infinite;
}

@keyframes sunPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.clouds {
  position: absolute;
  inset: 0;
}

.cloud {
  position: absolute;
  font-size: 28px;
  opacity: 0.8;
}

.cloud-1 {
  top: 20px;
  left: 10%;
  animation: cloudDrift 12s linear infinite;
}
.cloud-2 {
  top: 50px;
  left: 60%;
  animation: cloudDrift 16s linear infinite reverse;
}
.cloud-3 {
  top: 10px;
  left: 40%;
  animation: cloudDrift 14s linear infinite;
}

@keyframes cloudDrift {
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(30px);
  }
  100% {
    transform: translateX(0);
  }
}

/* 地面 */
.ground {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 55%;
  background: linear-gradient(180deg, #90c695 0%, #7ab87f 30%, #6aad6f 100%);
  border-radius: 50% 60% 0 0 / 30% 30% 0 0;
}

.grass-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
}

.grass-blade {
  position: absolute;
  font-size: 16px;
  animation: grassSway 2s ease-in-out infinite;
}

@keyframes grassSway {
  0%,
  100% {
    transform: scale(1) rotate(-5deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
}

.flowers {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.flower {
  position: absolute;
  font-size: 18px;
  animation: flowerBounce 3s ease-in-out infinite;
}

@keyframes flowerBounce {
  0%,
  100% {
    transform: translateY(0) rotate(0);
  }
  25% {
    transform: translateY(-3px) rotate(3deg);
  }
  75% {
    transform: translateY(-3px) rotate(-3deg);
  }
}

/* 豆豆区域 */
.dodo-area {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  cursor: pointer;
  transition: transform 0.3s;
}

.dodo-area:hover {
  transform: translateX(-50%) scale(1.05);
}

/* ============ 连胜火焰条 ============ */
.streak-bar {
  padding: 0 16px;
  margin-top: -20px;
  position: relative;
  z-index: 5;
}

/* ============ 问候卡片 ============ */
.greeting-card {
  margin: 16px 16px 20px;
  background: linear-gradient(135deg, #fff9e6, #f0ecff);
  border: 1px solid rgba(108, 92, 231, 0.1);
}

.greeting-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.greeting-icon {
  font-size: 36px;
}

.greeting-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.greeting-sub {
  font-size: 13px;
  color: var(--text-light);
  margin-top: 2px;
  line-height: 1.4;
}

/* ============ 学习计划 ============ */
.plan-section {
  padding: 0 16px;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.start-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 18px;
  border-radius: 20px;
  border: none;
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
}

.start-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(108, 92, 231, 0.4);
}

.plan-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.plan-card {
  padding: 16px 12px;
  border-radius: 14px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.plan-card.new-words {
  background: linear-gradient(135deg, #e6f3ff, #d0e8ff);
}
.plan-card.review-words {
  background: linear-gradient(135deg, #fff3e6, #ffe8d0);
}
.plan-card.daily-goal {
  background: linear-gradient(135deg, #e6ffe8, #d0ffd8);
}

.plan-icon {
  font-size: 24px;
}

.plan-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
}

.plan-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* ============ 每日任务 ============ */
.tasks-section {
  padding: 0 16px;
  margin-bottom: 20px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.task-item:not(.completed):hover {
  transform: translateX(4px);
  border-left: 3px solid var(--primary);
}

.task-item.completed {
  opacity: 0.5;
}

.task-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.task-icon-wrap.speak {
  background: #ffe0f0;
}
.task-icon-wrap.listen {
  background: #e0f0ff;
}
.task-icon-wrap.word {
  background: #fff8e0;
}
.task-icon-wrap.dialogue {
  background: #e8ffe0;
}

.task-body {
  flex: 1;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
}

.task-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.task-reward {
  flex-shrink: 0;
}

.reward-stars {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}

.reward-done {
  font-size: 16px;
}

/* ============ 教材导航 ============ */
.book-section {
  padding: 0 16px;
  margin-bottom: 20px;
}

.book-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 8px;
  background: var(--bg);
  color: var(--primary);
  font-weight: 600;
}

.grade-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.grade-tab {
  padding: 7px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: white;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-light);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.grade-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.unit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.unit-card {
  padding: 14px 10px;
  background: white;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.unit-card:hover {
  transform: translateY(-2px);
}

.unit-card.current {
  border-color: var(--primary);
  background: rgba(108, 92, 231, 0.04);
}

.unit-card.done {
  opacity: 0.4;
}

.unit-num {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.unit-status {
  font-size: 14px;
}

/* ============ 快捷入口 ============ */
.quick-links {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 0 16px;
  margin-bottom: 24px;
}

.quick-link {
  text-align: center;
  padding: 16px 8px;
  text-decoration: none;
  transition: all 0.3s;
}

.quick-link:hover {
  transform: translateY(-3px);
}

.ql-icon {
  font-size: 28px;
  display: block;
  margin-bottom: 6px;
}

.ql-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
