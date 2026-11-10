import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from '../api/_lib/auth.js'
import { calcularZonasRitmo } from '../api/carreras.js'
import { extractYoutubeId } from '../api/ejercicios.js'
import { construirEstadoRodilla } from '../api/_lib/planner-db.js'
import {
  extractYouTubeId as extractYouTubeIdFront,
  getExercisePoster,
  hasPlayableVideo,
  isDirectVideoExercise,
  isYouTubeExercise,
} from '../src/lib/media.js'
import { T } from '../shared/planner.js'
import {
  parseTiempoSegundos,
  formatSegundosInput,
  extraerDistanciaMetros,
  extraerSecuenciaDistanciasMetros,
  prescripcionPorDefecto,
  formatearMarcaLogica,
} from '../shared/numeros.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ------------------------------------------------------------------ 1. Auth
test('auth: hashPassword y verifyPassword validan contraseñas y rechazan manipulaciones', async () => {
  const hash = await hashPassword('ClaveSegura2026!')
  assert.ok(hash.startsWith('scrypt$') || hash.includes(':'), 'El hash debe incluir sal y clave derivada')
  assert.equal(await verifyPassword('ClaveSegura2026!', hash), true)
  assert.equal(await verifyPassword('OtraClave', hash), false)
  assert.equal(await verifyPassword('', hash), false)
  assert.equal(await verifyPassword('ClaveSegura2026!', 'formato_invalido'), false)
})

test('auth: createSessionToken y verifySessionToken firman y detectan expiración/alteración', () => {
  process.env.AUTH_SECRET = 'test-secret-serging-gym-local-only'
  const token = createSessionToken({ id: 10000, rol: 'admin' }, 3600)
  const payload = verifySessionToken(token)
  assert.equal(payload?.uid, 10000)
  assert.equal(payload?.rol, 'admin')

  // Token manipulado
  const [body, sig] = token.split('.')
  const tampered = `${body}.${sig.slice(0, -2)}aa`
  assert.equal(verifySessionToken(tampered), null)

  // Token expirado
  const expired = createSessionToken({ id: 10000, rol: 'usuario' }, -10)
  assert.equal(verifySessionToken(expired), null)
})

// --------------------------------------------------------------- 2. Carreras
test('carreras: calcularZonasRitmo genera Z1..Z5 coherentes con marcas reales de Sergio', () => {
  const zonasDefault = calcularZonasRitmo([])
  assert.equal(zonasDefault.length, 5)
  for (let i = 0; i < zonasDefault.length - 1; i += 1) {
    assert.ok(
      zonasDefault[i].ritmo_min_seg_km >= zonasDefault[i + 1].ritmo_min_seg_km,
      `Zona ${i + 1} debe ser más suave que Zona ${i + 2}`
    )
  }

  const marcasSergio = [
    { distancia_m: 1000, ritmo_seg_km: 230, fecha: '2026-09-01' },
    { distancia_m: 5000, ritmo_seg_km: 263, fecha: '2026-09-01' },
    { distancia_m: 10000, ritmo_seg_km: 290, fecha: '2026-09-01' },
    { distancia_m: 15000, ritmo_seg_km: 300, fecha: '2026-09-01' },
    { distancia_m: 21097, ritmo_seg_km: 316, fecha: '2026-09-01' },
  ]
  const zonas = calcularZonasRitmo(marcasSergio)
  assert.equal(zonas.length, 5)
  const z2 = zonas.find((z) => z.codigo === 'Z2')
  const z4 = zonas.find((z) => z.codigo === 'Z4')
  const z5 = zonas.find((z) => z.codigo === 'Z5')
  assert.equal(z2.ritmo_min_seg_km, 324) // 5:24/km
  assert.equal(z4.ritmo_min_seg_km, 285) // 4:45/km
  assert.ok(z5.ritmo_min_seg_km <= 255) // <= 4:15/km
})

