/**
 * Utilidades HTTP compatibles tanto con Vercel Serverless Functions
 * como con Node http.IncomingMessage / ServerResponse en Vite dev/preview.
 */

const DEFAULT_MAX_BYTES = 1024 * 1024 // 1 MB

export function httpError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  err.expose = true
  return err
}

export function sendJson(res, status, data, extraHeaders = {}) {
  res.statusCode = status
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders,
  }
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      res.setHeader(key, value)
    }
  }
  res.end(JSON.stringify(data))
}

export async function readJson(req, maxBytes = DEFAULT_MAX_BYTES) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      if (req.body.length > maxBytes) {
        throw httpError(413, 'El cuerpo de la petición supera el límite de 1 MB.')
      }
      const text = req.body.toString('utf8').trim()
      return parseSafeJson(text)
    }
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > maxBytes) {
        throw httpError(413, 'El cuerpo de la petición supera el límite de 1 MB.')
      }
      return parseSafeJson(req.body.trim())
    }
    if (typeof req.body === 'object') {
      return req.body
    }
  }

  const chunks = []
  let totalBytes = 0

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalBytes += buf.length
    if (totalBytes > maxBytes) {
      throw httpError(413, 'El cuerpo de la petición supera el límite de 1 MB.')
    }
    chunks.push(buf)
  }

  if (chunks.length === 0) return {}
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return parseSafeJson(raw)
}

function parseSafeJson(text) {
  if (!text) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    throw httpError(400, 'El formato JSON enviado no es válido.')
  }
}

export function getQuery(req) {
  const out = {}
  if (req?.query && typeof req.query === 'object') {
    for (const [k, v] of Object.entries(req.query)) {
      out[k] = Array.isArray(v) ? v[0] : v
    }
  }
  try {
    const url = new URL(req?.url || '/', 'http://localhost')
    for (const [k, v] of url.searchParams.entries()) {
      if (out[k] === undefined) out[k] = v
    }
  } catch {
    // Ignorar URL malformada y devolver lo ya extraido
  }
  return out
}

export function methodNotAllowed(res, allowed = ['GET']) {
  sendJson(
    res,
    405,
    { error: `Método no permitido. Usa ${allowed.join(' o ')}.` },
    { Allow: allowed.join(', ') },
  )
}

export function withErrorHandling(handler) {
  return async function wrappedHandler(req, res) {
    try {
      await handler(req, res)
    } catch (err) {
      if (res.writableEnded) return
      const status = err?.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500
      const message = err?.expose
        ? err.message
        : status === 500
          ? 'Error interno del servidor. Inténtalo de nuevo en unos segundos.'
          : err?.message || 'Petición no válida.'

      if (status >= 500) {
        console.error('[API Error]', err?.message || err)
      }
      sendJson(res, status, { error: message })
    }
  }
}
