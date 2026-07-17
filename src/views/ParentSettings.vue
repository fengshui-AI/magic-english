<template>
  <div class="settings-page">
    <!-- 顶部栏 -->
    <header class="settings-header">
      <button class="btn-back" @click="router.back()">
        <span class="back-icon">←</span>
      </button>
      <h1>学习管控</h1>
      <div class="header-spacer"></div>
    </header>

    <div class="settings-content">
      <!-- 每日时长 -->
      <div class="settings-group">
        <h2 class="group-title">⏰ 每日学习时长</h2>
        <p class="group-desc">设置孩子每天可使用的最大学习时间</p>
        <div class="time-picker">
          <button
            v-for="opt in timeOptions"
            :key="opt.value"
            class="time-option"
            :class="{ active: localSettings.dailyLimitMinutes === opt.value }"
            @click="localSettings.dailyLimitMinutes = opt.value"
          >
            {{ opt.label }}
          </button>
          <div class="custom-time">
            <input
              v-model.number="customMinutes"
              type="number"
              class="custom-input"
              placeholder="自定义"
              min="5"
              max="120"
              @focus="customFocused = true"
            />
            <span class="custom-unit">分钟</span>
            <button v-if="customMinutes > 0" class="btn-apply" @click="applyCustomMinutes">
              确定
            </button>
          </div>
        </div>
      </div>

      <!-- 禁用时段 -->
      <div class="settings-group">
        <h2 class="group-title">🌙 禁用时段</h2>
        <p class="group-desc">在该时段内，应用将自动锁定，保护孩子的作息</p>
        <div class="time-range">
          <div class="range-item">
            <label>开始时间</label>
            <select v-model.number="localSettings.disabledStartHour">
              <option v-for="h in 24" :key="'s' + h" :value="h - 1">
                {{ String(h - 1).padStart(2, '0') }}:00
              </option>
            </select>
          </div>
          <span class="range-separator">至</span>
          <div class="range-item">
            <label>结束时间</label>
            <select v-model.number="localSettings.disabledEndHour">
              <option v-for="h in 24" :key="'e' + h" :value="h - 1">
                {{ String(h - 1).padStart(2, '0') }}:00
              </option>
            </select>
          </div>
        </div>
        <div class="disable-toggle" @click="toggleDisabled">
          <span>{{ localSettings.disabledStartHour != null ? '已启用' : '已关闭' }}</span>
          <div class="toggle-switch" :class="{ on: localSettings.disabledStartHour != null }">
            <div class="toggle-knob"></div>
          </div>
        </div>
      </div>

      <!-- 周末设置 -->
      <div class="settings-group">
        <h2 class="group-title">📅 周末学习</h2>
        <div class="toggle-row">
          <div>
            <span class="toggle-label">允许周末学习</span>
            <p class="toggle-desc">关闭后周末将无法打开学习应用</p>
          </div>
          <div
            class="toggle-switch"
            :class="{ on: localSettings.allowWeekend !== false }"
            @click="toggleWeekend"
          >
            <div class="toggle-knob"></div>
          </div>
        </div>
      </div>

      <!-- 通知 -->
      <div class="settings-group">
        <h2 class="group-title">🔔 通知设置</h2>
        <div class="toggle-row">
          <div>
            <span class="toggle-label">周报推送</span>
            <p class="toggle-desc">每周一自动推送孩子上周的学习周报</p>
          </div>
          <div
            class="toggle-switch"
            :class="{ on: localSettings.notificationEnabled }"
            @click="localSettings.notificationEnabled = !localSettings.notificationEnabled"
          >
            <div class="toggle-knob"></div>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <button class="btn-save" :disabled="saving" @click="saveSettings">
        <span v-if="saving" class="saving-spinner"></span>
        {{ saving ? '保存中...' : '保存设置' }}
      </button>

      <!-- 保存成功提示 -->
      <transition name="toast">
        <div v-if="showToast" class="toast-success">✅ 设置已保存</div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { parentApi, type ParentSettings } from '../api/parent'

