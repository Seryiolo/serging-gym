/**
 * Endpoint /api/evolucion
 * GET  -> pesos, rodilla (actual, fases, historial, evaluacion, entrenosRecientes),
 *         entrenosPendientesHinchazon, carrerasResumen y logros reales calculados desde BD
 * POST -> action: 'registrar_peso' | 'eliminar_peso' | 'cambiar_fase_rodilla'
 */
import { requireUser } from './_lib/auth.js'
import { methodNotAllowed, readJson, sendJson, withErrorHandling } from './_lib/http.js'
import { batch, execute, query, queryOne, readBatch } from './_lib/turso.js'
import { construirEstadoRodilla, evaluarRodillaUsuario } from './_lib/planner-db.js'
import { addDias, esISO, hoyMadrid } from '../shared/fechas.js'
import { parseDecimal } from '../shared/numeros.js'

function calcularRachaRodillaSinDolor(entrenos) {
  let racha = 0
  for (const e of entrenos) {
    if (e.molestia_durante == null && e.molestia_despues == null) continue
    const pico = Math.max(e.molestia_durante ?? 0, e.molestia_despues ?? 0)
    if (pico <= 2 && e.hinchazon !== 1) {
      racha += 1
    } else {
      break
    }
  }
  return racha
}

function construirLogros({ entrenosCompletados, rachaRodillaSinDolor, kmAcumulados, ejerciciosConPR, faseId }) {
  const insignias = [
    {
      id: 'primer_entreno',
      titulo: 'Primer entrenamiento',
      descripcion: 'Registrar tu primera sesión completada.',
      conseguido: entrenosCompletados >= 1,
      progreso: Math.min(entrenosCompletados, 1),
      objetivo: 1,
    },
    {
      id: 'constancia_10',
      titulo: 'Constancia de hierro',
      descripcion: 'Completar 10 entrenamientos registrados.',
      conseguido: entrenosCompletados >= 10,
      progreso: Math.min(entrenosCompletados, 10),
      objetivo: 10,
    },
    {
      id: 'rodilla_estable_6',
      titulo: 'Rodilla bajo control',
      descripcion: 'Encadenar 6 sesiones seguidas sin dolor (>2/10) ni hinchazón.',
      conseguido: rachaRodillaSinDolor >= 6,
      progreso: Math.min(rachaRodillaSinDolor, 6),
      objetivo: 6,
    },
    {
      id: 'corredor_50k',
      titulo: 'Base aeróbica 50K',
      descripcion: 'Acumular 50 km de carrera registrados.',
      conseguido: kmAcumulados >= 50,
      progreso: Math.min(kmAcumulados, 50),
      objetivo: 50,
    },
    {
      id: 'fuerza_anclas_5',
      titulo: 'Progresión de cargas',
      descripcion: 'Registrar marcas de peso en al menos 5 ejercicios distintos.',
      conseguido: ejerciciosConPR >= 5,
      progreso: Math.min(ejerciciosConPR, 5),
      objetivo: 5,
    },
    {
      id: 'fase_avanzada',
      titulo: 'Reatletización avanzada',
      descripcion: 'Alcanzar la Fase 3 o superior en la progresión de rodilla.',
      conseguido: faseId >= 3,
      progreso: Math.min(faseId, 3),
      objetivo: 3,
    },
  ]

  return {
    entrenosCompletados,
    rachaRodillaSinDolor,
    kmAcumulados,
    ejerciciosConPR,
    faseRodillaActual: faseId,
    insignias,
  }
}

