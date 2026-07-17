import { createRouter, createWebHashHistory } from 'vue-router'
import { authStore, fetchMe } from '../stores/auth'
import { petStore, fetchMyPet } from '../stores/pet'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/learn',
      name: 'learn',
      component: () => import('../views/LearnPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notebook',
      name: 'notebook',
      component: () => import('../views/NotebookPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/growth',
      name: 'growth',
      component: () => import('../views/GrowthPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pet',
      name: 'pet',
      component: () => import('../views/PetPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/feedback',
      name: 'feedback',
      component: () => import('../views/FeedbackPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('../views/OnboardingPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/parent',
      name: 'parent-dashboard',
      component: () => import('../views/ParentDashboard.vue'),
      meta: { requiresAuth: true, parentOnly: true },
    },
    {
      path: '/parent/settings',
      name: 'parent-settings',
      component: () => import('../views/ParentSettings.vue'),
      meta: { requiresAuth: true, parentOnly: true },
    },
    // ============================================================
    // 合规页面（T7.4 上线 Checklist）
    // ============================================================
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('../views/PrivacyPage.vue'),
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('../views/TermsPage.vue'),
    },
    // ============================================================
    // 404 兜底
    // ============================================================
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
})

// 路由守卫：认证 + parentOnly 管控
router.beforeEach(async (to, _from, next) => {
  // 尝试从 token 恢复登录态
  if (authStore.token && !authStore.user) {
    await fetchMe()
  }

  // 未登录访问需登录页面 → 跳转登录
  if (to.meta.requiresAuth && !authStore.user) {
    next({ name: 'login' })
    return
  }

  // 已登录访问游客页面 → 跳转首页
  if (to.meta.guest && authStore.user) {
    next({ name: 'home' })
    return
  }

  // 家长专属页面：非 parent 角色拒绝访问
  if (to.meta.parentOnly && authStore.user?.role !== 'parent') {
    next({ name: 'home' })
    return
  }

  next()

  // 登录后拉取豆豆数据
  if (authStore.user && !petStore.pet) {
    fetchMyPet()
  }
})

export default router
