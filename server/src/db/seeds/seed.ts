/* eslint-disable no-console -- seed script output */

import 'dotenv/config'
import { db } from '../index.js'
import { words, users } from '../schemas/index.js'
import { seedWords } from '../seed-data.js'
import { eq, sql } from 'drizzle-orm'

async function seed() {
  console.log('🌱 Seeding database...')

  const existing = await db.select().from(words).limit(1)

  if (existing.length === 0) {
    // ============================================================
    // 首次种子：批量插入 500 词
    // ============================================================
    let inserted = 0
    for (const w of seedWords) {
      try {
        await db.insert(words).values(w)
        inserted++
      } catch (err: any) {
        if (err.code === '23505') continue
        console.error(`❌ Failed to insert "${w.word}":`, err.message?.substring(0, 80))
      }
    }
    console.log(`✅ Seeded ${inserted}/${seedWords.length} words`)
  } else {
    // ============================================================
    // 已有数据：更新 sentence / sentenceCn（按 word 匹配）
    // ============================================================
    console.log(`📦 Words table has data. Updating sentence / sentenceCn fields...`)
    let updated = 0
    let skipped = 0
    for (const w of seedWords) {
      try {
        const result = await db
          .update(words)
          .set({ sentence: w.sentence, sentenceCn: w.sentenceCn })
          .where(eq(words.word, w.word))
        if (result.rowCount && result.rowCount > 0) {
          updated++
        } else {
          skipped++
        }
      } catch (err: any) {
        console.error(`❌ Failed to update "${w.word}":`, err.message?.substring(0, 80))
      }
    }
    console.log(`✅ Updated ${updated} words with sentences (${skipped} skipped)`)
  }

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
