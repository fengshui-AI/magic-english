<template>
  <div class="onboarding">
    <!-- 背景装饰 -->
    <div class="bg-stars">
      <span v-for="i in 20" :key="i" class="star" :style="starStyle(i)">✨</span>
    </div>

    <!-- 步骤 0: 欢迎页 — 豆豆首次亮相 -->
    <transition name="slide" mode="out-in">
      <div v-if="step === 0" key="welcome" class="step welcome-step">
        <div class="dodo-intro">
          <div class="dodo-avatar-wrap">
            <div class="dodo-avatar animate-bounce">🥚</div>
            <div class="dodo-glow"></div>
          </div>
          <div class="dodo-speech">
            <p class="speech-text">嗨！我是你的豆语星球伙伴！</p>
            <p class="speech-sub">我会陪你一起学英语，一起成长 🪄</p>
          </div>
        </div>
        <div class="step-actions">
          <button class="btn btn-primary btn-lg" @click="nextStep">开始豆语之旅 ✨</button>
          <p class="skip-hint" @click="skipOnboarding">已有账号？直接登录 →</p>
        </div>
      </div>

      <!-- 步骤 1: 年级选择 -->
      <div v-else-if="step === 1" key="grade" class="step">
        <h2 class="step-title">你上几年级了？</h2>
        <p class="step-desc">我会根据你的年级推荐合适的学习内容</p>
        <div class="grade-grid">
          <button
            v-for="g in 6"
            :key="g"
            class="grade-option"
            :class="{ selected: form.grade === g }"
            @click="form.grade = g"
          >
            <span class="grade-num">{{ g }}</span>
            <span class="grade-label">年级</span>
          </button>
        </div>
        <div class="step-actions">
          <button class="btn btn-secondary" @click="prevStep">← 上一步</button>
          <button class="btn btn-primary" :disabled="!form.grade" @click="nextStep">
            下一步 →
          </button>
        </div>
      </div>

      <!-- 步骤 2: 兴趣标签选择 -->
      <div v-else-if="step === 2" key="interest" class="step">
        <h2 class="step-title">你喜欢什么？</h2>
        <p class="step-desc">
          选 3 个你感兴趣的主题，学习更有趣！（已选 {{ form.interests.length }}/3）
        </p>
        <div class="interest-grid">
          <button
            v-for="item in interests"
            :key="item.id"
            class="interest-option"
            :class="{ selected: form.interests.includes(item.id) }"
            :disabled="!form.interests.includes(item.id) && form.interests.length >= 3"
            @click="toggleInterest(item.id)"
          >
            <span class="interest-icon">{{ item.icon }}</span>
            <span class="interest-name">{{ item.name }}</span>
            <span v-if="form.interests.includes(item.id)" class="check-mark">✓</span>
          </button>
        </div>
        <div class="step-actions">
          <button class="btn btn-secondary" @click="prevStep">← 上一步</button>
          <button class="btn btn-primary" :disabled="form.interests.length < 3" @click="nextStep">
            下一步 →
          </button>
        </div>
      </div>

      <!-- 步骤 3: 豆豆命名 -->
      <div v-else-if="step === 3" key="naming" class="step">
        <h2 class="step-title">给你的伙伴起个名字吧！</h2>
        <p class="step-desc">一个好听的名字，让豆豆成为你的专属伙伴</p>
        <div class="naming-area">
          <div class="dodo-preview" :class="{ named: form.petName }">
            <span class="dodo-egg">🥚</span>
            <div v-if="form.petName" class="name-tag">
              {{ form.petName }}
            </div>
          </div>
          <div class="input-wrap">
            <input
              v-model="form.petName"
              type="text"
              class="name-input"
              placeholder="给豆豆起个名字..."
              maxlength="8"
              @keyup.enter="form.petName && nextStep()"
            />
            <span class="char-count">{{ form.petName.length }}/8</span>
          </div>
          <div class="name-suggestions">
            <span class="suggest-label">试试这些：</span>
            <button
              v-for="name in suggestedNames"
              :key="name"
              class="suggest-chip"
              @click="form.petName = name"
            >
              {{ name }}
            </button>
          </div>
        </div>
        <div class="step-actions">
          <button class="btn btn-secondary" @click="prevStep">← 上一步</button>
          <button
            class="btn btn-primary"
            :disabled="!form.petName.trim()"
            :class="{ loading: submitting }"
            @click="completeOnboarding"
          >
            {{ submitting ? '正在召唤魔法...' : '确认，出发！🚀' }}
          </button>
        </div>
      </div>

      <!-- 步骤 4: 入学完成 -->
      <div v-else-if="step === 4" key="done" class="step done-step">
        <div class="done-animation">
          <div class="sparkles">
            <span v-for="i in 8" :key="i" class="sparkle" :style="sparkleStyle(i)">✨</span>
          </div>
          <div class="dodo-hatched animate-bounce">
            <span class="hatch-emoji">🐣</span>
          </div>
        </div>
        <h2 class="done-title">欢迎 {{ form.petName }} 加入！</h2>
        <p class="done-sub">
          {{ form.petName }} 是你的专属英语学习伙伴<br />
          每天坚持学习，一起进化成长吧！
        </p>
        <div class="done-info">
          <div class="info-chip"><span>📚</span> {{ gradeLabel }}</div>
          <div class="info-chip"><span>🎯</span> {{ interestLabels }}</div>
        </div>
        <button class="btn btn-primary btn-lg" @click="goHome">进入魔法花园 🌸</button>
      </div>
    </transition>

    <!-- 进度指示器 -->
    <div v-if="step < 4" class="step-dots">
      <span
        v-for="i in 4"
        :key="i"
        class="dot"
        :class="{ active: step + 1 >= i, done: step + 1 > i }"
      ></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authStore } from '../stores/auth'
