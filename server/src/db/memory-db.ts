/**
 * In-memory mock database that implements drizzle-orm's query builder interface.
 * Used as fallback when PostgreSQL is not available.
 * Data is stored in Maps and all operations happen synchronously in memory.
 */

import { randomUUID } from 'node:crypto'

// ============================================================
// Storage
// ============================================================
const tables = new Map<string, Map<string, any[]>>()

function getTable(key: string): Map<string, any[]> {
  if (!tables.has(key)) tables.set(key, new Map())
  return tables.get(key)!
}

// ============================================================
// Column / Table identity helpers
// ============================================================
function isColumn(obj: any): boolean {
  return (
    obj != null &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.columnType === 'string' &&
    obj.table != null
  )
}

function getTableName(table: any): string {
  // drizzle tables have Symbol(drizzle:Name) but also expose .name or we can
  // look at the schema registration key
  if (typeof table === 'function' && table._.name) return table._.name
  // Fallback: use the table's own name property if available
  if (typeof table?.name === 'string') return table.name
  // Last resort: iterate our stored tables to find a match
  return ''
}

/**
 * Resolve a table reference to its storage key.
 * Works with both real drizzle PgTable objects and our mock table refs.
 */
function resolveTableKey(table: any): string {
  // drizzle PgTable stores its name in Symbol(drizzle:Name)
  const symName = Object.getOwnPropertySymbols(table || {}).find(
    (s) => s.toString().includes('drizzle:Name'),
  )
  if (symName) return (table as any)[symName] as string
  // Fallback
  if (typeof table?.name === 'string') return table.name
  return String(table)
}

// ============================================================
// Condition extraction from drizzle SQL objects
// ============================================================
interface SimpleCondition {
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_null' | 'is_not_null'
  columnName: string
  value: any
}

function extractConditions(sqlObj: any): SimpleCondition[] {
  if (!sqlObj || !sqlObj.queryChunks) return []

  const chunks = sqlObj.queryChunks

  // Check if this is an and/or composite
  const hasAndOr = chunks.some(
    (c: any) =>
      typeof c === 'object' &&
      c?.value?.[0]?.includes?.(' and ') ||
      c?.value?.[0]?.includes?.(' or '),
  )

  if (hasAndOr) {
    const conditions: SimpleCondition[] = []
    for (const chunk of chunks) {
      const val0 = chunk?.value?.[0]
      const isParenOrOp = val0 && (val0.includes('(') || val0.includes(')') || val0.includes(' and ') || val0.includes(' or '))
      if (
        chunk &&
        typeof chunk === 'object' &&
        chunk.queryChunks &&
        !isParenOrOp
      ) {
        conditions.push(...extractConditions(chunk))
      }
    }
    if (conditions.length > 0) return conditions
  }

  // Simple condition: [StringChunk(''), Column, StringChunk(' op '), Value/Param, StringChunk('')]
  let column: any = null
  let value: any = undefined
  let op: SimpleCondition['op'] = 'eq'

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    if (isColumn(c)) {
      column = c
    } else if (c && typeof c === 'object' && c.constructor?.name === 'Param') {
      value = c.value
    } else if (typeof c === 'object' && c?.value?.[0]) {
      const opStr = c.value[0].trim()
      if (opStr === '>') op = 'gt'
      else if (opStr === '>=') op = 'gte'
      else if (opStr === '<') op = 'lt'
      else if (opStr === '<=') op = 'lte'
      else if (opStr === '!=') op = 'ne'
      else if (opStr === 'IS NOT NULL') op = 'is_not_null'
      else if (opStr === 'IS NULL') op = 'is_null'
    }
    // Also handle raw string values (not wrapped in Param)
    if (
      !column &&
      typeof c === 'string' &&
      i > 0 &&
      isColumn(chunks[i - 1])
    ) {
      // This shouldn't happen with drizzle, but just in case
    }
  }

  if (column) {
    return [{ op, columnName: column.name, value }]
  }

  return []
}

// ============================================================
// Row filtering & sorting
// ============================================================
function evaluateCondition(row: any, cond: SimpleCondition): boolean {
  const rowVal = row[cond.columnName]
  switch (cond.op) {
    case 'eq':
      return rowVal === cond.value
    case 'ne':
      return rowVal !== cond.value
    case 'gt':
      return rowVal > cond.value
    case 'gte':
      return rowVal >= cond.value
    case 'lt':
      return rowVal < cond.value
    case 'lte':
      return rowVal <= cond.value
    case 'is_null':
      return rowVal == null
    case 'is_not_null':
      return rowVal != null
    default:
      return true
  }
}

