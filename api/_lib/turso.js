/**
 * Cliente HTTP v2 pipeline para Turso / libSQL (solo servidor).
 * Nunca importa ni expone variables VITE_*.
 */

function getTursoConfig() {
  const rawUrl = (process.env.TURSO_DATABASE_URL || '').trim()
  const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim()

  if (!rawUrl) {
    const err = new Error('Falta configurar TURSO_DATABASE_URL en el servidor.')
    err.statusCode = 500
    throw err
  }

  const baseUrl = rawUrl
    .replace(/^libsql:\/\//i, 'https://')
    .replace(/^wss:\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://')
    .replace(/\/+$/, '')

  return { endpoint: `${baseUrl}/v2/pipeline`, authToken }
}

/**
 * Codifica un parametro JS al formato estricto de Turso HTTP v2 pipeline.
 */
export function encodeArg(v) {
  if (v === null || v === undefined) return { type: 'null' }
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' }
  if (typeof v === 'bigint') return { type: 'integer', value: v.toString() }
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return { type: 'null' }
    if (Number.isSafeInteger(v)) return { type: 'integer', value: String(v) }
    return { type: 'float', value: v }
  }
  if (typeof v === 'string') return { type: 'text', value: v }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? { type: 'null' } : { type: 'text', value: v.toISOString() }
  }
  return { type: 'text', value: JSON.stringify(v) }
}

/**
 * Decodifica una celda devuelta por Turso HTTP v2 pipeline.
 */
export function decodeCell(col) {
  if (!col || col.type === 'null') return null
  if (col.type === 'integer') return Number(col.value)
  if (col.type === 'float') return Number(col.value)
  if (col.type === 'text') return String(col.value)
  if (col.type === 'blob') return col.base64 ?? null
  return col.value ?? null
}

function normalizeStatement(item) {
  if (typeof item === 'string') return { sql: item, args: [] }
  if (Array.isArray(item)) return { sql: item[0], args: item[1] || [] }
  if (item && typeof item.sql === 'string') return { sql: item.sql, args: item.args || [] }
  throw new Error('Sentencia SQL inválida en pipeline.')
}

function buildExecuteRequest(sql, args = []) {
  const stmt = { sql }
  if (args && args.length > 0) {
    stmt.args = args.map(encodeArg)
  }
  return { type: 'execute', stmt }
}

function decodeExecuteResult(execResult) {
  const cols = execResult?.cols || []
  const rawRows = execResult?.rows || []
  const rows = rawRows.map((rawRow) => {
    const obj = {}
    for (let i = 0; i < cols.length; i++) {
      obj[cols[i].name] = decodeCell(rawRow[i])
    }
    return obj
  })

  const lastInsertRowid =
    execResult?.last_insert_rowid != null ? Number(execResult.last_insert_rowid) : null
  const rowsAffected = Number(execResult?.affected_row_count ?? 0)

  Object.defineProperties(rows, {
    lastInsertRowid: { value: lastInsertRowid, enumerable: false },
    rowsAffected: { value: rowsAffected, enumerable: false },
  })

  return { rows, lastInsertRowid, rowsAffected }
}

async function sendPipeline(requests) {
  const { endpoint, authToken } = getTursoConfig()
  const headers = { 'Content-Type': 'application/json' }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requests }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error(`Error HTTP ${res.status} al consultar Turso: ${detail.slice(0, 300)}`)
    err.statusCode = 502
    throw err
  }

  const payload = await res.json()
  const results = payload?.results || []

  for (let i = 0; i < results.length; i++) {
    if (results[i]?.type === 'error') {
      const msg = results[i].error?.message || 'Error SQL desconocido en Turso'
      const code = results[i].error?.code || 'SQL_ERROR'
      const err = new Error(`Turso SQL error (${code}): ${msg}`)
      err.code = code
      throw err
    }
  }

  return results
}

/**
 * Ejecuta una sentencia SQL y devuelve metadatos + filas.
 */
export async function execute(sql, args = []) {
  const results = await sendPipeline([buildExecuteRequest(sql, args), { type: 'close' }])
  const execRes = results[0]?.response?.result
  return decodeExecuteResult(execRes)
}

/**
 * Ejecuta una consulta y devuelve el array de filas decodificadas.
 */
export async function query(sql, args = []) {
  const { rows } = await execute(sql, args)
  return rows
}

/**
 * Ejecuta una consulta y devuelve la primera fila o null.
 */
export async function queryOne(sql, args = []) {
  const { rows } = await execute(sql, args)
  return rows[0] ?? null
}

/**
 * Ejecuta multiples consultas de solo lectura en un unico roundtrip HTTP /v2/pipeline.
 * Devuelve un array con el array de filas de cada consulta en el mismo orden.
 */
export async function readBatch(statements) {
  if (!Array.isArray(statements) || statements.length === 0) return []
  const normalized = statements.map(normalizeStatement)
  const requests = [
    ...normalized.map((s) => buildExecuteRequest(s.sql, s.args)),
    { type: 'close' },
  ]
  const results = await sendPipeline(requests)
  return normalized.map((_, idx) => decodeExecuteResult(results[idx]?.response?.result).rows)
}

/**
 * Ejecuta multiples sentencias de escritura de forma atomica (BEGIN ... COMMIT)
 * en un unico roundtrip HTTP /v2/pipeline con claves foraneas activadas.
 */
export async function batch(statements) {
  if (!Array.isArray(statements) || statements.length === 0) return []
  const normalized = statements.map(normalizeStatement)
  const requests = [
    buildExecuteRequest('PRAGMA foreign_keys = ON'),
    buildExecuteRequest('BEGIN'),
    ...normalized.map((s) => buildExecuteRequest(s.sql, s.args)),
    buildExecuteRequest('COMMIT'),
    { type: 'close' },
  ]
  const results = await sendPipeline(requests)
  // Indices: 0 = PRAGMA, 1 = BEGIN, 2..(2 + n - 1) = statements, 2 + n = COMMIT
  return normalized.map((_, idx) => decodeExecuteResult(results[idx + 2]?.response?.result))
}
