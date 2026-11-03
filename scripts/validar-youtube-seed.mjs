/**
 * Verifica mediante YouTube oEmbed que todos los enlaces `video_origen = 'youtube'`
 * definidos en `db/seed_ejercicios.sql` siguen activos y permiten inserción embebida.
 *
 * Uso:
 *   node scripts/validar-youtube-seed.mjs
 *   node scripts/validar-youtube-seed.mjs --update-db
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractYoutubeId } from '../api/ejercicios.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const SEED_PATH = path.join(PROJECT_ROOT, 'db', 'seed_ejercicios.sql')

const YT_URL_RE = /https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/g

async function checkYoutubeUrl(url) {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const res = await fetch(endpoint, { method: 'GET' })
  if (!res.ok) {
    return { ok: false, status: res.status, title: null }
  }
  const data = await res.json()
  return { ok: true, status: 200, title: data.title || 'OK', author: data.author_name || '' }
}

async function main() {
  const sql = fs.readFileSync(SEED_PATH, 'utf8')
  const urls = Array.from(new Set(Array.from(sql.matchAll(YT_URL_RE), (m) => m[0])))

  console.log(`Comprobando ${urls.length} URLs únicas de YouTube en db/seed_ejercicios.sql...`)

  const validUrls = []
  const brokenUrls = []

  for (const url of urls) {
    const id = extractYoutubeId(url)
    if (!id) {
      brokenUrls.push({ url, reason: 'ID inválido' })
      continue
    }
    try {
      const check = await checkYoutubeUrl(url)
      if (check.ok) {
        validUrls.push(url)
        console.log(`  [OK] ${id} -> ${check.title} (${check.author})`)
      } else {
        brokenUrls.push({ url, reason: `HTTP ${check.status}` })
        console.warn(`  [BROKEN] ${id} -> HTTP ${check.status}`)
      }
    } catch (err) {
      brokenUrls.push({ url, reason: err.message })
      console.warn(`  [ERROR] ${id} -> ${err.message}`)
    }
  }

  if (process.argv.includes('--update-db') && validUrls.length > 0) {
    const { execute } = await import('../api/_lib/turso.js')
    for (const url of validUrls) {
      await execute(
        `UPDATE ejercicios SET video_validado = 1 WHERE video_origen = 'youtube' AND video_url = ?`,
        [url],
      )
    }
    console.log(`Actualizados ${validUrls.length} enlaces como video_validado = 1 en Turso.`)
  }

  if (brokenUrls.length > 0) {
    console.error(`\nSe detectaron ${brokenUrls.length} URLs no válidas.`)
    process.exitCode = 1
  } else {
    console.log(`\nTodas las URLs (${validUrls.length}/${urls.length}) verificadas con éxito.`)
  }
}

main()
