<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- 底部导航 — 5个Tab -->
    <nav v-if="showNav" class="bottom-nav">
      <router-link to="/" class="nav-item" exact-active-class="active">
        <span class="nav-icon">🏠</span>
        <span>花园</span>
      </router-link>
      <router-link to="/notebook" class="nav-item" active-class="active">
        <span class="nav-icon">📖</span>
        <span>手账本</span>
      </router-link>
      <router-link to="/chat" class="nav-item nav-cta" active-class="active">
        <span class="nav-icon cta-icon">💬</span>
        <span>对话</span>
      </router-link>
      <router-link to="/growth" class="nav-item" active-class="active">
        <span class="nav-icon">🌱</span>
        <span>成长</span>
      </router-link>
      <router-link to="/pet" class="nav-item" active-class="active">
        <span class="nav-icon">🐾</span>
        <span>宠物</span>
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
  background: var(--bg);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 底部导航 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 480px;
  width: 100%;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-around;
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 10px;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 500;
  min-width: 52px;
}

.nav-item.active {
  color: var(--primary);
}

.nav-item:hover {
  background: var(--bg);
}

.nav-icon {
  font-size: 20px;
  line-height: 1;
}

/* CTA 学习按钮 */
.nav-cta {
  position: relative;
}

.nav-cta .cta-icon {
  background: linear-gradient(135deg, #6c5ce7, #fd79a8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 24px;
}

.nav-cta::before {
  content: '';
  position: absolute;
  top: -8px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.1), rgba(253, 121, 168, 0.1));
  z-index: -1;
}

.nav-cta.active::before {
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.2), rgba(253, 121, 168, 0.2));
}
</style>
