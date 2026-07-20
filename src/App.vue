<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- 底部导航 — 4个Tab：星球 / 学习 / 手账本 / 豆豆 -->
    <nav v-if="showNav" class="bottom-nav">
      <router-link to="/" class="nav-item" exact-active-class="active">
        <span class="nav-icon">🗺️</span>
        <span class="nav-label">星球</span>
      </router-link>

      <router-link to="/learn" class="nav-item" active-class="active">
        <span class="nav-icon">📝</span>
        <span class="nav-label">学习</span>
      </router-link>

      <router-link to="/notebook" class="nav-item" active-class="active">
        <span class="nav-icon">📖</span>
        <span class="nav-label">手账本</span>
      </router-link>

      <router-link to="/pet" class="nav-item" active-class="active">
        <span class="nav-icon">🐣</span>
        <span class="nav-label">豆豆</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 不显示导航的页面：登录页、入学流程
const hideNavRoutes = ['login', 'onboarding']
const showNav = computed(() => !hideNavRoutes.includes(route.name as string))
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg-primary);
  padding-bottom: calc(64px + var(--safe-bottom, 0px));
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ============================================================
   底部导航 — 魔法玻璃质感
   ============================================================ */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 480px;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 4px calc(8px + var(--safe-bottom, 0px));
  background: rgba(15, 15, 35, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-light);
  z-index: var(--z-nav);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 14px;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-base);
  text-decoration: none;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  position: relative;
  flex: 1;
  max-width: 80px;
}

.nav-item.active {
  color: var(--text-primary);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: -10px;
  width: 20px;
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  box-shadow: var(--glow-primary);
}

.nav-icon {
  font-size: 22px;
  line-height: 1;
  transition: transform var(--transition-base);
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
}

.nav-label {
  font-size: 10px;
  letter-spacing: 0.5px;
}
</style>
