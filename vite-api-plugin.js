/**
 * Plugin de Vite para desarrollo y previsualizacion local (vite dev / vite preview).
 * - Carga .env.local en process.env SOLO en servidor (jamas expone TURSO_* al cliente).
 * - Enruta cualquier peticion /api/<nombre> al handler serverless ./api/<nombre>.js.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function loadServerEnvFile(filePath, override = false) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIndex = line.indexOf('=')
    if (eqIndex <= 0) continue

    const key = line.slice(0, eqIndex).trim().replace(/^export\s+/, '')
    if (!key || key.startsWith('VITE_')) continue

    let val = line.slice(eqIndex + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }

    if (override || process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val
    }
  }
}

function hydrateServerEnv(rootDir) {
  loadServerEnvFile(path.join(rootDir, '.env'), false)
  loadServerEnvFile(path.join(rootDir, '.env.local'), false)
}

function createApiMiddleware(rootDir) {
  return async function apiMiddleware(req, res, next) {
    const rawUrl = req.url || '/'
    if (!rawUrl.startsWith('/api/') && rawUrl !== '/api') {
      return next()
    }

    let pathname = rawUrl
    try {
      pathname = new URL(rawUrl, 'http://localhost').pathname
    } catch {
      pathname = rawUrl.split('?')[0]
    }

    const routeName = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '')

    if (!routeName || routeName.startsWith('_') || !/^[a-z0-9-]+$/i.test(routeName)) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Endpoint de API no encontrado.' }))
      return
    }

    const handlerPath = path.join(rootDir, 'api', `${routeName}.js`)
    if (!fs.existsSync(handlerPath)) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: `No existe el endpoint /api/${routeName}.` }))
      return
    }

    try {
      const stat = fs.statSync(handlerPath)
      const moduleUrl = `${pathToFileURL(handlerPath).href}?v=${Math.trunc(stat.mtimeMs)}`
      const mod = await import(moduleUrl)
      const handler = mod?.default

      if (typeof handler !== 'function') {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: `El módulo /api/${routeName} no exporta un handler válido.` }))
        return
      }

      await handler(req, res)
    } catch (err) {
      console.error(`[vite-api-plugin] Error en /api/${routeName}:`, err?.message || err)
      if (!res.writableEnded) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Error interno al procesar la petición en /api.' }))
      }
    }
  }
}

export function viteApiPlugin() {
  let rootDir = process.cwd()
  hydrateServerEnv(rootDir)

  return {
    name: 'serging-gym-api-plugin',
    configResolved(config) {
      rootDir = config.root || process.cwd()
      hydrateServerEnv(rootDir)
    },
    configureServer(server) {
      hydrateServerEnv(rootDir)
      server.middlewares.use(createApiMiddleware(rootDir))
    },
    configurePreviewServer(server) {
      hydrateServerEnv(rootDir)
      server.middlewares.use(createApiMiddleware(rootDir))
    },
  }
}

export const sergingApiPlugin = viteApiPlugin
export default viteApiPlugin
