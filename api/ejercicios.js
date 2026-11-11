/**
 * Endpoint /api/ejercicios
 * GET  -> Catalogo de ejercicios activos + flag booleano `favorito`
 * POST -> action: 'toggle_favorito' | 'crear' (con extraccion de ID de YouTube y poster_url automatico)
 */
import { requireUser } from './_lib/auth.js'
import { methodNotAllowed, readJson, sendJson, withErrorHandling } from './_lib/http.js'
import { execute, query, queryOne } from './_lib/turso.js'

const GRUPOS_VALIDOS = new Set([
  'pecho',
  'espalda',
  'hombro',
  'biceps',
  'triceps',
  'core',
  'cuadriceps',
  'isquios',
  'gluteo',
  'gemelo',
  'movilidad',
  'pliometria',
  'agilidad',
  'carrera',
  'cuerpo_completo',
])

const TIPOS_REGISTRO_VALIDOS = new Set([
  'fuerza',
  'isometrico',
  'tiempo',
  'movilidad',
  'carrera',
])

export function extractYoutubeId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  )
  return match ? match[1] : null
}

function resolveVideoMetadata(rawVideoUrl, rawPosterUrl) {
  const videoUrl = typeof rawVideoUrl === 'string' ? rawVideoUrl.trim() : ''
  const customPoster = typeof rawPosterUrl === 'string' && rawPosterUrl.trim() ? rawPosterUrl.trim() : null

  if (!videoUrl) {
    return {
      video_url: null,
      poster_url: customPoster,
      video_origen: 'ninguno',
      video_validado: 0,
    }
  }

  const ytId = extractYoutubeId(videoUrl)
  if (ytId) {
    return {
      video_url: videoUrl,
      poster_url: customPoster || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      video_origen: 'youtube',
      video_validado: 1,
    }
  }

  if (videoUrl.startsWith('/videos/') || videoUrl.includes('/videos/')) {
    return {
      video_url: videoUrl,
      poster_url: customPoster,
      video_origen: 'propio',
      video_validado: 1,
    }
  }

  if (/^https?:\/\//i.test(videoUrl)) {
    return {
      video_url: videoUrl,
      poster_url: customPoster,
      video_origen: 'otro',
      video_validado: 1,
    }
  }

  return {
    video_url: null,
    poster_url: customPoster,
    video_origen: 'ninguno',
    video_validado: 0,
  }
}

