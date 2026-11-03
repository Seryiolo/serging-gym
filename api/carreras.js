/**
 * Endpoint /api/carreras
 * GET  -> historial de carreras + ritmosReferencia + objetivos + zonasRitmo personalizadas (Z1..Z5)
 * POST -> registro atomico en entrenos + carreras, actualizar_objetivo y eliminar_carrera
 */
import { requireUser } from './_lib/auth.js'
import { methodNotAllowed, readJson, sendJson, withErrorHandling } from './_lib/http.js'
import { batch, execute, query, queryOne, readBatch } from './_lib/turso.js'
import { esISO, hoyMadrid } from '../shared/fechas.js'
import { formatRitmo } from '../shared/numeros.js'

const TIPOS_CARRERA = new Set([
  'rodaje',
  'series',
  'fartlek',
  'tempo',
  'tirada_larga',
  'competicion',
  'tecnica',
])

const SUPERFICIES_VALIDAS = new Set(['pista', 'asfalto', 'tierra', 'cinta'])

/**
 * Calcula Z1..Z5 personalizadas a partir de los ritmos de referencia del usuario.
 */
export function calcularZonasRitmo(ritmosReferencia = []) {
  // Ordenar por fecha mas reciente para quedarnos con la referencia vigente de cada distancia
  const vigentesPorDist = new Map()
  for (const r of ritmosReferencia) {
    if (!r || !(r.distancia_m > 0) || !(r.ritmo_seg_km > 0)) continue
    const prev = vigentesPorDist.get(r.distancia_m)
    if (!prev || String(r.fecha || '') >= String(prev.fecha || '')) {
      vigentesPorDist.set(r.distancia_m, r)
    }
  }

  const refs = Array.from(vigentesPorDist.values())

  // Estimar ritmo equivalente de 10k con formula de Riegel: ritmo2 = ritmo1 * (D2 / D1)^0.06
  let ritmo10k = 285 // 4:45/km por defecto si aun no hay marcas
  if (refs.length > 0) {
    const exacta10k = vigentesPorDist.get(10000)
    if (exacta10k) {
      ritmo10k = exacta10k.ritmo_seg_km
    } else {
      // Usar la referencia mas cercana a 10k
      refs.sort((a, b) => Math.abs(a.distancia_m - 10000) - Math.abs(b.distancia_m - 10000))
      const base = refs[0]
      ritmo10k = Math.round(base.ritmo_seg_km * Math.pow(10000 / base.distancia_m, 0.06))
    }
  }

  const ref5k = vigentesPorDist.get(5000)?.ritmo_seg_km ?? Math.round(ritmo10k * Math.pow(0.5, 0.06))
  const refMedia =
    vigentesPorDist.get(21097)?.ritmo_seg_km ??
    vigentesPorDist.get(21000)?.ritmo_seg_km ??
    Math.round(ritmo10k * Math.pow(2.10975, 0.06))

  const rawZones = [
    {
      zona: 1,
      codigo: 'Z1',
      nombre: 'Z1 · Regenerativo',
      descripcion: 'Trote muy suave de recuperación, calentamiento y descarga articular.',
      rapido: Math.round(ritmo10k + 62),
      lento: Math.round(ritmo10k + 95),
    },
    {
      zona: 2,
      codigo: 'Z2',
      nombre: 'Z2 · Rodaje Aeróbico',
      descripcion: 'Base aeróbica conversacional para sumar kilómetros sin fatiga.',
      rapido: Math.round(ritmo10k + 34),
      lento: Math.round(ritmo10k + 62),
    },
    {
      zona: 3,
      codigo: 'Z3',
      nombre: 'Z3 · Tempo / Media-Maratón',
      descripcion: 'Ritmo controlado y sostenido (bloques de 15-40 min).',
      rapido: Math.round(Math.min(refMedia, ritmo10k + 13)),
      lento: Math.round(Math.max(refMedia + 16, ritmo10k + 33)),
    },
    {
      zona: 4,
      codigo: 'Z4',
      nombre: 'Z4 · Umbral (10k - 15k)',
      descripcion: 'Umbral anaeróbico, series largas de 2000m-3000m y ritmo competición 10k.',
      rapido: Math.round(ritmo10k - 5),
      lento: Math.round(ritmo10k + 12),
    },
    {
      zona: 5,
      codigo: 'Z5',
      nombre: 'Z5 · VO2max (Series 1k - 5k)',
      descripcion: 'Intervalos intensos en pista (400m - 1000m) para potencia aeróbica.',
      rapido: Math.max(150, Math.round(Math.min(ref5k - 16, ritmo10k - 26))),
      lento: Math.round(Math.min(ref5k + 3, ritmo10k - 6)),
    },
  ]

  return rawZones.map((z) => ({
    zona: z.zona,
    codigo: z.codigo,
    nombre: z.nombre,
    descripcion: z.descripcion,
    ritmo_min_seg_km: z.rapido,
    ritmo_max_seg_km: z.lento,
    rango: `${formatRitmo(z.rapido)} - ${formatRitmo(z.lento)} /km`,
  }))
}

