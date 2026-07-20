<template>
  <div class="garden-page">
    <!-- ============================================================
         远景层 — 天空背景（按出生地不同色调）
         ============================================================ -->
    <div class="sky-layer" :style="{ background: gardenStore.data?.theme.sky }">
      <div class="clouds">
        <span class="cloud" v-for="c in 4" :key="c" :style="cloudStyle(c)">☁️</span>
      </div>
    </div>

    <!-- ============================================================
         地形层 — 地面场景
         ============================================================ -->
    <div class="terrain-layer" :style="{ background: gardenStore.data?.theme.terrain }">
      <!-- 初始装饰 -->
      <span
        v-for="(d, i) in gardenStore.data?.theme.initialDecor || []"
        :key="'init-' + i"
        class="terrain-decor"
        :style="{ left: 15 + i * 22 + '%', top: 20 + (i % 3) * 15 + '%' }"
      >{{ d }}</span>
    </div>

    <!-- ============================================================
         建筑层 — 地标建筑（点击跳转学习）
         ============================================================ -->
    <div class="buildings-layer">
      <div
        v-for="b in buildings"
        :key="b.id"
        class="building"
        :class="{ unlocked: b.unlocked, locked: !b.unlocked }"
        :style="{ left: b.position.x + '%', top: b.position.y + '%' }"
        @click="b.unlocked && b.route ? $router.push(b.route) : null"
      >
        <div class="building-emoji">{{ b.emoji }}</div>
        <div class="building-name">{{ b.name }}</div>
        <div v-if="!b.unlocked" class="building-lock">🔒</div>
        <div v-if="b.unlocked" class="building-glow"></div>
      </div>
    </div>

    <!-- ============================================================
         摆件层 — 单词摆件（可拖拽）
         ============================================================ -->
    <div class="items-layer" ref="itemsLayer">
      <div
        v-for="item in gardenStore.data?.items || []"
        :key="item.id"
        class="garden-item"
        :style="{ left: item.position.x + 'px', top: item.position.y + 'px' }"
        draggable="true"
        @dragstart="onDragStart($event, item.id)"
        @dragend="onDragEnd"
      >
        <span class="item-emoji">{{ item.emoji }}</span>
        <span class="item-word">{{ item.word }}</span>
      </div>
    </div>

    <!-- ============================================================
         交互层 — 豆豆游走
         ============================================================ -->
    <div class="interaction-layer">
      <div class="dodo-walker" :style="dodoStyle">
        <span class="dodo-sprite">🦕</span>
        <div class="dodo-shadow"></div>
      </div>
    </div>

    <!-- ============================================================
         顶部栏 — 星光瓶 + 标题
         ============================================================ -->
    <header class="garden-header">
      <button class="btn-back" @click="$router.back()">←</button>
      <h1 class="garden-title">🏡 豆豆家园</h1>
      <div class="starlight-bottle" :class="{ full: gardenStore.starlight?.isFull }">
        <div class="bottle-glass">
          <div
            class="bottle-fill"
            :style="{ height: (gardenStore.starlight?.fillLevel || 0) * 100 + '%' }"
          ></div>
        </div>
        <div class="bottle-glow" :style="{ opacity: (gardenStore.starlight?.fillLevel || 0) }"></div>
      </div>
    </header>

    <!-- ============================================================
         底部栏 — 建筑/摆件/装扮 切换
         ============================================================ -->
    <div class="garden-footer">
      <button class="footer-tab" :class="{ active: activeTab === 'buildings' }" @click="activeTab = 'buildings'">
        🏛️ 建筑
      </button>
      <button class="footer-tab" :class="{ active: activeTab === 'items' }" @click="activeTab = 'items'">
        📦 摆件({{ gardenStore.data?.stats.totalItems || 0 }})
      </button>
      <button class="footer-tab" :class="{ active: activeTab === 'decorate' }" @click="activeTab = 'decorate'">
        🎨 装扮
      </button>
    </div>

    <!-- ============================================================
         底部面板 — 装饰品选择
         ============================================================ -->
    <div v-if="activeTab === 'decorate'" class="decorate-panel">
      <div class="deco-tabs">
        <button
          v-for="cat in decoCategories"
          :key="cat.type"
          class="deco-tab"
          :class="{ active: activeDecoType === cat.type }"
          @click="activeDecoType = cat.type"
        >{{ cat.label }}</button>
      </div>
      <div class="deco-grid">
        <div
          v-for="d in filteredDecorations"
          :key="d.id"
          class="deco-item"
          :class="{ owned: d.owned, equipped: d.equipped }"
          @click="handleDecoClick(d)"
        >
          <span class="deco-emoji">{{ d.emoji }}</span>
          <span class="deco-name">{{ d.name }}</span>
          <span v-if="!d.owned && d.unlockType === 'starlight'" class="deco-cost">⭐{{ d.unlockValue }}</span>
          <span v-else-if="!d.owned" class="deco-clue">🔒</span>
          <span v-else-if="d.equipped" class="deco-equipped">✓</span>
        </div>
      </div>
    </div>

    <!-- 加载态 -->
    <div v-if="gardenStore.loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>豆豆正在整理家园...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { gardenStore, fetchGarden, saveLayout, unlockDecoration, equipDecoration, unequipDecoration } from '../stores/garden'
