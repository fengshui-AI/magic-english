<template>
  <div class="page login-page">
    <!-- 背景渐变层 -->
    <div class="bg-gradient"></div>
    <!-- 底部草绿光晕 -->
    <div class="grass-glow"></div>
    <!-- 动画星光粒子 -->
    <div class="star-field">
      <svg
        v-for="i in starCount"
        :key="i"
        class="star-svg"
        :style="starPos(i)"
        viewBox="0 0 20 20"
      >
        <path
          d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z"
          fill="#f0d060"
          :opacity="0.3 + (i % 3) * 0.15"
        />
      </svg>
    </div>

    <!-- 家长入口 -->
    <button class="parent-dot" @click="showParent = true" title="家长入口">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="3" stroke="#b2bec3" stroke-width="1.5"/>
        <circle cx="17" cy="9" r="2.5" stroke="#b2bec3" stroke-width="1.5"/>
        <path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" stroke="#b2bec3" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M14 20c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5" stroke="#b2bec3" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- 主内容 -->
    <div class="main-content">
      <!-- 豆豆角色 -->
      <div class="dodo-stage">
        <div class="dodo-wrap" @click="triggerDodoInteract">
          <div class="dodo-glow"></div>
          <img
            src="/assets/login/dodo-character.png"
            class="dodo-img"
            alt="豆豆"
            :class="{ 'dodo-breathe': !dodoInteract }"
          />
        </div>

        <!-- 对话气泡 -->
        <div class="speech-bubble">
          <span>你终于来啦，我们一起去星球玩吧</span>
          <div class="bubble-tail"></div>
        </div>
      </div>

      <!-- 品牌 -->
      <div class="brand">
        <h1 class="brand-name">豆语星球</h1>
        <p class="brand-tagline">和豆豆一起，每天发现一点点英语魔法</p>
      </div>

      <!-- 主按钮 -->
      <button class="main-cta" @click="enterAsGuest">
        <span class="cta-label">去见豆豆</span>
      </button>
      <p class="cta-hint">不用注册，先体验</p>

      <!-- 次级按钮 -->
      <button class="secondary-btn" @click="showForm = !showForm">
        {{ showForm ? '收起' : '登录注册' }}
      </button>

      <!-- 表单区域 -->
      <transition name="form-slide">
        <div v-if="showForm" class="form-area">
          <div class="auth-switch">
            <button :class="{ on: mode === 'login' }" @click="mode = 'login'">登录</button>
            <button :class="{ on: mode === 'register' }" @click="mode = 'register'">注册</button>
          </div>

          <form class="auth-form" @submit.prevent="handleSubmit">
            <div v-if="mode === 'register'" class="field">
              <input v-model="form.name" type="text" placeholder="给豆豆起个名字" required minlength="1" maxlength="20" />
            </div>
            <div class="field">
              <input v-model="form.phone" type="tel" placeholder="爸爸妈妈的手机号" required minlength="11" maxlength="20" />
            </div>
            <div class="field">
              <input v-model="form.password" type="password" placeholder="设置密码（至少6位）" required minlength="6" maxlength="50" />
            </div>
            <template v-if="mode === 'register'">
              <div class="field">
                <div class="grade-row">
                  <button v-for="g in 6" :key="g" type="button" class="grade-chip" :class="{ on: form.grade === g }" @click="form.grade = g">
                    {{ g }}年级
                  </button>
                </div>
              </div>
            </template>
            <div v-if="errorMsg" class="error-toast">
              <span>{{ errorMsg }}</span>
              <button type="button" class="retry" @click="handleSubmit">重试</button>
            </div>
            <div v-if="mode === 'register'" class="agree-row">
              <label>
                <input type="checkbox" v-model="agreed" />
                <span>同意 <router-link to="/terms" target="_blank">用户协议</router-link> · <router-link to="/privacy" target="_blank">隐私政策</router-link>，且已获得监护人同意</span>
              </label>
            </div>
            <button class="auth-btn" :disabled="loading || (mode === 'register' && !agreed)" type="submit">
              {{ loading ? '稍等...' : mode === 'login' ? '登录' : '注册' }}
            </button>
          </form>
        </div>
      </transition>
    </div>

    <!-- 家长弹窗 -->
    <transition name="fade">
      <div v-if="showParent" class="modal-bg" @click.self="showParent = false">
        <div class="modal-box">
          <button class="modal-x" @click="showParent = false">✕</button>
          <h2>家长中心</h2>
          <p class="modal-hint">查看学习报告和设置</p>
          <form @submit.prevent="handleParentLogin">
            <div class="field">
              <input v-model="parentForm.phone" type="tel" placeholder="手机号" required />
            </div>
            <div class="field">
              <input v-model="parentForm.password" type="password" placeholder="密码" required />
            </div>
            <div v-if="parentError" class="error-toast"><span>{{ parentError }}</span></div>
            <button class="auth-btn" :disabled="parentLoading" type="submit">
              {{ parentLoading ? '...' : '登录' }}
            </button>
          </form>
          <p class="modal-foot">家长账号由管理员创建</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { register, login } from '../stores/auth'

