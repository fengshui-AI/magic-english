<template>
  <div class="parent-page">
    <!-- 顶部栏 -->
    <header class="parent-header">
      <div class="header-left">
        <button class="btn-back" @click="router.back()">
          <span class="back-icon">←</span>
        </button>
        <div class="header-title">
          <span class="header-emoji">🌿</span>
          <h1>成长观察室</h1>
        </div>
      </div>
      <div class="header-right">
        <span class="child-name">{{ currentChild?.name || '宝贝' }}</span>
        <div class="avatar-circle">{{ currentChild?.name?.charAt(0) || '?' }}</div>
      </div>
    </header>

    <!-- 内容区 -->
    <div class="parent-content">
      <!-- 加载态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载成长数据...</p>
      </div>

      <template v-else>
        <!-- 概览卡片行 -->
        <section class="overview-row">
          <div class="stat-card card-gradient-1">
            <div class="stat-icon">📅</div>
            <div class="stat-body">
              <span class="stat-value">{{ report?.summary.totalDays || 0 }}</span>
              <span class="stat-label">本周学习天数</span>
            </div>
          </div>
          <div class="stat-card card-gradient-2">
            <div class="stat-icon">⏱️</div>
            <div class="stat-body">
              <span class="stat-value">{{ report?.summary.totalMinutes || 0 }}</span>
              <span class="stat-label">本周学习分钟</span>
            </div>
          </div>
          <div class="stat-card card-gradient-3">
            <div class="stat-icon">📝</div>
            <div class="stat-body">
              <span class="stat-value">{{ report?.summary.newWords || 0 }}</span>
              <span class="stat-label">新学单词</span>
            </div>
          </div>
          <div class="stat-card card-gradient-4">
            <div class="stat-icon">🔥</div>
            <div class="stat-body">
              <span class="stat-value">{{ report?.summary.currentStreak || 0 }}天</span>
              <span class="stat-label">连续打卡</span>
            </div>
          </div>
        </section>

        <!-- 学习亮点 -->
        <section v-if="report?.learningHighlights?.length" class="highlight-section">
          <h2 class="section-title"><span class="title-icon">✨</span>本周亮点</h2>
          <div class="highlight-list">
            <div
              v-for="(item, idx) in report.learningHighlights"
              :key="idx"
              class="highlight-item"
              :style="{ animationDelay: idx * 0.1 + 's' }"
            >
              <span class="highlight-dot"></span>
              <span>{{ item }}</span>
            </div>
          </div>
        </section>

        <!-- 豆豆状态卡片 -->
        <section v-if="report?.pet" class="pet-card">
          <div class="pet-card-header">
            <h2 class="section-title"><span class="title-icon">🦕</span>豆豆状态</h2>
            <span class="gradient-badge">{{ report.pet.gradient }}</span>
          </div>
          <div class="pet-status-row">
            <div class="pet-status-item">
              <span class="pet-status-label">成长阶段</span>
              <span class="pet-status-value">{{ stageLabel(report.pet.stage) }}</span>
            </div>
            <div class="pet-status-item">
              <span class="pet-status-label">阶段进度</span>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: Math.min(report.pet.stageProgress, 100) + '%' }"
                ></div>
              </div>
            </div>
            <div class="pet-status-item">
              <span class="pet-status-label">累计陪伴</span>
              <span class="pet-status-value">{{ report.pet.totalMinutes }}分钟</span>
            </div>
          </div>
          <div v-if="report.dodoMessage" class="dodo-message">
            <span class="dodo-emoji">🦕</span>
            <p>{{ report.dodoMessage }}</p>
          </div>
        </section>

        <!-- 心情变化图 -->
        <section v-if="report?.emotion" class="emotion-section">
          <h2 class="section-title"><span class="title-icon">💭</span>心情变化</h2>
          <div class="emotion-card">
            <div class="emotion-trend" :class="'trend-' + report.emotion.trend">
              <span class="trend-icon">{{
                report.emotion.trend === 'up' ? '📈' : report.emotion.trend === 'down' ? '📉' : '📊'
              }}</span>
              <span class="trend-text">{{
                report.emotion.trend === 'up'
                  ? '上升中'
                  : report.emotion.trend === 'down'
                    ? '略下降'
                    : '稳定'
              }}</span>
            </div>
            <div class="emotion-values">
              <div class="emotion-val">
                <span class="val-label">周初</span>
                <span class="val-num">{{ Math.round(report.emotion.startPleasure * 100) }}%</span>
              </div>
              <div class="emotion-arrow">→</div>
              <div class="emotion-val">
                <span class="val-label">周末</span>
                <span class="val-num">{{ Math.round(report.emotion.endPleasure * 100) }}%</span>
              </div>
            </div>
            <p class="emotion-highlight">{{ report.emotion.highlight }}</p>
          </div>
        </section>

        <!-- 家长寄语 -->
        <section v-if="report?.parentMessage" class="parent-message-section">
          <h2 class="section-title"><span class="title-icon">💌</span>温馨提示</h2>
          <div class="parent-message-card">
            <p>{{ report.parentMessage }}</p>
          </div>
        </section>

        <!-- 管控设置入口 -->
        <section class="settings-section">
          <h2 class="section-title"><span class="title-icon">⚙️</span>学习管控</h2>
          <div class="settings-list">
            <button class="setting-item" @click="router.push('/parent/settings')">
              <div class="setting-left">
                <span class="setting-icon">⏰</span>
                <span>每日时长上限</span>
              </div>
              <span class="setting-value">{{ settings.dailyLimitMinutes || '未设' }}分钟</span>
              <span class="setting-arrow">›</span>
            </button>
            <button class="setting-item" @click="router.push('/parent/settings')">
              <div class="setting-left">
                <span class="setting-icon">🌙</span>
                <span>禁用时段</span>
              </div>
              <span class="setting-value">{{
                settings.disabledStartHour != null
                  ? `${settings.disabledStartHour}:00-${settings.disabledEndHour}:00`
                  : '未设'
              }}</span>
              <span class="setting-arrow">›</span>
            </button>
            <button class="setting-item" @click="router.push('/parent/settings')">
              <div class="setting-left">
                <span class="setting-icon">🔔</span>
                <span>周报推送</span>
              </div>
              <span class="setting-value">{{
                settings.notificationEnabled ? '已开启' : '已关闭'
              }}</span>
              <span class="setting-arrow">›</span>
            </button>
          </div>
        </section>

        <!-- 历史周报 -->
        <section v-if="historyReports.length > 0" class="history-section">
          <h2 class="section-title"><span class="title-icon">📋</span>历史周报</h2>
          <div class="history-list">
            <button
              v-for="(r, idx) in historyReports"
              :key="idx"
              class="history-item"
              @click="selectHistoryReport(r)"
            >
              <div class="history-left">
                <span class="history-week">{{ formatWeek(r.weekStart) }}</span>
                <span class="history-summary">
                  {{ r.summary.totalDays }}天 · {{ r.summary.newWords }}新词 ·
                  {{ r.summary.totalMinutes }}分钟
                </span>
              </div>
              <span class="setting-arrow">›</span>
            </button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { reportApi, type WeeklyReport } from '../api/report'
