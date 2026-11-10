/**
 * Endpoint GET /api/bootstrap?mes=YYYY-MM&lunes=YYYY-MM-DD
 * Carga todo el estado inicial del dashboard y agenda en un unico pipeline HTTP a Turso.
 */
import { requireUser } from './_lib/auth.js'
import { getQuery, methodNotAllowed, sendJson, withErrorHandling } from './_lib/http.js'
import { readBatch } from './_lib/turso.js'
import { construirEstadoRodilla, generarSemanaPlan } from './_lib/planner-db.js'
import { addDias, esISO, hoyMadrid, lunesDe } from '../shared/fechas.js'

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const LUNES_INICIO_ENTRENO = '2026-11-16'

export default withErrorHandling(async function bootstrapHandler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const user = await requireUser(req, res)
  if (!user) return

  const q = getQuery(req)
  const hoy = hoyMadrid()

  const lunesRef = esISO(q.lunes)
    ? lunesDe(q.lunes)
    : MES_RE.test(q.mes || '')
      ? lunesDe(`${q.mes}-01`)
      : lunesDe(hoy)

  const lunesResumen = esISO(q.lunes) ? lunesDe(q.lunes) : lunesDe(hoy)
  const domingoResumen = addDias(lunesResumen, 6)

  let desdeMes = addDias(lunesRef, -35)
  let hastaMes = addDias(lunesRef, 42)
  if (MES_RE.test(q.mes || '')) {
    const iniMes = addDias(`${q.mes}-01`, -14)
    const finMes = addDias(`${q.mes}-28`, 21)
    if (iniMes < desdeMes) desdeMes = iniMes
    if (finMes > hastaMes) hastaMes = finMes
  }
  if (desdeMes > LUNES_INICIO_ENTRENO) desdeMes = addDias(LUNES_INICIO_ENTRENO, -7)
  const finSemanaInicio = addDias(LUNES_INICIO_ENTRENO, 7)
  if (hastaMes < finSemanaInicio) hastaMes = finSemanaInicio

  let [
    perfilRows,
    rodillaRows,
    fasesRows,
    entrenosRows,
    ritmos,
    objetivos,
    sesionesMes,
    kmSemanaRows,
    ultimoPesoRows,
    videosDestacados,
    entrenosSemanaRows,
    semanaInicioRows,
  ] = await readBatch([
    {
      sql: 'SELECT objetivo, dias_min, dias_max, notas FROM perfil WHERE user_id = ? LIMIT 1',
      args: [user.id],
    },
    {
      sql: `SELECT er.fase_id, er.desde, er.modo_auto,
                   fr.nombre, fr.descripcion, fr.impacto_max,
                   fr.sesiones_para_subir, molestia_max_subir, fr.molestia_min_bajar
            FROM estado_rodilla er
            JOIN fases_rodilla fr ON fr.id = er.fase_id
            WHERE er.user_id = ? LIMIT 1`,
      args: [user.id],
    },
    {
      sql: `SELECT id, nombre, descripcion, impacto_max,
                   sesiones_para_subir, molestia_max_subir, molestia_min_bajar
            FROM fases_rodilla
            ORDER BY id ASC`,
      args: [],
    },
    {
      sql: `SELECT id, inicio,
                   molestia_rodilla_durante AS molestia_durante,
                   molestia_rodilla_despues AS molestia_despues,
                   hinchazon_dia_siguiente AS hinchazon
            FROM entrenos
            WHERE user_id = ?
            ORDER BY inicio DESC, id DESC
            LIMIT 25`,
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
    {
      sql: `SELECT sp.id, sp.semana_id, sp.fecha, sp.plantilla_id, sp.tipo, sp.titulo,
                   sp.descripcion, sp.estado,
                   COUNT(se.id) AS num_ejercicios,
                   COUNT(DISTINCT se.bloque_orden) AS num_bloques
            FROM sesiones_plan sp
            LEFT JOIN sesion_ejercicios se ON se.sesion_plan_id = sp.id
            WHERE sp.user_id = ? AND sp.fecha >= ? AND sp.fecha <= ?
            GROUP BY sp.id
            ORDER BY sp.fecha ASC, sp.id ASC`,
      args: [user.id, desdeMes, hastaMes],
    },
    {
      sql: `SELECT COALESCE(SUM(c.distancia_m), 0) AS metros_semana
            FROM carreras c
            JOIN entrenos e ON e.id = c.entreno_id
            WHERE e.user_id = ? AND substr(e.inicio, 1, 10) >= ? AND substr(e.inicio, 1, 10) <= ?`,
      args: [user.id, lunesResumen, domingoResumen],
    },
    {
      sql: 'SELECT kg, fecha FROM peso_corporal WHERE user_id = ? ORDER BY fecha DESC, id DESC LIMIT 1',
      args: [user.id],
    },
    {
      sql: `SELECT id, nombre, grupo, patron, tipo_registro, unilateral, impacto,
                   equipamiento, instrucciones, video_url, poster_url, video_origen, video_validado
            FROM ejercicios
            WHERE activo = 1 AND (user_id IS NULL OR user_id = ?)
              AND video_url IS NOT NULL AND video_url != ''
              AND (video_validado = 1 OR video_origen IN ('propio', 'youtube'))
            ORDER BY
              video_validado DESC,
              CASE WHEN video_origen = 'propio' THEN 0 ELSE 1 END ASC,
              CASE WHEN grupo = 'core' OR tipo_registro = 'isometrico' THEN 0 ELSE 1 END ASC,
              id ASC
            LIMIT 6`,
      args: [user.id],
    },
    {
      sql: `SELECT COUNT(*) AS total
            FROM entrenos
            WHERE user_id = ? AND substr(inicio, 1, 10) >= ? AND substr(inicio, 1, 10) <= ?`,
      args: [user.id, lunesResumen, domingoResumen],
    },
    {
      sql: 'SELECT id FROM semanas WHERE user_id = ? AND lunes = ? LIMIT 1',
      args: [user.id, LUNES_INICIO_ENTRENO],
    },
  ])

  // Si es la primera vez absoluta y aún no existe la semana del 16 de noviembre, generarla
  if (!semanaInicioRows || semanaInicioRows.length === 0) {
    try {
      const gen = await generarSemanaPlan(user.id, {
        lunes: LUNES_INICIO_ENTRENO,
        dias: 5,
        hayCarrera: false,
        segundoSuperior: false,
        sobreescribir: false,
      })
      if (gen?.sesiones?.length) {
        sesionesMes = [...sesionesMes, ...gen.sesiones].sort((a, b) =>
          String(a.fecha).localeCompare(String(b.fecha))
        )
      }
    } catch {
      // Continuar con bootstrap normal
    }
  }

  const perfil = perfilRows[0] || {
    objetivo: 'Fuerza, carrera y progresión de rodilla',
    dias_min: 4,
    dias_max: 6,
    notas: null,
  }

  const rodilla = construirEstadoRodilla(rodillaRows[0], fasesRows, entrenosRows, hoy)

  const sesionesDeSemana = sesionesMes.filter(
    (s) => s.fecha >= lunesResumen && s.fecha <= domingoResumen,
  )
  const completadasPlan = sesionesDeSemana.filter((s) => s.estado === 'completada').length
  const entrenosLibresCount = entrenosSemanaRows[0]?.total ?? 0

  const metrosSemana = kmSemanaRows[0]?.metros_semana ?? 0
  const resumenSemana = {
    sesionesCompletadas: sesionesDeSemana.length > 0 ? completadasPlan : entrenosLibresCount,
    sesionesTotales: sesionesDeSemana.length,
    kmSemana: Math.round((metrosSemana / 1000) * 10) / 10,
    ultimoPesoKg: ultimoPesoRows[0]?.kg ?? null,
  }

  return sendJson(res, 200, {
    hoy,
    fechaInicioEntrenamiento: LUNES_INICIO_ENTRENO,
    user,
    perfil,
    rodilla,
    ritmos,
    objetivos,
    sesionesMes,
    resumenSemana,
    videosDestacados,
  })
})
