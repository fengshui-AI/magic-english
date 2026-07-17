import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // 只扫描 src/ 和项目根目录的测试文件，避免扫描 server/node_modules
    include: ['src/**/*.test.ts', '*.test.ts'],
    // 排除 E2E 测试（需要后端运行，仅通过 npm run test:e2e 执行）
    exclude: ['e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**'],
    },
  },
})