export default withErrorHandling(async function carrerasHandler(req, res) {
  const user = await requireUser(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const [carreras, ritmosReferencia, objetivos] = await readBatch([
      {
        sql: `SELECT
                c.id, c.entreno_id, substr(e.inicio, 1, 10) AS fecha, e.inicio,
                c.tipo, c.distancia_m, c.duracion_s, c.ritmo_seg_km,
                c.superficie, c.molestia_rodilla, c.series_detalle, c.nota,
                e.sesion_plan_id
              FROM carreras c
              JOIN entrenos e ON e.id = c.entreno_id
              WHERE e.user_id = ?
              ORDER BY e.inicio DESC, c.id DESC`,
        args: [user.id],
      },
      {
        sql: `SELECT id, distancia_m, ritmo_seg_km, fecha
              FROM ritmos_referencia
              WHERE user_id = ?
              ORDER BY distancia_m ASC, fecha DESC`,
        args: [user.id],
      },
      {
        sql: `SELECT id, nombre, fecha, distancia_m, tiempo_objetivo_s
              FROM carreras_objetivo
              WHERE user_id = ?
              ORDER BY fecha ASC`,
        args: [user.id],
      },
    ])

    const zonasRitmo = calcularZonasRitmo(ritmosReferencia)
    return sendJson(res, 200, {
      carreras,
      ritmosReferencia,
      objetivos,
      zonasRitmo,
    })
  }

  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'POST'])
  }

  const body = await readJson(req)
  const action = String(body.action || 'registrar').trim()

  if (action === 'actualizar_objetivo' || action === 'eliminar_objetivo') {
    if (action === 'eliminar_objetivo' || body.eliminar === true) {
      const objId = Number(body.id)
      if (!Number.isInteger(objId) || objId <= 0) {
        return sendJson(res, 400, { error: 'ID de carrera objetivo no válido.' })
      }
      await execute('DELETE FROM carreras_objetivo WHERE id = ? AND user_id = ?', [objId, user.id])
      const objetivos = await query(
        'SELECT id, nombre, fecha, distancia_m, tiempo_objetivo_s FROM carreras_objetivo WHERE user_id = ? ORDER BY fecha ASC',
        [user.id],
      )
      return sendJson(res, 200, { ok: true, objetivos })
    }

    const nombre = String(body.nombre || '').trim()
    const fecha = String(body.fecha || '').trim()
    const distanciaM = Math.round(Number(body.distancia_m))
    const tiempoObjetivoS =
      body.tiempo_objetivo_s !== null &&
      body.tiempo_objetivo_s !== undefined &&
      body.tiempo_objetivo_s !== '' &&
      Number(body.tiempo_objetivo_s) > 0
        ? Math.round(Number(body.tiempo_objetivo_s))
        : null

    if (nombre.length < 2) {
      return sendJson(res, 400, { error: 'Introduce un nombre válido para el objetivo.' })
    }
    if (!esISO(fecha)) {
      return sendJson(res, 400, { error: 'La fecha del objetivo debe tener formato YYYY-MM-DD.' })
    }
    if (!Number.isFinite(distanciaM) || distanciaM <= 0) {
      return sendJson(res, 400, { error: 'La distancia del objetivo debe ser mayor que 0 metros.' })
    }

    if (body.id) {
      const objId = Number(body.id)
      const upd = await execute(
        `UPDATE carreras_objetivo
         SET nombre = ?, fecha = ?, distancia_m = ?, tiempo_objetivo_s = ?
         WHERE id = ? AND user_id = ?`,
        [nombre, fecha, distanciaM, tiempoObjetivoS, objId, user.id],
      )
      if (upd.rowsAffected === 0) {
        return sendJson(res, 404, { error: 'Objetivo de carrera no encontrado.' })
      }
    } else {
      await execute(
        `INSERT INTO carreras_objetivo (user_id, nombre, fecha, distancia_m, tiempo_objetivo_s)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, nombre, fecha, distanciaM, tiempoObjetivoS],
      )
    }

    const objetivos = await query(
      'SELECT id, nombre, fecha, distancia_m, tiempo_objetivo_s FROM carreras_objetivo WHERE user_id = ? ORDER BY fecha ASC',
      [user.id],
    )
    return sendJson(res, 200, { ok: true, objetivos })
  }

  if (action === 'actualizar_ritmo') {
    const distanciaM = Math.round(Number(body.distancia_m))
    const ritmoSegKm = Math.round(Number(body.ritmo_seg_km))
    const fecha = esISO(body.fecha) ? body.fecha : hoyMadrid()

    if (!Number.isFinite(distanciaM) || distanciaM <= 0 || !Number.isFinite(ritmoSegKm) || ritmoSegKm <= 0) {
      return sendJson(res, 400, { error: 'Distancia y ritmo en segundos/km deben ser mayores que 0.' })
    }

    await execute(
      `INSERT INTO ritmos_referencia (user_id, distancia_m, ritmo_seg_km, fecha)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, distancia_m, fecha) DO UPDATE SET ritmo_seg_km = excluded.ritmo_seg_km`,
      [user.id, distanciaM, ritmoSegKm, fecha],
    )

    const ritmosReferencia = await query(
      'SELECT id, distancia_m, ritmo_seg_km, fecha FROM ritmos_referencia WHERE user_id = ? ORDER BY distancia_m ASC, fecha DESC',
      [user.id],
    )
    return sendJson(res, 200, {
      ok: true,
      ritmosReferencia,
      zonasRitmo: calcularZonasRitmo(ritmosReferencia),
    })
  }

  if (action === 'eliminar_carrera') {
    const carreraId = Number(body.carreraId ?? body.id)
    if (!Number.isInteger(carreraId) || carreraId <= 0) {
      return sendJson(res, 400, { error: 'ID de carrera no válido.' })
    }

    const row = await queryOne(
      `SELECT c.id, c.entreno_id,
              (SELECT COUNT(*) FROM series_registradas sr WHERE sr.entreno_id = c.entreno_id) AS num_series
       FROM carreras c
       JOIN entrenos e ON e.id = c.entreno_id
       WHERE c.id = ? AND e.user_id = ?
       LIMIT 1`,
      [carreraId, user.id],
    )

    if (!row) {
      return sendJson(res, 404, { error: 'Carrera no encontrada.' })
    }

    if ((row.num_series ?? 0) === 0) {
      await execute('DELETE FROM entrenos WHERE id = ? AND user_id = ?', [row.entreno_id, user.id])
    } else {
      await execute('DELETE FROM carreras WHERE id = ?', [carreraId])
    }

    return sendJson(res, 200, { ok: true })
  }

  // Registro de carrera (default / action === 'registrar')
  const tipo = String(body.tipo || 'rodaje').trim().toLowerCase()
  if (!TIPOS_CARRERA.has(tipo)) {
    return sendJson(res, 400, { error: 'Tipo de sesión de carrera no válido.' })
  }

  const distanciaM = Math.round(Number(body.distancia_m))
  const duracionS = Math.round(Number(body.duracion_s))
  if (!Number.isFinite(distanciaM) || distanciaM <= 0) {
    return sendJson(res, 400, { error: 'La distancia debe ser mayor que 0 metros.' })
  }
  if (!Number.isFinite(duracionS) || duracionS <= 0) {
    return sendJson(res, 400, { error: 'La duración debe ser mayor que 0 segundos.' })
  }

  const rawSup = typeof body.superficie === 'string' ? body.superficie.trim().toLowerCase() : ''
  const superficie = rawSup && SUPERFICIES_VALIDAS.has(rawSup) ? rawSup : null

  const molestiaRaw = body.molestia_rodilla
  const molestiaRodilla =
    molestiaRaw !== null && molestiaRaw !== undefined && molestiaRaw !== '' && Number.isFinite(Number(molestiaRaw))
      ? Math.max(0, Math.min(10, Math.round(Number(molestiaRaw))))
      : null

  let seriesDetalle = null
  if (body.series_detalle !== null && body.series_detalle !== undefined && body.series_detalle !== '') {
    seriesDetalle =
      typeof body.series_detalle === 'string'
        ? body.series_detalle.trim() || null
        : JSON.stringify(body.series_detalle)
  }

  const nota = typeof body.nota === 'string' && body.nota.trim() ? body.nota.trim() : null
  const fechaIso = esISO(body.fecha) ? body.fecha : hoyMadrid()
  const inicio = `${fechaIso} 08:30:00`
  const fin = `${fechaIso} ${new Date(Date.UTC(2000, 0, 1, 8, 30, 0) + duracionS * 1000)
    .toISOString()
    .slice(11, 19)}`

  let validSesionPlanId = null
  if (body.sesionPlanId !== null && body.sesionPlanId !== undefined && body.sesionPlanId !== '') {
    const pid = Number(body.sesionPlanId)
    if (Number.isInteger(pid) && pid > 0) {
      const plan = await queryOne(
        'SELECT id FROM sesiones_plan WHERE id = ? AND user_id = ? LIMIT 1',
        [pid, user.id],
      )
      if (plan) validSesionPlanId = pid
    }
  }

  const stmts = [
    {
      sql: `INSERT INTO entrenos (
              user_id, sesion_plan_id, inicio, fin,
              molestia_rodilla_durante, molestia_rodilla_despues, nota
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id`,
      args: [user.id, validSesionPlanId, inicio, fin, molestiaRodilla, molestiaRodilla, nota],
    },
    {
      sql: `INSERT INTO carreras (
              entreno_id, tipo, distancia_m, duracion_s,
              superficie, molestia_rodilla, series_detalle, nota
            ) VALUES (
              (SELECT MAX(id) FROM entrenos WHERE user_id = ?),
              ?, ?, ?, ?, ?, ?, ?
            )
            RETURNING id, entreno_id`,
      args: [
        user.id,
        tipo,
        distanciaM,
        duracionS,
        superficie,
        molestiaRodilla,
        seriesDetalle,
        nota,
      ],
    },
  ]

  if (validSesionPlanId !== null) {
    stmts.push({
      sql: `UPDATE sesiones_plan SET estado = 'completada' WHERE id = ? AND user_id = ?`,
      args: [validSesionPlanId, user.id],
    })
  }

  const results = await batch(stmts)
  const entrenoId = results[0]?.rows[0]?.id ?? results[0]?.lastInsertRowid
  const carreraId = results[1]?.rows[0]?.id ?? results[1]?.lastInsertRowid
  const ritmoSegKm = Math.trunc((duracionS * 1000) / distanciaM)

  return sendJson(res, 201, {
    ok: true,
    carreraId,
    entrenoId,
    ritmo_seg_km: ritmoSegKm,
  })
})