// ----------------------------------------------------------------- 3. Media
test('media y youtube: extracción de IDs, posters propios vs YouTube y detección de vídeo', () => {
  const urls = [
    ['https://www.youtube.com/watch?v=gRVjAtPip0Y', 'gRVjAtPip0Y'],
    ['https://youtu.be/eGo4IYlbE5g?si=123', 'eGo4IYlbE5g'],
    ['https://www.youtube.com/shorts/hk4mgq9Ppvk', 'hk4mgq9Ppvk'],
    ['https://www.youtube.com/embed/MvnoCUVpkDc', 'MvnoCUVpkDc'],
  ]
  for (const [url, expected] of urls) {
    assert.equal(extractYoutubeId(url), expected)
    assert.equal(extractYouTubeIdFront(url), expected)
  }
  assert.equal(extractYoutubeId(''), null)
  assert.equal(extractYoutubeId('/videos/rodilla/hip-thrust-barra.mp4'), null)

  const ejPropio = {
    video_url: '/videos/rodilla/hip-thrust-barra.mp4',
    poster_url: '/videos/posters/hip-thrust-barra.jpg',
    video_origen: 'propio',
  }
  assert.equal(isDirectVideoExercise(ejPropio), true)
  assert.equal(isYouTubeExercise(ejPropio), false)
  assert.equal(hasPlayableVideo(ejPropio), true)
  assert.equal(getExercisePoster(ejPropio), '/videos/posters/hip-thrust-barra.jpg')

  const ejYt = {
    video_url: 'https://www.youtube.com/watch?v=gRVjAtPip0Y',
    poster_url: null,
    video_origen: 'youtube',
  }
  assert.equal(isYouTubeExercise(ejYt), true)
  assert.equal(hasPlayableVideo(ejYt), true)
  assert.equal(
    getExercisePoster(ejYt),
    'https://i.ytimg.com/vi/gRVjAtPip0Y/hqdefault.jpg'
  )
})

// ----------------------------------------------------------- 4. Estado Rodilla
test('planner-db: construirEstadoRodilla evalúa racha estable y alerta por hinchazón', () => {
  const fases = [
    { id: 1, nombre: 'Fase 1', impacto_max: 1, sesiones_para_subir: 4, molestia_max_subir: 2, molestia_min_bajar: 5 },
    { id: 2, nombre: 'Fase 2', impacto_max: 2, sesiones_para_subir: 6, molestia_max_subir: 2, molestia_min_bajar: 5 },
    { id: 3, nombre: 'Fase 3', impacto_max: 3, sesiones_para_subir: 6, molestia_max_subir: 2, molestia_min_bajar: 5 },
  ]
  const entrenosEstables = [
    { id: 4, molestia_durante: 1, molestia_despues: 1, hinchazon: 0 },
    { id: 3, molestia_durante: 2, molestia_despues: 1, hinchazon: 0 },
    { id: 2, molestia_durante: 0, molestia_despues: 1, hinchazon: 0 },
    { id: 1, molestia_durante: 1, molestia_despues: 2, hinchazon: 0 },
  ]
  const estadoSubir = construirEstadoRodilla({ fase_id: 1, modo_auto: 1 }, fases, entrenosEstables, '2026-11-03')
  assert.equal(estadoSubir.fase_id, 1)
  assert.equal(estadoSubir.evaluacion.progreso, 4)
  assert.equal(estadoSubir.evaluacion.accion, 'subir')

  const entrenosConDerrame = [
    { id: 5, molestia_durante: 2, molestia_despues: 3, hinchazon: 1 },
  ]
  const estadoBajar = construirEstadoRodilla({ fase_id: 2, modo_auto: 1 }, fases, entrenosConDerrame, '2026-11-03')
  assert.equal(estadoBajar.evaluacion.accion, 'bajar')
})