export default withErrorHandling(async function ejerciciosHandler(req, res) {
  const user = await requireUser(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const rows = await query(
      `SELECT
         e.id, e.user_id, e.nombre, e.grupo, e.patron, e.tipo_registro,
         e.unilateral, e.impacto, e.fase_rodilla_min, e.equipamiento,
         e.instrucciones, e.video_url, e.poster_url, e.video_origen,
         e.video_validado, e.activo,
         CASE WHEN fv.ejercicio_id IS NOT NULL THEN 1 ELSE 0 END AS es_favorito
       FROM ejercicios e
       LEFT JOIN favoritos_video fv ON fv.ejercicio_id = e.id AND fv.user_id = ?
       WHERE e.activo = 1 AND (e.user_id IS NULL OR e.user_id = ?)
       ORDER BY es_favorito DESC, e.nombre ASC`,
      [user.id, user.id],
    )

    const ejercicios = rows.map(({ es_favorito, ...rest }) => ({
      ...rest,
      favorito: Boolean(es_favorito),
    }))

    return sendJson(res, 200, { ejercicios })
  }

  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'POST'])
  }

  const body = await readJson(req)
  const action = String(body.action || '').trim()

  if (action === 'toggle_favorito') {
    const ejercicioId = Number(body.ejercicioId)
    if (!Number.isInteger(ejercicioId) || ejercicioId <= 0) {
      return sendJson(res, 400, { error: 'ID de ejercicio no válido.' })
    }

    const existe = await queryOne(
      'SELECT id FROM ejercicios WHERE id = ? AND activo = 1 AND (user_id IS NULL OR user_id = ?) LIMIT 1',
      [ejercicioId, user.id],
    )
    if (!existe) {
      return sendJson(res, 404, { error: 'Ejercicio no encontrado.' })
    }

    const favActual = await queryOne(
      'SELECT ejercicio_id FROM favoritos_video WHERE user_id = ? AND ejercicio_id = ? LIMIT 1',
      [user.id, ejercicioId],
    )

    if (favActual) {
      await execute(
        'DELETE FROM favoritos_video WHERE user_id = ? AND ejercicio_id = ?',
        [user.id, ejercicioId],
      )
      return sendJson(res, 200, { ok: true, favorito: false })
    }

    await execute(
      'INSERT OR IGNORE INTO favoritos_video (user_id, ejercicio_id) VALUES (?, ?)',
      [user.id, ejercicioId],
    )
    return sendJson(res, 200, { ok: true, favorito: true })
  }

  if (action === 'crear') {
    const nombre = String(body.nombre || '').trim()
    const grupo = String(body.grupo || '').trim().toLowerCase()
    const tipoRegistro = String(body.tipo_registro || 'fuerza').trim().toLowerCase()

    if (nombre.length < 2 || nombre.length > 120) {
      return sendJson(res, 400, { error: 'El nombre del ejercicio debe tener entre 2 y 120 caracteres.' })
    }
    if (!GRUPOS_VALIDOS.has(grupo)) {
      return sendJson(res, 400, { error: 'Grupo muscular o categoría no válida.' })
    }
    if (!TIPOS_REGISTRO_VALIDOS.has(tipoRegistro)) {
      return sendJson(res, 400, { error: 'Tipo de registro no válido.' })
    }

    const unilateral = body.unilateral ? 1 : 0
    const impactoNum = Number(body.impacto ?? 0)
    const impacto = Number.isFinite(impactoNum)
      ? Math.max(0, Math.min(3, Math.round(impactoNum)))
      : 0
    const faseRodillaMin = 1
    const patron = typeof body.patron === 'string' && body.patron.trim() ? body.patron.trim().slice(0, 80) : null
    const equipamiento =
      typeof body.equipamiento === 'string' && body.equipamiento.trim()
        ? body.equipamiento.trim().slice(0, 120)
        : null
    const instrucciones =
      typeof body.instrucciones === 'string' && body.instrucciones.trim()
        ? body.instrucciones.trim().slice(0, 2000)
        : null

    const videoMeta = resolveVideoMetadata(body.video_url, body.poster_url)

    const duplicado = await queryOne(
      'SELECT id FROM ejercicios WHERE user_id = ? AND lower(nombre) = lower(?) LIMIT 1',
      [user.id, nombre],
    )
    if (duplicado) {
      return sendJson(res, 400, { error: 'Ya tienes un ejercicio creado con ese mismo nombre.' })
    }

    const ins = await execute(
      `INSERT INTO ejercicios (
         user_id, nombre, grupo, patron, tipo_registro, unilateral,
         impacto, fase_rodilla_min, equipamiento, instrucciones,
         video_url, poster_url, video_origen, video_validado, activo
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       RETURNING id, user_id, nombre, grupo, patron, tipo_registro, unilateral,
                 impacto, fase_rodilla_min, equipamiento, instrucciones,
                 video_url, poster_url, video_origen, video_validado, activo`,
      [
        user.id,
        nombre,
        grupo,
        patron,
        tipoRegistro,
        unilateral,
        impacto,
        faseRodillaMin,
        equipamiento,
        instrucciones,
        videoMeta.video_url,
        videoMeta.poster_url,
        videoMeta.video_origen,
        videoMeta.video_validado,
      ],
    )

    const ejercicio = { ...ins.rows[0], favorito: false }
    return sendJson(res, 201, { ok: true, ejercicio })
  }

  return sendJson(res, 400, { error: `Acción no reconocida en /api/ejercicios: ${action}` })
})
