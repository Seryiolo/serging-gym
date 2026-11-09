/**
 * Endpoint /api/sesion
 * GET  ?id=<sesion_plan_id> -> detalle completo con bloques, ejercicios (con poster_url) y ultima_marca
 * POST -> action: 'completar' (sesion planificada o libre), 'sustituir_ejercicio', 'hinchazon_pendiente'
 */
import { requireUser } from './_lib/auth.js'
import { getQuery, methodNotAllowed, readJson, sendJson, withErrorHandling } from './_lib/http.js'
import { batch, execute, queryOne, readBatch } from './_lib/turso.js'
import { candidatosSustitucion, evaluarRodillaUsuario } from './_lib/planner-db.js'
import { hoyMadrid, TZ } from '../shared/fechas.js'
import { parseDecimal, formatDuracion, formatRitmo, ritmoSegKm } from '../shared/numeros.js'

function ahoraMadridISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`
}

function clampMolestia(val) {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(10, Math.round(n)))
}

function normalizeHinchazon(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'boolean') return val ? 1 : 0
  const n = Number(val)
  if (n === 0 || n === 1) return n
  return null
}

function normalizeLado(lado) {
  if (!lado) return 'ambos'
  const s = String(lado).trim().toLowerCase()
  if (s === 'izq' || s === 'izquierda' || s === 'l') return 'izq'
  if (s === 'dcha' || s === 'der' || s === 'derecha' || s === 'r') return 'dcha'
  return 'ambos'
}

function normalizeNonNegInt(val) {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

function normalizeRpe(val) {
  const n = parseDecimal(val)
  if (n === null || n < 1 || n > 10) return null
  return Math.round(n * 10) / 10
}

export default withErrorHandling(async function sesionHandler(req, res) {
  const user = await requireUser(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const q = getQuery(req)
    const sesionId = Number(q.id)
    if (!Number.isInteger(sesionId) || sesionId <= 0) {
      return sendJson(res, 400, { error: 'ID de sesión no válido.' })
    }

    const [sesionRows, itemsRows, marcasRows, entrenoRows] = await readBatch([
      {
        sql: `SELECT id, fecha, tipo, titulo, descripcion, estado, plantilla_id
              FROM sesiones_plan
              WHERE id = ? AND user_id = ?
              LIMIT 1`,
        args: [sesionId, user.id],
      },
      {
        sql: `SELECT
                se.id AS sesion_ejercicio_id,
                se.bloque_orden,
                se.bloque_nombre,
                se.bloque_tipo,
                se.orden,
                se.rol,
                se.superserie,
                se.series_obj,
                se.reps_obj,
                se.rpe_obj,
                se.descanso_s,
                se.nota,
                se.sustituye_a,
                e.id AS ej_id,
                e.nombre AS ej_nombre,
                e.grupo AS ej_grupo,
                e.patron AS ej_patron,
                e.tipo_registro AS ej_tipo_registro,
                e.unilateral AS ej_unilateral,
                e.impacto AS ej_impacto,
                e.equipamiento AS ej_equipamiento,
                e.instrucciones AS ej_instrucciones,
                e.video_url AS ej_video_url,
                e.poster_url AS ej_poster_url,
                e.video_origen AS ej_video_origen
              FROM sesion_ejercicios se
              JOIN sesiones_plan sp ON sp.id = se.sesion_plan_id
              JOIN ejercicios e ON e.id = se.ejercicio_id
              WHERE se.sesion_plan_id = ? AND sp.user_id = ?
              ORDER BY se.bloque_orden ASC, se.orden ASC, se.id ASC`,
        args: [sesionId, user.id],
      },
      {
        sql: `SELECT
                sr.ejercicio_id,
                substr(en.inicio, 1, 10) AS fecha,
                sr.peso_kg,
                sr.reps,
                sr.segundos
              FROM series_registradas sr
              JOIN entrenos en ON en.id = sr.entreno_id
              WHERE en.user_id = ?
                AND sr.completada = 1
                AND sr.ejercicio_id IN (
                  SELECT ejercicio_id FROM sesion_ejercicios WHERE sesion_plan_id = ?
                )
              ORDER BY
                en.inicio DESC,
                en.id DESC,
                COALESCE(sr.peso_kg, 0) DESC,
                COALESCE(sr.segundos, 0) DESC,
                COALESCE(sr.reps, 0) DESC`,
        args: [user.id, sesionId],
      },
      {
        sql: `SELECT id, sesion_plan_id, inicio, fin,
                     molestia_rodilla_durante AS molestia_durante,
                     molestia_rodilla_despues AS molestia_despues,
                     hinchazon_dia_siguiente AS hinchazon,
                     nota
              FROM entrenos
              WHERE sesion_plan_id = ? AND user_id = ?
              ORDER BY inicio DESC, id DESC
              LIMIT 1`,
        args: [sesionId, user.id],
      },
    ])

    const sesion = sesionRows[0]
    if (!sesion) {
      return sendJson(res, 404, { error: 'Sesión no encontrada.' })
    }

    const ultimaMarcaPorEjercicio = new Map()
    for (const m of marcasRows) {
      if (!ultimaMarcaPorEjercicio.has(m.ejercicio_id)) {
        ultimaMarcaPorEjercicio.set(m.ejercicio_id, {
          fecha: m.fecha,
          peso_kg: m.peso_kg,
          reps: m.reps,
          segundos: m.segundos,
        })
      }
    }

    const bloquesMap = new Map()
    for (const row of itemsRows) {
      if (!bloquesMap.has(row.bloque_orden)) {
        bloquesMap.set(row.bloque_orden, {
          orden: row.bloque_orden,
          nombre: row.bloque_nombre,
          tipo: row.bloque_tipo,
          items: [],
        })
      }
      bloquesMap.get(row.bloque_orden).items.push({
        sesion_ejercicio_id: row.sesion_ejercicio_id,
        orden: row.orden,
        rol: row.rol,
        superserie: row.superserie,
        series_obj: row.series_obj,
        reps_obj: row.reps_obj,
        rpe_obj: row.rpe_obj,
        descanso_s: row.descanso_s,
        nota: row.nota,
        sustituye_a: row.sustituye_a,
        ejercicio: {
          id: row.ej_id,
          nombre: row.ej_nombre,
          grupo: row.ej_grupo,
          patron: row.ej_patron,
          tipo_registro: row.ej_tipo_registro,
          unilateral: row.ej_unilateral,
          impacto: row.ej_impacto,
          equipamiento: row.ej_equipamiento,
          instrucciones: row.ej_instrucciones,
          video_url: row.ej_video_url,
          poster_url: row.ej_poster_url,
          video_origen: row.ej_video_origen,
        },
        ultima_marca: ultimaMarcaPorEjercicio.get(row.ej_id) ?? null,
      })
    }

    const entreno = entrenoRows[0] ?? null
    const bloques = Array.from(bloquesMap.values()).sort((a, b) => a.orden - b.orden)
    return sendJson(res, 200, { sesion, bloques, entreno })
  }

  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'POST'])
  }

  const body = await readJson(req)
  const action = String(body.action || '').trim()

  if (action === 'completar') {
    let validSesionPlanId = null
    if (body.sesionPlanId !== null && body.sesionPlanId !== undefined && body.sesionPlanId !== '') {
      const pid = Number(body.sesionPlanId)
      if (!Number.isInteger(pid) || pid <= 0) {
        return sendJson(res, 400, { error: 'ID de sesión planificada no válido.' })
      }
      const planRow = await queryOne(
        'SELECT id FROM sesiones_plan WHERE id = ? AND user_id = ? LIMIT 1',
        [pid, user.id],
      )
      if (!planRow) {
        return sendJson(res, 404, { error: 'La sesión planificada indicada no existe.' })
      }
      validSesionPlanId = pid
    }

    const ahora = new Date()
    const duracionSeg = Number(body.duracionSeg) > 0 ? Math.round(Number(body.duracionSeg)) : 0
    const finStr =
      typeof body.fin === 'string' && body.fin.trim()
        ? body.fin.trim()
        : ahoraMadridISO(ahora)
    const inicioStr =
      typeof body.inicio === 'string' && body.inicio.trim()
        ? body.inicio.trim()
        : duracionSeg > 0
          ? ahoraMadridISO(new Date(ahora.getTime() - duracionSeg * 1000))
          : `${hoyMadrid(ahora)} 09:00:00`

    const molestiaDurante = clampMolestia(body.molestiaDurante)
    const molestiaDespues = clampMolestia(body.molestiaDespues)
    const hinchazon = normalizeHinchazon(body.hinchazonDiaSiguiente)
    const nota = typeof body.nota === 'string' && body.nota.trim() ? body.nota.trim() : null

    const rawSeries = Array.isArray(body.series) ? body.series : []
    const seriesLimpias = []
    for (let i = 0; i < rawSeries.length; i++) {
      const s = rawSeries[i]
      if (!s) continue
      const ejId = Number(s.ejercicio_id)
      if (!Number.isInteger(ejId) || ejId <= 0) continue

      const sesEjId =
        s.sesion_ejercicio_id != null && Number.isInteger(Number(s.sesion_ejercicio_id)) && Number(s.sesion_ejercicio_id) > 0
          ? Number(s.sesion_ejercicio_id)
          : null

      const ronda = Math.max(1, Math.round(Number(s.ronda) || i + 1))
      const lado = normalizeLado(s.lado)
      const reps = normalizeNonNegInt(s.reps)
      const pesoParsed = parseDecimal(s.peso_kg)
      const pesoKg = pesoParsed !== null && pesoParsed >= 0 ? pesoParsed : null
      const segundos = normalizeNonNegInt(s.segundos)
      const rpe = normalizeRpe(s.rpe)
      const completada = s.completada === false || s.completada === 0 ? 0 : 1

      seriesLimpias.push({
        sesEjId,
        ejId,
        ronda,
        lado,
        reps,
        pesoKg,
        segundos,
        rpe,
        completada,
      })
    }

    const stmts = [
      {
        sql: `INSERT INTO entrenos (
                user_id, sesion_plan_id, inicio, fin,
                molestia_rodilla_durante, molestia_rodilla_despues,
                hinchazon_dia_siguiente, nota
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              RETURNING id`,
        args: [
          user.id,
          validSesionPlanId,
          inicioStr,
          finStr,
          molestiaDurante,
          molestiaDespues,
          hinchazon,
          nota,
        ],
      },
    ]

    for (const s of seriesLimpias) {
      stmts.push({
        sql: `INSERT INTO series_registradas (
                entreno_id, sesion_ejercicio_id, ejercicio_id,
                ronda, lado, reps, peso_kg, segundos, rpe, completada
              ) VALUES (
                (SELECT MAX(id) FROM entrenos WHERE user_id = ?),
                ?, ?, ?, ?, ?, ?, ?, ?, ?
              )`,
        args: [
          user.id,
          s.sesEjId,
          s.ejId,
          s.ronda,
          s.lado,
          s.reps,
          s.pesoKg,
          s.segundos,
          s.rpe,
          s.completada,
        ],
      })
    }

    if (validSesionPlanId !== null) {
      stmts.push({
        sql: `UPDATE sesiones_plan SET estado = 'completada' WHERE id = ? AND user_id = ?`,
        args: [validSesionPlanId, user.id],
      })
    }

    // Si hay series completadas de ejercicios de tipo 'carrera' con distancia (reps >= 200m) y tiempo (segundos > 0),
    // sincronizar automáticamente un registro en la tabla `carreras` para que sume km, ritmos y gráficas.
    const ejIdsUnicos = Array.from(new Set(seriesLimpias.map((s) => s.ejId)))
    if (ejIdsUnicos.length > 0) {
      const placeholders = ejIdsUnicos.map(() => '?').join(',')
      const [ejCarreraRows] = await readBatch([
        {
          sql: `SELECT id, nombre, tipo_registro FROM ejercicios WHERE id IN (${placeholders})`,
          args: ejIdsUnicos,
        },
      ])
      const idsTipoCarrera = new Set(
        (ejCarreraRows || [])
          .filter((e) => e.tipo_registro === 'carrera')
          .map((e) => e.id),
      )

      const seriesCarreraValidas = seriesLimpias.filter(
        (s) =>
          s.completada === 1 &&
          idsTipoCarrera.has(s.ejId) &&
          Number(s.reps) >= 200 &&
          Number(s.segundos) > 0,
      )

      if (seriesCarreraValidas.length > 0) {
        const distanciaTotalM = seriesCarreraValidas.reduce((acc, s) => acc + Number(s.reps), 0)
        const duracionTotalS = seriesCarreraValidas.reduce((acc, s) => acc + Number(s.segundos), 0)
        const sonIntervalosPista =
          seriesCarreraValidas.length >= 2 ||
          seriesCarreraValidas.some((s) => Number(s.reps) <= 3000)
        const tipoCarrera = sonIntervalosPista ? 'series' : 'rodaje'
        const superficie = sonIntervalosPista ? 'pista' : 'asfalto'
        const molestiaMax =
          molestiaDurante !== null || molestiaDespues !== null
            ? Math.max(molestiaDurante ?? 0, molestiaDespues ?? 0)
            : null

        const desgloseSeries = seriesCarreraValidas
          .map((s, idx) => {
            const r = ritmoSegKm(s.reps, s.segundos)
            return `#${idx + 1} ${s.reps}m en ${formatDuracion(s.segundos)} (${formatRitmo(r)}/km)`
          })
          .join(' · ')

        stmts.push({
          sql: `INSERT INTO carreras (
                  entreno_id, tipo, distancia_m, duracion_s,
                  superficie, molestia_rodilla, series_detalle, nota
                ) VALUES (
                  (SELECT MAX(id) FROM entrenos WHERE user_id = ?),
                  ?, ?, ?, ?, ?, ?, ?
                )`,
          args: [
            user.id,
            tipoCarrera,
            distanciaTotalM,
            duracionTotalS,
            superficie,
            molestiaMax,
            desgloseSeries,
            nota,
          ],
        })
      }
    }

    const results = await batch(stmts)
    const entrenoId = results[0]?.rows[0]?.id ?? results[0]?.lastInsertRowid
    const rodilla = await evaluarRodillaUsuario(user.id)

    return sendJson(res, 200, {
      ok: true,
      entrenoId,
      evaluacionRodilla: rodilla.evaluacion,
      rodilla,
    })
  }

  if (action === 'sustituir_ejercicio') {
    const sesionEjercicioId = Number(body.sesionEjercicioId)
    if (!Number.isInteger(sesionEjercicioId) || sesionEjercicioId <= 0) {
      return sendJson(res, 400, { error: 'ID de ejercicio de sesión no válido.' })
    }

    if (body.nuevoEjercicioId === undefined || body.nuevoEjercicioId === null || body.nuevoEjercicioId === '') {
      const candidatos = await candidatosSustitucion(user.id, sesionEjercicioId)
      return sendJson(res, 200, { candidatos })
    }

    const nuevoId = Number(body.nuevoEjercicioId)
    if (!Number.isInteger(nuevoId) || nuevoId <= 0) {
      return sendJson(res, 400, { error: 'ID del nuevo ejercicio no válido.' })
    }

    const [actualRows, nuevoEjRows] = await readBatch([
      {
        sql: `SELECT se.id, se.ejercicio_id, se.sustituye_a
              FROM sesion_ejercicios se
              JOIN sesiones_plan sp ON sp.id = se.sesion_plan_id
              WHERE se.id = ? AND sp.user_id = ?
              LIMIT 1`,
        args: [sesionEjercicioId, user.id],
      },
      {
        sql: `SELECT id FROM ejercicios
              WHERE id = ? AND activo = 1 AND (user_id IS NULL OR user_id = ?)
              LIMIT 1`,
        args: [nuevoId, user.id],
      },
    ])

    const actual = actualRows[0]
    if (!actual) {
      return sendJson(res, 404, { error: 'Ejercicio de sesión no encontrado.' })
    }
    if (!nuevoEjRows[0]) {
      return sendJson(res, 404, { error: 'El ejercicio seleccionado no está disponible.' })
    }

    const sustituyeA = actual.sustituye_a ?? actual.ejercicio_id
    await execute(
      'UPDATE sesion_ejercicios SET ejercicio_id = ?, sustituye_a = ? WHERE id = ?',
      [nuevoId, sustituyeA, sesionEjercicioId],
    )

    return sendJson(res, 200, { ok: true })
  }

  if (action === 'hinchazon_pendiente') {
    const entrenoId = Number(body.entrenoId)
    const hinchazon = normalizeHinchazon(body.hinchazon)

    if (!Number.isInteger(entrenoId) || entrenoId <= 0) {
      return sendJson(res, 400, { error: 'ID de entrenamiento no válido.' })
    }
    if (hinchazon !== 0 && hinchazon !== 1) {
      return sendJson(res, 400, { error: 'El valor de hinchazón debe ser 0 o 1.' })
    }

    const upd = await execute(
      'UPDATE entrenos SET hinchazon_dia_siguiente = ? WHERE id = ? AND user_id = ?',
      [hinchazon, entrenoId, user.id],
    )
    if (upd.rowsAffected === 0) {
      return sendJson(res, 404, { error: 'Entrenamiento no encontrado.' })
    }

    const rodilla = await evaluarRodillaUsuario(user.id)
    return sendJson(res, 200, { ok: true, evaluacionRodilla: rodilla.evaluacion, rodilla })
  }

  if (action === 'eliminar_entreno') {
    let entrenoId = Number(body.entrenoId)
    let sesionPlanId = Number(body.sesionPlanId)
    if (!Number.isInteger(entrenoId) || entrenoId <= 0) {
      entrenoId = null
    }
    if (!Number.isInteger(sesionPlanId) || sesionPlanId <= 0) {
      sesionPlanId = null
    }

    if (!entrenoId && !sesionPlanId) {
      return sendJson(res, 400, { error: 'Se requiere ID de entrenamiento o de sesión planificada.' })
    }

    let entreno = null
    if (entrenoId) {
      entreno = await queryOne(
        'SELECT id, sesion_plan_id FROM entrenos WHERE id = ? AND user_id = ? LIMIT 1',
        [entrenoId, user.id],
      )
    } else if (sesionPlanId) {
      entreno = await queryOne(
        'SELECT id, sesion_plan_id FROM entrenos WHERE sesion_plan_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1',
        [sesionPlanId, user.id],
      )
    }

    const stmts = []
    if (entreno) {
      stmts.push(
        {
          sql: 'DELETE FROM series_registradas WHERE entreno_id = ?',
          args: [entreno.id],
        },
        {
          sql: 'DELETE FROM carreras WHERE entreno_id = ?',
          args: [entreno.id],
        },
        {
          sql: 'DELETE FROM entrenos WHERE id = ? AND user_id = ?',
          args: [entreno.id, user.id],
        },
      )
    }

    const targetSesionPlanId = entreno?.sesion_plan_id || sesionPlanId
    if (targetSesionPlanId) {
      stmts.push({
        sql: "UPDATE sesiones_plan SET estado = 'pendiente' WHERE id = ? AND user_id = ?",
        args: [targetSesionPlanId, user.id],
      })
    }

    if (stmts.length > 0) {
      await batch(stmts)
    }

    const rodilla = await evaluarRodillaUsuario(user.id)
    return sendJson(res, 200, {
      ok: true,
      mensaje: 'Entrenamiento descartado/eliminado correctamente.',
      evaluacionRodilla: rodilla.evaluacion,
      rodilla,
    })
  }

  return sendJson(res, 400, { error: `Acción no reconocida en /api/sesion: ${action}` })
})
