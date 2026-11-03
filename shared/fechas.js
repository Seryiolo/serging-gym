/**
 * Utilidades de fechas compartidas. Todas trabajan con cadenas ISO "YYYY-MM-DD"
 * y aritmetica en UTC, para no depender de la zona horaria del dispositivo ni
 * de cambios de hora (el bug clasico de new Date(...).toISOString()).
 */

export const TZ = 'Europe/Madrid'

const ISO = /^\d{4}-\d{2}-\d{2}$/

export function esISO(s) {
  if (typeof s !== 'string' || !ISO.test(s)) return false
  const d = parseISO(s)
  return !Number.isNaN(d.getTime()) && toISO(d) === s
}

function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toISO(d) {
  return d.toISOString().slice(0, 10)
}

/** Fecha de hoy en Madrid, sea cual sea la zona del dispositivo/servidor. */
export function hoyMadrid(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ahora)
}

export function addDias(iso, n) {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}

/** 0 = lunes ... 6 = domingo */
export function diaSemana(iso) {
  return (parseISO(iso).getUTCDay() + 6) % 7
}

export function lunesDe(iso) {
  return addDias(iso, -diaSemana(iso))
}

export function diasDeSemana(lunesIso) {
  return Array.from({ length: 7 }, (_, i) => addDias(lunesIso, i))
}

/** Semanas (cada una con 7 ISO) que cubren el mes. mes: 1-12. */
export function cuadriculaMes(anio, mes) {
  const primero = `${anio}-${String(mes).padStart(2, '0')}-01`
  let cursor = lunesDe(primero)
  const ultimo = toISO(new Date(Date.UTC(anio, mes, 0)))
  const semanas = []
  while (cursor <= ultimo) {
    semanas.push(diasDeSemana(cursor))
    cursor = addDias(cursor, 7)
  }
  return semanas
}

export function mesDe(iso) {
  return Number(iso.slice(5, 7))
}

export function anioDe(iso) {
  return Number(iso.slice(0, 4))
}

export function diasEntre(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 86400000)
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export const nombreMes = (mes) => MESES[mes - 1]
export const nombreDia = (iso) => DIAS[diaSemana(iso)]

/** "2026-11-03" -> "03/11" */
export function formatCorto(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

/** "2026-11-03" -> "martes 3 de noviembre" */
export function formatLargo(iso) {
  return `${nombreDia(iso)} ${Number(iso.slice(8, 10))} de ${nombreMes(mesDe(iso))}`
}