/**
 * Build a mapping from DB column name → JS property name for a table ref.
 * e.g. { 'user_id': 'userId', 'birth_place': 'birthPlace', 'id': 'id' }
 */
function buildColumnMap(tableRef: any): Map<string, string> {
  const map = new Map<string, string>()
  if (tableRef && typeof tableRef === 'object') {
    for (const [jsKey, col] of Object.entries(tableRef)) {
      if (jsKey === 'then' || jsKey === 'catch') continue
      const c = col as any
      if (c && typeof c === 'object' && typeof c.name === 'string' && c.columnType) {
        map.set(c.name, jsKey) // DB name → JS key
      }
    }
  }
  return map
}

function filterRows(rows: any[], conditions: SimpleCondition[], colMap?: Map<string, string>): any[] {
  if (conditions.length === 0) return rows
  return rows.filter((row) => conditions.every((c) => {
    // Map DB column name to JS property name if we have a mapping
    const jsKey = colMap?.get(c.columnName) || c.columnName
    return evaluateCondition(row, { ...c, columnName: jsKey })
  }))
}

function sortRows(rows: any[], orderBy: { column: string; desc: boolean }[]): any[] {
  if (!orderBy.length) return rows
  return [...rows].sort((a, b) => {
    for (const { column, desc } of orderBy) {
      const va = a[column]
      const vb = b[column]
      if (va === vb) continue
      const cmp = va < vb ? -1 : 1
      return desc ? -cmp : cmp
    }
    return 0
  })
}

function applyDefaults(tableRef: any, data: any): any {
  // Generate UUID for primary key if not provided
  if (!data.id) data.id = randomUUID()
  // Timestamps
  const now = new Date().toISOString()
  if (data.createdAt === undefined) data.createdAt = now
  if (data.updatedAt === undefined) data.updatedAt = now

  // Apply schema column defaults (using JS property names, not DB column names)
  if (tableRef && typeof tableRef === 'object') {
    for (const [jsKey, col] of Object.entries(tableRef)) {
      if (jsKey === 'then' || jsKey === 'catch') continue
      const c = col as any
      if (c && typeof c === 'object' && typeof c.name === 'string' && c.columnType) {
        // Skip if the JS property already has a value
        if (data[jsKey] !== undefined) continue
        // Skip if already set via camelCase alias
        if (c.hasDefault && c.default !== undefined) {
          const def = c.default
          // Check if default is a SQL function like now()
          if (def && typeof def === 'object' && def.queryChunks) {
            // SQL function default (e.g. now()) — use current timestamp
            data[jsKey] = now
          } else if (typeof def === 'function') {
            data[jsKey] = def()
          } else {
            data[jsKey] = def
          }
        } else if (c.notNull && c.dataType === 'number') {
          data[jsKey] = 0
        } else if (c.notNull && c.dataType === 'boolean') {
          data[jsKey] = false
        }
      }
    }
  }
  return data
}

// ============================================================
// Query builder factory
// ============================================================
function makeThenable(obj: any, executeFn: () => Promise<any>) {
  obj.then = (resolve: any, reject: any) => executeFn().then(resolve, reject)
  return obj
}

function createSelectBuilder(tableRef: any, state: any) {
  const key = resolveTableKey(tableRef)
  const colMap = buildColumnMap(tableRef)

  const execute = async () => {
    const allRows = Array.from(getTable(key).values())
    const conditions = state.where ? extractConditions(state.where) : []
    let result = filterRows(allRows, conditions, colMap)

    if (state.orderBy) {
      const orderItems = Array.isArray(state.orderBy) ? state.orderBy : [state.orderBy]
      const orderSpec = orderItems.map((item: any) => {
        if (isColumn(item)) return { column: item.name, desc: false }
        // desc() / asc() wrapper
        if (item?.queryChunks) {
          const col = item.queryChunks.find((c: any) => isColumn(c))
          const sql = item.queryChunks.find(
            (c: any) => typeof c === 'object' && c?.value?.[0]?.includes?.('DESC'),
          )
          return { column: col?.name || '', desc: !!sql }
        }
        return { column: '', desc: false }
      })
      result = sortRows(result, orderSpec)
    }

    if (state.limit != null) result = result.slice(0, state.limit)
    return result
  }

  const builder: any = {}
  builder.where = (condition: any) =>
    createSelectBuilder(tableRef, { ...state, where: condition })
  builder.orderBy = (...items: any[]) =>
    createSelectBuilder(tableRef, { ...state, orderBy: items })
  builder.limit = (n: number) =>
    createSelectBuilder(tableRef, { ...state, limit: n })
  builder.execute = execute
  makeThenable(builder, execute)
  return builder
}