const router = useRouter()
const mode = ref<'login' | 'register'>('register')
const loading = ref(false)
const errorMsg = ref('')
const agreed = ref(false)
const showParent = ref(false)
const showForm = ref(false)

// 豆豆互动
const dodoInteract = ref(false)
let interactTimer: ReturnType<typeof setTimeout> | null = null
function triggerDodoInteract() {
  dodoInteract.value = true
  if (interactTimer) clearTimeout(interactTimer)
  interactTimer = setTimeout(() => { dodoInteract.value = false }, 1500)
}

const form = reactive({ name: '', phone: '', password: '', grade: 3 })
const parentForm = reactive({ phone: '', password: '' })
const parentLoading = ref(false)
const parentError = ref('')

const isLowEnd = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 2
const starCount = computed(() => isLowEnd ? 10 : 22)

function friendlyErr(msg: string): string {
  if (msg.includes('Phone already registered') || msg.includes('already registered') || msg.includes('已注册')) return '这个手机号注册过啦，直接登录吧～'
  if (msg.includes('Invalid password') || msg.includes('password')) return '密码不对哦，再试试～'
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed') || msg.includes('Failed to fetch')) return '网络有点慢，稍后再试～'
  if (msg.includes('phone') || msg.includes('手机')) return '手机号好像不太对，再看看？'
  if (msg.includes('User not found') || msg.includes('not found')) return '这个手机号还没注册哦～'
  return '出了点小问题，再试一次～'
}

async function handleSubmit() {
  errorMsg.value = ''
  loading.value = true
  try {
    if (mode.value === 'register') {
      if (!agreed.value) { errorMsg.value = '请先同意协议哦～'; loading.value = false; return }
      const ageSegment: 'low' | 'mid' | 'high' =
        form.grade <= 2 ? 'low' : form.grade <= 4 ? 'mid' : 'high'
      await register({
        name: form.name,
        phone: form.phone,
        password: form.password,
        grade: form.grade,
        ageSegment,
        role: 'child',
      })
    } else {
      await login({ phone: form.phone, password: form.password })
    }
    router.push({ name: 'home' })
  } catch (e: any) {
    errorMsg.value = friendlyErr(e.message || '操作失败')
  } finally { loading.value = false }
}

async function handleParentLogin() {
  parentError.value = ''
  parentLoading.value = true
  try {
    await login({ phone: parentForm.phone, password: parentForm.password })
    router.push({ name: 'parent-dashboard' })
    showParent.value = false
  } catch (e: any) {
    parentError.value = friendlyErr(e.message || '登录失败')
  } finally { parentLoading.value = false }
}

async function enterAsGuest() {
  errorMsg.value = ''
  loading.value = true
  try {
    const guestId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
    const guestPassword = 'guest_' + Math.random().toString(36).slice(2, 10)
    await register({ name: guestId, password: guestPassword, role: 'child', grade: 3, ageSegment: 'mid' })
    router.push({ name: 'onboarding' })
  } catch (e: any) {
    errorMsg.value = friendlyErr(e.message || '游客注册失败')
  } finally { loading.value = false }
}

function starPos(i: number) {
  return {
    left: `${(i * 17 + 3) % 100}%`,
    top: `${(i * 23 + 7) % 100}%`,
    animationDelay: `${i * 0.5}s`,
    width: `${10 + (i % 5) * 5}px`,
    height: `${10 + (i % 5) * 5}px`,
  }
}
</script>

<style scoped>
/* ===== 页面背景：水彩柔绒渐变 ===== */
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 16px 32px;
  position: relative;
  overflow-x: hidden;
}

.bg-gradient {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(255, 248, 225, 0.9) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 60%, rgba(255, 235, 180, 0.4) 0%, transparent 50%),
    linear-gradient(180deg,
      #fefcf3 0%,
      #fdf6e3 25%,
      #faf0c8 45%,
      #f0ecc0 60%,
      #e8f5e9 78%,
      #dcedc8 92%,
      #c8e6c9 100%
    );
}

