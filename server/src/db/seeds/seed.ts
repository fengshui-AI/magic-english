/* eslint-disable no-console -- seed script output */

import 'dotenv/config'
import { db } from '../index.js'
import { words, users } from '../schemas/index.js'
import { seedWords } from '../seed-data.js'
import { eq } from 'drizzle-orm'

async function seed() {
  console.log('🌱 Seeding database...')

  // 检查是否已有数据
  const existing = await db.select().from(words).limit(1)
  if (existing.length > 0) {
    console.log(`⚠️  Words table already has ${existing.length}+ words. Skipping seed.`)
    console.log('   To re-seed, truncate the words table first.')
    return
  }

  // 批量插入 500 词
  let inserted = 0
  for (const w of seedWords) {
    try {
      await db.insert(words).values(w)
      inserted++
    } catch (err: any) {
      // 跳过重复词（如果 unique 约束已存在）
      if (err.code === '23505') continue
      console.error(`❌ Failed to insert "${w.word}":`, err.message?.substring(0, 80))
    }
  }
  console.log(`✅ Seeded ${inserted}/${seedWords.length} words`)

  // 创建 demo 用户
  const [demoUser] = await db
    .insert(users)
    .values({
      name: '小明',
      role: 'child',
      grade: 3,
      ageSegment: 'mid',
    })
    .returning()
    .onConflictDoNothing()
    .catch(() => [{ name: '小明(已存在)', id: '-' }])

  if (demoUser) {
    console.log(`✅ Demo user: ${demoUser.name}`)
  }

  console.log('🎉 Seed complete!')
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message)
    process.exit(1)
  })
  .finally(() => process.exit(0))
