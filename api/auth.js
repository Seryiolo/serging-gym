/**
 * Endpoint /api/auth
 * GET  -> Comprobacion limpia de sesion activa (HTTP 200 siempre)
 * POST -> login (con configuracion inicial automatica si password_hash IS NULL),
 *         register, logout, admin_users y approve_user.
 */
import { createHash } from 'node:crypto'
import {
  buildClearCookie,
  buildSessionCookie,
  getSessionUser,
  hashPassword,
  requireUser,
  signSessionToken,
  verifyPassword,
} from './_lib/auth.js'
import { methodNotAllowed, readJson, sendJson, withErrorHandling } from './_lib/http.js'
import { batch, execute, query, queryOne } from './_lib/turso.js'
import { hoyMadrid } from '../shared/fechas.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Protección contra fuerza bruta en login. Persistida en Turso (tabla login_intentos) porque
// en serverless cada instancia tiene su propia memoria y un contador en RAM se podría esquivar.
const LOGIN_WINDOW_MS = 10 * 60 * 1000
const MAX_FAILED_ATTEMPTS = 8

function getRateLimitKey(req, email) {
  const xff = req?.headers?.['x-forwarded-for']
  const ip = (Array.isArray(xff) ? xff[0] : String(xff || '')).split(',')[0].trim() || 'local'
  return createHash('sha256').update(`${ip}|${email}`).digest('hex')
}

async function isRateLimited(key) {
  try {
    const row = await queryOne('SELECT intentos, desde FROM login_intentos WHERE clave = ? LIMIT 1', [key])
    if (!row) return false
    if (Date.now() - row.desde > LOGIN_WINDOW_MS) return false
    return row.intentos >= MAX_FAILED_ATTEMPTS
  } catch {
    return false // Si la tabla no está disponible, no bloquear el acceso legítimo
  }
}

async function recordFailedLogin(key) {
  const now = Date.now()
  try {
    await execute(
      `INSERT INTO login_intentos (clave, intentos, desde) VALUES (?, 1, ?)
       ON CONFLICT(clave) DO UPDATE SET
         intentos = CASE WHEN ? - desde > ? THEN 1 ELSE intentos + 1 END,
         desde    = CASE WHEN ? - desde > ? THEN ? ELSE desde END`,
      [key, now, now, LOGIN_WINDOW_MS, now, LOGIN_WINDOW_MS, now],
    )
  } catch {
    // Ignorar fallo de registro de intentos
  }
}

async function clearFailedLogin(key) {
  try {
    await execute('DELETE FROM login_intentos WHERE clave = ?', [key])
  } catch {
    // Ignorar
  }
}