/* 底部草绿光晕 */
.grass-glow {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 35vh;
  background:
    radial-gradient(ellipse at 50% 100%, rgba(168, 213, 162, 0.4) 0%, transparent 70%),
    radial-gradient(ellipse at 30% 90%, rgba(200, 230, 201, 0.3) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 95%, rgba(220, 237, 200, 0.3) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

/* ===== 星光粒子（SVG 星形 + 发光） ===== */
.star-field {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.star-svg {
  position: absolute;
  filter: drop-shadow(0 0 6px rgba(240, 208, 96, 0.5)) drop-shadow(0 0 12px rgba(255, 235, 150, 0.2));
  animation: starTwinkle 3.5s ease-in-out infinite;
}
@keyframes starTwinkle {
  0%, 100% { opacity: 0.2; transform: scale(1) rotate(0deg); }
  50% { opacity: 0.7; transform: scale(1.3) rotate(15deg); }
}

/* 家长入口 */
.parent-dot {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.45);
  cursor: pointer;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  transition: all 0.3s;
}
.parent-dot:hover { background: rgba(255,255,255,0.8); }

/* ===== 主内容 ===== */
.main-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
}

/* ===== 豆豆角色 ===== */
.dodo-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 4px;
}
.dodo-wrap {
  position: relative;
  display: inline-block;
  cursor: pointer;
  transition: transform 0.3s ease;
}
.dodo-wrap:active { transform: scale(0.97); }

/* 浅草绿柔光 */
.dodo-glow {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(168, 213, 162, 0.3) 0%, rgba(255, 235, 150, 0.1) 40%, transparent 70%);
  animation: glowPulse 3s ease-in-out infinite;
  pointer-events: none;
}
@keyframes glowPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.85; }
}

/* 豆豆图片 - 用 multiply 混合模式让白色背景透明 */
.dodo-img {
  position: relative;
  z-index: 1;
  width: 220px;
  height: auto;
  mix-blend-mode: multiply;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.08));
  transition: transform 0.3s;
}
.dodo-breathe {
  animation: dodoBreathe 4s ease-in-out infinite;
}
@keyframes dodoBreathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.02); }
}

/* 对话气泡 */
.speech-bubble {
  position: relative;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 22px;
  padding: 12px 24px;
  margin-top: 4px;
  box-shadow:
    0 3px 16px rgba(0,0,0,0.05),
    0 0 0 1px rgba(255,255,255,0.6);
  text-align: center;
  max-width: 290px;
  backdrop-filter: blur(4px);
}
.speech-bubble span {
  font-size: 15px;
  color: #5d4e37;
  font-weight: 500;
  line-height: 1.5;
}
.bubble-tail {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid rgba(255, 255, 255, 0.88);
  filter: drop-shadow(0 -1px 0 rgba(255,255,255,0.5));
}

/* ===== 品牌 ===== */
.brand {
  text-align: center;
  margin: 14px 0 18px;
}
.brand-name {
  font-size: 30px;
  font-weight: 800;
  color: #5d4e37;
  margin: 0;
  letter-spacing: 3px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.brand-tagline {
  font-size: 14px;
  color: #8b7d6b;
  margin: 6px 0 0;
}

/* ===== 主按钮：暖奶油黄柔光胶囊 ===== */
.main-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 320px;
  padding: 20px 32px;
  border: none;
  border-radius: 48px;
  background: linear-gradient(135deg,
    #fde8a0 0%,
    #f5d070 35%,
    #f0c850 65%,
    #e8b840 100%);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow:
    0 6px 24px rgba(240, 200, 80, 0.4),
    0 2px 8px rgba(200, 160, 50, 0.15),
    inset 0 2px 6px rgba(255, 255, 255, 0.5),
    inset 0 -2px 6px rgba(200, 160, 50, 0.12);
  animation: ctaBreathe 3s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}
/* 顶部高光 */
.main-cta::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 12%;
  right: 12%;
  height: 38%;
  background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 70%, transparent 100%);
  border-radius: 48px 48px 0 0;
  pointer-events: none;
}
/* 毛绒质感纹理 */
.main-cta::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
  opacity: 0.06;
  mix-blend-mode: multiply;
  border-radius: 48px;
  pointer-events: none;
}
.main-cta:hover {
  box-shadow:
    0 8px 32px rgba(240, 200, 80, 0.5),
    0 0 0 4px rgba(240, 200, 80, 0.15),
    inset 0 2px 6px rgba(255, 255, 255, 0.5);
}
.main-cta:active {
  transform: scale(0.96);
  animation: none;
}
@keyframes ctaBreathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
.cta-label {
  font-size: 26px;
  font-weight: 800;
  color: #5d4e37;
  letter-spacing: 4px;
  position: relative;
  z-index: 1;
}
.cta-hint {
  font-size: 13px;
  color: #a09585;
  margin: 10px 0 16px;
  text-align: center;
}