import { parentApi, type ParentSettings } from '../api/parent'

const router = useRouter()

const loading = ref(true)
const report = ref<WeeklyReport | null>(null)
const historyReports = ref<WeeklyReport[]>([])
const settings = ref<ParentSettings>({})
const currentChild = ref<{ name: string; id: string } | null>(null)

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    seed: '🌱 种子期',
    sprout: '🌿 发芽期',
    young: '🌳 成长期',
    adult: '🌟 成熟期',
    legend: '👑 传说期',
  }
  return map[stage] || stage
}

function formatWeek(start: string): string {
  const d = new Date(start)
  return `${d.getMonth() + 1}/${d.getDate()} - ${new Date(d.getTime() + 6 * 86400000).getMonth() + 1}/${new Date(d.getTime() + 6 * 86400000).getDate()}`
}

async function selectHistoryReport(r: WeeklyReport) {
  report.value = r
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  try {
    const [weeklyData, historyData] = await Promise.all([
      reportApi.getWeekly(),
      reportApi.getHistory(),
    ])
    report.value = weeklyData
    historyReports.value = (historyData.reports || []).slice(1) // 排除当前周报
  } catch {
    // 使用模拟数据
    report.value = {
      childId: '',
      childName: '小明',
      weekStart: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      weekEnd: new Date().toISOString().split('T')[0],
      summary: {
        totalDays: 5,
        totalMinutes: 68,
        newWords: 12,
        wordsReviewed: 25,
        sentencesSpoken: 18,
        starsEarned: 32,
        avgCorrectRate: 0.78,
        currentStreak: 12,
        longestStreak: 15,
      },
      emotion: {
        startPleasure: 0.55,
        endPleasure: 0.72,
        avgPleasure: 0.65,
        trend: 'up',
        highlight: '本周心情逐步提升，学习状态越来越好！🌟',
      },
      pet: {
        name: '豆豆',
        stage: 'sprout',
        stageProgress: 65,
        totalMinutes: 180,
        gradient: '朋友',
      },
      learningHighlights: [
        '坚持学习了 5 天，真了不起！',
        '掌握了 12 个新单词，词汇量又增加了！',
        '练习了 18 句口语表达',
        '收获了 32 颗星星',
        '已连续 12 天打卡，正在养成好习惯！🔥',
      ],
      focusAreas: ['动物', '食物', '学校'],
      dodoMessage: '这周小明学了5天英语，嗯嗯，感觉不错呢～',
      parentMessage:
        '孩子本周学习积极性很高，保持了良好的学习节奏。新学了 12 个单词，掌握情况不错。连续 12 天打卡的习惯值得表扬！',
      generatedAt: new Date().toISOString(),
    }
  }

  try {
    const childData = await parentApi.getSettings('me')
    settings.value = childData
  } catch {
    settings.value = {
      dailyLimitMinutes: 30,
      disabledStartHour: 22,
      disabledEndHour: 6,
      notificationEnabled: true,
    }
  }

  loading.value = false
})
</script>

