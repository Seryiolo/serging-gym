/**
 * Conecta el motor puro de planificacion semanal (shared/planner.js) con Turso.
 * Soporta rotacion real de huecos variables (8 semanas de historial),
 * adaptacion por fase/impacto de rodilla y sustitucion compatible de ejercicios.
 */
import {
  T,
  composicionSemana,
  fechasDeSemana,
  candidatosDeHueco,
  elegirVariable,
} from '../../shared/planner.js'
import { evaluarProgresion } from '../../shared/rodilla.js'
import { addDias, hoyMadrid, lunesDe } from '../../shared/fechas.js'
import { prescripcionPorDefecto } from '../../shared/numeros.js'
import { batch, execute, queryOne, readBatch } from './turso.js'
import { httpError } from './http.js'

const GRUPOS_POR_TIPO_SESION = {
  superior: ['pecho', 'espalda', 'hombro', 'biceps', 'triceps', 'core', 'movilidad'],
  inferior: ['cuadriceps', 'isquios', 'gluteo', 'gemelo', 'core', 'movilidad', 'cuerpo_completo'],
  pliometria_agilidad: ['pliometria', 'agilidad', 'carrera', 'core', 'movilidad', 'gluteo', 'isquios', 'cuadriceps', 'gemelo'],
  carrera: ['carrera', 'movilidad', 'core', 'gemelo', 'gluteo', 'pliometria', 'agilidad'],
  movilidad_core: ['movilidad', 'core', 'gluteo', 'gemelo', 'isquios', 'cuadriceps'],
}

export function construirEstadoRodilla(rodillaRow, fasesRows, entrenosRows, hoy = hoyMadrid()) {
  const fases = fasesRows || []
  const faseDefecto = fases[0] || {
    id: 1,
    nombre: 'Fase 1 · Control sin impacto',
    descripcion: 'Fuerza controlada e isométricos sin impacto articular.',
    impacto_max: 0,
    sesiones_para_subir: 6,
    molestia_max_subir: 2,
    molestia_min_bajar: 5,
  }
  const faseActual =
    fases.find((f) => f.id === rodillaRow?.fase_id) ||
    (rodillaRow?.fase_id ? { ...faseDefecto, ...rodillaRow, id: rodillaRow.fase_id } : faseDefecto)

  const faseMax = fases.length > 0 ? Math.max(...fases.map((f) => f.id)) : 4
  const evaluacion = evaluarProgresion(
    {
      id: faseActual.id,
      sesiones_para_subir: faseActual.sesiones_para_subir ?? 6,
      molestia_max_subir: faseActual.molestia_max_subir ?? 2,
      molestia_min_bajar: faseActual.molestia_min_bajar ?? 5,
    },
    entrenosRows || [],
    faseMax,
  )

  return {
    fase_id: faseActual.id,
    nombre: faseActual.nombre,
    descripcion: faseActual.descripcion,
    impacto_max: faseActual.impacto_max,
    desde: rodillaRow?.desde ?? hoy,
    modo_auto: rodillaRow?.modo_auto ?? 1,
    fases,
    evaluacion,
  }
}

export async function evaluarRodillaUsuario(userId) {
  const [rodillaRows, fasesRows, entrenosRows] = await readBatch([
    {
      sql: `SELECT er.fase_id, er.desde, er.modo_auto,
                   fr.nombre, fr.descripcion, fr.impacto_max,
                   fr.sesiones_para_subir, fr.molestia_max_subir, fr.molestia_min_bajar
            FROM estado_rodilla er
            JOIN fases_rodilla fr ON fr.id = er.fase_id
            WHERE er.user_id = ? LIMIT 1`,
      args: [userId],
    },
    {
      sql: `SELECT id, nombre, descripcion, impacto_max,
                   sesiones_para_subir, molestia_max_subir, molestia_min_bajar
            FROM fases_rodilla ORDER BY id ASC`,
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
      args: [userId],
    },
  ])
  return construirEstadoRodilla(rodillaRows[0], fasesRows, entrenosRows)
}

/**
 * Plantilla de respaldo para PIERNA_B (id=7) en caso de no estar sembrada en plantillas_sesion.
 */
