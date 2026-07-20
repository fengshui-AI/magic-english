import app from './index.js'
import 'dotenv/config'
import { usingMemoryDb } from './db/index.js'

const port = parseInt(process.env.PORT || '3000')

// Skip migration when using in-memory DB (already seeded)
async function autoMigrate() {
  if (usingMemoryDb) {
    console.log('📦 Using in-memory database — migration skipped (seed data loaded)')
    return
  }

  const pg = await import('pg')
  const databaseUrl = process.env.DATABASE_URL || 'postgres://localhost:5432/magic_english'
  const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10000 })
  try {
    await client.connect()
    console.log('✅ Database connection OK')

    // 确保 password_hash 列存在（向后兼容）
    try {
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
      `)
      console.log('✅ password_hash column ensured')
    } catch {
      console.log('⚠️  password_hash column check skipped (permission)')
    }

    // 确保 sentence / sentence_cn 列存在（向后兼容）
    try {
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE words ADD COLUMN sentence TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
      `)
      console.log('✅ sentence column ensured')
    } catch (e: any) {
      console.log('⚠️  sentence column check failed:', e.message?.substring(0, 100))
    }

    try {
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE words ADD COLUMN sentence_cn TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
      `)
      console.log('✅ sentence_cn column ensured')
    } catch (e: any) {
      console.log('⚠️  sentence_cn column check failed:', e.message?.substring(0, 100))
    }

    // ============================================================
    // 豆豆家园系统：创建星光/装饰品/花园相关表（V3.4）
    // ============================================================
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS starlight_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id),
          amount INTEGER NOT NULL,
          source_type VARCHAR(30) NOT NULL,
          balance INTEGER NOT NULL DEFAULT 0,
          source_ref VARCHAR(100),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_starlight_user ON starlight_records(user_id);
        CREATE INDEX IF NOT EXISTS idx_starlight_date ON starlight_records(created_at);
        CREATE INDEX IF NOT EXISTS idx_starlight_type ON starlight_records(source_type);
      `)
      console.log('✅ starlight_records table ready')

      await client.query(`
        CREATE TABLE IF NOT EXISTS decorations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) NOT NULL,
          name VARCHAR(50) NOT NULL,
          emoji VARCHAR(10) NOT NULL,
          theme VARCHAR(30),
          unlock_type VARCHAR(30) NOT NULL,
          unlock_value INTEGER NOT NULL DEFAULT 0,
          slot VARCHAR(20),
          grade_min SMALLINT NOT NULL DEFAULT 1,
          grade_max SMALLINT NOT NULL DEFAULT 6,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_decorations_type ON decorations(type);
        CREATE INDEX IF NOT EXISTS idx_decorations_unlock ON decorations(unlock_type);
      `)
      console.log('✅ decorations table ready')

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_decorations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id),
          decoration_id UUID NOT NULL REFERENCES decorations(id),
          equipped BOOLEAN NOT NULL DEFAULT false,
          position SMALLINT DEFAULT 0,
          unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(user_id, decoration_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_decorations_user ON user_decorations(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_decorations_equipped ON user_decorations(user_id, equipped);
      `)
      console.log('✅ user_decorations table ready')

      await client.query(`
        CREATE TABLE IF NOT EXISTS garden_layouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
          layout_data JSONB NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_garden_user ON garden_layouts(user_id);
      `)
      console.log('✅ garden_layouts table ready')
    } catch (e: any) {
      console.log('⚠️  Garden system tables creation failed:', e.message?.substring(0, 200))
    }

    // 检查是否需要填充 sentence 数据
    try {
      const { rows: nullCount } = await client.query(
        `SELECT COUNT(*) as cnt FROM words WHERE sentence IS NULL`
      )
      if (parseInt(nullCount[0].cnt) > 0) {
        console.log(`📝 ${nullCount[0].cnt} words missing sentences — loading seed data...`)
        const seedModule = await import('./db/seed-data.js')
        const wordList = seedModule.seedWords || []
        let filled = 0
        for (const w of wordList) {
          try {
            const result = await client.query(
              `UPDATE words SET sentence = $1, sentence_cn = $2 WHERE word = $3 AND sentence IS NULL`,
              [w.sentence, w.sentenceCn, w.word]
            )
            filled += result.rowCount || 0
          } catch { /* skip individual failures */ }
        }
        console.log(`✅ Filled sentences for ${filled} words`)
      } else {
        console.log('✅ All words already have sentences')
      }
    } catch (e: any) {
      console.log('⚠️  sentence data fill skipped:', e.message?.substring(0, 100))
    }

    const { readFileSync, existsSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const drizzleDir = join(__dirname, '..', 'drizzle')

    if (existsSync(drizzleDir)) {
      const migrationFiles = readFileSync(join(drizzleDir, 'meta', '_journal.json'), 'utf-8')
      const journal = JSON.parse(migrationFiles)

      for (const entry of journal.entries || []) {
        const sqlPath = join(drizzleDir, `${entry.tag}.sql`)
        if (existsSync(sqlPath)) {
          const sqlContent = readFileSync(sqlPath, 'utf-8')
          console.log(`📦 Running migration: ${entry.tag}`)
          await client.query(sqlContent)
          console.log(`✅ Migration ${entry.tag} complete`)
        }
      }
    } else {
      console.log('⚠️  No migration files found, skipping schema sync')
    }

    console.log('✅ Database migration done')
  } catch (err) {
    console.error('❌ Database migration failed:', String(err).substring(0, 300))
    console.error('⚠️  Server will continue without DB — some features may not work')
  } finally {
    await client.end()
  }
}

autoMigrate().then(() => {
  console.log(`🚀 豆语星球 Server starting on http://localhost:${port}`)
  app.listen(port, () => {
    console.log(`✅ Server listening on port ${port}`)
  })
})