import { createPet } from '../stores/pet'
import { userApi } from '../api/user'
import { profileApi } from '../api/profile'

const router = useRouter()
const step = ref(0)
const submitting = ref(false)

const form = reactive({
  grade: 0,
  interests: [] as string[],
  petName: '',
})

const interests = [
  { id: 'animals', name: '动物', icon: '🐱' },
  { id: 'food', name: '美食', icon: '🍕' },
  { id: 'sports', name: '运动', icon: '⚽' },
  { id: 'music', name: '音乐', icon: '🎵' },
  { id: 'space', name: '太空', icon: '🚀' },
  { id: 'nature', name: '自然', icon: '🌿' },
  { id: 'games', name: '游戏', icon: '🎮' },
  { id: 'art', name: '绘画', icon: '🎨' },
  { id: 'travel', name: '旅行', icon: '✈️' },
  { id: 'ocean', name: '海洋', icon: '🌊' },
]

const suggestedNames = ['小魔法', '闪电', '彩虹', '星星', '布丁', '棉花糖', '果冻', '小太阳']

const gradeLabel = computed(() => (form.grade ? `${form.grade}年级` : ''))
const interestLabels = computed(() =>
  form.interests
    .map((id) => interests.find((i) => i.id === id)?.name)
    .filter(Boolean)
    .join('、'),
)

function starStyle(i: number) {
  const x = (i * 137 + 50) % 100
  const y = (i * 89 + 30) % 80
  const delay = ((i * 0.7) % 3).toFixed(1)
  const size = 10 + (i % 3) * 4
  return {
    left: `${x}%`,
    top: `${y}%`,
    animationDelay: `${delay}s`,
    fontSize: `${size}px`,
    opacity: 0.2 + (i % 5) * 0.1,
  }
}

function sparkleStyle(i: number) {
  const angle = (i / 8) * 360
  const radius = 80
  const x = 50 + Math.cos((angle * Math.PI) / 180) * radius
  const y = 50 + Math.sin((angle * Math.PI) / 180) * radius
  const delay = (i * 0.15).toFixed(1)
  return {
    left: `${x}%`,
    top: `${y}%`,
    animationDelay: `${delay}s`,
  }
}

function toggleInterest(id: string) {
  const idx = form.interests.indexOf(id)
  if (idx >= 0) {
    form.interests.splice(idx, 1)
  } else if (form.interests.length < 3) {
    form.interests.push(id)
  }
}

function nextStep() {
  if (step.value < 3) step.value++
}

function prevStep() {
  if (step.value > 1) step.value--
}

function skipOnboarding() {
  router.push('/login')
}

async function completeOnboarding() {
  if (submitting.value) return
  submitting.value = true

  try {
    // 保存用户信息
    if (authStore.user) {
      await userApi
        .update(authStore.user.id, {
          grade: form.grade,
        })
        .catch(() => {})
    }

    // 保存兴趣标签到画像
    if (form.interests.length > 0) {
      await profileApi.saveInterests(form.interests).catch(() => {})
    }

    // 创建豆豆
    await createPet({
      name: form.petName.trim(),
      birthPlace: 'magic_garden',
      personality: form.interests[0] || 'animals',
      specialty: form.interests[1] || 'nature',
    }).catch(() => {
      // 创建失败不阻塞流程
    })

    step.value = 4
    // 3 秒后自动跳转
    setTimeout(goHome, 3000)
  } catch {
    // 即使失败也完成流程
    step.value = 4
  } finally {
    submitting.value = false
  }
}

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.onboarding {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #1a0a3e 0%, #2d1b69 30%, #4a3db3 60%, #6c5ce7 100%);
}

