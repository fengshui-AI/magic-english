<template>
  <div class="growth-page">
    <!-- 头部 -->
    <div class="growth-header animate-fade-in">
      <h1>🌱 豆豆成长记</h1>
      <p>见证 {{ petStore.name }} 的每一步成长</p>
    </div>

    <!-- 当前形态展示 -->
    <div class="morph-card card animate-fade-in" style="animation-delay: 0.1s">
      <div class="morph-display">
        <transition name="morph-switch" mode="out-in">
          <div :key="currentStage" class="morph-creature">
            <div class="morph-emoji animate-bounce">{{ currentStageEmoji }}</div>
            <div class="morph-glow"></div>
          </div>
        </transition>
        <div class="morph-info">
          <span class="morph-name">{{ petStore.name }}</span>
          <span class="morph-stage-badge" :class="petStore.stage">
            {{ stageLabel }}
          </span>
        </div>
      </div>

      <!-- 经验条 -->
      <div class="exp-section">
        <div class="exp-header">
          <span>成长值</span>
          <span>{{ petStore.exp }} / {{ petStore.expToNext }}</span>
        </div>
        <div class="exp-bar-wrap">
          <div class="exp-bar" :style="{ width: expPct + '%' }">
            <div class="exp-shimmer"></div>
          </div>
        </div>
        <div class="exp-next-hint">
          <span v-if="nextStage" class="next-preview">
            下一阶段：{{ nextStage.emoji }} {{ nextStage.label }}
          </span>
          <span v-else class="max-hint">🏆 已达最高等级！</span>
        </div>
      </div>
    </div>

    <!-- 成长阶段时间线 -->
    <div class="timeline-section animate-fade-in" style="animation-delay: 0.2s">
      <h2 class="section-title">🌟 成长时光线</h2>
      <div class="timeline">
        <div
          v-for="(stage, idx) in stages"
          :key="stage.id"
          class="timeline-node"
          :class="{ reached: stage.reached, current: stage.current }"
        >
          <div class="node-marker">
            <div class="node-dot">
              <span v-if="stage.reached">✓</span>
              <span v-else-if="stage.current">🔮</span>
              <span v-else>🔒</span>
            </div>
            <div
              v-if="idx < stages.length - 1"
              class="node-line"
              :class="{ active: stage.reached }"
            ></div>
          </div>
          <div class="node-content">
            <div class="node-emoji">{{ stage.emoji }}</div>
            <div class="node-label">{{ stage.label }}</div>
            <div class="node-desc">{{ stage.desc }}</div>
            <div v-if="stage.reached && stage.reachedAt" class="node-date">
              {{ stage.reachedAt }}
            </div>
            <div v-if="stage.current" class="node-progress">进行中...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 成长数据 -->
    <div class="stats-section animate-fade-in" style="animation-delay: 0.3s">
      <h2 class="section-title">📊 成长数据</h2>
      <div class="stats-grid">
        <div class="growth-stat card">
          <span class="gs-icon">📚</span>
          <span class="gs-value">{{ learningStore.totalStars }}</span>
          <span class="gs-label">总星星</span>
        </div>
        <div class="growth-stat card">
          <span class="gs-icon">⏱️</span>
          <span class="gs-value">{{ totalMinutes }}</span>
          <span class="gs-label">学习时长</span>
        </div>
        <div class="growth-stat card">
          <span class="gs-icon">🎤</span>
          <span class="gs-value">{{ totalWords }}</span>
          <span class="gs-label">学词数量</span>
        </div>
        <div class="growth-stat card">
          <span class="gs-icon">🔥</span>
          <span class="gs-value">{{ streakStore.currentStreak }}天</span>
          <span class="gs-label">最长连胜</span>
        </div>
      </div>
    </div>

    <!-- 成就徽章 -->
    <div class="achievements-section animate-fade-in" style="animation-delay: 0.4s">
      <h2 class="section-title">🏅 成就徽章</h2>
      <div class="badges-grid">
        <div
          v-for="badge in badges"
          :key="badge.id"
          class="badge-item"
          :class="{ unlocked: badge.unlocked }"
        >
          <div class="badge-icon-wrap" :class="{ locked: !badge.unlocked }">
            <span class="badge-icon">{{ badge.unlocked ? badge.icon : '❓' }}</span>
          </div>
          <div class="badge-name">{{ badge.unlocked ? badge.name : '???' }}</div>
          <div class="badge-cond">{{ badge.unlocked ? badge.desc : badge.condition }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { petStore } from '../stores/pet'
import { learningStore } from '../stores/learning'
import { streakStore, fetchStreakState } from '../stores/streak'

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

const currentStageEmoji = computed(() => {
  const map: Record<string, string> = {
    egg: '🥚',
    baby: '🐣',
    young: '🦎',
    adult: '🐉',
    legend: '🐲',
  }
  return map[petStore.stage] || '🥚'
})

const expPct = computed(() => Math.min(100, Math.round((petStore.exp / petStore.expToNext) * 100)))

const nextStage = computed(() => {
  const map: Record<string, { emoji: string; label: string }> = {
    egg: { emoji: '🐣', label: '幼崽期' },
    baby: { emoji: '🦎', label: '成长期' },
    young: { emoji: '🐉', label: '成熟期' },
    adult: { emoji: '🐲', label: '传说级' },
    legend: { emoji: '', label: '' },
  }
  const next = map[petStore.stage]
  return next?.label ? next : null
})

const currentStage = computed(() => petStore.stage)

const stages = [
  {
    id: 'egg',
    emoji: '🥚',
    label: '魔法蛋',
    desc: '一颗神秘的魔法蛋，等待被唤醒...',
    reached: false,
    current: false,
    reachedAt: '',
  },
  {
    id: 'baby',
    emoji: '🐣',
    label: '幼崽期',
    desc: '豆豆破壳而出，开始探索世界',
    reached: false,
    current: false,
    reachedAt: '',
  },
  {
    id: 'young',
    emoji: '🦎',
    label: '成长期',
    desc: '豆豆快速成长，学会更多魔法',
    reached: false,
    current: false,
    reachedAt: '',
  },
  {
    id: 'adult',
    emoji: '🐉',
    label: '成熟期',
    desc: '豆豆已经非常强大，能使用高级魔法',
    reached: false,
    current: false,
    reachedAt: '',
  },
  {
    id: 'legend',
    emoji: '🐲',
    label: '传说级',
    desc: '豆豆成为传说级的魔法龙！',
    reached: false,
    current: false,
    reachedAt: '',
  },
]

// 根据当前阶段计算时间线状态
const stageOrder = ['egg', 'baby', 'young', 'adult', 'legend']
const currentStageIdx = stageOrder.indexOf(petStore.stage)

stages.forEach((s, idx) => {
  if (idx < currentStageIdx) {
    s.reached = true
    s.current = false
  } else if (idx === currentStageIdx) {
    s.reached = true
    s.current = true
  } else {
    s.reached = false
    s.current = false
  }
})

// 模拟里程碑日期
const mockDates = ['2026-07-01', '2026-07-08', '2026-07-15', '', '']
stages.forEach((s, idx) => {
  if (s.reached && !s.reachedAt) {
    s.reachedAt = mockDates[idx]
  }
})

const totalMinutes = computed(() => {
  return learningStore.progress?.summary?.totalMinutes || 45
})

const totalWords = computed(() => {
  return learningStore.progress?.summary?.totalWordsLearned || 23
})

const badges = [
  {
    id: 'first_word',
    icon: '📝',
    name: '初识单词',
    desc: '学得真棒！',
    condition: '学习第一个单词',
    unlocked: true,
  },
  {
    id: 'streak_3',
    icon: '🔥',
    name: '三天连胜',
    desc: '坚持不懈！',
    condition: '连续学习3天',
    unlocked: true,
  },
  {
    id: 'streak_7',
    icon: '🔥🔥',
    name: '一周连胜',
    desc: '习惯养成中！',
    condition: '连续学习7天',
    unlocked: false,
  },
  {
    id: 'word_10',
    icon: '📚',
    name: '十个单词',
    desc: '词汇小达人',
    condition: '累计学习10个单词',
    unlocked: true,
  },
  {
    id: 'word_50',
    icon: '📚📚',
    name: '五十单词',
    desc: '词汇小专家',
    condition: '累计学习50个单词',
    unlocked: false,
  },
  {
    id: 'speak_10',
    icon: '🎤',
    name: '勇敢开口',
    desc: '敢于表达！',
    condition: '完成10次跟读',
    unlocked: false,
  },
  {
    id: 'perfect',
    icon: '🌟',
    name: '完美发音',
    desc: '发音小天才',
    condition: '跟读评分达到90分',
    unlocked: false,
  },
  {
    id: 'morning',
    icon: '🌅',
    name: '晨读之星',
    desc: '早起学习',
    condition: '早上6-8点学习',
    unlocked: false,
  },
]

onMounted(() => {
  fetchStreakState().catch(() => {})
})
</script>

<style scoped>
.growth-page {
  padding: 20px 16px 100px;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
}

.growth-header {
  text-align: center;
  margin-bottom: 20px;
}

.growth-header h1 {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #00b894, #6c5ce7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.growth-header p {
  color: var(--text-light);
  font-size: 13px;
  margin-top: 4px;
}

/* 形态展示卡片 */
.morph-card {
  background: linear-gradient(135deg, #e8ffe8, #f0ecff);
  margin-bottom: 24px;
  text-align: center;
  padding: 28px 20px;
}

.morph-display {
  margin-bottom: 24px;
}

.morph-creature {
  position: relative;
  display: inline-block;
}

.morph-emoji {
  font-size: 80px;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.animate-bounce {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

.morph-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.3), transparent 70%);
}

.morph-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}