export default withErrorHandling(async function evolucionHandler(req, res) {
  const user = await requireUser(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const hoy = hoyMadrid()
    const prefijoMes = hoy.slice(0, 7) // YYYY-MM
    const desdeHinchazon = addDias(hoy, -2)
    const hastaHinchazon = addDias(hoy, -1)

    const [
      pesos,
      rodillaRows,
      fasesRows,
      historialFases,
      entrenosRecientes,
      entrenosPendientesHinchazon,
      carrerasHistorial,
      totalesRows,
    ] = await readBatch([
      {
        sql: 'SELECT id, fecha, kg FROM peso_corporal WHERE user_id = ? ORDER BY fecha ASC, id ASC',
        args: [user.id],
      },
      {
        sql: `SELECT er.fase_id, er.desde, er.modo_auto,
                     fr.nombre, fr.descripcion, fr.impacto_max,
                     fr.sesiones_para_subir, fr.molestia_max_subir, fr.molestia_min_bajar
              FROM estado_rodilla er
              JOIN fases_rodilla fr ON fr.id = er.fase_id
              WHERE er.user_id = ? LIMIT 1`,
        args: [user.id],
      },
      {
        sql: `SELECT id, nombre, descripcion, impacto_max,
                     sesiones_para_subir, molestia_max_subir, molestia_min_bajar
              FROM fases_rodilla ORDER BY id ASC`,
        args: [],
      },
      {
        sql: `SELECT h.id, h.fase_id, f.nombre AS fase_nombre, h.fecha, h.motivo
              FROM historial_fase_rodilla h
              JOIN fases_rodilla f ON f.id = h.fase_id
              WHERE h.user_id = ?
              ORDER BY h.fecha DESC, h.id DESC
              LIMIT 30`,
        args: [user.id],
      },
      {
        sql: `SELECT
                e.id,
                substr(e.inicio, 1, 10) AS fecha,
                e.inicio,
                e.molestia_rodilla_durante AS molestia_durante,
                e.molestia_rodilla_despues AS molestia_despues,
                e.hinchazon_dia_siguiente AS hinchazon,
                e.nota,
                COALESCE(
                  sp.titulo,
                  CASE WHEN MAX(c.id) IS NOT NULL THEN 'Sesión de carrera' ELSE 'Entrenamiento libre' END
                ) AS titulo
              FROM entrenos e
              LEFT JOIN sesiones_plan sp ON sp.id = e.sesion_plan_id
              LEFT JOIN carreras c ON c.entreno_id = e.id
              WHERE e.user_id = ?
              GROUP BY e.id
              ORDER BY e.inicio DESC, e.id DESC
              LIMIT 25`,
        args: [user.id],
      },
      {
        sql: `SELECT
                e.id,
                substr(e.inicio, 1, 10) AS fecha,
                e.inicio,
                e.molestia_rodilla_durante AS molestia_durante,
                e.molestia_rodilla_despues AS molestia_despues,
                COALESCE(sp.titulo, 'Entrenamiento registrado') AS titulo
              FROM entrenos e
              LEFT JOIN sesiones_plan sp ON sp.id = e.sesion_plan_id
              WHERE e.user_id = ?
                AND substr(e.inicio, 1, 10) >= ?
                AND substr(e.inicio, 1, 10) <= ?
                AND e.hinchazon_dia_siguiente IS NULL
              ORDER BY e.inicio DESC, e.id DESC`,
        args: [user.id, desdeHinchazon, hastaHinchazon],
      },
      {
        sql: `SELECT
                c.id, c.entreno_id, substr(e.inicio, 1, 10) AS fecha,
                c.tipo, c.distancia_m, c.duracion_s, c.ritmo_seg_km,
                c.superficie, c.molestia_rodilla
              FROM carreras c
              JOIN entrenos e ON e.id = c.entreno_id
              WHERE e.user_id = ?
              ORDER BY e.inicio DESC, c.id DESC
              LIMIT 50`,
        args: [user.id],
      },
      {
        sql: `SELECT
                (SELECT COUNT(*) FROM entrenos WHERE user_id = ?) AS entrenos_completados,
                (SELECT COALESCE(SUM(c.distancia_m), 0)
                 FROM carreras c JOIN entrenos e ON e.id = c.entreno_id
                 WHERE e.user_id = ?) AS metros_totales,
                (SELECT COUNT(DISTINCT sr.ejercicio_id)
                 FROM series_registradas sr JOIN entrenos e ON e.id = sr.entreno_id
                 WHERE e.user_id = ? AND sr.completada = 1 AND sr.peso_kg > 0) AS ejercicios_con_pr`,
        args: [user.id, user.id, user.id],
      },
    ])

    const estadoBase = construirEstadoRodilla(rodillaRows[0], fasesRows, entrenosRecientes, hoy)
    const actual = {
      fase_id: estadoBase.fase_id,
      nombre: estadoBase.nombre,
      descripcion: estadoBase.descripcion,
      impacto_max: estadoBase.impacto_max,
      desde: estadoBase.desde,
      modo_auto: estadoBase.modo_auto,
    }

    const rodilla = {
      ...actual,
      actual,
      fases: estadoBase.fases,
      historialFases,
      evaluacion: estadoBase.evaluacion,
      entrenosRecientes,
    }

    const carrerasMes = carrerasHistorial.filter((c) => String(c.fecha || '').startsWith(prefijoMes))
    const metrosMes = carrerasMes.reduce((acc, c) => acc + (c.distancia_m || 0), 0)
    const carrerasResumen = {
      totalKmMes: Math.round((metrosMes / 1000) * 10) / 10,
      totalSesionesMes: carrerasMes.length,
      historial: carrerasHistorial,
    }

    const tot = totalesRows[0] || {}
    const entrenosCompletados = tot.entrenos_completados ?? 0
    const kmAcumulados = Math.round(((tot.metros_totales ?? 0) / 1000) * 10) / 10
    const ejerciciosConPR = tot.ejercicios_con_pr ?? 0
    const rachaRodillaSinDolor = calcularRachaRodillaSinDolor(entrenosRecientes)

    const logros = construirLogros({
      entrenosCompletados,
      rachaRodillaSinDolor,
      kmAcumulados,
      ejerciciosConPR,
      faseId: actual.fase_id,
    })

    return sendJson(res, 200, {
      pesos,
      rodilla,
      entrenosPendientesHinchazon,
      carrerasResumen,
      logros,
    })
  }

  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'POST'])
  }

  const body = await readJson(req)
  const action = String(body.action || '').trim()

  if (action === 'registrar_peso') {
    const fecha = esISO(body.fecha) ? body.fecha : hoyMadrid()
    const kg = parseDecimal(body.kg)

    if (kg === null || kg <= 0 || kg >= 400) {
      return sendJson(res, 400, { error: 'Introduce un peso corporal válido (entre 1 y 399 kg).' })
    }

    const kgRedondeado = Math.round(kg * 100) / 100
    await execute(
      `INSERT INTO peso_corporal (user_id, fecha, kg)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, fecha) DO UPDATE SET kg = excluded.kg`,
      [user.id, fecha, kgRedondeado],
    )

    const pesos = await query(
      'SELECT id, fecha, kg FROM peso_corporal WHERE user_id = ? ORDER BY fecha ASC, id ASC',
      [user.id],
    )
    return sendJson(res, 200, { ok: true, pesos })
  }

  if (action === 'eliminar_peso') {
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0) {
      return sendJson(res, 400, { error: 'ID de registro de peso no válido.' })
    }

    const del = await execute('DELETE FROM peso_corporal WHERE id = ? AND user_id = ?', [
      id,
      user.id,
    ])
    if (del.rowsAffected === 0) {
      return sendJson(res, 404, { error: 'Registro de peso no encontrado.' })
    }

    const pesos = await query(
      'SELECT id, fecha, kg FROM peso_corporal WHERE user_id = ? ORDER BY fecha ASC, id ASC',
      [user.id],
    )
    return sendJson(res, 200, { ok: true, pesos })
  }

  if (action === 'cambiar_fase_rodilla') {
    const faseId = Number(body.fase_id)
    if (!Number.isInteger(faseId) || faseId <= 0) {
      return sendJson(res, 400, { error: 'Fase de rodilla no válida.' })
    }

    const faseExiste = await queryOne('SELECT id FROM fases_rodilla WHERE id = ? LIMIT 1', [faseId])
    if (!faseExiste) {
      return sendJson(res, 404, { error: 'La fase de rodilla indicada no existe.' })
    }

    const hoy = hoyMadrid()
    const modoAuto =
      body.modo_auto === undefined || body.modo_auto === null
        ? 1
        : body.modo_auto
          ? 1
          : 0
    const motivo =
      typeof body.motivo === 'string' && body.motivo.trim()
        ? body.motivo.trim()
        : 'Actualización manual de fase por el usuario'

    await batch([
      {
        sql: `INSERT INTO estado_rodilla (user_id, fase_id, desde, modo_auto)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
                desde = CASE WHEN estado_rodilla.fase_id != excluded.fase_id THEN excluded.desde ELSE estado_rodilla.desde END,
                fase_id = excluded.fase_id,
                modo_auto = excluded.modo_auto`,
        args: [user.id, faseId, hoy, modoAuto],
      },
      {
        sql: `INSERT INTO historial_fase_rodilla (user_id, fase_id, fecha, motivo)
              VALUES (?, ?, ?, ?)`,
        args: [user.id, faseId, hoy, motivo],
      },
    ])

    const rodilla = await evaluarRodillaUsuario(user.id)
    return sendJson(res, 200, { ok: true, rodilla })
  }

  return sendJson(res, 400, { error: `Acción no reconocida en /api/evolucion: ${action}` })
})
