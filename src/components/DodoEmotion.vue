<template>
  <div class="dodo-emotion" :class="animationClass">
    <!-- 豆豆主体 -->
    <div class="dodo-body" :style="bodyStyle">
      <div class="dodo-face">
        <span class="dodo-expression">{{ emotionStore.response?.expression || '😊' }}</span>
      </div>
      <!-- 情感维度指示器 -->
      <div v-if="showIndicators" class="dodo-indicators">
        <div
          class="indicator pleasure"
          :style="{ width: emotionStore.emotion.pleasure * 100 + '%' }"
          title="愉悦度"
        ></div>
        <div
          class="indicator arousal"
          :style="{ width: emotionStore.emotion.arousal * 100 + '%' }"
          title="唤醒度"
        ></div>
      </div>
      <!-- 梯度标识 -->
      <div v-if="emotionStore.gradient" class="dodo-gradient-badge">
        {{ emotionStore.gradient.emoji }}
      </div>
    </div>

    <!-- 气泡 -->
    <transition name="bubble">
      <div
        v-if="emotionStore.bubbleVisible && emotionStore.response?.bubbleText"
        class="dodo-bubble"
      >
        <div class="bubble-content">{{ emotionStore.response.bubbleText }}</div>
        <div class="bubble-tail"></div>
      </div>
    </transition>

    <!-- 心情标签 -->
    <div v-if="emotionStore.response" class="dodo-mood-label">
      {{ emotionStore.response.moodLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { emotionStore, pleasureColor, arousalScale } from '../stores/emotion'

defineProps<{
  showIndicators?: boolean
  size?: 'small' | 'medium' | 'large'
}>()

const animationClass = computed(() => {
  const anim = emotionStore.response?.animation || 'idle'
  return `anim-${anim}`
})

const bodyStyle = computed(() => {
  const color = pleasureColor(emotionStore.emotion.pleasure)
  const scale = arousalScale(emotionStore.emotion.arousal)
  return {
    transform: `scale(${scale})`,
    background: `radial-gradient(circle at 40% 30%, ${color}44, transparent 70%)`,
  }
})
</script>

<style scoped>
.dodo-emotion {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

/* 豆豆主体 */
.dodo-body {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background: radial-gradient(circle at 40% 30%, rgba(253, 203, 110, 0.27), transparent 70%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.3s ease,
    background 0.5s ease;
}

.dodo-face {
  position: relative;
  z-index: 1;
}

.dodo-expression {
  font-size: 36px;
  line-height: 1;
  transition: all 0.3s ease;
}

/* 情感维度指示器 */
.dodo-indicators {
  position: absolute;
  bottom: 4px;
  left: 10%;
  right: 10%;
  display: flex;
  gap: 2px;
  opacity: 0.6;
}

.indicator {
  height: 3px;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.indicator.pleasure {
  background: #fdcb6e;
}

.indicator.arousal {
  background: #a29bfe;
}

/* 梯度徽章 */
.dodo-gradient-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 18px;
  line-height: 1;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.15));
}

/* 气泡 */
.dodo-bubble {
  position: relative;
  max-width: 200px;
  animation: bubbleFloat 0.3s ease;
}

.bubble-content {
  background: white;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-on-light);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.bubble-tail {
  width: 10px;
  height: 10px;
  background: white;
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

/* 气泡过渡 */
.bubble-enter-active {
  transition: all 0.3s ease;
}

.bubble-leave-active {
  transition: all 0.2s ease;
}

.bubble-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.bubble-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* 心情标签 */
.dodo-mood-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

/* 动画 */
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes sway {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

@keyframes focus {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes cuddle {
  0%,
  100% {
    transform: scale(1) rotate(0);
  }
  25% {
    transform: scale(1.05) rotate(-3deg);
  }
  75% {
    transform: scale(1.05) rotate(3deg);
  }
}

.anim-bounce .dodo-body {
  animation: bounce 0.6s ease infinite;
}

.anim-sway .dodo-body {
  animation: sway 1.2s ease infinite;
}

.anim-focus .dodo-body {
  animation: focus 1s ease infinite;
}

.anim-cuddle .dodo-body {
  animation: cuddle 1.5s ease infinite;
}

.anim-idle .dodo-body {
  animation: sway 2s ease infinite;
}
</style>