.morph-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.morph-stage-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.morph-stage-badge.egg {
  background: #ffeaa7;
  color: #8b6914;
}
.morph-stage-badge.baby {
  background: #fd79a8;
  color: white;
}
.morph-stage-badge.young {
  background: #a29bfe;
  color: white;
}
.morph-stage-badge.adult {
  background: #6c5ce7;
  color: white;
}
.morph-stage-badge.legend {
  background: linear-gradient(135deg, #fdcb6e, #e17055);
  color: white;
}

/* 经验条 */
.exp-section {
  text-align: left;
}

.exp-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-light);
  margin-bottom: 6px;
}

.exp-bar-wrap {
  height: 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.exp-bar {
  height: 100%;
  background: linear-gradient(90deg, #00b894, #6c5ce7);
  border-radius: 5px;
  transition: width 0.5s ease;
  position: relative;
  overflow: hidden;
}

.exp-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
}

.exp-next-hint {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.next-preview {
  color: var(--primary);
  font-weight: 500;
}

.max-hint {
  color: var(--accent);
  font-weight: 600;
}

/* 时间线 */
.timeline-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--text);
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-node {
  display: flex;
  gap: 16px;
  min-height: 80px;
}

.node-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 32px;
  flex-shrink: 0;
}

.node-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.timeline-node.reached .node-dot {
  background: #e6fff8;
  border-color: var(--success);
  color: var(--success);
}

