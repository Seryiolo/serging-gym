/**
 * Autenticacion sin estado (HMAC-SHA256) + hashing de contraseñas con scrypt.
 * Valida en cada peticion que el usuario exista y siga en estado 'aprobado'.
 */
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { queryOne } from './turso.js'
import { sendJson } from './http.js'

export const SESSION_COOKIE_NAME = 'sg_session'
export const SESSION_MAX_AGE_SEC = 90 * 24 * 60 * 60 // 7776000s (90 dias)

function getSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) {
    return process.env.SESSION_SECRET.trim()
  }
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim()) {
    return process.env.AUTH_SECRET.trim()
  }
  return createHash('sha256')
    .update('serging-gym-session:' + (process.env.TURSO_AUTH_TOKEN || 'dev'))
    .digest('hex')
}

export function hashPassword(password) {
  const cleanPwd = String(password).slice(0, 128)
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(cleanPwd, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false
  if (typeof password === 'string' && password.length > 128) return false

  let salt = ''
  let hashHex = ''

  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$')
    if (parts.length !== 3) return false
    salt = parts[1]
    hashHex = parts[2]
  } else if (storedHash.includes(':')) {
    const parts = storedHash.split(':')
    if (parts.length !== 2) return false
    salt = parts[0]
    hashHex = parts[1]
  } else {
    return false
  }

  if (!salt || !hashHex || hashHex.length % 2 !== 0) return false

  try {
    const expected = Buffer.from(hashHex, 'hex')
    if (expected.length === 0) return false
    const actual = scryptSync(String(password), salt, expected.length)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function signSessionToken(user, maxAgeSec = SESSION_MAX_AGE_SEC) {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec
  const payload = {
    uid: Number(user.id),
    email: String(user.email || ''),
    rol: String(user.rol || 'usuario'),
    exp,
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sigB64 = createHmac('sha256', getSessionSecret()).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sigB64}`
}

export const createSessionToken = signSessionToken

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null

  const [payloadB64, sigB64] = parts
  try {
    const expectedSig = createHmac('sha256', getSessionSecret()).update(payloadB64).digest()
    const actualSig = Buffer.from(sigB64, 'base64url')
    if (actualSig.length !== expectedSig.length || !timingSafeEqual(actualSig, expectedSig)) {
      return null
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (!payload || !Number.isInteger(payload.uid) || payload.uid <= 0) return null

    const nowSec = Math.floor(Date.now() / 1000)
    if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return null

    return payload
  } catch {
    return null
  }
}

function isSecureRequest(req) {
  const proto = req?.headers?.['x-forwarded-proto']
  const firstProto = Array.isArray(proto) ? proto[0] : String(proto || '').split(',')[0].trim()
  return process.env.NODE_ENV === 'production' || firstProto === 'https'
}

export function buildSessionCookie(req, token) {
  const secure = isSecureRequest(req) ? '; Secure' : ''
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; SameSite=Lax${secure}`
}

export function buildClearCookie(req) {
  const secure = isSecureRequest(req) ? '; Secure' : ''
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export function extractToken(req) {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization
  if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (bearer) return bearer
  }

  const cookieHeader = req?.headers?.cookie
  if (typeof cookieHeader === 'string' && cookieHeader.length > 0) {
    const pairs = cookieHeader.split(';')
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=')
      if (eqIdx === -1) continue
      const key = pair.slice(0, eqIdx).trim()
      if (key === SESSION_COOKIE_NAME) {
        const rawVal = pair.slice(eqIdx + 1).trim()
        try {
          return decodeURIComponent(rawVal)
        } catch {
          return rawVal
        }
      }
    }
  }

  return null
}

export async function getSessionUser(req) {
  const token = extractToken(req)
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload) return null

  const user = await queryOne(
    'SELECT id, email, nombre, rol, estado FROM users WHERE id = ? LIMIT 1',
    [payload.uid],
  )

  if (!user || user.estado !== 'aprobado') return null

  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
  }
}

export async function requireUser(req, res) {
  const user = await getSessionUser(req)
  if (!user) {
    sendJson(res, 401, { error: 'Sesión no iniciada o expirada. Inicia sesión para continuar.' })
    return null
  }
  return user
}
