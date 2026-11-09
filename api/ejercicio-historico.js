/**
 * Endpoint GET /api/ejercicio-historico?ejercicioId=<id>
 * Devuelve el historico real de series completadas de un ejercicio,
 * puntos para grafica (peso maximo, 1RM estimado con Epley, reps, segundos) y listado de sesiones.
 */
import { requireUser } from './_lib/auth.js'
import { getQuery, methodNotAllowed, sendJson, withErrorHandling } from './_lib/http.js'
import { readBatch } from './_lib/turso.js'
import { estimar1RM, ritmoSegKm } from '../shared/numeros.js'

export default withErrorHandling(async function ejercicioHistoricoHandler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const user = await requireUser(req, res)
  if (!user) return

  const q = getQuery(req)
  const ejercicioId = Number(q.ejercicioId ?? q.id)
  if (!Number.isInteger(ejercicioId) || ejercicioId <= 0) {
    return sendJson(res, 400, { error: 'ID de ejercicio no válido.' })
  }

  const [ejRows, seriesRows] = await readBatch([
    {
      sql: `SELECT id, nombre, grupo, patron, tipo_registro, unilateral, impacto,
                   equipamiento, instrucciones, video_url, poster_url, video_origen
            FROM ejercicios
            WHERE id = ? AND (user_id IS NULL OR user_id = ?)
            LIMIT 1`,
      args: [ejercicioId, user.id],
    },
    {
      sql: `SELECT
              en.id AS entreno_id,
              substr(en.inicio, 1, 10) AS fecha,
              en.inicio,
              COALESCE(sp.titulo, 'Entrenamiento libre') AS sesion_titulo,
              sr.ronda,
              sr.lado,
              sr.reps,
              sr.peso_kg,
              sr.segundos,
              sr.rpe
            FROM series_registradas sr
            JOIN entrenos en ON en.id = sr.entreno_id
            LEFT JOIN sesiones_plan sp ON sp.id = en.sesion_plan_id
            WHERE en.user_id = ? AND sr.ejercicio_id = ? AND sr.completada = 1
            ORDER BY en.inicio ASC, en.id ASC, sr.ronda ASC, sr.id ASC`,
      args: [user.id, ejercicioId],
    },
  ])

  const ejercicio = ejRows[0]
  if (!ejercicio) {
    return sendJson(res, 404, { error: 'Ejercicio no encontrado.' })
  }

  const sesionesMap = new Map()
  const graficaPorFecha = new Map()

  for (const row of seriesRows) {
    if (!sesionesMap.has(row.entreno_id)) {
      sesionesMap.set(row.entreno_id, {
        entreno_id: row.entreno_id,
        fecha: row.fecha,
        sesion_titulo: row.sesion_titulo,
        max_kg: null,
        max_1rm: null,
        max_reps: null,
        max_seg: null,
        min_seg: null,
        mejor_ritmo_seg_km: null,
        series: [],
      })
    }

    const sesionEntry = sesionesMap.get(row.entreno_id)
    const ritmoSerie =
      ejercicio.tipo_registro === 'carrera' && row.reps >= 200 && row.segundos > 0
        ? ritmoSegKm(row.reps, row.segundos)
        : null

    sesionEntry.series.push({
      ronda: row.ronda,
      lado: row.lado,
      reps: row.reps,
      peso_kg: row.peso_kg,
      segundos: row.segundos,
      ritmo_seg_km: ritmoSerie,
      rpe: row.rpe,
    })

    const rmObj =
      row.peso_kg != null && row.reps != null
        ? estimar1RM(row.peso_kg, Math.round(row.reps))
        : null
    const rmVal = rmObj?.valor ?? null

    if (row.peso_kg != null && (sesionEntry.max_kg === null || row.peso_kg > sesionEntry.max_kg)) {
      sesionEntry.max_kg = row.peso_kg
    }
    if (rmVal != null && (sesionEntry.max_1rm === null || rmVal > sesionEntry.max_1rm)) {
      sesionEntry.max_1rm = rmVal
    }
    if (row.reps != null && (sesionEntry.max_reps === null || row.reps > sesionEntry.max_reps)) {
      sesionEntry.max_reps = row.reps
    }
    if (row.segundos != null && row.segundos > 0) {
      if (sesionEntry.max_seg === null || row.segundos > sesionEntry.max_seg) {
        sesionEntry.max_seg = row.segundos
      }
      if (sesionEntry.min_seg === null || row.segundos < sesionEntry.min_seg) {
        sesionEntry.min_seg = row.segundos
      }
    }
    if (
      ritmoSerie != null &&
      (sesionEntry.mejor_ritmo_seg_km === null || ritmoSerie < sesionEntry.mejor_ritmo_seg_km)
    ) {
      sesionEntry.mejor_ritmo_seg_km = ritmoSerie
    }

    if (!graficaPorFecha.has(row.fecha)) {
      graficaPorFecha.set(row.fecha, {
        fecha: row.fecha,
        maxKg: null,
        max1RM: null,
        maxReps: null,
        maxSeg: null,
        minSeg: null,
        mejorRitmoSegKm: null,
      })
    }
    const punto = graficaPorFecha.get(row.fecha)
    if (row.peso_kg != null && (punto.maxKg === null || row.peso_kg > punto.maxKg)) {
      punto.maxKg = row.peso_kg
    }
    if (rmVal != null && (punto.max1RM === null || rmVal > punto.max1RM)) {
      punto.max1RM = rmVal
    }
    if (row.reps != null && (punto.maxReps === null || row.reps > punto.maxReps)) {
      punto.maxReps = row.reps
    }
    if (row.segundos != null && row.segundos > 0) {
      if (punto.maxSeg === null || row.segundos > punto.maxSeg) {
        punto.maxSeg = row.segundos
      }
      if (punto.minSeg === null || row.segundos < punto.minSeg) {
        punto.minSeg = row.segundos
      }
    }
    if (
      ritmoSerie != null &&
      (punto.mejorRitmoSegKm === null || ritmoSerie < punto.mejorRitmoSegKm)
    ) {
      punto.mejorRitmoSegKm = ritmoSerie
    }
  }

  const puntosGrafica = Array.from(graficaPorFecha.values()).sort((a, b) =>
    a.fecha.localeCompare(b.fecha),
  )
  const sesiones = Array.from(sesionesMap.values()).reverse()

  return sendJson(res, 200, {
    ejercicio,
    puntosGrafica,
    sesiones,
  })
})