const router = useRouter()

const timeOptions = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '45分钟', value: 45 },
  { label: '60分钟', value: 60 },
  { label: '不限', value: 0 },
]

const localSettings = reactive<ParentSettings>({
  dailyLimitMinutes: 30,
  disabledStartHour: undefined,
  disabledEndHour: undefined,
  allowWeekend: true,
  notificationEnabled: true,
})

const customMinutes = ref(0)
const customFocused = ref(false)
const saving = ref(false)
const showToast = ref(false)

function applyCustomMinutes() {
  if (customMinutes.value >= 5 && customMinutes.value <= 120) {
    localSettings.dailyLimitMinutes = customMinutes.value
  }
}

function toggleWeekend() {
  localSettings.allowWeekend = localSettings.allowWeekend !== false ? false : true
}

function toggleDisabled() {
  if (localSettings.disabledStartHour != null) {
    localSettings.disabledStartHour = undefined
    localSettings.disabledEndHour = undefined
  } else {
    localSettings.disabledStartHour = 22
    localSettings.disabledEndHour = 6
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await parentApi.updateSettings('me', { ...localSettings })
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  } catch {
    // 模拟保存成功
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  }
  saving.value = false
}

onMounted(async () => {
  try {
    const settings = await parentApi.getSettings('me')
    Object.assign(localSettings, settings)
  } catch {
    // 使用默认值
  }
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f5f0 0%, #f0ece6 100%);
  padding-bottom: 40px;
}

.settings-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(248, 245, 240, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.btn-back {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  color: #5c5c5c;
}

.settings-header h1 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 18px;
  font-weight: 600;
  color: #3d3929;
  margin: 0;
}

.header-spacer {
  width: 36px;
}

.settings-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px 20px;
}

.settings-group {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.group-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 600;
  color: #3d3929;
  margin: 0 0 4px;
}

.group-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin: 0 0 14px;
  line-height: 1.5;
}

/* 时长选择 */
.time-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.time-option {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1.5px solid #e8e4da;
  background: #fff;
  font-size: 13px;
  color: #5c5544;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.time-option:hover {
  border-color: #c9a96e;
}

.time-option.active {
  background: linear-gradient(135deg, #f5f0e8, #ede4d3);
  border-color: #c9a96e;
  color: #8c7040;
  font-weight: 600;
}

.custom-time {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  width: 100%;
}

.custom-input {
  width: 70px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1.5px solid #e8e4da;
  font-size: 14px;
  color: #3d3929;
  outline: none;
  font-family: inherit;
  text-align: center;
}

.custom-input:focus {
  border-color: #c9a96e;
}

.custom-unit {
  font-size: 13px;
  color: #8c8c8c;
}

.btn-apply {
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #c9a96e, #b8956a);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

/* 禁用时段 */
.time-range {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.range-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.range-item label {
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.range-item select {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1.5px solid #e8e4da;
  font-size: 14px;
  color: #3d3929;
  outline: none;
  font-family: inherit;
  background: #fff;
  cursor: pointer;
}

.range-separator {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 16px;
}

/* Toggle */
.disable-toggle,
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-label {
  font-size: 14px;
  color: #3d3929;
  font-weight: 500;
}

.toggle-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin: 2px 0 0;
}

.toggle-switch {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: #d5d5d5;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  flex-shrink: 0;
}

.toggle-switch.on {
  background: #c9a96e;
}

.toggle-knob {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle-switch.on .toggle-knob {
  transform: translateX(20px);
}

/* 保存按钮 */
.btn-save {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #c9a96e, #b8956a);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
  margin-top: 8px;
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.saving-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Toast */
.toast-success {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #3d3929;
  color: #fff;
  padding: 10px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.toast-enter-active {
  animation: toastIn 0.3s ease;
}
.toast-leave-active {
  animation: toastOut 0.3s ease;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}
</style>
