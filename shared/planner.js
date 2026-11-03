/**
 * Logica pura del planificador semanal (sin acceso a la base de datos).
 * La capa con BD vive en api/_lib/planner.js.
 */
import { addDias, diaSemana } from './fechas.js'

/** Ids de plantillas (ver db/seed_plantillas.sql) */
export const T = {
  TORSO_A: 1,      // empuje
  PIERNA_A: 2,     // fuerza unilateral + pliometria controlada
  CARRERA_PISTA: 3,
  TORSO_B: 4,      // traccion
  AGILIDAD: 5,     // reatletizacion: cambios de direccion + cadena posterior
  RODAJE: 6,       // continuo + core
  PIERNA_B: 7,     // cadera, isometricos y core
}

/**
 * Patrones semanales por numero de dias: [offset desde el lunes, plantilla].
 * Editable: para cambiar la distribucion de la semana basta con tocar esta tabla.
 * Reglas buscadas: tren superior 1-2 dias, pierna/pliometria 2-3 dias, carrera 1-3,
 * y nunca dos sesiones exigentes de pierna seguidas.
 */
export const PATRONES = {
  4: [[0, T.PIERNA_A], [1, T.TORSO_A], [3, T.CARRERA_PISTA], [5, T.PIERNA_B]],
  5: [[0, T.PIERNA_A], [1, T.TORSO_A], [2, T.RODAJE], [4, T.CARRERA_PISTA], [5, T.AGILIDAD]],
  6: [[0, T.PIERNA_A], [1, T.TORSO_A], [2, T.RODAJE], [3, T.PIERNA_B], [4, T.CARRERA_PISTA], [5, T.AGILIDAD]],
}

/**
 * Composicion de una semana.
 * @param {{dias:number, hayCarrera?:boolean, segundoSuperior?:boolean}} opts
 * @returns {Array<{offset:number, plantillaId:number, nota?:string}>}
 */
export function composicionSemana({ dias, hayCarrera = false, segundoSuperior = false }) {
  const base = PATRONES[dias]
  if (!base) throw new Error(`Numero de dias no soportado: ${dias} (usa 4, 5 o 6)`)
  let sesiones = base.map(([offset, plantillaId]) => ({ offset, plantillaId }))

  if (segundoSuperior) {
    // El segundo dia de tren superior sustituye al rodaje (o, en 4 dias, a Pierna B)
    const objetivo = dias === 4 ? T.PIERNA_B : T.RODAJE
    sesiones = sesiones.map((s) => (s.plantillaId === objetivo ? { ...s, plantillaId: T.TORSO_B } : s))
  }

  if (hayCarrera) {
    // Semana de carrera: sin series de pista ni pliometria/agilidad intensa
    sesiones = sesiones
      .filter((s) => s.plantillaId !== T.AGILIDAD)
      .map((s) => (s.plantillaId === T.CARRERA_PISTA
        ? { ...s, plantillaId: T.RODAJE, nota: 'Semana de carrera: rodaje suave en lugar de series.' }
        : s))
  }
  return sesiones.sort((a, b) => a.offset - b.offset)
}

/** Fecha concreta de cada sesion de la semana. */
export function fechasDeSemana(lunes, composicion) {
  return composicion.map((s) => ({ ...s, fecha: addDias(lunes, s.offset) }))
}

// ---------------------------------------------------------------- variables

/** PRNG determinista (mulberry32) a partir de un texto. */
export function semillaDe(texto) {
  let h = 1779033703 ^ texto.length
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/**
 * Filtra el catalogo para un hueco variable.
 * @param {Array} catalogo
 * @param {{grupo?:string, patron?:string, tipo_registro?:string}} filtro
 * @param {{impactoMax:number, faseId:number, excluirEquipo?:string[]}} ctx
 */
export function candidatosDeHueco(catalogo, filtro, ctx) {
  const excluir = (ctx.excluirEquipo ?? []).map((e) => e.toLowerCase())
  return catalogo.filter((e) => {
    if (!e.activo) return false
    if (filtro.grupo && e.grupo !== filtro.grupo) return false
    if (filtro.patron && e.patron !== filtro.patron) return false
    if (filtro.tipo_registro && e.tipo_registro !== filtro.tipo_registro) return false
    if (e.impacto > ctx.impactoMax) return false
    if (e.fase_rodilla_min > ctx.faseId) return false
    const equipo = (e.equipamiento ?? '').toLowerCase()
    if (excluir.some((x) => x && equipo.includes(x))) return false
    return true
  })
}

/**
 * Elige el ejercicio de un hueco variable.
 * @param {Array} candidatos
 * @param {Array<{ejercicio_id:number}>} historial  usos previos del hueco, mas reciente primero (uno por semana)
 * @param {'semanal'|'mensual'|'nunca'} rotacion
 * @param {number|null} porDefecto  ejercicio_id de la plantilla (se usa si 'nunca' o no hay candidatos)
 * @param {string} semilla  texto estable (usuario+semana+hueco) para desempatar
 */
export function elegirVariable({ candidatos, historial, rotacion, porDefecto, semilla }) {
  if (candidatos.length === 0) return porDefecto ?? null
  const ids = new Set(candidatos.map((c) => c.id))
  const ultimo = historial[0]?.ejercicio_id

  if (rotacion === 'nunca') return ids.has(porDefecto) ? porDefecto : candidatos[0].id

  if (rotacion === 'mensual' && ultimo != null && ids.has(ultimo)) {
    let seguidas = 0
    for (const h of historial) {
      if (h.ejercicio_id === ultimo) seguidas += 1
      else break
    }
    if (seguidas < 4) return ultimo
  }

  if (candidatos.length === 1) return candidatos[0].id

  // Menos usado recientemente: los que nunca se usaron van primero; despues los mas antiguos.
  const ultimaPosicion = new Map()
  historial.forEach((h, i) => { if (!ultimaPosicion.has(h.ejercicio_id)) ultimaPosicion.set(h.ejercicio_id, i) })
  const puntuacion = (c) => (ultimaPosicion.has(c.id) ? ultimaPosicion.get(c.id) : Infinity)

  let pool = candidatos.filter((c) => c.id !== ultimo)
  if (pool.length === 0) pool = candidatos
  const mejor = Math.max(...pool.map(puntuacion))
  const empatados = pool.filter((c) => puntuacion(c) === mejor).sort((a, b) => a.id - b.id)
  const azar = semillaDe(semilla)
  return empatados[Math.floor(azar() * empatados.length)].id
}

/** Dias de la semana (0=lun) que tienen sesion, para pintar la agenda. */
export function offsetsConSesion(composicion) {
  return composicion.map((s) => s.offset)
}

export { diaSemana }
