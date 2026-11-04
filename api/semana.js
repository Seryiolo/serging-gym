/**
 * Endpoint /api/semana
 * GET  ?lunes=YYYY-MM-DD -> semana + sesiones planificadas
 * POST -> action: 'generar' | 'mover_sesion' | 'reorganizar_semana' | 'estado_sesion'
 */
import { requireUser } from './_lib/auth.js'
import { getQuery, methodNotAllowed, readJson, sendJson, withErrorHandling } from './_lib/http.js'
import { batch, execute } from './_lib/turso.js'
import { cargarSesionesSemana, generarSemanaPlan } from './_lib/planner-db.js'
import { esISO, hoyMadrid, lunesDe } from '../shared/fechas.js'

export default withErrorHandling(async function semanaHandler(req, res) {
  const user = await requireUser(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const q = getQuery(req)
    const baseIso = esISO(q.lunes) ? q.lunes : hoyMadrid()
    const lunes = lunesDe(baseIso)
    const data = await cargarSesionesSemana(user.id, lunes)
    return sendJson(res, 200, data)
  }

  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'POST'])
  }

  const body = await readJson(req)
  const action = String(body.action || '').trim()

  if (action === 'generar') {
    const dias = Number(body.dias ?? 5)
    if (![4, 5, 6].includes(dias)) {
      return sendJson(res, 400, { error: 'El número de días de la semana debe ser 4, 5 o 6.' })
    }
    const baseIso = esISO(body.lunes) ? body.lunes : hoyMadrid()
    const lunes = lunesDe(baseIso)
    const hayCarrera = Boolean(body.hayCarrera)
    const segundoSuperior = Boolean(body.segundoSuperior)
    const sobreescribir = body.sobreescribir === undefined ? true : Boolean(body.sobreescribir)

    const { semana, sesiones } = await generarSemanaPlan(user.id, {
      lunes,
      dias,
      hayCarrera,
      segundoSuperior,
      sobreescribir,
    })

    return sendJson(res, 200, { ok: true, semana, sesiones })
  }

  if (action === 'mover_sesion') {
    const sesionId = Number(body.sesionId)
    const nuevaFecha = String(body.nuevaFecha || '').trim()

    if (!Number.isInteger(sesionId) || sesionId <= 0) {
      return sendJson(res, 400, { error: 'ID de sesión no válido.' })
    }
    if (!esISO(nuevaFecha)) {
      return sendJson(res, 400, { error: 'La nueva fecha debe tener formato YYYY-MM-DD.' })
    }

    const result = await execute(
      'UPDATE sesiones_plan SET fecha = ? WHERE id = ? AND user_id = ?',
      [nuevaFecha, sesionId, user.id],
    )
    if (result.rowsAffected === 0) {
      return sendJson(res, 404, { error: 'Sesión planificada no encontrada.' })
    }
    return sendJson(res, 200, { ok: true })
  }

  if (action === 'reorganizar_semana') {
    const cambios = Array.isArray(body.cambios) ? body.cambios : []
    if (cambios.length === 0) {
      return sendJson(res, 400, { error: 'No se enviaron cambios para reorganizar la semana.' })
    }

    const stmts = []
    for (const c of cambios) {
      const sesionId = Number(c.sesionId)
      const nuevaFecha = String(c.nuevaFecha || '').trim()
      if (!Number.isInteger(sesionId) || sesionId <= 0 || !esISO(nuevaFecha)) {
        return sendJson(res, 400, { error: 'Datos de sesión o fecha inválidos en la reorganización.' })
      }
      stmts.push({
        sql: 'UPDATE sesiones_plan SET fecha = ? WHERE id = ? AND user_id = ?',
        args: [nuevaFecha, sesionId, user.id],
      })
    }

    await batch(stmts)
    const baseIso = esISO(body.lunes) ? body.lunes : hoyMadrid()
    const data = await cargarSesionesSemana(user.id, lunesDe(baseIso))
    return sendJson(res, 200, { ok: true, ...data })
  }

  if (action === 'estado_sesion') {
    const sesionId = Number(body.sesionId)
    const estado = String(body.estado || '').trim()

    if (!Number.isInteger(sesionId) || sesionId <= 0) {
      return sendJson(res, 400, { error: 'ID de sesión no válido.' })
    }
    if (!['pendiente', 'completada', 'omitida'].includes(estado)) {
      return sendJson(res, 400, { error: 'Estado de sesión no válido.' })
    }

    const result = await execute(
      'UPDATE sesiones_plan SET estado = ? WHERE id = ? AND user_id = ?',
      [estado, sesionId, user.id],
    )
    if (result.rowsAffected === 0) {
      return sendJson(res, 404, { error: 'Sesión planificada no encontrada.' })
    }
    return sendJson(res, 200, { ok: true })
  }

  return sendJson(res, 400, { error: `Acción no reconocida en /api/semana: ${action}` })
})
