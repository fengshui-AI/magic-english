import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

// ============================================================
// PWA — 注册 Service Worker
// ============================================================
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').then(
    (registration) => {
      console.log('[PWA] Service Worker registered:', registration.scope)
    },
    (error) => {
      console.warn('[PWA] Service Worker registration failed:', error)
    }
  )
}

const app = createApp(App)
app.use(router)
app.mount('#app')