// ----------------------------- 5. Integridad SQL + 30 Vídeos Personales + Plantillas
test('seeds y pipeline de vídeos: 30 slugs personales mapeados 1-a-1, sin colisiones y con FKs válidas', () => {
  const pyContent = fs.readFileSync(
    path.join(ROOT, 'scripts', 'videos', '03_recortar_videos.py'),
    'utf8'
  )
  const finalistRe = /\(\s*\d+\s*,\s*"([a-z0-9-]+)"\s*,\s*"[^"]+"\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g
  const finalists = Array.from(pyContent.matchAll(finalistRe)).map((m) => ({
    slug: m[1],
    ini: Number(m[2]),
    fin: Number(m[3]),
    pos: Number(m[4]),
  }))
  assert.equal(finalists.length, 30, 'Deben existir exactamente 30 vídeos finalistas en 03_recortar_videos.py')

  const slugSet = new Set(finalists.map((f) => f.slug))
  assert.equal(slugSet.size, 30, 'Los 30 slugs de vídeos personales deben ser únicos')

  for (const f of finalists) {
    const dur = f.fin - f.ini
    assert.ok(dur >= 8 && dur <= 12.5, `Duración fuera de rango (8-12s) en ${f.slug}: ${dur}s`)
    assert.ok(f.pos >= f.ini && f.pos <= f.fin, `Poster fuera del clip en ${f.slug}`)
  }

  const sqlEj = fs.readFileSync(path.join(ROOT, 'db', 'seed_ejercicios.sql'), 'utf8')
  assert.ok(
    sqlEj.includes('ON CONFLICT(id) DO UPDATE'),
    'seed_ejercicios.sql debe usar ON CONFLICT(id) DO UPDATE para proteger claves foráneas'
  )
  assert.equal(
    sqlEj.includes('INSERT OR REPLACE'),
    false,
    'seed_ejercicios.sql no debe usar INSERT OR REPLACE'
  )

  const gruposValidos = new Set([
    'pecho','espalda','hombro','biceps','triceps','core',
    'cuadriceps','isquios','gluteo','gemelo','movilidad',
    'pliometria','agilidad','carrera','cuerpo_completo',
  ])
  const tiposValidos = new Set(['fuerza','isometrico','tiempo','movilidad','carrera'])

  const rowRe = /^\((\d+),\s*NULL,\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*([01]),\s*([0-3]),\s*([1-4]),/gm
  const idsEj = new Set()
  const nombresEj = new Set()
  for (const m of sqlEj.matchAll(rowRe)) {
    const id = Number(m[1])
    const nombre = m[2]
    const grupo = m[3]
    const tipoReg = m[5]
    assert.equal(idsEj.has(id), false, `ID de ejercicio duplicado en seed: ${id}`)
    assert.equal(nombresEj.has(nombre), false, `Nombre de ejercicio duplicado en seed: ${nombre}`)
    assert.equal(gruposValidos.has(grupo), true, `Grupo inválido en ejercicio ${id}: ${grupo}`)
    assert.equal(tiposValidos.has(tipoReg), true, `tipo_registro inválido en ejercicio ${id}: ${tipoReg}`)
    idsEj.add(id)
    nombresEj.add(nombre)
  }
  assert.ok(idsEj.size >= 95, `El catálogo debe tener al menos 95 ejercicios, encontrados: ${idsEj.size}`)

  for (const { slug } of finalists) {
    assert.ok(
      sqlEj.includes(`'/videos/rodilla/${slug}.mp4'`),
      `Falta el vídeo personal /videos/rodilla/${slug}.mp4 en seed_ejercicios.sql`
    )
    assert.ok(
      sqlEj.includes(`'/videos/posters/${slug}.jpg'`),
      `Falta el póster /videos/posters/${slug}.jpg en seed_ejercicios.sql`
    )
  }

  // Verificar nuevos 22 vídeos del programa de readaptación ACL-R 3.0
  const pyNuevoContent = fs.readFileSync(
    path.join(ROOT, 'scripts', 'videos', '05_recortar_video_nuevo.py'),
    'utf8'
  )
  const nuevoRe = /\(\s*\d+\s*,\s*"([a-z0-9-]+)"\s*,/g
  const nuevosSlugs = Array.from(pyNuevoContent.matchAll(nuevoRe)).map((m) => m[1])
  assert.equal(nuevosSlugs.length, 22, 'Deben existir 22 ejercicios en 05_recortar_video_nuevo.py')
  for (const slug of nuevosSlugs) {
    const videoFile = path.join(ROOT, 'public', 'videos', 'rodilla', `${slug}.mp4`)
    const posterFile = path.join(ROOT, 'public', 'videos', 'posters', `${slug}.jpg`)
    assert.ok(fs.existsSync(videoFile), `Falta archivo físico de vídeo: ${slug}.mp4`)
    assert.ok(fs.existsSync(posterFile), `Falta archivo físico de póster: ${slug}.jpg`)
    assert.ok(
      sqlEj.includes(`'/videos/rodilla/${slug}.mp4'`),
      `Falta registrar vídeo /videos/rodilla/${slug}.mp4 en seed_ejercicios.sql`
    )
  }

  // Verificar plantillas y claves foráneas de plantilla_huecos -> ejercicios(id)
  const sqlPl = fs.readFileSync(path.join(ROOT, 'db', 'seed_plantillas.sql'), 'utf8')
  assert.ok(sqlPl.includes('ON CONFLICT(id) DO UPDATE'))
  assert.equal(sqlPl.includes('INSERT OR REPLACE'), false)
  assert.ok(
    sqlPl.includes(`(${T.PIERNA_B}, NULL, 'Pierna B`),
    'seed_plantillas.sql debe incluir la plantilla 7 (Pierna B)'
  )

  const huecoRe = /^\(\d+,\s*\d+,\s*\d+,\s*'(?:ancla|variable)',\s*(\d+),/gm
  let countHuecos = 0
  for (const m of sqlPl.matchAll(huecoRe)) {
    countHuecos += 1
    const ejId = Number(m[1])
    assert.equal(
      idsEj.has(ejId),
      true,
      `plantilla_huecos referencia ejercicio_id=${ejId} inexistente en seed_ejercicios.sql`
    )
  }
  assert.ok(countHuecos >= 35, `Deben existir al menos 35 huecos en plantillas, encontrados: ${countHuecos}`)
})

// --------------------------------------------------- 5b. Marcas Lógicas y Series de Carrera
test('numeros: parseTiempoSegundos, extraerDistanciaMetros y formatearMarcaLogica por tipo de actividad', () => {
  assert.equal(parseTiempoSegundos('3:55'), 235)
  assert.equal(parseTiempoSegundos('03:52'), 232)
  assert.equal(parseTiempoSegundos('1:05:00'), 3900)
  assert.equal(parseTiempoSegundos('45'), 45)
  assert.equal(parseTiempoSegundos('3:75'), null)
  assert.equal(formatSegundosInput(235, true), '3:55')
  assert.equal(formatSegundosInput(45, false), '45')

  assert.equal(extraerDistanciaMetros('1000m @ Z4-Z5', 'Series de 1000m'), 1000)
  assert.equal(extraerDistanciaMetros('2000m @ Z4', 'Series de 2000m'), 2000)
  assert.equal(extraerDistanciaMetros('40 metros', 'Skipping'), 40)
  assert.equal(extraerDistanciaMetros('8k - 14k Z2', 'Rodaje Z2'), 8000)

  assert.equal(
    formatearMarcaLogica({ reps: 1000, segundos: 232 }, 'carrera'),
    '1000m en 3:52 (3:52/km)'
  )
  assert.equal(
    formatearMarcaLogica({ segundos: 35, peso_kg: 10 }, 'isometrico'),
    '35 seg · 10 kg'
  )
  assert.equal(
    formatearMarcaLogica({ peso_kg: 70, reps: 8 }, 'fuerza'),
    '70 kg × 8 reps'
  )

  const piramide = extraerSecuenciaDistanciasMetros(
    '400m - 500m - 600m - 800m - 600m - 500m - 400m (Z4-Z5)',
    'Series Pirámide Pista'
  )
  assert.deepEqual(piramide, [400, 500, 600, 800, 600, 500, 400])

  const prescPiramide = prescripcionPorDefecto({
    nombre: 'Series Pirámide Pista (400m-500m-600m-800m-600m-500m-400m)',
    grupo: 'carrera',
    tipo_registro: 'carrera',
  })
  assert.equal(prescPiramide.series_obj, 7)
  assert.equal(prescPiramide.descanso_s, 105)

  const prescFartlek = prescripcionPorDefecto({
    nombre: 'Fartlek 5K/10K: 5 min Zona 4 + 1:30 min Zona 2',
    grupo: 'carrera',
    tipo_registro: 'carrera',
  })
  assert.equal(prescFartlek.series_obj, 4)
  assert.equal(prescFartlek.descanso_s, 90)
})

// --------------------------------------------------- 6. Auditoría Cero Secretos
test('seguridad: cero exposición de tokens Turso, cliente libsql o credenciales en código fuente', () => {
  const dirsToScan = ['src', 'api', 'db', 'scripts']
  const jwtHeaderPrefix = ['eyJ', 'hbGciOi'].join('')
  const forbiddenAnywhere = [jwtHeaderPrefix, 'libsql://serging-gym-']

  function walk(dir) {
    const out = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) out.push(...walk(full))
      else if (/\.(js|jsx|mjs|sql|ps1|py|css|html)$/.test(entry.name)) out.push(full)
    }
    return out
  }

  for (const d of dirsToScan) {
    for (const file of walk(path.join(ROOT, d))) {
      const content = fs.readFileSync(file, 'utf8')
      for (const secret of forbiddenAnywhere) {
        assert.equal(
          content.includes(secret),
          false,
          `Dato sensible '${secret}' detectado en ${path.relative(ROOT, file)}`
        )
      }
      if (d === 'src') {
        assert.equal(
          content.includes('VITE_TURSO'),
          false,
          `VITE_TURSO detectado en frontend: ${path.relative(ROOT, file)}`
        )
        assert.equal(
          content.includes('@libsql/client'),
          false,
          `@libsql/client no debe importarse nunca en frontend: ${path.relative(ROOT, file)}`
        )
      }
    }
  }
})