/* ===== 次级按钮 ===== */
.secondary-btn {
  width: 100%;
  max-width: 260px;
  padding: 14px 24px;
  border: 1.5px solid rgba(168, 213, 162, 0.7);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.45);
  font-size: 16px;
  font-weight: 600;
  color: #6b9a6d;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 8px;
  backdrop-filter: blur(4px);
}
.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(168, 213, 162, 1);
  box-shadow: 0 2px 12px rgba(168, 213, 162, 0.15);
}
.secondary-btn:active { transform: scale(0.97); }

/* ===== 表单区域 ===== */
.form-area {
  width: 100%;
  max-width: 320px;
  margin-top: 8px;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 24px;
  border: 1.5px solid rgba(168, 213, 162, 0.35);
  backdrop-filter: blur(8px);
}
.form-slide-enter-active, .form-slide-leave-active {
  transition: all 0.35s ease;
  max-height: 400px;
  opacity: 1;
  overflow: hidden;
}
.form-slide-enter-from, .form-slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.auth-switch {
  display: flex;
  margin-bottom: 14px;
  background: rgba(245, 240, 220, 0.5);
  border-radius: 16px;
  padding: 3px;
}
.auth-switch button {
  flex: 1;
  padding: 9px;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  color: #b5a99a;
  background: transparent;
  cursor: pointer;
  transition: all 0.25s;
}
.auth-switch button.on {
  background: rgba(253, 232, 160, 0.65);
  color: #5d4e37;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.auth-form { display: flex; flex-direction: column; gap: 10px; }

.field input {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid rgba(168, 213, 162, 0.5);
  border-radius: 20px;
  font-size: 15px;
  outline: none;
  background: rgba(255, 253, 245, 0.75);
  color: #5d4e37;
  transition: all 0.25s;
  box-sizing: border-box;
}
.field input::placeholder { color: #d0c8ba; }
.field input:focus {
  border-color: rgba(168, 213, 162, 0.9);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 3px rgba(168, 213, 162, 0.12);
}

.grade-row { display: flex; flex-wrap: wrap; gap: 8px; }
.grade-chip {
  padding: 8px 16px;
  border: 1.5px solid rgba(168, 213, 162, 0.4);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 253, 245, 0.6);
  color: #b5a99a;
  cursor: pointer;
  transition: all 0.25s;
}
.grade-chip.on {
  border-color: rgba(240, 200, 80, 0.7);
  background: rgba(253, 232, 160, 0.55);
  color: #5d4e37;
}

.error-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 240, 230, 0.7);
  border-radius: 14px;
  font-size: 13px;
  color: #e17055;
}
.retry {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid #e17055;
  border-radius: 10px;
  background: transparent;
  color: #e17055;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.retry:hover { background: #e17055; color: white; }

.agree-row { margin-top: 2px; }
.agree-row label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #a09585;
  cursor: pointer;
  line-height: 1.6;
}
.agree-row input[type="checkbox"] {
  margin-top: 3px;
  accent-color: #a8d5a2;
  width: 16px;
  height: 16px;
}
.agree-row a { color: #8b7d6b; text-decoration: underline; }

.auth-btn {
  width: 100%;
  padding: 14px;
  border: 1.5px solid rgba(168, 213, 162, 0.6);
  border-radius: 20px;
  font-size: 16px;
  font-weight: 700;
  color: #6b9a6d;
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.25s;
  margin-top: 4px;
}
.auth-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.auth-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.75);
  border-color: rgba(168, 213, 162, 0.9);
}

/* ===== 家长弹窗 ===== */
.modal-bg {
  position: fixed;
  inset: 0;
  background: rgba(93,78,55,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  backdrop-filter: blur(4px);
}
.modal-box {
  position: relative;
  width: 100%;
  max-width: 320px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 28px 20px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.1);
}
.modal-x {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  background: #f5f1ea;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
}
.modal-box h2 { font-size: 18px; font-weight: 700; color: #5d4e37; margin: 0 0 4px; }
.modal-hint { font-size: 12px; color: #b5a99a; margin: 0 0 16px; }
.modal-foot { text-align: center; font-size: 11px; color: #d0c8ba; margin: 12px 0 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