/* 背景星星 */
.bg-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.star {
  position: absolute;
  animation: twinkle 2s ease-in-out infinite;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.3);
  }
}

/* 步骤容器 */
.step {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.step-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}

.step-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32px;
}

/* 欢迎页 */
.welcome-step {
  gap: 40px;
}

.dodo-intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.dodo-avatar-wrap {
  position: relative;
}

.dodo-avatar {
  font-size: 80px;
  line-height: 1;
  position: relative;
  z-index: 1;
}

.dodo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(253, 203, 110, 0.4), transparent 70%);
  animation: pulse 2s ease-in-out infinite;
}

.animate-bounce {
  animation: bounce 1.5s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
}

.dodo-speech {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.speech-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.speech-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

/* 操作按钮 */
.step-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  justify-content: center;
}

.btn-lg {
  padding: 16px 40px;
  font-size: 17px;
  border-radius: 50px;
  background: linear-gradient(135deg, #fdcb6e, #f39c12);
  color: #2d1b69;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(253, 203, 110, 0.4);
}

.btn-lg:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(253, 203, 110, 0.5);
}

.btn-primary {
  padding: 14px 32px;
  font-size: 15px;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.btn-primary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 14px 24px;
  font-size: 14px;
  border-radius: 50px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.skip-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  margin-top: 16px;
  cursor: pointer;
  transition: color 0.2s;
}

.skip-hint:hover {
  color: rgba(255, 255, 255, 0.7);
}

.loading {
  opacity: 0.7;
}

/* 年级选择 */
.grade-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 32px;
}

.grade-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 16px;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
}

.grade-option:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.15);
}

.grade-option.selected {
  border-color: #fdcb6e;
  background: rgba(253, 203, 110, 0.15);
  box-shadow: 0 0 20px rgba(253, 203, 110, 0.2);
}

.grade-num {
  font-size: 28px;
  font-weight: 700;
  color: white;
}

.grade-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.grade-option.selected .grade-label {
  color: #fdcb6e;
}

/* 兴趣选择 */
.interest-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  margin-bottom: 32px;
}

.interest-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.interest-option:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.12);
}

.interest-option:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.interest-option.selected {
  border-color: #fdcb6e;
  background: rgba(253, 203, 110, 0.12);
}

.interest-icon {
  font-size: 24px;
}

.interest-name {
  font-size: 15px;
  font-weight: 500;
  color: white;
}

.check-mark {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fdcb6e;
  color: #2d1b69;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 命名 */
.naming-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
}

.dodo-preview {
  font-size: 60px;
  line-height: 1;
  position: relative;
  transition: all 0.5s;
}

.dodo-preview.named .dodo-egg {
  animation: wiggle 0.5s ease-in-out;
}

@keyframes wiggle {
  0%,
  100% {
    transform: rotate(0);
  }
  25% {
    transform: rotate(-10deg);
  }
  75% {
    transform: rotate(10deg);
  }
}

.name-tag {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 4px 14px;
  border-radius: 20px;
  color: #fdcb6e;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.input-wrap {
  position: relative;
  width: 100%;
}

.name-input {
  width: 100%;
  padding: 14px 50px 14px 20px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
}

.name-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.name-input:focus {
  border-color: #fdcb6e;
  background: rgba(255, 255, 255, 0.15);
}

.char-count {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.name-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.suggest-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.suggest-chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggest-chip:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
}

/* 完成页 */
.done-step {
  gap: 24px;
}

.done-animation {
  position: relative;
  width: 160px;
  height: 160px;
}

.sparkles {
  position: absolute;
  inset: 0;
}

.sparkle {
  position: absolute;
  font-size: 16px;
  animation: sparkleBurst 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes sparkleBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
}

.dodo-hatched {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hatch-emoji {
  font-size: 70px;
}

.done-title {
  font-size: 26px;
  font-weight: 700;
  color: white;
}

.done-sub {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

.done-info {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.info-chip {
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 进度点 */
.step-dots {
  position: fixed;
  bottom: 40px;
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
}

.dot.active {
  background: rgba(255, 255, 255, 0.6);
  transform: scale(1.3);
}

.dot.done {
  background: #fdcb6e;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}
</style>
