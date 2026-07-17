import 'dotenv/config'
import * as schema from './schemas/index.js'

let usingMemoryDb = false

// Try PostgreSQL first, fall back to in-memory mock
let db: any
let pool: any
let migrationDb: any

try {
  const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/magic_english'
  
  // Dynamic import — will fail if pg is not installed or DB is unreachable
  const pg = await import('pg')
  const { drizzle } = await import('drizzle-orm/node-postgres')

  pool = new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Short timeout for fast fallback
  })

  // Test connection
  const client = await pool.connect()
  await client.query('SELECT 1')
  client.release()
  
  db = drizzle(pool, { schema })
  migrationDb = drizzle(new pg.Client({ connectionString, connectionTimeoutMillis: 5000 }), { schema })
  
  console.log('✅ Connected to PostgreSQL')
} catch (err: any) {
  console.warn('⚠️  PostgreSQL not available:', err.message?.substring(0, 100))
  console.log('📦 Falling back to in-memory database (data will be lost on restart)')
  
  const mem = await import('./memory-db.js')
  db = mem.memoryDb
  usingMemoryDb = true
  
  // Auto-seed memory DB
  await mem.seedMemoryDb()
}

export { db, pool, migrationDb, usingMemoryDb }
export * from './schemas/index.js'