<style scoped>
.parent-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f5f0 0%, #f0ece6 30%, #f5f2ec 100%);
  padding-bottom: 40px;
}

/* 顶部栏 */
.parent-header {
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

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
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
  transition: all 0.2s;
}

.btn-back:hover {
  background: rgba(0, 0, 0, 0.08);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-emoji {
  font-size: 22px;
}

.header-title h1 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 18px;
  font-weight: 600;
  color: #3d3929;
  margin: 0;
  letter-spacing: 0.02em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.child-name {
  font-size: 14px;
  color: #6b6555;
  font-weight: 500;
}

.avatar-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a96e, #b8956a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

/* 内容区 */
.parent-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px 20px;
}

/* 加载态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 16px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #c9a96e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-container p {
  color: #8c8c8c;
  font-size: 14px;
}

/* 概览卡片行 */
.overview-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 16px;
  border-radius: 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.card-gradient-1 {
  background: linear-gradient(135deg, #fef9e7, #fdebd0);
}
.card-gradient-2 {
  background: linear-gradient(135deg, #e8f8f5, #d1f2eb);
}
.card-gradient-3 {
  background: linear-gradient(135deg, #ebf5fb, #d6eaf8);
}
.card-gradient-4 {
  background: linear-gradient(135deg, #fdebd0, #fadbd8);
}

.stat-icon {
  font-size: 26px;
  line-height: 1;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-family: 'Georgia', serif;
  font-size: 24px;
  font-weight: 700;
  color: #3d3929;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #8c8165;
  font-weight: 500;
}

/* 区域标题 */
.section-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 600;
  color: #3d3929;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.title-icon {
  font-size: 18px;
}

/* 亮点列表 */
.highlight-section {
  margin-bottom: 20px;
}

.highlight-list {
  background: #fff;
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: #5c5544;
  animation: slideIn 0.4s ease both;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.highlight-item:last-child {
  border-bottom: none;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.highlight-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a96e, #d4a574);
  flex-shrink: 0;
}

/* 豆豆卡片 */
.pet-card {
  background: linear-gradient(135deg, #f5f0e8, #ede4d3);
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.pet-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.gradient-badge {
  background: rgba(201, 169, 110, 0.15);
  color: #8c7040;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.pet-status-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}

.pet-status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pet-status-label {
  font-size: 13px;
  color: #8c8165;
}

.pet-status-value {
  font-size: 14px;
  color: #3d3929;
  font-weight: 600;
}

.progress-bar {
  width: 140px;
  height: 8px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #c9a96e, #d4a574);
  border-radius: 4px;
  transition: width 0.6s ease;
}

.dodo-message {
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  padding: 12px 14px;
  align-items: flex-start;
}

.dodo-emoji {
  font-size: 22px;
  line-height: 1;
}

.dodo-message p {
  margin: 0;
  font-size: 13px;
  color: #5c5544;
  line-height: 1.5;
}

/* 心情 */
.emotion-section {
  margin-bottom: 20px;
}

.emotion-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.emotion-trend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.trend-icon {
  font-size: 22px;
}

.trend-text {
  font-size: 14px;
  font-weight: 600;
}

.trend-up .trend-text {
  color: #27ae60;
}
.trend-down .trend-text {
  color: #e74c3c;
}
.trend-stable .trend-text {
  color: #7f8c8d;
}

.emotion-values {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 12px;
}

.emotion-val {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.val-label {
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.val-num {
  font-family: 'Georgia', serif;
  font-size: 28px;
  font-weight: 700;
  color: #3d3929;
}

.emotion-arrow {
  font-size: 18px;
  color: #c9a96e;
  margin-top: 8px;
}

.emotion-highlight {
  margin: 0;
  font-size: 13px;
  color: #6b6555;
  line-height: 1.6;
  text-align: center;
  padding: 10px 0 0;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

/* 家长寄语 */
.parent-message-section {
  margin-bottom: 20px;
}

.parent-message-card {
  background: linear-gradient(135deg, #fef9f0, #fdf2e0);
  border-radius: 16px;
  padding: 18px;
  border-left: 3px solid #c9a96e;
}

.parent-message-card p {
  margin: 0;
  font-size: 14px;
  color: #5c4a2e;
  line-height: 1.7;
}

/* 管控设置 */
.settings-section {
  margin-bottom: 20px;
}

.settings-list {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.setting-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 16px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  font-family: inherit;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.setting-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  font-size: 14px;
  color: #3d3929;
}

.setting-icon {
  font-size: 18px;
}

.setting-value {
  font-size: 13px;
  color: #8c8c8c;
  margin-right: 6px;
}

.setting-arrow {
  font-size: 18px;
  color: #c0c0c0;
  font-weight: 300;
}

/* 历史周报 */
.history-section {
  margin-bottom: 20px;
}

.history-list {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.history-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  font-family: inherit;
  transition: background 0.2s;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.history-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.history-week {
  font-size: 13px;
  font-weight: 600;
  color: #3d3929;
}

.history-summary {
  font-size: 12px;
  color: #8c8c8c;
}
</style>
