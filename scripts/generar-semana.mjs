/**
 * CLI para generar el plan semanal en Turso usando el motor unificado (api/_lib/planner-db.js).
 * Uso: node scripts/generar-semana.mjs [YYYY-MM-DD] [dias=5] [hayCarrera=0]
 */
import { pathToFileURL } from 'node:url'
import { generarSemanaPlan } from '../api/_lib/planner-db.js'
import { hoyMadrid, lunesDe } from '../shared/fechas.js'

export async function generarSemana(userId, fechaLunes, diasObjetivo = 5, hayCarrera = 0) {
  const lunes = lunesDe(fechaLunes || hoyMadrid())
  const res = await generarSemanaPlan(userId, {
    lunes,
    dias: Number(diasObjetivo) || 5,
    hayCarrera: Boolean(Number(hayCarrera)),
    segundoSuperior: Number(diasObjetivo) >= 5,
    sobreescribir: true,
  })
  console.log(
    `OK semana ${res.semana?.lunes} (ID ${res.semana?.id}): ${res.sesiones.length} sesiones creadas.`
  )
  for (const s of res.sesiones) {
    console.log(`  [${s.fecha}] ${s.titulo} — ${s.num_ejercicios} ejercicios | ${s.num_bloques} bloques`)
  }
  return res
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lunes = process.argv[2] || hoyMadrid()
  const dias = Number(process.argv[3] || 5)
  const hayCarrera = Number(process.argv[4] || 0)
  generarSemana(10000, lunes, dias, hayCarrera).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
