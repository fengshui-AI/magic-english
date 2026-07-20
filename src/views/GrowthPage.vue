<template>
  <div class="growth-page">
    <!-- 头部 -->
    <div class="growth-header animate-fade-in">
      <h1>🌱 成长时光</h1>
      <p>见证 {{ petStore.name }} 的每一步成长</p>
    </div>

    <!-- 当前形态展示 — 四阶段不同视觉风格 -->
    <div class="morph-card card animate-fade-in" style="animation-delay: 0.1s" :class="'stage-' + currentStage">
      <div class="morph-display">
        <transition name="morph-switch" mode="out-in">
          <div :key="currentStage" class="morph-creature">
            <div class="morph-emoji animate-bounce">{{ stageEmoji }}</div>
            <div class="morph-glow"></div>
            <div class="morph-particles">
              <span v-for="p in 6" :key="p" class="particle" :style="particleStyle(p)"></span>
            </div>
          </div>
        </transition>
        <div class="morph-info">
          <span class="morph-name">{{ petStore.name }}</span>
          <span class="morph-stage-badge" :class="currentStage">
            {{ stageLabel }}
          </span>
        </div>
      </div>

      <!-- 经验条 -->
      <div class="exp-section">
        <div class="exp-header">
          <span>成长值</span>
          <span>{{ totalMinutes }} / {{ nextStageMinutes }} 分钟</span>
        </div>
        <div class="exp-bar-wrap">
          <div class="exp-bar" :style="{ width: stageProgress + '%' }">
            <div class="exp-shimmer"></div>
          </div>
        </div>
        <div class="exp-next-hint">
          <span v-if="nextStageInfo" class="next-preview">
            → {{ nextStageInfo.emoji }} {{ nextStageInfo.label }}（还需 {{ nextStageInfo.remaining }} 分钟）
          </span>
          <span v-else class="max-hint">🌟 豆豆已经圆满了！</span>
        </div>
      </div>
    </div>

    <!-- 性格 & 特长 -->
    <div class="trait-section animate-fade-in" style="animation-delay: 0.15s">
      <div class="trait-row">
        <div class="trait-card personality">
          <span class="trait-icon">{{ personalityIcon }}</span>
          <div class="trait-info">
            <span class="trait-label">性格</span>
            <span class="trait-value">{{ personalityLabel }}</span>
          </div>
        </div>
        <div class="trait-card specialty" :class="{ locked: !specialtyUnlocked }">
          <span class="trait-icon">{{ specialtyUnlocked ? specialtyIcon : '🔒' }}</span>
          <div class="trait-info">
            <span class="trait-label">特长</span>
            <span class="trait-value">{{ specialtyUnlocked ? specialtyLabel : '开花后显现' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 成长时光线 -->
    <div class="timeline-section animate-fade-in" style="animation-delay: 0.2s">
      <h2 class="section-title">🌟 成长时光线</h2>
      <div class="timeline">
        <div
          v-for="(stage, idx) in growthStages"
          :key="stage.id"
          class="timeline-node"
          :class="{ reached: stage.reached, current: stage.current }"
        >
          <div class="node-marker">
            <div class="node-dot">
              <span v-if="stage.reached && !stage.current">✓</span>
              <span v-else-if="stage.current">{{ stage.emoji }}</span>
              <span v-else>🔒</span>
            </div>
            <div
              v-if="idx < growthStages.length - 1"
              class="node-line"
              :class="{ active: stage.reached }"
            ></div>
          </div>
          <div class="node-content">
            <div class="node-emoji">{{ stage.emoji }}</div>
            <div class="node-label">{{ stage.label }}</div>
            <div class="node-desc">{{ stage.desc }}</div>
            <div v-if="stage.reached && stage.date" class="node-date">{{ stage.date }}</div>
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
          <span class="gs-value">{{ totalWords }}</span>
          <span class="gs-label">掌握单词</span>
        </div>
        <div class="growth-stat card">
          <span class="gs-icon">⏱️</span>
          <span class="gs-value">{{ totalMinutes }}</span>
          <span class="gs-label">学习分钟</span>
        </div>
        <div class="growth-stat card">
          <span class="gs-icon">🎤</span>
          <span class="gs-value">{{ totalSentences }}</span>
          <span class="gs-label">开口次数</span>
        </div>
        <div class="growth-stat card">
          <span class="gs-icon">🔥</span>
          <span class="gs-value">{{ streakStore.currentStreak }}天</span>
          <span class="gs-label">连续打卡</span>
        </div>
      </div>
    </div>

    <!-- 成就徽章 — 动态计算 -->
    <div class="achievements-section animate-fade-in" style="animation-delay: 0.4s">
      <h2 class="section-title">🏅 成就徽章</h2>
      <div class="badges-grid">
        <div
          v-for="badge in computedBadges"
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

    <!-- 回忆卡片（仅在阶段 >= sprout 时显示） -->
    <div v-if="currentStageIdx >= 1" class="memories-section animate-fade-in" style="animation-delay: 0.5s">
      <h2 class="section-title">💌 成长回忆</h2>
      <div class="memory-cards">
        <div
          v-for="m in memories"
          :key="m.id"
          class="memory-card"
        >
          <div class="memory-stage">{{ m.emoji }} {{ m.stage }}</div>
          <p class="memory-text">{{ m.text }}</p>
          <div class="memory-date">{{ m.date }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { petStore, fetchMyPet } from '../stores/pet'
import { learningStore, fetchProgress } from '../stores/learning'
import { streakStore, fetchStreakState } from '../stores/streak'

// ============================================================
// 阶段定义（与 PRD 4.6 完全对齐）
// ============================================================
const STAGE_DEFS: Record<string, { label: string; emoji: string; desc: string; minMinutes: number; minWords: number }> = {
  seed:   { label: '一颗种子', emoji: '🌰', desc: '豆豆还是一颗小种子，安静地等待发芽...', minMinutes: 0, minWords: 0 },
  sprout: { label: '发芽了',   emoji: '🌱', desc: '小嫩芽破土而出，豆豆开始探索世界！', minMinutes: 120, minWords: 5 },
  bloom:  { label: '开花了',   emoji: '🌸', desc: '豆豆完全舒展开来，特长开始显现！', minMinutes: 600, minWords: 30 },
  fruit:  { label: '结果了',   emoji: '🌟', desc: '豆豆已经圆满，成为最棒的伙伴！', minMinutes: 1800, minWords: 100 },
}

const STAGE_ORDER = ['seed', 'sprout', 'bloom', 'fruit']

// ============================================================
// 当前阶段
// ============================================================
const currentStage = computed(() => petStore.pet?.stage || 'seed')
const currentStageIdx = computed(() => STAGE_ORDER.indexOf(currentStage.value))

const stageDef = computed(() => STAGE_DEFS[currentStage.value] || STAGE_DEFS.seed)
const stageLabel = computed(() => stageDef.value.label)
const stageEmoji = computed(() => stageDef.value.emoji)

// 阶段进度
const totalMinutes = computed(() => petStore.pet?.totalLearningMinutes || 0)
const nextStageDef = computed(() => {
  const nextIdx = currentStageIdx.value + 1
  return nextIdx < STAGE_ORDER.length ? STAGE_DEFS[STAGE_ORDER[nextIdx]] : null
})
const nextStageMinutes = computed(() => nextStageDef.value?.minMinutes || 99999)
const stageProgress = computed(() => {
  const currentMin = STAGE_DEFS[currentStage.value]?.minMinutes || 0
  const nextMin = nextStageMinutes.value
  if (nextMin <= currentMin) return 100
  return Math.min(100, Math.round(((totalMinutes.value - currentMin) / (nextMin - currentMin)) * 100))
})

const nextStageInfo = computed(() => {
  if (!nextStageDef.value || currentStage.value === 'fruit') return null
  return {
    emoji: nextStageDef.value.emoji,
    label: nextStageDef.value.label,
    remaining: nextStageDef.value.minMinutes - totalMinutes.value,
  }
})

// ============================================================
// 性格 & 特长
// ============================================================
const PERSONALITY_MAP: Record<string, { label: string; icon: string; desc: string }> = {
  outgoing: { label: '健谈外向', icon: '💬', desc: '喜欢聊天，表达丰富' },
  focused: { label: '认真专注', icon: '🎯', desc: '学习时特别专注' },
  gentle: { label: '温和安静', icon: '🌸', desc: '温柔陪伴，不急不躁' },
  curious: { label: '好奇探索', icon: '🔍', desc: '对一切充满好奇' },
  quiet: { label: '内敛深思', icon: '🌙', desc: '安静思考，深刻理解' },
}

const SPECIALTY_MAP: Record<string, { label: string; icon: string; desc: string }> = {
  memory: { label: '单词达人', icon: '🧠', desc: '记单词特别快' },
  pronounce: { label: '发音高手', icon: '🎤', desc: '发音特别标准' },
  creative: { label: '故事大王', icon: '📖', desc: '想象力特别丰富' },
  persistent: { label: '坚持之星', icon: '💪', desc: '学习特别有毅力' },
  balanced: { label: '全能伙伴', icon: '⭐', desc: '各方面均衡发展' },
}

const personalityKey = computed(() => petStore.pet?.personality || 'curious')
const personalityLabel = computed(() => PERSONALITY_MAP[personalityKey.value]?.label || '好奇探索')
const personalityIcon = computed(() => PERSONALITY_MAP[personalityKey.value]?.icon || '🔍')

const specialtyKey = computed(() => petStore.pet?.specialty || 'balanced')
const specialtyUnlocked = computed(() => currentStageIdx.value >= 2) // bloom 阶段显现
const specialtyLabel = computed(() => SPECIALTY_MAP[specialtyKey.value]?.label || '全能伙伴')
const specialtyIcon = computed(() => SPECIALTY_MAP[specialtyKey.value]?.icon || '⭐')

// ============================================================
// 成长时间线
// ============================================================
const growthStages = computed(() => {
  const ci = currentStageIdx.value
  const mins = totalMinutes.value
  const words = totalWords.value

  return STAGE_ORDER.map((id, idx) => {
    const def = STAGE_DEFS[id]
    return {
      id,
      emoji: def.emoji,
      label: def.label,
      desc: def.desc,
      reached: idx <= ci, // 阶段不可逆
      current: idx === ci,
      date: idx < ci ? getStageDate(idx) : '',
    }
  })
})

function getStageDate(idx: number): string {
  // 从进化记录中获取，暂无则用估算
  const now = new Date()
  const daysAgo = (STAGE_ORDER.length - idx) * 7
  now.setDate(now.getDate() - daysAgo)
  return `${now.getMonth() + 1}月${now.getDate()}日`
}

// ============================================================
// 成长数据
// ============================================================
const totalWords = computed(() => learningStore.progress?.summary?.totalWordsLearned || 0)
const totalSentences = computed(() => learningStore.progress?.summary?.totalSentencesSpoken || 0)

// ============================================================
// 成就徽章（动态计算）
// ============================================================
interface Badge {
  id: string; icon: string; name: string; desc: string; condition: string; unlocked: boolean
}

const computedBadges = computed<Badge[]>(() => {
  const words = totalWords.value
  const mins = totalMinutes.value
  const streak = streakStore.currentStreak
  const stage = currentStage.value

  return [
    { id: 'first_word', icon: '📝', name: '初识单词', desc: '学得真棒！', condition: '学习第一个单词', unlocked: words >= 1 },
    { id: 'word_10', icon: '📚', name: '十个单词', desc: '词汇小达人', condition: '累计学习10个单词', unlocked: words >= 10 },
    { id: 'word_50', icon: '📚📚', name: '五十单词', desc: '词汇小专家', condition: '累计学习50个单词', unlocked: words >= 50 },
    { id: 'word_100', icon: '🏆', name: '百词斩', desc: '百词成就达成！', condition: '累计学习100个单词', unlocked: words >= 100 },
    { id: 'streak_3', icon: '🔥', name: '三天连胜', desc: '坚持不懈！', condition: '连续学习3天', unlocked: streak >= 3 },
    { id: 'streak_7', icon: '🔥🔥', name: '一周连胜', desc: '习惯养成中！', condition: '连续学习7天', unlocked: streak >= 7 },
    { id: 'streak_30', icon: '💎', name: '月度之星', desc: '坚持一个月！', condition: '连续学习30天', unlocked: streak >= 30 },
    { id: 'min_100', icon: '⏱️', name: '百分钟', desc: '累积100分钟', condition: '学习满100分钟', unlocked: mins >= 100 },
    { id: 'min_600', icon: '⏱️⏱️', name: '开花时刻', desc: '进入开花阶段', condition: '学习满600分钟', unlocked: mins >= 600 },
    { id: 'min_1800', icon: '🌟', name: '圆满达成', desc: '达到结果阶段', condition: '学习满1800分钟', unlocked: mins >= 1800 },
    { id: 'stage_sprout', icon: '🌱', name: '破土而出', desc: '豆豆发芽了！', condition: '进入发芽阶段', unlocked: STAGE_ORDER.indexOf(stage) >= 1 },
    { id: 'stage_bloom', icon: '🌸', name: '绚丽绽放', desc: '豆豆开花了！', condition: '进入开花阶段', unlocked: STAGE_ORDER.indexOf(stage) >= 2 },
    { id: 'stage_fruit', icon: '🌟', name: '圆满结果', desc: '豆豆结果了！', condition: '进入结果阶段', unlocked: STAGE_ORDER.indexOf(stage) >= 3 },
  ]
})

// ============================================================
// 成长回忆卡片
// ============================================================
const memories = computed(() => {
  const result: { id: string; emoji: string; stage: string; text: string; date: string }[] = []
  const ci = currentStageIdx.value

  if (ci >= 1) {
    result.push({
      id: 'sprout',
      emoji: '🌱',
      stage: '发芽了',
      text: `那一天，${petStore.name}终于破土而出！还记得你学会第一个单词时，那颗小种子轻轻颤动了一下...`,
      date: getStageDate(1),
    })
  }
  if (ci >= 2) {
    result.push({
      id: 'bloom',
      emoji: '🌸',
      stage: '开花了',
      text: `${petStore.name}绽放了第一朵花！那时你已经掌握了${totalWords.value}个单词，${specialtyLabel.value}的特长开始闪闪发光...`,
      date: getStageDate(2),
    })
  }
  if (ci >= 3) {
    result.push({
      id: 'fruit',
      emoji: '🌟',
      stage: '结果了',
      text: `${petStore.name}终于圆满结果！${totalMinutes.value}分钟的陪伴，每一刻都值得珍藏。这是属于你们的奇迹...`,
      date: getStageDate(3),
    })
  }

  return result
})

// ============================================================
// 粒子效果
// ============================================================
function particleStyle(i: number) {
  return {
    '--delay': i * 0.5 + 's',
    '--x': (Math.sin(i * 1.7) * 40) + 'px',
    '--y': (Math.cos(i * 2.3) * 40) + 'px',
  } as any
}

onMounted(() => {
  fetchMyPet()
  fetchProgress()
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
  color: #8c8c8c;
  font-size: 13px;
  margin-top: 4px;
}

/* 形态展示 — 四阶段不同风格 */
.morph-card {
  margin-bottom: 16px;
  text-align: center;
  padding: 28px 20px;
  transition: background 0.6s ease;
}

.morph-card.stage-seed { background: linear-gradient(135deg, #fef9e7, #fdebd0); }
.morph-card.stage-sprout { background: linear-gradient(135deg, #e8f8e8, #d4f0d4); }
.morph-card.stage-bloom { background: linear-gradient(135deg, #fce4ec, #f8bbd0); }
.morph-card.stage-fruit { background: linear-gradient(135deg, #fff8e1, #ffecb3); }

.morph-display { margin-bottom: 24px; }

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
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.morph-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 120px; height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.2), transparent 70%);
}

.morph-particles {
  position: absolute;
  inset: -20px;
  pointer-events: none;
}

.particle {
  position: absolute;
  top: 50%; left: 50%;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(255, 215, 0, 0.6);
  animation: particle-float 3s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes particle-float {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0; }
  50% { transform: translate(var(--x), var(--y)) scale(1.5); opacity: 1; }
}

.morph-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}

.morph-name { font-size: 20px; font-weight: 700; color: #3d3929; }

.morph-stage-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.morph-stage-badge.seed { background: #fdebd0; color: #8b6914; }
.morph-stage-badge.sprout { background: #c8e6c9; color: #2e7d32; }
.morph-stage-badge.bloom { background: #f8bbd0; color: #c62828; }
.morph-stage-badge.fruit { background: linear-gradient(135deg, #ffd54f, #ff8f00); color: #fff; }

/* 经验条 */
.exp-section { text-align: left; }
.exp-header { display: flex; justify-content: space-between; font-size: 13px; color: #8c8c8c; margin-bottom: 6px; }
.exp-bar-wrap { height: 10px; background: rgba(255,255,255,0.6); border-radius: 5px; overflow: hidden; margin-bottom: 8px; }
.exp-bar { height: 100%; background: linear-gradient(90deg, #00b894, #6c5ce7); border-radius: 5px; transition: width 0.5s ease; position: relative; overflow: hidden; }
.exp-shimmer { position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: shimmer 2s infinite; }
@keyframes shimmer { 0% { left: -50%; } 100% { left: 150%; } }
.exp-next-hint { font-size: 12px; color: #8c8c8c; text-align: center; }
.next-preview { color: #6c5ce7; font-weight: 500; }
.max-hint { color: #ff8f00; font-weight: 600; }

/* 性格 & 特长 */
.trait-section { margin-bottom: 20px; }
.trait-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.trait-card { background: #fff; border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.trait-card.locked { opacity: 0.5; }
.trait-icon { font-size: 28px; }
.trait-info { display: flex; flex-direction: column; gap: 2px; }
.trait-label { font-size: 11px; color: #8c8c8c; }
.trait-value { font-size: 14px; font-weight: 600; color: #3d3929; }
.trait-card.personality { border-left: 3px solid #6c5ce7; }
.trait-card.specialty { border-left: 3px solid #ff8f00; }

/* 时间线 */
.timeline-section { margin-bottom: 24px; }
.section-title { font-size: 17px; font-weight: 700; margin-bottom: 16px; color: #3d3929; }
.timeline { display: flex; flex-direction: column; }
.timeline-node { display: flex; gap: 16px; min-height: 80px; }
.node-marker { display: flex; flex-direction: column; align-items: center; width: 32px; flex-shrink: 0; }
.node-dot { width: 32px; height: 32px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; transition: all 0.3s; }
.timeline-node.reached .node-dot { background: #e6fff8; border: 2px solid #00b894; color: #00b894; }
.timeline-node.current .node-dot { background: #00b894; border: 2px solid #00b894; color: #fff; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(0,184,148,0.4); } 50% { box-shadow: 0 0 0 12px rgba(0,184,148,0); } }
.node-line { width: 2px; flex: 1; min-height: 24px; background: #eee; transition: background 0.3s; }
.node-line.active { background: #00b894; }
.node-content { padding-bottom: 20px; flex: 1; }
.node-emoji { font-size: 20px; margin-bottom: 4px; }
.node-label { font-size: 15px; font-weight: 600; color: #3d3929; margin-bottom: 2px; }
.node-desc { font-size: 12px; color: #8c8c8c; line-height: 1.5; }
.node-date { font-size: 11px; color: #00b894; margin-top: 4px; font-weight: 500; }
.node-progress { font-size: 11px; color: #6c5ce7; margin-top: 4px; font-weight: 600; animation: pulse 2s ease-in-out infinite; }

/* 形态切换动画 */
.morph-switch-enter-active, .morph-switch-leave-active { transition: all 0.6s ease; }
.morph-switch-enter-from { opacity: 0; transform: scale(0.3) rotate(-20deg); }
.morph-switch-leave-to { opacity: 0; transform: scale(1.5) rotate(20deg); }

/* 数据 */
.stats-section { margin-bottom: 24px; }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.growth-stat { text-align: center; padding: 20px 12px; }
.gs-icon { font-size: 28px; display: block; margin-bottom: 6px; }
.gs-value { font-size: 20px; font-weight: 700; color: #6c5ce7; display: block; }
.gs-label { font-size: 12px; color: #8c8c8c; margin-top: 2px; }

/* 徽章 */
.achievements-section { margin-bottom: 24px; }
.badges-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.badge-item { text-align: center; padding: 12px 6px; background: white; border-radius: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s; }
.badge-item.unlocked:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(108,92,231,0.15); }
.badge-icon-wrap { width: 48px; height: 48px; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; transition: all 0.3s; }
.badge-icon-wrap.locked { background: #f0f0f0; opacity: 0.5; }
.badge-item.unlocked .badge-icon-wrap { background: linear-gradient(135deg, #fff9e6, #ffe0f0); box-shadow: 0 2px 10px rgba(253,203,110,0.3); }
.badge-icon { font-size: 24px; }
.badge-name { font-size: 12px; font-weight: 600; color: #3d3929; margin-bottom: 2px; }
.badge-cond { font-size: 10px; color: #8c8c8c; line-height: 1.3; }
.badge-item.unlocked .badge-cond { color: #00b894; }

/* 回忆卡片 */
.memories-section { margin-bottom: 24px; }
.memory-cards { display: flex; flex-direction: column; gap: 12px; }
.memory-card { background: linear-gradient(135deg, #fef9e7, #fdf2e0); border-radius: 16px; padding: 18px; border-left: 4px solid #c9a96e; }
.memory-stage { font-size: 14px; font-weight: 600; color: #8c7040; margin-bottom: 8px; }
.memory-text { font-size: 13px; color: #5c4a2e; line-height: 1.7; margin: 0; }
.memory-date { font-size: 11px; color: #b7955b; margin-top: 8px; text-align: right; }
</style>