const FALLBACK_PIERNA_B = {
  id: null,
  keyId: T.PIERNA_B,
  nombre: 'Pierna B - Cadera, Isométricos y Core',
  tipo: 'inferior',
  descripcion: 'Cadena posterior, resistencia tendinosa isométrica y estabilidad lumbopélvica.',
  bloques: [
    {
      orden: 1,
      nombre: 'Preparación de cadera y activación',
      tipo: 'preparacion',
      huecos: [
        { orden: 1, rol: 'ancla', ejercicio_id: 6, rotacion: 'nunca', superserie: 1, series: 2, reps: '45 seg/lado', rpe_objetivo: null, descanso_s: 30, nota: 'Movilidad 90/90 controlada' },
        { orden: 2, rol: 'ancla', ejercicio_id: 4, rotacion: 'nunca', superserie: 1, series: 2, reps: '12+12 pasos', rpe_objetivo: null, descanso_s: 45, nota: 'Activación de glúteo medio con minibanda' },
      ],
    },
    {
      orden: 2,
      nombre: 'Fuerza de cadera y control unilateral',
      tipo: 'fuerza',
      huecos: [
        { orden: 1, rol: 'ancla', ejercicio_id: 34, rotacion: 'nunca', superserie: null, series: 4, reps: '8-10', rpe_objetivo: 8.0, descanso_s: 105, nota: 'Bisagra de cadera controlada sin perder neutralidad' },
        { orden: 2, rol: 'variable', ejercicio_id: 38, filtro_grupo: 'cuadriceps', rotacion: 'semanal', superserie: null, series: 3, reps: '8+8', rpe_objetivo: 8.0, descanso_s: 90, nota: 'Control de alineación rodilla-segundo dedo del pie' },
      ],
    },
    {
      orden: 3,
      nombre: 'Isométricos y core antirrotación',
      tipo: 'accesorios',
      huecos: [
        { orden: 1, rol: 'ancla', ejercicio_id: 31, rotacion: 'nunca', superserie: 2, series: 3, reps: '25 seg/lado', rpe_objetivo: 8.0, descanso_s: 45, nota: 'Empuje isométrico de isquios' },
        { orden: 2, rol: 'variable', ejercicio_id: 35, filtro_grupo: 'cuadriceps', filtro_tipo_registro: 'isometrico', rotacion: 'semanal', superserie: 2, series: 3, reps: '30 seg/lado', rpe_objetivo: 8.0, descanso_s: 60, nota: 'Isométrico analgésico tendón rotuliano' },
        { orden: 3, rol: 'variable', ejercicio_id: 5, filtro_grupo: 'core', rotacion: 'semanal', superserie: null, series: 3, reps: '10+10', rpe_objetivo: 7.5, descanso_s: 45, nota: 'Pelvis estable durante todo el set' },
      ],
    },
  ],
}

const GRUPOS_ALTERNATIVOS_RODILLA = {
  pliometria: ['cuadriceps', 'gluteo', 'isquios', 'gemelo'],
  agilidad: ['gluteo', 'isquios', 'cuadriceps', 'movilidad'],
  carrera: ['movilidad', 'core', 'gluteo'],
}

function elegirAlternativaSeguraRodilla(catalogo, ejOriginal, ctx, usadosEnSesion) {
  const grupos = [
    ejOriginal?.grupo,
    ...(GRUPOS_ALTERNATIVOS_RODILLA[ejOriginal?.grupo] || ['movilidad', 'core']),
  ].filter(Boolean)

  for (const grupo of grupos) {
    const cands = candidatosDeHueco(catalogo, { grupo }, ctx)
    const libres = cands.filter((c) => !usadosEnSesion.has(c.id))
    if (libres.length > 0) return libres[0]
    if (cands.length > 0) return cands[0]
  }

  const cualquiera = candidatosDeHueco(catalogo, {}, ctx)
  return cualquiera[0] || ejOriginal || catalogo[0] || null
}

function resolverEjercicioHueco({ hueco, plantillaKey, bloqueOrden, lunes, userId, catalogo, catalogoMap, ctx, historialMap, usadosEnSesion }) {
  const ejPorDefecto = hueco.ejercicio_id ? catalogoMap.get(hueco.ejercicio_id) : null
  const necesitaAdaptarAncla =
    ejPorDefecto && (ejPorDefecto.impacto > ctx.impactoMax || ejPorDefecto.fase_rodilla_min > ctx.faseId)

  if (hueco.rol === 'ancla') {
    if (ejPorDefecto && !necesitaAdaptarAncla) {
      return { ejercicioId: ejPorDefecto.id, sustituyeA: null, adaptadoRodilla: false }
    }
    const alt = elegirAlternativaSeguraRodilla(catalogo, ejPorDefecto, ctx, usadosEnSesion)
    if (alt && ejPorDefecto && alt.id !== ejPorDefecto.id) {
      return { ejercicioId: alt.id, sustituyeA: ejPorDefecto.id, adaptadoRodilla: true }
    }
    return { ejercicioId: alt?.id ?? hueco.ejercicio_id, sustituyeA: null, adaptadoRodilla: false }
  }

  // Hueco variable
  const tieneFiltroExplicito = Boolean(
    hueco.filtro_grupo || hueco.filtro_patron || hueco.filtro_tipo_registro,
  )
  const filtro = tieneFiltroExplicito
    ? {
        grupo: hueco.filtro_grupo || undefined,
        patron: hueco.filtro_patron || undefined,
        tipo_registro: hueco.filtro_tipo_registro || undefined,
      }
    : {
        grupo: ejPorDefecto?.grupo || undefined,
      }

  let candidatos = candidatosDeHueco(catalogo, filtro, ctx)
  if (filtro.grupo === 'carrera' && filtro.patron !== 'tecnica_carrera') {
    const principalesCarrera = candidatos.filter(
      (c) => c.patron !== 'tecnica_carrera' && c.patron !== 'mecanica_aceleracion',
    )
    if (principalesCarrera.length > 0) candidatos = principalesCarrera
  }
  const sinDuplicar = candidatos.filter((c) => !usadosEnSesion.has(c.id))
  if (sinDuplicar.length > 0) candidatos = sinDuplicar

  if (candidatos.length === 0) {
    const alt = elegirAlternativaSeguraRodilla(catalogo, ejPorDefecto, ctx, usadosEnSesion)
    const adaptado = Boolean(alt && ejPorDefecto && alt.id !== ejPorDefecto.id && necesitaAdaptarAncla)
    return {
      ejercicioId: alt?.id ?? hueco.ejercicio_id,
      sustituyeA: adaptado ? ejPorDefecto.id : null,
      adaptadoRodilla: adaptado,
    }
  }

  const slotKey = `${plantillaKey}:${bloqueOrden}:${hueco.orden}`
  const historial = historialMap.get(slotKey) || []
  const semilla = `${userId}:${lunes}:${slotKey}`
  const elegidoId = elegirVariable({
    candidatos,
    historial,
    rotacion: hueco.rotacion || 'semanal',
    porDefecto: hueco.ejercicio_id ?? null,
    semilla,
  })

  return {
    ejercicioId: elegidoId ?? candidatos[0].id,
    sustituyeA: null,
    adaptadoRodilla: false,
  }
}

