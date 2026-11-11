/**
 * Utilidades de vídeo, miniaturas y audio de descanso para Serging Gym.
 */

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
  ]
  for (const regex of patterns) {
    const match = trimmed.match(regex)
    if (match?.[1]) return match[1]
  }
  return null
}

export function isYouTubeExercise(ejercicio) {
  if (!ejercicio?.video_url) return false
  if (ejercicio.video_origen === 'youtube') return true
  return Boolean(extractYouTubeId(ejercicio.video_url))
}

export function isDirectVideoExercise(ejercicio) {
  if (!ejercicio?.video_url) return false
  if (isYouTubeExercise(ejercicio)) return false
  return ejercicio.video_origen === 'propio' || /\.(mp4|webm|mov)(\?|$)/i.test(ejercicio.video_url) || ejercicio.video_url.startsWith('/videos/')
}

export function hasPlayableVideo(ejercicio) {
  return Boolean(ejercicio?.video_url && ejercicio.video_origen !== 'ninguno')
}

export function getYouTubeEmbedUrl(url, autoplay = true) {
  const id = extractYouTubeId(url)
  if (!id) return null
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`
}

export function getExercisePoster(ejercicio) {
  if (!ejercicio) return null
  if (ejercicio.poster_url) return ejercicio.poster_url
  const ytId = extractYouTubeId(ejercicio.video_url)
  if (ytId) return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
  return null
}

export const GRUPO_LABELS = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombro: 'Hombro',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  core: 'Core',
  cuadriceps: 'Cuádriceps',
  isquios: 'Isquios',
  gluteo: 'Glúteo',
  gemelo: 'Gemelo',
  movilidad: 'Movilidad',
  pliometria: 'Pliometría',
  agilidad: 'Agilidad',
  carrera: 'Carrera',
  cuerpo_completo: 'Full Body',
}

export const IMPACTO_LABELS = {
  0: 'Sin impacto',
  1: 'Impacto bajo',
  2: 'Impacto medio',
  3: 'Impacto alto',
}

/**
 * Emite un doble tono suave con Web Audio API cuando termina el descanso.
 */
let sharedAudioCtx = null

/**
 * iOS/Safari solo permite sonido si el AudioContext se crea o reanuda dentro de un gesto del usuario.
 * Se llama al pulsar "completar serie" (inicio del descanso) para dejarlo listo antes del pitido.
 */
export function unlockAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
  } catch {
    // Silencioso si el navegador bloquea Web Audio
  }
}

export function playRestBeep() {
  try {
    unlockAudio()
    const ctx = sharedAudioCtx
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const now = ctx.currentTime

    const playTone = (freq, startOffset, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + startOffset)
      gain.gain.setValueAtTime(0.001, now + startOffset)
      gain.gain.exponentialRampToValueAtTime(0.14, now + startOffset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + startOffset)
      osc.stop(now + startOffset + duration + 0.02)
    }

    playTone(660, 0, 0.14)
    playTone(880, 0.17, 0.22)
  } catch {
    // Silencioso si el navegador bloquea Web Audio
  }
}