import type { Decoration } from '../api/decorations'

const router = useRouter()
const itemsLayer = ref<HTMLElement | null>(null)
const activeTab = ref('buildings')
const activeDecoType = ref('head')

// 拖拽状态
const dragItemId = ref<string | null>(null)
function onDragStart(e: DragEvent, itemId: string) {
  dragItemId.value = itemId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onDragEnd() {
  dragItemId.value = null
}

// 豆豆随机游走
const dodoPos = reactive({ x: 50, y: 60 })
const dodoStyle = computed(() => ({
  left: dodoPos.x + '%',
  top: dodoPos.y + '%',
}))

let walkTimer: ReturnType<typeof setInterval> | null = null
function startDodoWalk() {
  walkTimer = setInterval(() => {
    dodoPos.x = 30 + Math.random() * 40
    dodoPos.y = 40 + Math.random() * 30
  }, 4000)
}

// 云朵样式
function cloudStyle(i: number) {
  return {
    left: (i * 25 + Math.sin(i) * 10) + '%',
    top: (10 + i * 12) + '%',
    animationDelay: i * 1.5 + 's',
    opacity: 0.3 + i * 0.1,
  }
}

// 建筑位置预设
const buildingPositions: Record<string, { x: number; y: number }> = {
  library: { x: 12, y: 45 },
  workshop: { x: 42, y: 55 },
  story_house: { x: 72, y: 40 },
  crystal_tower: { x: 85, y: 25 },
  rainbow_bridge: { x: 55, y: 70 },
  mushroom_castle: { x: 22, y: 65 },
}

const buildings = computed(() =>
  (gardenStore.data?.buildings || []).map((b) => ({
    ...b,
    position: buildingPositions[b.id] || { x: 50, y: 50 },
  }))
)

// 装饰品分类
const decoCategories = [
  { type: 'head', label: '👑 头饰' },
  { type: 'face', label: '😊 面部' },
  { type: 'neck', label: '🧣 颈部' },
  { type: 'back', label: '🦋 背部' },
  { type: 'tail', label: '🔔 尾饰' },
  { type: 'hand', label: '🪄 手持' },
  { type: 'effect', label: '✨ 特效' },
]

const filteredDecorations = computed(() =>
  gardenStore.decorations.filter((d) => d.type === activeDecoType.value)
)

async function handleDecoClick(d: Decoration) {
  if (!d.owned) {
    // 星光解锁
    const ok = await unlockDecoration(d.id)
    if (!ok) {
      alert('星光不足～再多多学习就能解锁啦！')
    }
  } else if (d.equipped) {
    await unequipDecoration(d.id)
  } else {
    await equipDecoration(d.id)
  }
}

// 允许拖放（模板中使用）
function allowDrop(e: DragEvent) {
  e.preventDefault()
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  if (!dragItemId.value || !itemsLayer.value) return
  const rect = itemsLayer.value.getBoundingClientRect()
  const x = e.clientX - rect.left - 25
  const y = e.clientY - rect.top - 25
  // 更新位置并保存
  const layoutData = gardenStore.data?.layoutData || {}
  if (!layoutData.items) layoutData.items = {}
  layoutData.items[dragItemId.value] = { x, y }
  saveLayout(layoutData)
}

onMounted(() => {
  fetchGarden()
  startDodoWalk()
})
</script>

<style scoped>
.garden-page {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

/* 远景层 */
.sky-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  transition: background 0.8s ease;
}

.clouds {
  position: absolute;
  inset: 0;
}

.cloud {
  position: absolute;
  font-size: 40px;
  animation: cloud-float 20s ease-in-out infinite;
}

@keyframes cloud-float {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(30px); }
}

/* 地形层 */
.terrain-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 65%;
  z-index: 2;
  border-radius: 60% 70% 0 0 / 30% 30% 0 0;
  transition: background 0.8s ease;
}

.terrain-decor {
  position: absolute;
  font-size: 28px;
  opacity: 0.7;
}