function createInsertBuilder(tableRef: any, valuesData: any) {
  const key = resolveTableKey(tableRef)

  const execute = async () => {
    const rows = Array.isArray(valuesData) ? valuesData : [valuesData]
    const inserted: any[] = []
    const store = getTable(key)

    for (const row of rows) {
      const data = applyDefaults(tableRef, { ...row })
      store.set(data.id, data)
      inserted.push({ ...data })
    }
    return inserted
  }

  const builder: any = {}
  builder.returning = () => {
    const retBuilder: any = {}
    retBuilder.execute = execute
    makeThenable(retBuilder, execute)
    return retBuilder
  }
  // Also make the insert builder itself thenable (for cases without .returning())
  makeThenable(builder, execute)
  return builder
}

function createUpdateBuilder(tableRef: any, setData: any) {
  const key = resolveTableKey(tableRef)
  const colMap = buildColumnMap(tableRef)

  const executeWithWhere = async (whereCondition?: any) => {
    const store = getTable(key)
    const conditions = whereCondition ? extractConditions(whereCondition) : []
    const updated: any[] = []

    for (const [id, row] of store.entries()) {
      if (filterRows([row], conditions, colMap).length > 0) {
        const newRow = { ...row, ...setData }
        // Preserve original id
        newRow.id = id
        store.set(id, newRow)
        updated.push({ ...newRow })
      }
    }
    return updated
  }

  const builder: any = {}
  builder.where = (condition: any) => {
    const whereBuilder: any = {}
    whereBuilder.returning = () => {
      const retBuilder: any = {}
      retBuilder.execute = () => executeWithWhere(condition)
      makeThenable(retBuilder, () => executeWithWhere(condition))
      return retBuilder
    }
    whereBuilder.execute = () => executeWithWhere(condition)
    makeThenable(whereBuilder, () => executeWithWhere(condition))
    return whereBuilder
  }
  builder.execute = () => executeWithWhere()
  makeThenable(builder, () => executeWithWhere())
  return builder
}

function createDeleteBuilder(tableRef: any) {
  const key = resolveTableKey(tableRef)
  const colMap = buildColumnMap(tableRef)

  const builder: any = {}
  builder.where = (condition: any) => {
    const whereBuilder: any = {}
    whereBuilder.execute = async () => {
      const store = getTable(key)
      const conditions = extractConditions(condition)
      for (const [id, row] of store.entries()) {
        if (filterRows([row], conditions, colMap).length > 0) {
          store.delete(id)
        }
      }
    }
    makeThenable(whereBuilder, whereBuilder.execute)
    return whereBuilder
  }
  return builder
}

// ============================================================
// Mock drizzle-orm database instance
// ============================================================
export const memoryDb = {
  select() {
    return {
      from: (tableRef: any) => createSelectBuilder(tableRef, {}),
    }
  },

  insert(tableRef: any) {
    return {
      values: (data: any) => createInsertBuilder(tableRef, data),
    }
  },

  update(tableRef: any) {
    return {
      set: (data: any) => createUpdateBuilder(tableRef, data),
    }
  },

  delete(tableRef: any) {
    return {
      where: (condition: any) => createDeleteBuilder(tableRef).where(condition),
    }
  },
}

/**
 * Seed the in-memory database with initial data (words, demo user).
 * Called automatically when using memory DB fallback.
 */
export async function seedMemoryDb() {
  const wordsStore = getTable('words')
  if (wordsStore.size > 0) return // Already seeded

  // Inline seed data for memory DB
  const { seedWords } = await import('./seed-data.js').catch(() => ({ seedWords: [] }))

  for (const w of seedWords) {
    const row = applyDefaults({ name: 'words' }, { ...w })
    wordsStore.set(row.id, row)
  }
  console.log(`🌱 Memory DB: seeded ${seedWords.length} words`)

  // Create demo user
  const usersStore = getTable('users')
  const demoUser = applyDefaults({ name: 'users' }, {
    name: '小明',
    role: 'child',
    grade: 3,
    ageSegment: 'mid',
  })
  usersStore.set(demoUser.id, demoUser)
  console.log(`🌱 Memory DB: created demo user ${demoUser.name} (id: ${demoUser.id})`)
}
