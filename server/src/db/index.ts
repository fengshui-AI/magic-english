import 'dotenv/config'
import * as schema from './schemas/index.js'

let usingMemoryDb = false

let db: any
let pool: any
let migrationDb: any

// 优先 PostgreSQL，开发环境可降级到内存数据库
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // 没有配置 DATABASE_URL → 内存 fallback
  console.warn('⚠️  DATABASE_URL not set — using in-memory database')
  const mem = await import('./memory-db.js')
  db = mem.memoryDb
  usingMemoryDb = true
  await mem.seedMemoryDb()
} else {
  try {
    const pg = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')

    pool = new pg.Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    // 测试连接
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()

    db = drizzle(pool, { schema })
    migrationDb = drizzle(
      new pg.Client({ connectionString, connectionTimeoutMillis: 5000 }),
      { schema },
    )

    console.log('✅ Connected to PostgreSQL')
  } catch (err: any) {
    // 生产环境：数据库连接失败直接退出
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ PostgreSQL connection failed in production — exiting')
      console.error(err.message?.substring(0, 200))
      process.exit(1)
    }

    // 开发环境：降级到内存
    console.warn('⚠️  PostgreSQL not available:', err.message?.substring(0, 100))
    console.log('📦 Falling back to in-memory database')
    const mem = await import('./memory-db.js')
    db = mem.memoryDb
    usingMemoryDb = true
    await mem.seedMemoryDb()
  }
}

export { db, pool, migrationDb, usingMemoryDb }
export * from './schemas/index.js'
