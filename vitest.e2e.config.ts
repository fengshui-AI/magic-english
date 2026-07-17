import { defineConfig } from 'vitest/config'

// E2E 测试配置：需要后端运行中才能执行
// 使用方法：npm run test:e2e
export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.test.ts'],
    testTimeout: 30000,
    hookTimeout: 15000,
    retry: 2,
  },
})
