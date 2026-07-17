import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

export default defineConfig({
  schema: './src/db/schemas/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/magic_english',
  },
  // 过滤腾讯云系统表，避免权限错误
  tablesFilter: ['!tencentdb_*'],
})