export async function cargarSesionesSemana(userId, lunesIso) {
  const lunes = lunesDe(lunesIso)
  const domingo = addDias(lunes, 6)
  const [semanaRows, sesiones] = await readBatch([
    {
      sql: 'SELECT id, user_id, lunes, dias_objetivo, hay_carrera, origen, creado_en FROM semanas WHERE user_id = ? AND lunes = ? LIMIT 1',
      args: [userId, lunes],
    },
    {
      sql: `SELECT sp.id, sp.semana_id, sp.fecha, sp.plantilla_id, sp.tipo, sp.titulo, sp.descripcion, sp.estado,
                   COUNT(se.id) AS num_ejercicios,
                   COUNT(DISTINCT se.bloque_orden) AS num_bloques
            FROM sesiones_plan sp
            LEFT JOIN sesion_ejercicios se ON se.sesion_plan_id = sp.id
            WHERE sp.user_id = ? AND sp.fecha >= ? AND sp.fecha <= ?
            GROUP BY sp.id
            ORDER BY sp.fecha ASC, sp.id ASC`,
      args: [userId, lunes, domingo],
    },
  ])
  return { semana: semanaRows[0] ?? null, sesiones }
}

export async function generarSemanaPlan(
  userId,
  { lunes: rawLunes, dias = 5, hayCarrera = false, segundoSuperior = false, sobreescribir = true },
) {
  const lunes = lunesDe(rawLunes)
  const domingo = addDias(lunes, 6)
  const desdeHistorial = addDias(lunes, -56)

  const composicion = fechasDeSemana(
    lunes,
    composicionSemana({ dias, hayCarrera, segundoSuperior }),
  )

  const [
    rodillaRows,
    fasesRows,
    catalogo,
    plantillasRows,
    bloquesRows,
    huecosRows,
    historialRows,
    semanaExistenteRows,
    sesionesExistentesRows,
  ] = await readBatch([
    {
      sql: `SELECT er.fase_id, fr.impacto_max
            FROM estado_rodilla er
            JOIN fases_rodilla fr ON fr.id = er.fase_id
            WHERE er.user_id = ? LIMIT 1`,
      args: [userId],
    },
    {
      sql: 'SELECT id, impacto_max FROM fases_rodilla ORDER BY id ASC',
      args: [],
    },
    {
      sql: `SELECT id, user_id, nombre, grupo, patron, tipo_registro, unilateral,
                   impacto, fase_rodilla_min, equipamiento, activo
            FROM ejercicios
            WHERE activo = 1 AND (user_id IS NULL OR user_id = ?)
            ORDER BY id ASC`,
      args: [userId],
    },
    {
      sql: `SELECT id, user_id, nombre, tipo, descripcion, activo
            FROM plantillas_sesion
            WHERE activo = 1 AND (user_id IS NULL OR user_id = ?)
            ORDER BY id ASC`,
      args: [userId],
    },
    {
      sql: 'SELECT id, plantilla_id, orden, nombre, tipo FROM plantilla_bloques ORDER BY plantilla_id ASC, orden ASC',
      args: [],
    },
    {
      sql: `SELECT id, bloque_id, orden, rol, ejercicio_id, filtro_grupo, filtro_patron,
                   filtro_tipo_registro, rotacion, superserie, series, reps,
                   rpe_objetivo, descanso_s, nota
            FROM plantilla_huecos
            ORDER BY bloque_id ASC, orden ASC`,
      args: [],
    },
    {
      sql: `SELECT sp.plantilla_id, sp.fecha, se.bloque_orden, se.orden, se.ejercicio_id
            FROM sesion_ejercicios se
            JOIN sesiones_plan sp ON sp.id = se.sesion_plan_id
            WHERE sp.user_id = ? AND sp.fecha >= ? AND sp.fecha < ?
            ORDER BY sp.fecha DESC, se.id DESC`,
      args: [userId, desdeHistorial, lunes],
    },
    {
      sql: 'SELECT id FROM semanas WHERE user_id = ? AND lunes = ? LIMIT 1',
      args: [userId, lunes],
    },
    {
      sql: 'SELECT id, fecha, estado, plantilla_id FROM sesiones_plan WHERE user_id = ? AND fecha >= ? AND fecha <= ?',
      args: [userId, lunes, domingo],
    },
  ])

  if (!sobreescribir && sesionesExistentesRows.length > 0) {
    return cargarSesionesSemana(userId, lunes)
  }

  const faseFallback = fasesRows[0] || { id: 1, impacto_max: 1 }
  const ctx = {
    faseId: rodillaRows[0]?.fase_id ?? faseFallback.id,
    impactoMax: rodillaRows[0]?.impacto_max ?? faseFallback.impacto_max,
  }

  const catalogoMap = new Map(catalogo.map((e) => [e.id, e]))

  // Indexar plantillas -> bloques -> huecos
  const huecosPorBloque = new Map()
  for (const h of huecosRows) {
    if (!huecosPorBloque.has(h.bloque_id)) huecosPorBloque.set(h.bloque_id, [])
    huecosPorBloque.get(h.bloque_id).push(h)
  }

  const bloquesPorPlantilla = new Map()
  for (const b of bloquesRows) {
    if (!bloquesPorPlantilla.has(b.plantilla_id)) bloquesPorPlantilla.set(b.plantilla_id, [])
    bloquesPorPlantilla.get(b.plantilla_id).push({
      ...b,
      huecos: huecosPorBloque.get(b.id) || [],
    })
  }

  const plantillasMap = new Map()
  for (const p of plantillasRows) {
    plantillasMap.set(p.id, {
      ...p,
      keyId: p.id,
      bloques: bloquesPorPlantilla.get(p.id) || [],
    })
  }

  // Historial por slot (plantilla:bloque_orden:orden), maximo 1 entrada por fecha/semana mas reciente primero
  const historialMap = new Map()
  const vistoSemanaPorSlot = new Set()
  for (const row of historialRows) {
    const pKey = row.plantilla_id ?? T.PIERNA_B
    const slotKey = `${pKey}:${row.bloque_orden}:${row.orden}`
    const weekSlot = `${slotKey}:${lunesDe(row.fecha)}`
    if (vistoSemanaPorSlot.has(weekSlot)) continue
    vistoSemanaPorSlot.add(weekSlot)
    if (!historialMap.has(slotKey)) historialMap.set(slotKey, [])
    historialMap.get(slotKey).push({ ejercicio_id: row.ejercicio_id })
  }

  // Asegurar fila de semana y obtener su ID
  const hayCarreraInt = hayCarrera ? 1 : 0
  const upsertedSemana = await execute(
    `INSERT INTO semanas (user_id, lunes, dias_objetivo, hay_carrera, origen)
     VALUES (?, ?, ?, ?, 'auto')
     ON CONFLICT(user_id, lunes) DO UPDATE SET
       dias_objetivo = excluded.dias_objetivo,
       hay_carrera = excluded.hay_carrera
     RETURNING id`,
    [userId, lunes, dias, hayCarreraInt],
  )
  const semanaId = upsertedSemana.rows[0]?.id ?? semanaExistenteRows[0]?.id

  // Preservar sesiones ya completadas en esa semana
  const fechasCompletadas = new Set(
    sesionesExistentesRows.filter((s) => s.estado === 'completada').map((s) => s.fecha),
  )

  const stmts = [
    {
      sql: `DELETE FROM sesion_ejercicios
            WHERE sesion_plan_id IN (
              SELECT id FROM sesiones_plan
              WHERE user_id = ? AND fecha >= ? AND fecha <= ? AND estado != 'completada'
            )`,
      args: [userId, lunes, domingo],
    },
    {
      sql: `DELETE FROM sesiones_plan
            WHERE user_id = ? AND fecha >= ? AND fecha <= ? AND estado != 'completada'`,
      args: [userId, lunes, domingo],
    },
  ]

  // Construir sesiones nuevas e insertarlas de forma atomica
  for (const item of composicion) {
    if (fechasCompletadas.has(item.fecha)) continue

    const plantilla =
      plantillasMap.get(item.plantillaId) ||
      (item.plantillaId === T.PIERNA_B ? FALLBACK_PIERNA_B : null)

    if (!plantilla) continue

    const dbPlantillaId = plantillasMap.has(item.plantillaId) ? plantilla.id : null
    const descripcion = item.nota
      ? `${item.nota}${plantilla.descripcion ? ` · ${plantilla.descripcion}` : ''}`
      : plantilla.descripcion || null

    stmts.push({
      sql: `INSERT INTO sesiones_plan (semana_id, user_id, fecha, plantilla_id, tipo, titulo, descripcion, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      args: [semanaId, userId, item.fecha, dbPlantillaId, plantilla.tipo, plantilla.nombre, descripcion],
    })

    const usadosEnSesion = new Set()
    const esSesionExterior =
      plantilla.tipo === 'carrera' || plantilla.tipo === 'pliometria_agilidad'
    const ctxSesion = {
      ...ctx,
      impactoMax: esSesionExterior ? Math.max(ctx.impactoMax, 2) : ctx.impactoMax,
      excluirEquipo: esSesionExterior
        ? [
            'barra',
            'mancuerna',
            'maquina',
            'máquina',
            'polea',
            'rack',
            'multipower',
            'prensa',
            'fitball',
            'landmine',
            'trineo',
            'kettlebell',
            'disco',
          ]
        : ['conos', 'pista', 'vallas'],
    }
    for (const bloque of plantilla.bloques) {
      for (const hueco of bloque.huecos) {
        const resuelto = resolverEjercicioHueco({
          hueco,
          plantillaKey: plantilla.keyId ?? item.plantillaId,
          bloqueOrden: bloque.orden,
          lunes,
          userId,
          catalogo,
          catalogoMap,
          ctx: ctxSesion,
          historialMap,
          usadosEnSesion,
        })

        if (!resuelto.ejercicioId) continue
        usadosEnSesion.add(resuelto.ejercicioId)

        const ejResuelto = catalogoMap.get(resuelto.ejercicioId)
        const usarPrescripcionPropia =
          ejResuelto &&
          ejResuelto.grupo === 'carrera' &&
          resuelto.ejercicioId !== hueco.ejercicio_id &&
          bloque.tipo === 'carrera'
        const prescPropia = usarPrescripcionPropia ? prescripcionPorDefecto(ejResuelto) : null

        const notaBase = prescPropia?.nota || hueco.nota || null
        const notaFinal = resuelto.adaptadoRodilla
          ? `${notaBase ? `${notaBase} · ` : ''}(Adaptado a tu fase actual de rodilla)`
          : notaBase

        stmts.push({
          sql: `INSERT INTO sesion_ejercicios (
                  sesion_plan_id, bloque_orden, bloque_nombre, bloque_tipo,
                  orden, ejercicio_id, rol, superserie, series_obj, reps_obj,
                  rpe_obj, descanso_s, nota, sustituye_a
                ) VALUES (
                  (SELECT MAX(id) FROM sesiones_plan WHERE user_id = ?),
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )`,
          args: [
            userId,
            bloque.orden,
            bloque.nombre,
            bloque.tipo,
            hueco.orden,
            resuelto.ejercicioId,
            hueco.rol,
            hueco.superserie ?? null,
            prescPropia?.series_obj ?? hueco.series ?? 3,
            prescPropia?.reps_obj ?? hueco.reps ?? '8-10',
            hueco.rpe_objetivo ?? null,
            prescPropia?.descanso_s ?? hueco.descanso_s ?? 90,
            notaFinal,
            resuelto.sustituyeA,
          ],
        })
      }
    }
  }

  await batch(stmts)
  return cargarSesionesSemana(userId, lunes)
}

/**
 * Construye el catálogo completo de ejercicios disponibles para cambiar o añadir
 * en una sesión planificada, anotando cuáles pertenecen al mismo grupo, a la misma
 * sección del entrenamiento o son creados por el usuario, sin ocultar ninguno.
 */
async function construirCatalogoParaContexto(userId, { ejercicioActualId = null, sesionTipo = null, grupoRef = null, patronRef = null, tipoRegistroRef = null }) {
  const [rodillaRows, fasesRows, catalogo] = await readBatch([
    {
      sql: `SELECT er.fase_id, fr.impacto_max
            FROM estado_rodilla er
            JOIN fases_rodilla fr ON fr.id = er.fase_id
            WHERE er.user_id = ? LIMIT 1`,
      args: [userId],
    },
    { sql: 'SELECT id, impacto_max FROM fases_rodilla ORDER BY id ASC', args: [] },
    {
      sql: `SELECT id, user_id, nombre, grupo, patron, tipo_registro, unilateral, impacto,
                   fase_rodilla_min, equipamiento, instrucciones, video_url,
                   poster_url, video_origen, activo
            FROM ejercicios
            WHERE activo = 1 AND (user_id IS NULL OR user_id = ?)
            ORDER BY nombre ASC`,
      args: [userId],
    },
  ])

  const faseFallback = fasesRows[0] || { id: 1, impacto_max: 1 }
  const faseId = rodillaRows[0]?.fase_id ?? faseFallback.id
  const impactoMax = rodillaRows[0]?.impacto_max ?? faseFallback.impacto_max
  const gruposSeccion = GRUPOS_POR_TIPO_SESION[sesionTipo] || []

  const cands = catalogo
    .filter((c) => c.id !== ejercicioActualId)
    .map(({ activo: _activo, ...c }) => {
      const esPersonal = c.user_id != null && Number(c.user_id) === Number(userId)
      const esMismoGrupo = Boolean(grupoRef && c.grupo === grupoRef)
      const esMismaSeccion = Boolean(
        esMismoGrupo || gruposSeccion.includes(c.grupo),
      )
      const avisoRodilla = Boolean(c.impacto > impactoMax || c.fase_rodilla_min > faseId)
      return {
        ...c,
        es_personal: esPersonal,
        es_mismo_grupo: esMismoGrupo,
        es_misma_seccion: esMismaSeccion,
        aviso_rodilla: avisoRodilla,
        prescripcion_sugerida: prescripcionPorDefecto(c),
      }
    })

  cands.sort((a, b) => {
    const score = (item) => {
      let s = 0
      if (item.es_mismo_grupo) s += 100
      else if (item.es_misma_seccion) s += 50
      if (item.es_personal && item.es_mismo_grupo) s += 40
      else if (item.es_personal && item.es_misma_seccion) s += 25
      else if (item.es_personal) s += 10
      if (patronRef && item.patron === patronRef) s += 8
      if (tipoRegistroRef && item.tipo_registro === tipoRegistroRef) s += 4
      if (!item.aviso_rodilla) s += 2
      return s
    }
    const diff = score(b) - score(a)
    if (diff !== 0) return diff
    return a.nombre.localeCompare(b.nombre, 'es')
  })

  return cands
}

/**
 * Devuelve ejercicios para sustituir un ejercicio concreto de una sesion planificada.
 */
export async function candidatosSustitucion(userId, sesionEjercicioId) {
  const actual = await queryOne(
    `SELECT se.id, se.ejercicio_id, sp.tipo AS sesion_tipo, e.grupo, e.patron, e.tipo_registro
     FROM sesion_ejercicios se
     JOIN sesiones_plan sp ON sp.id = se.sesion_plan_id
     JOIN ejercicios e ON e.id = se.ejercicio_id
     WHERE se.id = ? AND sp.user_id = ?
     LIMIT 1`,
    [sesionEjercicioId, userId],
  )

  if (!actual) {
    throw httpError(404, 'No se encontró el ejercicio dentro de tu sesión.')
  }

  return construirCatalogoParaContexto(userId, {
    ejercicioActualId: actual.ejercicio_id,
    sesionTipo: actual.sesion_tipo,
    grupoRef: actual.grupo,
    patronRef: actual.patron,
    tipoRegistroRef: actual.tipo_registro,
  })
}

/**
 * Devuelve ejercicios disponibles para añadir a un bloque de una sesión planificada.
 */
export async function candidatosParaSesion(userId, sesionPlanId, grupoSugerido = null) {
  const sesion = await queryOne(
    'SELECT id, tipo FROM sesiones_plan WHERE id = ? AND user_id = ? LIMIT 1',
    [sesionPlanId, userId],
  )
  if (!sesion) {
    throw httpError(404, 'No se encontró la sesión planificada.')
  }

  const grupoPorDefecto =
    grupoSugerido ||
    (sesion.tipo === 'carrera'
      ? 'carrera'
      : sesion.tipo === 'pliometria_agilidad'
        ? 'pliometria'
        : sesion.tipo === 'inferior'
          ? 'cuadriceps'
          : sesion.tipo === 'superior'
            ? 'pecho'
            : 'movilidad')

  return construirCatalogoParaContexto(userId, {
    ejercicioActualId: null,
    sesionTipo: sesion.tipo,
    grupoRef: grupoPorDefecto,
  })
}

/**
 * Reemplaza una sesión planificada concreta por una plantilla del sistema (1..7),
 * aplicando las reglas de fase de rodilla, exclusión de material exterior/gym y
 * rotación inteligente de ejercicios (incluyendo no repetir variables ya programadas
 * en la misma semana ni en las últimas 8 semanas).
 */
export async function reemplazarSesionPorPlantilla(userId, sesionPlanId, plantillaId) {
  const sesion = await queryOne(
    'SELECT id, fecha, estado FROM sesiones_plan WHERE id = ? AND user_id = ? LIMIT 1',
    [sesionPlanId, userId],
  )
  if (!sesion) {
    throw httpError(404, 'No se encontró la sesión planificada.')
  }

  const lunes = lunesDe(sesion.fecha)
  const domingo = addDias(lunes, 6)
  const desdeHistorial = addDias(lunes, -56)

  const [rodillaRows, fasesRows, catalogo, plantillasRows, bloquesRows, huecosRows, historialRows] =
    await readBatch([
      {
        sql: `SELECT er.fase_id, fr.impacto_max
              FROM estado_rodilla er
              JOIN fases_rodilla fr ON fr.id = er.fase_id
              WHERE er.user_id = ? LIMIT 1`,
        args: [userId],
      },
      { sql: 'SELECT id, impacto_max FROM fases_rodilla ORDER BY id ASC', args: [] },
      {
        sql: `SELECT id, user_id, nombre, grupo, patron, tipo_registro, unilateral, impacto,
                     fase_rodilla_min, equipamiento, instrucciones, video_url,
                     poster_url, video_origen, activo
              FROM ejercicios
              WHERE activo = 1 AND (user_id IS NULL OR user_id = ?)
              ORDER BY id ASC`,
        args: [userId],
      },
      {
        sql: `SELECT id, nombre, tipo, descripcion
              FROM plantillas_sesion
              WHERE activo = 1 AND (user_id IS NULL OR user_id = ?)
              ORDER BY id ASC`,
        args: [userId],
      },
      {
        sql: 'SELECT id, plantilla_id, orden, nombre, tipo FROM plantilla_bloques ORDER BY plantilla_id ASC, orden ASC',
        args: [],
      },
      {
        sql: `SELECT id, bloque_id, orden, rol, ejercicio_id, filtro_grupo, filtro_patron,
                     filtro_tipo_registro, rotacion, superserie, series, reps,
                     rpe_objetivo, descanso_s, nota
              FROM plantilla_huecos
              ORDER BY bloque_id ASC, orden ASC`,
        args: [],
      },
      {
        sql: `SELECT sp.id AS sesion_id, sp.plantilla_id, sp.fecha, se.bloque_orden, se.orden, se.ejercicio_id
              FROM sesion_ejercicios se
              JOIN sesiones_plan sp ON sp.id = se.sesion_plan_id
              WHERE sp.user_id = ? AND sp.fecha >= ? AND sp.fecha <= ? AND sp.id != ?
              ORDER BY
                CASE WHEN sp.fecha >= ? THEN 0 ELSE 1 END ASC,
                sp.fecha DESC,
                se.id DESC`,
        args: [userId, desdeHistorial, domingo, sesionPlanId, lunes],
      },
    ])

  const huecosPorBloque = new Map()
  for (const h of huecosRows) {
    if (!huecosPorBloque.has(h.bloque_id)) huecosPorBloque.set(h.bloque_id, [])
    huecosPorBloque.get(h.bloque_id).push(h)
  }

  const bloquesPorPlantilla = new Map()
  for (const b of bloquesRows) {
    if (!bloquesPorPlantilla.has(b.plantilla_id)) bloquesPorPlantilla.set(b.plantilla_id, [])
    bloquesPorPlantilla.get(b.plantilla_id).push({
      ...b,
      huecos: huecosPorBloque.get(b.id) || [],
    })
  }

  const plantillasMap = new Map()
  for (const p of plantillasRows) {
    plantillasMap.set(Number(p.id), {
      ...p,
      keyId: Number(p.id),
      bloques: bloquesPorPlantilla.get(p.id) || [],
    })
  }

  const pid = Number(plantillaId)
  const plantilla =
    plantillasMap.get(pid) || (pid === T.PIERNA_B ? FALLBACK_PIERNA_B : null)
  if (!plantilla) {
    throw httpError(404, 'Plantilla de entrenamiento no encontrada.')
  }

  const historialMap = new Map()
  const vistoClavePorSlot = new Set()
  for (const row of historialRows) {
    const pKey = row.plantilla_id ?? T.PIERNA_B
    const slotKey = `${pKey}:${row.bloque_orden}:${row.orden}`
    const esMismaSemana = row.fecha >= lunes && row.fecha <= domingo
    const dedupKey = esMismaSemana
      ? `${slotKey}:ses:${row.sesion_id}`
      : `${slotKey}:sem:${lunesDe(row.fecha)}`
    if (vistoClavePorSlot.has(dedupKey)) continue
    vistoClavePorSlot.add(dedupKey)
    if (!historialMap.has(slotKey)) historialMap.set(slotKey, [])
    historialMap.get(slotKey).push({ ejercicio_id: row.ejercicio_id })
  }

  const faseFallback = fasesRows[0] || { id: 1, impacto_max: 1 }
  const ctx = {
    faseId: rodillaRows[0]?.fase_id ?? faseFallback.id,
    impactoMax: rodillaRows[0]?.impacto_max ?? faseFallback.impacto_max,
  }
  const catalogoMap = new Map(catalogo.map((e) => [e.id, e]))

  const dbPlantillaId = plantillasMap.has(pid) ? plantilla.id : null
  const stmts = [
    {
      sql: `UPDATE series_registradas
            SET sesion_ejercicio_id = NULL
            WHERE sesion_ejercicio_id IN (
              SELECT id FROM sesion_ejercicios WHERE sesion_plan_id = ?
            )`,
      args: [sesionPlanId],
    },
    {
      sql: 'DELETE FROM sesion_ejercicios WHERE sesion_plan_id = ?',
      args: [sesionPlanId],
    },
    {
      sql: `UPDATE sesiones_plan
            SET plantilla_id = ?, tipo = ?, titulo = ?, descripcion = ?
            WHERE id = ? AND user_id = ?`,
      args: [
        dbPlantillaId,
        plantilla.tipo,
        plantilla.nombre,
        plantilla.descripcion || null,
        sesionPlanId,
        userId,
      ],
    },
  ]

  const usadosEnSesion = new Set()
  const esSesionExterior =
    plantilla.tipo === 'carrera' || plantilla.tipo === 'pliometria_agilidad'
  const ctxSesion = {
    ...ctx,
    impactoMax: esSesionExterior ? Math.max(ctx.impactoMax, 2) : ctx.impactoMax,
    excluirEquipo: esSesionExterior
      ? [
          'barra',
          'mancuerna',
          'maquina',
          'máquina',
          'polea',
          'rack',
          'multipower',
          'prensa',
          'fitball',
          'landmine',
          'trineo',
          'kettlebell',
          'disco',
        ]
      : ['conos', 'pista', 'vallas'],
  }

  for (const bloque of plantilla.bloques) {
    for (const hueco of bloque.huecos) {
      const resuelto = resolverEjercicioHueco({
        hueco,
        plantillaKey: plantilla.keyId ?? pid,
        bloqueOrden: bloque.orden,
        lunes: sesion.fecha,
        userId,
        catalogo,
        catalogoMap,
        ctx: ctxSesion,
        historialMap,
        usadosEnSesion,
      })

      if (!resuelto.ejercicioId) continue
      usadosEnSesion.add(resuelto.ejercicioId)

      const ejResuelto = catalogoMap.get(resuelto.ejercicioId)
      const usarPrescripcionPropia =
        ejResuelto &&
        ejResuelto.grupo === 'carrera' &&
        resuelto.ejercicioId !== hueco.ejercicio_id &&
        bloque.tipo === 'carrera'
      const prescPropia = usarPrescripcionPropia ? prescripcionPorDefecto(ejResuelto) : null

      const notaBase = prescPropia?.nota || hueco.nota || null
      const notaFinal = resuelto.adaptadoRodilla
        ? `${notaBase ? `${notaBase} · ` : ''}(Adaptado a tu fase actual de rodilla)`
        : notaBase

      stmts.push({
        sql: `INSERT INTO sesion_ejercicios (
                sesion_plan_id, bloque_orden, bloque_nombre, bloque_tipo,
                orden, ejercicio_id, rol, superserie, series_obj, reps_obj,
                rpe_obj, descanso_s, nota, sustituye_a
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sesionPlanId,
          bloque.orden,
          bloque.nombre,
          bloque.tipo,
          hueco.orden,
          resuelto.ejercicioId,
          hueco.rol,
          hueco.superserie ?? null,
          prescPropia?.series_obj ?? hueco.series ?? 3,
          prescPropia?.reps_obj ?? hueco.reps ?? '8-10',
          hueco.rpe_objetivo ?? null,
          prescPropia?.descanso_s ?? hueco.descanso_s ?? 90,
          notaFinal,
          resuelto.sustituyeA,
        ],
      })
    }
  }

  await batch(stmts)
  return { ok: true, sesionPlanId }
}