/* 建筑层 */
.buildings-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.building {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.3s;
}

.building:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.building.locked {
  filter: grayscale(1) blur(2px);
  opacity: 0.5;
}

.building-emoji {
  font-size: 40px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}

.building-name {
  font-size: 11px;
  color: #5c4a2e;
  background: rgba(255,255,255,0.8);
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.building-lock {
  font-size: 16px;
  margin-top: -30px;
}

.building-glow {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,215,0,0.2), transparent);
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* 摆件层 */
.items-layer {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.garden-item {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: auto;
  cursor: grab;
  transition: transform 0.2s;
}

.garden-item:hover {
  transform: scale(1.15);
  z-index: 10;
}

.garden-item:active {
  cursor: grabbing;
}

.item-emoji {
  font-size: 30px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}

.item-word {
  font-size: 10px;
  color: #5c4a2e;
  background: rgba(255,255,255,0.7);
  padding: 1px 6px;
  border-radius: 8px;
  white-space: nowrap;
}

/* 交互层 */
.interaction-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.dodo-walker {
  position: absolute;
  transform: translate(-50%, -50%);
  transition: left 3s ease-in-out, top 3s ease-in-out;
}

.dodo-sprite {
  font-size: 44px;
  display: block;
  animation: dodo-bob 1.5s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
}

@keyframes dodo-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.dodo-shadow {
  width: 30px;
  height: 8px;
  background: rgba(0,0,0,0.1);
  border-radius: 50%;
  margin: -4px auto 0;
  animation: shadow-pulse 1.5s ease-in-out infinite;
}

@keyframes shadow-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(0.8); opacity: 0.3; }
}

/* 顶部栏 */
.garden-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(180deg, rgba(0,0,0,0.2), transparent);
}

.btn-back {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.3);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.garden-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
  margin: 0;
}

/* 星光瓶 */
.starlight-bottle {
  width: 32px;
  height: 44px;
  position: relative;
}

.bottle-glass {
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.4);
  border-radius: 8px 8px 16px 16px;
  overflow: hidden;
  position: relative;
  backdrop-filter: blur(4px);
}

.bottle-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #ffd700, #ffa500);
  transition: height 0.8s ease;
  border-radius: 0 0 14px 14px;
}

.bottle-glow {
  position: absolute;
  inset: -4px;
  border-radius: 12px 12px 20px 20px;
  background: radial-gradient(circle, rgba(255,215,0,0.4), transparent);
  transition: opacity 0.8s;
}

.starlight-bottle.full .bottle-glow {
  animation: bottle-shine 1s ease-in-out infinite;
}

@keyframes bottle-shine {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 底部栏 */
.garden-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0,0,0,0.06);
}

.footer-tab {
  flex: 1;
  padding: 14px 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #8c8165;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border-bottom: 3px solid transparent;
}

.footer-tab.active {
  color: #c9a96e;
  border-bottom-color: #c9a96e;
  font-weight: 600;
}

/* 装扮面板 */
.decorate-panel {
  position: absolute;
  bottom: 56px;
  left: 0;
  right: 0;
  z-index: 9;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px 20px 0 0;
  padding: 12px 16px 20px;
  max-height: 50vh;
  overflow-y: auto;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
}

.deco-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  margin-bottom: 12px;
  padding-bottom: 4px;
}

.deco-tab {
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid #e8e4da;
  background: #fff;
  font-size: 12px;
  color: #5c5544;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: all 0.2s;
}

.deco-tab.active {
  background: linear-gradient(135deg, #f5f0e8, #ede4d3);
  border-color: #c9a96e;
  color: #8c7040;
  font-weight: 600;
}

.deco-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.deco-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  border: 2px solid #e8e4da;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.deco-item:hover {
  border-color: #c9a96e;
}

.deco-item.owned {
  background: #fef9e7;
  border-color: #e8d5b7;
}

.deco-item.equipped {
  background: linear-gradient(135deg, #f0e6d3, #e8d5b7);
  border-color: #c9a96e;
  box-shadow: 0 2px 8px rgba(201,169,110,0.2);
}

.deco-emoji {
  font-size: 28px;
}

.deco-name {
  font-size: 11px;
  color: #5c5544;
  text-align: center;
  line-height: 1.2;
}

.deco-cost {
  font-size: 10px;
  color: #c9a96e;
  font-weight: 600;
}

.deco-clue {
  font-size: 14px;
  opacity: 0.5;
}

.deco-equipped {
  font-size: 12px;
  color: #27ae60;
  font-weight: 700;
}

/* 加载态 */
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  color: #fff;
  font-size: 15px;
}
</style>
