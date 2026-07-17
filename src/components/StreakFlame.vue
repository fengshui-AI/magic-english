<template>
  <div class="streak-flame" :class="'level-' + flameLevel">
    <div class="flame-icon">
      <!-- 火焰动画 -->
      <div class="flame-core">
        <span class="flame-emoji">{{ streakStore.streakEmoji || '🕯️' }}</span>
      </div>
      <div v-if="flameLevel > 0" class="flame-outer">
        <div
          v-for="i in particleCount"
          :key="i"
          class="flame-particle"
          :style="particleStyle(i)"
        ></div>
      </div>
    </div>

    <div class="flame-info">
      <div class="flame-count" :style="{ color: flameColor }">
        {{ streakStore.currentStreak }}
      </div>
      <div class="flame-label">天连胜</div>
    </div>

    <!-- 里程碑进度条 -->
    <div v-if="streakStore.nextMilestone" class="milestone-progress">
      <div class="milestone-bar-wrap">
        <div class="milestone-bar" :style="milestoneBarStyle"></div>
      </div>
      <div class="milestone-text">
        距 {{ streakStore.nextMilestone.reward }} 还有 {{ daysToNext }} 天
      </div>
    </div>

    <!-- 冻结状态 -->
    <div v-if="streakStore.isFrozen" class="freeze-info">
      <span class="freeze-icon">🧊</span>
      <span>已冻结保护</span>
    </div>

    <!-- 冻结卡 -->
    <div v-if="streakStore.freezeCards > 0 && !streakStore.isFrozen" class="freeze-cards">
      <span class="card-icon">🃏</span>
      <span>×{{ streakStore.freezeCards }}</span>
      <button class="freeze-btn" :disabled="streakStore.loading" @click="$emit('freeze')">
        冻结
      </button>
    </div>

    <!-- 最长记录 -->
    <div v-if="streakStore.longestStreak > 0" class="longest-info">
      🏆 最高记录: {{ streakStore.longestStreak }} 天
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { streakStore, getFlameLevel, getFlameColor, daysToNextMilestone } from '../stores/streak'

defineEmits<{
  freeze: []
}>()

const flameLevel = computed(() => getFlameLevel(streakStore.currentStreak))
const flameColor = computed(() => getFlameColor(streakStore.currentStreak))
const daysToNext = computed(() =>
  daysToNextMilestone(streakStore.currentStreak, streakStore.nextMilestone),
)

const particleCount = computed(() => Math.min(flameLevel.value * 3, 12))

const milestoneBarStyle = computed(() => {
  if (!streakStore.nextMilestone) return { width: '100%' }
  const currentMilestone = [0, 3, 7, 15, 30, 60][flameLevel.value] || 0
  const next = streakStore.nextMilestone.days
  const progress =
    ((streakStore.currentStreak - currentMilestone) / (next - currentMilestone)) * 100
  return { width: Math.min(100, Math.max(0, progress)) + '%' }
})

function particleStyle(index: number) {
  const angle = (index / particleCount.value) * 360
  const delay = index * 0.15
  return {
    '--angle': angle + 'deg',
    '--delay': delay + 's',
    animationDelay: delay + 's',
  }
}
</script>

<style scoped>
.streak-flame {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
}

/* 火焰图标 */
.flame-icon {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flame-core {
  position: relative;
  z-index: 2;
}

.flame-emoji {
  font-size: 36px;
  line-height: 1;
  transition: all 0.3s ease;
}

/* 火焰粒子 */
.flame-outer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.flame-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--flame-color, #fdcb6e);
  animation: flameRise 1s ease-out infinite;
  opacity: 0;
}

@keyframes flameRise {
  0% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-28px);
    opacity: 0;
  }
}

/* 火焰等级颜色 */
.level-1 .flame-particle {
  --flame-color: #ffeaa7;
}
.level-2 .flame-particle {
  --flame-color: #fab1a0;
}
.level-3 .flame-particle {
  --flame-color: #ff7675;
}
.level-4 .flame-particle {
  --flame-color: #fdcb6e;
}
.level-5 .flame-particle {
  --flame-color: #e17055;
}

/* 火焰数字 */
.flame-info {
  text-align: center;
}

.flame-count {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.2;
  transition: color 0.3s ease;
}

.flame-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* 里程碑进度 */
.milestone-progress {
  width: 100%;
  text-align: center;
}

.milestone-bar-wrap {
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.milestone-bar {
  height: 100%;
  background: linear-gradient(90deg, #fdcb6e, #e17055);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.milestone-text {
  font-size: 11px;
  color: var(--text-muted);
}

/* 冻结信息 */
.freeze-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #e3f2fd;
  border-radius: 20px;
  font-size: 12px;
  color: #1976d2;
  font-weight: 600;
}

.freeze-icon {
  font-size: 16px;
}

/* 冻结卡 */
.freeze-cards {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #f5f5f5;
  border-radius: 16px;
  font-size: 12px;
}

.card-icon {
  font-size: 14px;
}

.freeze-btn {
  padding: 2px 10px;
  background: #6c5ce7;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.freeze-btn:hover {
  background: #5b4cdb;
}

.freeze-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 最长记录 */
.longest-info {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