/**
 * Reemplaza una sesión planificada por una lista personalizada de ejercicios
 * (procedente de una rutina favorita o del creador manual).
 */
export async function reemplazarSesionPorItems(
  userId,
  sesionPlanId,
  { titulo, tipo, descripcion = null, items = [] },
) {
  const sesion = await queryOne(
    'SELECT id FROM sesiones_plan WHERE id = ? AND user_id = ? LIMIT 1',
    [sesionPlanId, userId],
  )
  if (!sesion) {
    throw httpError(404, 'No se encontró la sesión planificada.')
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, 'El entrenamiento debe incluir al menos un ejercicio.')
  }

  const ids = Array.from(
    new Set(
      items
        .map((it) => Number(it.ejercicio_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  )
  if (ids.length === 0) {
    throw httpError(400, 'Selecciona al menos un ejercicio válido.')
  }

  const placeholders = ids.map(() => '?').join(',')
  const [ejRows] = await readBatch([
    {
      sql: `SELECT id, nombre, grupo, patron, tipo_registro, unilateral, instrucciones
            FROM ejercicios
            WHERE id IN (${placeholders}) AND activo = 1 AND (user_id IS NULL OR user_id = ?)`,
      args: [...ids, userId],
    },
  ])
  const ejMap = new Map((ejRows || []).map((e) => [Number(e.id), e]))

  const itemsValidos = items
    .map((it) => {
      const ej = ejMap.get(Number(it.ejercicio_id))
      if (!ej) return null
      const presc = prescripcionPorDefecto(ej)
      return {
        ej,
        bloque_orden:
          Number.isInteger(Number(it.bloque_orden)) && Number(it.bloque_orden) > 0
            ? Number(it.bloque_orden)
            : 1,
        bloque_nombre:
          typeof it.bloque_nombre === 'string' && it.bloque_nombre.trim()
            ? it.bloque_nombre.trim().slice(0, 80)
            : 'Bloque Principal',
        bloque_tipo:
          typeof it.bloque_tipo === 'string' && it.bloque_tipo.trim()
            ? it.bloque_tipo.trim()
            : ej.grupo === 'carrera'
              ? 'carrera'
              : ej.grupo === 'movilidad'
                ? 'preparacion'
                : 'fuerza',
        series_obj:
          Number(it.series_obj) > 0
            ? Math.min(25, Math.max(1, Math.round(Number(it.series_obj))))
            : presc.series_obj,
        reps_obj:
          typeof it.reps_obj === 'string' && it.reps_obj.trim()
            ? it.reps_obj.trim().slice(0, 60)
            : presc.reps_obj,
        descanso_s:
          it.descanso_s != null && Number.isFinite(Number(it.descanso_s)) && Number(it.descanso_s) >= 0
            ? Math.min(600, Math.round(Number(it.descanso_s)))
            : presc.descanso_s,
        nota:
          typeof it.nota === 'string' && it.nota.trim()
            ? it.nota.trim().slice(0, 300)
            : presc.nota,
      }
    })
    .filter(Boolean)

  if (itemsValidos.length === 0) {
    throw httpError(400, 'Ninguno de los ejercicios seleccionados está disponible.')
  }

  const tituloFinal =
    typeof titulo === 'string' && titulo.trim()
      ? titulo.trim().slice(0, 120)
      : 'Entrenamiento Personalizado'
  const tiposPermitidos = new Set([
    'superior',
    'inferior',
    'pliometria_agilidad',
    'carrera',
    'movilidad_core',
    'mixta',
  ])
  const tipoFinal = tiposPermitidos.has(tipo) ? tipo : 'superior'
  const descFinal =
    typeof descripcion === 'string' && descripcion.trim()
      ? descripcion.trim().slice(0, 300)
      : 'Sesión personalizada a medida'

  const stmts = [
    {
      sql: `UPDATE series_registradas
            SET sesion_ejercicio_id = NULL
            WHERE sesion_ejercicio_id IN (
              SELECT id FROM sesion_ejercicios WHERE sesion_plan_id = ?
            )`,
      args: [sesionPlanId],
    },
    {
      sql: 'DELETE FROM sesion_ejercicios WHERE sesion_plan_id = ?',
      args: [sesionPlanId],
    },
    {
      sql: `UPDATE sesiones_plan
            SET plantilla_id = NULL, tipo = ?, titulo = ?, descripcion = ?
            WHERE id = ? AND user_id = ?`,
      args: [tipoFinal, tituloFinal, descFinal, sesionPlanId, userId],
    },
  ]

  const ordenPorBloque = new Map()
  for (const item of itemsValidos) {
    const bOrd = item.bloque_orden
    const nextOrd = (ordenPorBloque.get(bOrd) || 0) + 1
    ordenPorBloque.set(bOrd, nextOrd)

    stmts.push({
      sql: `INSERT INTO sesion_ejercicios (
              sesion_plan_id, bloque_orden, bloque_nombre, bloque_tipo,
              orden, ejercicio_id, rol, superserie, series_obj, reps_obj,
              rpe_obj, descanso_s, nota, sustituye_a
            ) VALUES (?, ?, ?, ?, ?, ?, 'variable', NULL, ?, ?, 8.0, ?, ?, NULL)`,
      args: [
        sesionPlanId,
        bOrd,
        item.bloque_nombre,
        item.bloque_tipo,
        nextOrd,
        item.ej.id,
        item.series_obj,
        item.reps_obj,
        item.descanso_s,
        item.nota,
      ],
    })
  }

  await batch(stmts)
  return { ok: true, sesionPlanId }
}