export default withErrorHandling(async function authHandler(req, res) {
  if (req.method === 'GET') {
    const user = await getSessionUser(req)
    if (!user) {
      return sendJson(res, 200, { authenticated: false })
    }
    return sendJson(res, 200, { authenticated: true, user })
  }

  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'POST'])
  }

  const body = await readJson(req)
  const action = String(body.action || 'login').trim()

  if (action === 'logout') {
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': buildClearCookie(req) })
  }

  if (action === 'admin_users') {
    const admin = await requireUser(req, res)
    if (!admin) return
    if (admin.rol !== 'admin') {
      return sendJson(res, 403, { error: 'Solo los administradores pueden consultar el listado de usuarios.' })
    }

    const users = await query(
      `SELECT id, email, nombre, rol, estado, creado_en
       FROM users
       ORDER BY
         CASE estado WHEN 'pendiente' THEN 0 WHEN 'aprobado' THEN 1 ELSE 2 END ASC,
         creado_en DESC, id DESC`,
    )
    return sendJson(res, 200, { ok: true, users })
  }

  if (action === 'approve_user') {
    const admin = await requireUser(req, res)
    if (!admin) return
    if (admin.rol !== 'admin') {
      return sendJson(res, 403, { error: 'Solo los administradores pueden aprobar o rechazar cuentas.' })
    }

    const targetId = Number(body.targetUserId)
    const nuevoEstado = String(body.estado || '').trim()

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return sendJson(res, 400, { error: 'ID de usuario objetivo no válido.' })
    }
    if (!['aprobado', 'rechazado', 'pendiente'].includes(nuevoEstado)) {
      return sendJson(res, 400, { error: 'Estado de usuario no válido.' })
    }
    if (targetId === admin.id && nuevoEstado !== 'aprobado') {
      return sendJson(res, 400, { error: 'No puedes desactivar tu propia cuenta de administrador.' })
    }

    const stmts = [
      { sql: 'UPDATE users SET estado = ? WHERE id = ?', args: [nuevoEstado, targetId] },
    ]
    if (nuevoEstado === 'aprobado') {
      const hoy = hoyMadrid()
      stmts.push(
        {
          sql: 'INSERT OR IGNORE INTO perfil (user_id, objetivo, dias_min, dias_max) VALUES (?, ?, 4, 6)',
          args: [targetId, 'Fuerza, carrera y progresión de rodilla'],
        },
        {
          sql: 'INSERT OR IGNORE INTO estado_rodilla (user_id, fase_id, desde, modo_auto) VALUES (?, 1, ?, 1)',
          args: [targetId, hoy],
        },
      )
    }

    const results = await batch(stmts)
    if (results[0].rowsAffected === 0) {
      return sendJson(res, 404, { error: 'Usuario no encontrado.' })
    }

    const users = await query(
      `SELECT id, email, nombre, rol, estado, creado_en
       FROM users
       ORDER BY
         CASE estado WHEN 'pendiente' THEN 0 WHEN 'aprobado' THEN 1 ELSE 2 END ASC,
         creado_en DESC, id DESC`,
    )
    return sendJson(res, 200, { ok: true, users })
  }

  if (action !== 'login' && action !== 'register') {
    return sendJson(res, 400, { error: `Acción de autenticación desconocida: ${action}` })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const nombreInput = typeof body.nombre === 'string' ? body.nombre.trim() : ''

  if (!email || !EMAIL_RE.test(email)) {
    return sendJson(res, 400, { error: 'Introduce un email válido.' })
  }
  if (password.length < 4 || password.length > 128) {
    return sendJson(res, 400, { error: 'La contraseña debe tener entre 4 y 128 caracteres.' })
  }

  const rateKey = getRateLimitKey(req, email)
  if (await isRateLimited(rateKey)) {
    return sendJson(res, 429, {
      error: 'Demasiados intentos seguidos. Espera unos minutos antes de volver a intentarlo.',
    })
  }

  const existing = await queryOne(
    'SELECT id, email, nombre, password_hash, rol, estado FROM users WHERE lower(email) = ? LIMIT 1',
    [email],
  )

  if (!existing) {
    if (action === 'register') {
      if (password.length < 8) {
        return sendJson(res, 400, { error: 'Para crear una cuenta nueva usa una contraseña de al menos 8 caracteres.' })
      }
      const nombreFinal = (nombreInput || email.split('@')[0]).slice(0, 80)
      const hashed = hashPassword(password)
      await execute(
        `INSERT INTO users (email, nombre, password_hash, rol, estado)
         VALUES (?, ?, ?, 'usuario', 'pendiente')`,
        [email, nombreFinal, hashed],
      )
      return sendJson(res, 202, {
        pending: true,
        message: 'Solicitud creada. Pendiente de aprobación.',
      })
    }

    return sendJson(res, 404, {
      error: 'Email no reconocido. Revisa que esté bien escrito.',
    })
  }

  if (existing.estado === 'pendiente') {
    return sendJson(res, 403, {
      error: 'Tu cuenta está pendiente de aprobación por el administrador.',
    })
  }

  if (existing.estado === 'rechazado') {
    return sendJson(res, 403, { error: 'Acceso denegado.' })
  }

  // Cuenta aprobada
  if (!existing.password_hash) {
    const hashed = hashPassword(password)
    const nombreActualizado = existing.nombre || nombreInput || email.split('@')[0]
    const hoy = hoyMadrid()

    await batch([
      {
        sql: 'UPDATE users SET password_hash = ?, nombre = ? WHERE id = ?',
        args: [hashed, nombreActualizado, existing.id],
      },
      {
        sql: 'INSERT OR IGNORE INTO perfil (user_id, objetivo, dias_min, dias_max) VALUES (?, ?, 4, 6)',
        args: [existing.id, 'Fuerza, carrera y progresión de rodilla'],
      },
      {
        sql: 'INSERT OR IGNORE INTO estado_rodilla (user_id, fase_id, desde, modo_auto) VALUES (?, 1, ?, 1)',
        args: [existing.id, hoy],
      },
    ])

    const userPayload = {
      id: existing.id,
      email: existing.email,
      nombre: nombreActualizado,
      rol: existing.rol,
    }
    const token = signSessionToken(userPayload)
    return sendJson(
      res,
      200,
      { authenticated: true, firstSetup: true, user: userPayload },
      { 'Set-Cookie': buildSessionCookie(req, token) },
    )
  }

  if (!verifyPassword(password, existing.password_hash)) {
    await recordFailedLogin(rateKey)
    return sendJson(res, 401, { error: 'Contraseña incorrecta' })
  }

  await clearFailedLogin(rateKey)

  const userPayload = {
    id: existing.id,
    email: existing.email,
    nombre: existing.nombre,
    rol: existing.rol,
  }
  const token = signSessionToken(userPayload)
  return sendJson(
    res,
    200,
    { authenticated: true, user: userPayload },
    { 'Set-Cookie': buildSessionCookie(req, token) },
  )
})
