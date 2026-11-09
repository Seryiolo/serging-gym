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

/**
 * Convierte texto de tiempo ("3:55", "03:55", "1:05:20" o "45") a segundos totales.
 * Devuelve entero >= 0 o null si no es válido.
 */
export function parseTiempoSegundos(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor >= 0 ? Math.round(valor) : null
  }
  const s = String(valor).trim()
  if (!s) return null

  if (s.includes(':')) {
    const partes = s.split(':').map((p) => p.trim())
    if (partes.length === 2) {
      const min = parseEntero(partes[0])
      const seg = parseEntero(partes[1])
      if (min === null || seg === null || seg > 59) return null
      return min * 60 + seg
    }
    if (partes.length === 3) {
      const h = parseEntero(partes[0])
      const min = parseEntero(partes[1])
      const seg = parseEntero(partes[2])
      if (h === null || min === null || seg === null || min > 59 || seg > 59) return null
      return h * 3600 + min * 60 + seg
    }
    return null
  }

  const num = parseDecimal(s)
  if (num === null || num < 0) return null
  return Math.round(num)
}

/**
 * Formatea segundos para un input editable:
 * - Si >= 60s -> "m:ss" (ej. 235 -> "3:55")
 * - Si < 60s  -> "45"
 */
export function formatSegundosInput(segundos, forzarMMSS = false) {
  const n = Number(segundos)
  if (!Number.isFinite(n) || n <= 0) return ''
  const s = Math.round(n)
  if (s >= 60 || forzarMMSS) {
    return formatDuracion(s)
  }
  return String(s)
}

/**
 * Extrae la distancia objetivo en metros de un ejercicio de carrera/series/drills
 * a partir de su reps_obj (ej. "1000m @ Z4-Z5", "40 metros", "8k - 14k Z2") o su nombre.
 */
export function extraerDistanciaMetros(repsObj = '', nombreEj = '') {
  const texto = `${repsObj || ''} ${nombreEj || ''}`.toLowerCase()

  // Buscar patrón explícito en metros: "1000m", "2000 m", "400m", "40 metros", "80m"
  const matchMetros = texto.match(/(\d{2,5})\s*(?:m|metros|mts)\b/)
  if (matchMetros) {
    return Number(matchMetros[1])
  }

  // Buscar patrón en kilómetros: "8k", "10 km", "5k"
  const matchKm = texto.match(/(\d+(?:[.,]\d+)?)\s*(?:k|km|kilometros|kilómetros)\b/)
  if (matchKm) {
    const km = Number(matchKm[1].replace(',', '.'))
    if (Number.isFinite(km) && km > 0) return Math.round(km * 1000)
  }

  // Si es trote suave regenerativo por minutos (ej. "10-12 min Z1"), estimar 2000m por defecto
  if (texto.includes('min') && (texto.includes('trote') || texto.includes('z1') || texto.includes('z2'))) {
    return 2000
  }

  return 1000
}

/**
 * Formatea una marca registrada de forma lógica según el tipo de actividad:
 * - carrera: "1000m en 3:52 (3:52/km)" o "40m en 6s"
 * - isometrico / tiempo: "35 seg" o "35 seg · 10 kg"
 * - movilidad: "8 reps" o "45 seg"
 * - fuerza / pliometria: "60 kg × 8 reps" o "8 reps"
 */
export function formatearMarcaLogica(marca, tipoReg = 'fuerza') {
  if (!marca) return null
  const peso = marca.peso_kg != null && Number(marca.peso_kg) > 0 ? Number(marca.peso_kg) : null
  const reps = marca.reps != null && Number(marca.reps) > 0 ? Number(marca.reps) : null
  const seg = marca.segundos != null && Number(marca.segundos) > 0 ? Number(marca.segundos) : null

  if (tipoReg === 'carrera') {
    if (reps && seg) {
      const distLabel =
        reps >= 3000 && reps % 100 === 0
          ? `${(reps / 1000).toFixed(reps % 1000 === 0 ? 0 : 1)} km`
          : `${reps}m`
      if (reps >= 200) {
        const ritmo = ritmoSegKm(reps, seg)
        return `${distLabel} en ${formatDuracion(seg)} (${formatRitmo(ritmo)}/km)`
      }
      return `${distLabel} en ${seg >= 60 ? formatDuracion(seg) : `${seg}s`}`
    }
    if (seg) return formatDuracion(seg)
    if (reps) return `${reps >= 200 ? `${reps}m` : `${reps} reps`}`
    return null
  }

  if (tipoReg === 'isometrico' || tipoReg === 'tiempo') {
    const partes = []
    if (seg) partes.push(`${seg} seg`)
    if (peso) partes.push(`${peso} kg`)
    if (!seg && reps) partes.push(`${reps} reps`)
    return partes.length > 0 ? partes.join(' · ') : null
  }

  if (tipoReg === 'movilidad') {
    const partes = []
    if (reps) partes.push(`${reps} reps`)
    if (seg) partes.push(`${seg} seg`)
    return partes.length > 0 ? partes.join(' · ') : null
  }

  const partes = []
  if (peso) partes.push(`${peso} kg`)
  if (reps) partes.push(`${reps} reps`)
  if (seg) partes.push(`${seg} seg`)
  return partes.length > 0 ? partes.join(' × ') : null
}
