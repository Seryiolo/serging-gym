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
import { parseDecimal, estimar1RM, formatRitmo, formatDuracion, ritmoSegKm } from '../shared/numeros.js'

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

function construirLogros({
  entrenosCompletados,
  rachaRodillaSinDolor,
  kmAcumulados,
  ejerciciosConPR,
  faseId,
  maxPesoGlobal = 0,
  tiradaMasLargaM = 0,
  tieneSeriesPista = false,
  respuestasSinHinchazon = 0,
}) {
  const tiradaKm = Math.round((tiradaMasLargaM / 1000) * 10) / 10

  const insignias = [
    // --- Rodilla ---
    {
      id: 'primer_entreno',
      titulo: 'Primer entrenamiento',
      descripcion: 'Registrar tu primera sesión completada.',
      conseguido: entrenosCompletados >= 1,
      progreso: Math.min(entrenosCompletados, 1),
      objetivo: 1,
      categoria: 'rodilla',
    },
    {
      id: 'rodilla_estable_6',
      titulo: 'Rodilla bajo control',
      descripcion: 'Encadenar 6 sesiones seguidas sin dolor (>2/10) ni hinchazón.',
      conseguido: rachaRodillaSinDolor >= 6,
      progreso: Math.min(rachaRodillaSinDolor, 6),
      objetivo: 6,
      categoria: 'rodilla',
    },
    {
      id: 'rodilla_titanio_12',
      titulo: 'Rodilla de titanio',
      descripcion: 'Encadenar 12 sesiones seguidas estables sin dolor ni derrame.',
      conseguido: rachaRodillaSinDolor >= 12,
      progreso: Math.min(rachaRodillaSinDolor, 12),
      objetivo: 12,
      categoria: 'rodilla',
    },
    {
      id: 'rodilla_blindada_20',
      titulo: 'Rodilla blindada',
      descripcion: 'Encadenar 20 sesiones seguidas estables sin dolor (>2/10) ni inflamación.',
      conseguido: rachaRodillaSinDolor >= 20,
      progreso: Math.min(rachaRodillaSinDolor, 20),
      objetivo: 20,
      categoria: 'rodilla',
    },
    {
      id: 'cero_inflamacion_5',
      titulo: 'Cero inflamación',
      descripcion: 'Completar 5 controles de rodilla al día siguiente sin hinchazón.',
      conseguido: respuestasSinHinchazon >= 5,
      progreso: Math.min(respuestasSinHinchazon, 5),
      objetivo: 5,
      categoria: 'rodilla',
    },
    {
      id: 'cero_inflamacion_10',
      titulo: 'Control biológico total',
      descripcion: 'Completar 10 controles de rodilla al día siguiente sin hinchazón.',
      conseguido: respuestasSinHinchazon >= 10,
      progreso: Math.min(respuestasSinHinchazon, 10),
      objetivo: 10,
      categoria: 'rodilla',
    },
    {
      id: 'fase_avanzada',
      titulo: 'Reatletización avanzada',
      descripcion: 'Alcanzar la Fase 3 o superior en la progresión de rodilla.',
      conseguido: faseId >= 3,
      progreso: Math.min(faseId, 3),
      objetivo: 3,
      categoria: 'rodilla',
    },
    {
      id: 'retorno_completo',
      titulo: 'Retorno deportivo al 100%',
      descripcion: 'Alcanzar la Fase 4 de retorno completo sin restricciones.',
      conseguido: faseId >= 4,
      progreso: Math.min(faseId, 4),
      objetivo: 4,
      categoria: 'rodilla',
    },

    // --- Constancia ---
    {
      id: 'constancia_5',
      titulo: 'Rumbo al hábito',
      descripcion: 'Completar 5 entrenamientos registrados.',
      conseguido: entrenosCompletados >= 5,
      progreso: Math.min(entrenosCompletados, 5),
      objetivo: 5,
      categoria: 'constancia',
    },
    {
      id: 'constancia_10',
      titulo: 'Constancia de hierro',
      descripcion: 'Completar 10 entrenamientos registrados.',
      conseguido: entrenosCompletados >= 10,
      progreso: Math.min(entrenosCompletados, 10),
      objetivo: 10,
      categoria: 'constancia',
    },
    {
      id: 'constancia_25',
      titulo: 'Disciplina total',
      descripcion: 'Completar 25 entrenamientos registrados.',
      conseguido: entrenosCompletados >= 25,
      progreso: Math.min(entrenosCompletados, 25),
      objetivo: 25,
      categoria: 'constancia',
    },
    {
      id: 'constancia_50',
      titulo: 'Hábito de acero',
      descripcion: 'Completar 50 entrenamientos registrados.',
      conseguido: entrenosCompletados >= 50,
      progreso: Math.min(entrenosCompletados, 50),
      objetivo: 50,
      categoria: 'constancia',
    },
    {
      id: 'constancia_75',
      titulo: 'Leyenda del entrenamiento',
      descripcion: 'Completar 75 entrenamientos registrados.',
      conseguido: entrenosCompletados >= 75,
      progreso: Math.min(entrenosCompletados, 75),
      objetivo: 75,
      categoria: 'constancia',
    },

    // --- Carrera ---
    {
      id: 'corredor_25k',
      titulo: 'Primeros 25K',
      descripcion: 'Acumular 25 km de carrera registrados.',
      conseguido: kmAcumulados >= 25,
      progreso: Math.min(kmAcumulados, 25),
      objetivo: 25,
      categoria: 'carrera',
    },
    {
      id: 'corredor_50k',
      titulo: 'Base aeróbica 50K',
      descripcion: 'Acumular 50 km de carrera registrados.',
      conseguido: kmAcumulados >= 50,
      progreso: Math.min(kmAcumulados, 50),
      objetivo: 50,
      categoria: 'carrera',
    },
    {
      id: 'corredor_100k',
      titulo: 'Centenario running 100K',
      descripcion: 'Acumular 100 km de carrera registrados.',
      conseguido: kmAcumulados >= 100,
      progreso: Math.min(kmAcumulados, 100),
      objetivo: 100,
      categoria: 'carrera',
    },
    {
      id: 'corredor_250k',
      titulo: 'Fondo élite 250K',
      descripcion: 'Acumular 250 km de carrera registrados.',
      conseguido: kmAcumulados >= 250,
      progreso: Math.min(kmAcumulados, 250),
      objetivo: 250,
      categoria: 'carrera',
    },
    {
      id: 'pista_series_1k',
      titulo: 'Dominio de la pista',
      descripcion: 'Registrar una sesión de series o pista de atletismo.',
      conseguido: tieneSeriesPista,
      progreso: tieneSeriesPista ? 1 : 0,
      objetivo: 1,
      categoria: 'carrera',
    },
    {
      id: 'tirada_larga_15k',
      titulo: 'Gran fondo (15K+)',
      descripcion: 'Registrar una salida de carrera de 15 km o más.',
      conseguido: tiradaKm >= 15,
      progreso: Math.min(tiradaKm, 15),
      objetivo: 15,
      categoria: 'carrera',
    },
    {
      id: 'media_maraton_completada',
      titulo: 'Conquistador de los 21K',
      descripcion: 'Registrar un rodaje o tirada de media maratón (21 km o más).',
      conseguido: tiradaKm >= 21,
      progreso: Math.min(tiradaKm, 21),
      objetivo: 21,
      categoria: 'carrera',
    },

    // --- Fuerza ---
    {
      id: 'primer_peso_registrado',
      titulo: 'Primer récord de carga',
      descripcion: 'Registrar tu primer levantamiento con peso en cualquier ejercicio.',
      conseguido: maxPesoGlobal > 0,
      progreso: maxPesoGlobal > 0 ? 1 : 0,
      objetivo: 1,
      categoria: 'fuerza',
    },
    {
      id: 'fuerza_anclas_5',
      titulo: 'Progresión de cargas (5)',
      descripcion: 'Registrar marcas de peso en al menos 5 ejercicios distintos.',
      conseguido: ejerciciosConPR >= 5,
      progreso: Math.min(ejerciciosConPR, 5),
      objetivo: 5,
      categoria: 'fuerza',
    },
    {
      id: 'fuerza_anclas_10',
      titulo: 'Club de la fuerza (10)',
      descripcion: 'Registrar marcas de peso en al menos 10 ejercicios distintos.',
      conseguido: ejerciciosConPR >= 10,
      progreso: Math.min(ejerciciosConPR, 10),
      objetivo: 10,
      categoria: 'fuerza',
    },
    {
      id: 'club_75kg',
      titulo: 'Potencia 75 kg',
      descripcion: 'Mover 75 kg o más en un ejercicio de empuje o pierna.',
      conseguido: maxPesoGlobal >= 75,
      progreso: Math.min(maxPesoGlobal, 75),
      objetivo: 75,
      categoria: 'fuerza',
    },
    {
      id: 'club_100kg',
      titulo: 'Club de los 100 kg',
      descripcion: 'Alcanzar los 100 kg en un levantamiento pesado (Hip Thrust, Sentadilla o RDL).',
      conseguido: maxPesoGlobal >= 100,
      progreso: Math.min(maxPesoGlobal, 100),
      objetivo: 100,
      categoria: 'fuerza',
    },
    {
      id: 'club_120kg',
      titulo: 'Club de los 120 kg',
      descripcion: 'Alcanzar 120 kg o más en levantamientos pesados de tren inferior.',
      conseguido: maxPesoGlobal >= 120,
      progreso: Math.min(maxPesoGlobal, 120),
      objetivo: 120,
      categoria: 'fuerza',
    },
  ]

  return {
    entrenosCompletados,
    rachaRodillaSinDolor,
    kmAcumulados,
    ejerciciosConPR,
    faseRodillaActual: faseId,
    maxPesoGlobal,
    tiradaMasLargaKm: tiradaKm,
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
      mejoresFuerzaRows,
      ritmosRefRows,
      mejoresIsometricosRows,
      mejoresSeriesPistaRows,
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
      {
        sql: `SELECT
                sr.ejercicio_id,
                e.nombre AS ejercicio_nombre,
                e.grupo AS ejercicio_grupo,
                MAX(sr.peso_kg) AS max_peso_kg,
                sr.reps AS reps_con_max,
                substr(en.inicio, 1, 10) AS fecha_max
              FROM series_registradas sr
              JOIN entrenos en ON en.id = sr.entreno_id
              JOIN ejercicios e ON e.id = sr.ejercicio_id
              WHERE en.user_id = ? AND sr.completada = 1 AND sr.peso_kg > 0
              GROUP BY sr.ejercicio_id
              ORDER BY max_peso_kg DESC`,
        args: [user.id],
      },
      {
        sql: `SELECT distancia_m, ritmo_seg_km, fecha
              FROM ritmos_referencia
              WHERE user_id = ?
              ORDER BY distancia_m ASC, fecha DESC`,
        args: [user.id],
      },
      {
        sql: `SELECT
                sr.ejercicio_id,
                e.nombre AS ejercicio_nombre,
                e.grupo AS ejercicio_grupo,
                MAX(sr.segundos) AS max_segundos,
                MAX(COALESCE(sr.peso_kg, 0)) AS max_peso_kg,
                substr(en.inicio, 1, 10) AS fecha_max
              FROM series_registradas sr
              JOIN entrenos en ON en.id = sr.entreno_id
              JOIN ejercicios e ON e.id = sr.ejercicio_id
              WHERE en.user_id = ?
                AND sr.completada = 1
                AND sr.segundos > 0
                AND e.tipo_registro IN ('isometrico', 'tiempo')
              GROUP BY sr.ejercicio_id
              ORDER BY max_segundos DESC`,
        args: [user.id],
      },
      {
        sql: `SELECT
                sr.ejercicio_id,
                e.nombre AS ejercicio_nombre,
                sr.reps AS distancia_m,
                MIN(sr.segundos) AS mejor_segundos,
                COUNT(*) AS total_series_completadas,
                substr(en.inicio, 1, 10) AS fecha_mejor
              FROM series_registradas sr
              JOIN entrenos en ON en.id = sr.entreno_id
              JOIN ejercicios e ON e.id = sr.ejercicio_id
              WHERE en.user_id = ?
                AND sr.completada = 1
                AND e.tipo_registro = 'carrera'
                AND sr.reps >= 200
                AND sr.segundos > 0
              GROUP BY sr.ejercicio_id, sr.reps
              ORDER BY sr.reps ASC, mejor_segundos ASC`,
        args: [user.id],
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

    const marcasFuerza = (mejoresFuerzaRows || []).map((r) => {
      const rm = estimar1RM(r.max_peso_kg, Math.round(r.reps_con_max || 1))
      return {
        ejercicio_id: r.ejercicio_id,
        nombre: r.ejercicio_nombre,
        grupo: r.ejercicio_grupo,
        peso_kg: r.max_peso_kg,
        max_peso_kg: r.max_peso_kg,
        reps: r.reps_con_max || 1,
        fecha: r.fecha_max,
        estimado_1rm: rm?.valor ?? r.max_peso_kg,
        rm1_estimado: rm?.valor ?? r.max_peso_kg,
      }
    })

    const maxPesoGlobal = marcasFuerza.length > 0 ? Math.max(...marcasFuerza.map((m) => m.peso_kg)) : 0

    const marcasIsometricos = (mejoresIsometricosRows || []).map((r) => ({
      ejercicio_id: r.ejercicio_id,
      nombre: r.ejercicio_nombre,
      grupo: r.ejercicio_grupo,
      max_segundos: r.max_segundos,
      peso_kg: r.max_peso_kg > 0 ? r.max_peso_kg : null,
      fecha: r.fecha_max,
    }))

    const marcasSeriesPista = (mejoresSeriesPistaRows || []).map((r) => {
      const ritmo = ritmoSegKm(r.distancia_m, r.mejor_segundos)
      return {
        ejercicio_id: r.ejercicio_id,
        nombre: r.ejercicio_nombre,
        distancia_m: r.distancia_m,
        mejor_segundos: r.mejor_segundos,
        mejor_tiempo_formato: formatDuracion(r.mejor_segundos),
        ritmo_seg_km: ritmo,
        ritmo_formato: ritmo ? formatRitmo(ritmo) : '--:--',
        total_series: r.total_series_completadas,
        fecha: r.fecha_mejor,
      }
    })

    const distanciasClave = [
      { distancia_m: 1000, label: '1K Pista' },
      { distancia_m: 5000, label: '5K' },
      { distancia_m: 10000, label: '10K' },
      { distancia_m: 15000, label: '15K' },
      { distancia_m: 21097, label: 'Media Maratón (21K)' },
    ]

    const marcasCarrera = distanciasClave.map((d) => {
      const ref = (ritmosRefRows || []).find((r) => r.distancia_m === d.distancia_m)
      const car = (carrerasHistorial || [])
        .filter((c) => Math.abs((c.distancia_m || 0) - d.distancia_m) <= d.distancia_m * 0.05 && (c.ritmo_seg_km || 0) > 0)
        .sort((a, b) => (a.ritmo_seg_km || 999) - (b.ritmo_seg_km || 999))[0]
      const serieExacta = marcasSeriesPista
        .filter((s) => Math.abs((s.distancia_m || 0) - d.distancia_m) <= d.distancia_m * 0.05 && (s.ritmo_seg_km || 0) > 0)
        .sort((a, b) => (a.ritmo_seg_km || 999) - (b.ritmo_seg_km || 999))[0]

      const mejorRitmo = Math.min(
        ref?.ritmo_seg_km || 9999,
        car?.ritmo_seg_km || 9999,
        serieExacta?.ritmo_seg_km || 9999,
      )
      const ritmoSegKmVal = mejorRitmo < 9000 ? mejorRitmo : null
      const duracionS = ritmoSegKmVal ? Math.round((ritmoSegKmVal * d.distancia_m) / 1000) : null
      const fecha = serieExacta?.fecha || car?.fecha || ref?.fecha || null

      return {
        distancia_m: d.distancia_m,
        label: d.label,
        ritmo_seg_km: ritmoSegKmVal,
        ritmo_formato: ritmoSegKmVal ? formatRitmo(ritmoSegKmVal) : '--:--',
        duracion_s: duracionS,
        duracion_formato: duracionS ? formatDuracion(duracionS) : '--:--',
        tiempo_estimado_s: duracionS,
        fecha,
      }
    })

    const tiradaMasLargaM = (carrerasHistorial || []).reduce((max, c) => Math.max(max, c.distancia_m || 0), 0)
    const tieneSeriesPista =
      (carrerasHistorial || []).some((c) => c.tipo === 'series' || c.superficie === 'pista') ||
      marcasSeriesPista.length > 0
    const respuestasSinHinchazon = (entrenosRecientes || []).filter((e) => e.hinchazon === 0).length

    const mejoresMarcas = {
      fuerza: marcasFuerza,
      isometricos: marcasIsometricos,
      seriesPista: marcasSeriesPista,
      carrera: marcasCarrera,
      maxPesoGlobal,
      tiradaMasLargaKm: Math.round((tiradaMasLargaM / 1000) * 10) / 10,
    }

    const logros = construirLogros({
      entrenosCompletados,
      rachaRodillaSinDolor,
      kmAcumulados,
      ejerciciosConPR,
      faseId: actual.fase_id,
      maxPesoGlobal,
      tiradaMasLargaM,
      tieneSeriesPista,
      respuestasSinHinchazon,
    })

    return sendJson(res, 200, {
      pesos,
      rodilla,
      entrenosPendientesHinchazon,
      carrerasResumen,
      logros,
      mejoresMarcas,
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
