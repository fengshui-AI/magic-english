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
