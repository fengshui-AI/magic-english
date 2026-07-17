import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  // ============================================================
  // 构建优化（T7.2 性能优化）
  // ============================================================
  build: {
    // 浏览器兼容目标（减少 polyfill 体积）
    target: 'es2020',
    // CSS 代码分割：按需加载样式
    cssCodeSplit: true,
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 500,
    // 生产环境不生成 sourcemap（减小体积 + 避免源码泄露）
    sourcemap: false,
    // 压缩配置：esbuild 比 terser 快 20-40 倍，效果接近
    minify: 'esbuild',
    // Tree-shaking 优化
    rollupOptions: {
      output: {
        // 手动分包策略：将 node_modules 和页面组件分离
        manualChunks(id: string) {
          // vendor: vue 全家桶
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router')) {
            return 'vendor-vue'
          }
          // 页面级 chunk（按路由懒加载天然分离，此处做额外分组）
          if (id.includes('src/views/HomePage')) return 'pages-home'
          if (id.includes('src/views/LearnPage')) return 'pages-learn'
          if (id.includes('src/views/PetPage')) return 'pages-pet'
          if (id.includes('src/views/ChatPage')) return 'pages-chat'
          if (id.includes('src/views/Parent')) return 'pages-parent'
          if (id.includes('src/views/')) return 'pages-other'
          // 其他 node_modules
          if (id.includes('node_modules')) return 'vendor-lib'
          return undefined
        },
        // 稳定的 chunk 文件名（利于 CDN 缓存）
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    // 资源内联阈值（4KB 以下内联为 base64，减少 HTTP 请求）
    assetsInlineLimit: 4096,
    // 启用 CSS 压缩
    cssMinify: 'esbuild',
  },

  // ============================================================
  // 开发服务器
  // ============================================================
  server: {
    port: 5173,
    // API 代理到后端（开发时避免 CORS 问题）
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // ============================================================
  // 预构建优化
  // ============================================================
  optimizeDeps: {
    include: ['vue', 'vue-router'],
  },
})