.timeline-node.current .node-dot {
  background: var(--success);
  border-color: var(--success);
  color: white;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(0, 184, 148, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(0, 184, 148, 0);
  }
}

.node-line {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: #eee;
  transition: background 0.3s;
}

.node-line.active {
  background: var(--success);
}

.node-content {
  padding-bottom: 20px;
  flex: 1;
}

.node-emoji {
  font-size: 20px;
  margin-bottom: 4px;
}

.node-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}

.node-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.node-date {
  font-size: 11px;
  color: var(--success);
  margin-top: 4px;
  font-weight: 500;
}

.node-progress {
  font-size: 11px;
  color: var(--primary);
  margin-top: 4px;
  font-weight: 600;
  animation: pulse 2s ease-in-out infinite;
}

/* 形态切换动画 */
.morph-switch-enter-active,
.morph-switch-leave-active {
  transition: all 0.6s ease;
}

.morph-switch-enter-from {
  opacity: 0;
  transform: scale(0.3) rotate(-20deg);
}

.morph-switch-leave-to {
  opacity: 0;
  transform: scale(1.5) rotate(20deg);
}

/* 统计数据 */
.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.growth-stat {
  text-align: center;
  padding: 20px 12px;
}

.gs-icon {
  font-size: 28px;
  display: block;
  margin-bottom: 6px;
}

.gs-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
  display: block;
}

.gs-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 成就徽章 */
.achievements-section {
  margin-bottom: 24px;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.badge-item {
  text-align: center;
  padding: 12px 6px;
  background: white;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.badge-item.unlocked:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.15);
}

.badge-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  transition: all 0.3s;
}

.badge-icon-wrap.locked {
  background: #f0f0f0;
  opacity: 0.5;
}

.badge-item.unlocked .badge-icon-wrap {
  background: linear-gradient(135deg, #fff9e6, #ffe0f0);
  box-shadow: 0 2px 10px rgba(253, 203, 110, 0.3);
}

.badge-icon {
  font-size: 24px;
}

.badge-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}

.badge-cond {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.3;
}

.badge-item.unlocked .badge-cond {
  color: var(--success);
}
</style>
