/**
 * Utilidades numericas compartidas (frontend, API y tests).
 * Todas son funciones puras.
 */

/** Convierte "62,5" / "62.5" / " 62 " en numero. Devuelve null si no es valido. */
export function parseDecimal(valor) {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  const s = String(valor).trim().replace(/\s/g, '')
  if (!/^(\d+([.,]\d+)?|[.,]\d+)$/.test(s)) return null
  return Number(s.replace(',', '.'))
}

/** Entero no negativo o null. */
export function parseEntero(valor) {
  const n = parseDecimal(valor)
  if (n === null || !Number.isInteger(n) || n < 0) return null
  return n
}

/** Ritmo en segundos por km (redondeado). */
export function ritmoSegKm(distanciaM, duracionS) {
  if (!(distanciaM > 0) || !(duracionS > 0)) return null
  return Math.round((duracionS * 1000) / distanciaM)
}

/** 290 -> "4:50" */
export function formatRitmo(segKm) {
  if (!Number.isFinite(segKm) || segKm <= 0) return '--:--'
  const m = Math.floor(segKm / 60)
  const s = Math.round(segKm % 60)
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`
}

/** 3725 -> "1:02:05" ; 125 -> "2:05" */
export function formatDuracion(totalS) {
  if (!Number.isFinite(totalS) || totalS < 0) return '--:--'
  const h = Math.floor(totalS / 3600)
  const m = Math.floor((totalS % 3600) / 60)
  const s = Math.floor(totalS % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

/** Minutos y segundos (texto libre) -> segundos totales, o null. */
export function tiempoASegundos(min, seg) {
  const m = min === '' || min === null || min === undefined ? 0 : parseEntero(min)
  const s = seg === '' || seg === null || seg === undefined ? 0 : parseEntero(seg)
  if (m === null || s === null || s > 59) return null
  const total = m * 60 + s
  return total > 0 ? total : null
}

const redondear1 = (n) => Math.round(n * 10) / 10

/**
 * 1RM estimado con Epley. Solo es fiable hasta ~10 repeticiones.
 * @returns {{valor:number, fiable:boolean}|null}
 */
export function estimar1RM(peso, reps) {
  if (!(peso > 0) || !Number.isInteger(reps) || reps < 1 || reps > 30) return null
  const valor = reps === 1 ? peso : redondear1(peso * (1 + reps / 30))
  return { valor, fiable: reps <= 10 }
}

export function tablaPorcentajes(rm, porcentajes = [100, 95, 90, 85, 80, 75, 70, 65, 60]) {
  return porcentajes.map((pct) => ({ pct, kg: redondear1((rm * pct) / 100) }))
}

/** Redondea a la placa/mancuerna mas cercana (por defecto 0.5 kg). */
export function redondearA(valor, paso = 0.5) {
  return Math.round(valor / paso) * paso
}

/** Formatea descanso en segundos a texto legible: 45 -> "45s", 120 -> "2 min", 105 -> "1:45 min" */
export function formatDescanso(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return null
  const s = Math.round(segundos)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const resto = s % 60
  if (resto === 0) return `${m} min`
  return `${m}:${String(resto).padStart(2, '0')} min`
}
