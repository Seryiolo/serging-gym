import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDecimal, parseEntero, ritmoSegKm, formatRitmo, formatDuracion,
  tiempoASegundos, estimar1RM, tablaPorcentajes,
} from '../shared/numeros.js'
import {
  esISO, hoyMadrid, addDias, diaSemana, lunesDe, diasDeSemana, cuadriculaMes, formatLargo, diasEntre,
} from '../shared/fechas.js'
import { evaluarProgresion } from '../shared/rodilla.js'
import {
  composicionSemana, T, PATRONES, candidatosDeHueco, elegirVariable, semillaDe,
} from '../shared/planner.js'

// ------------------------------------------------------------------ numeros
test('parseDecimal acepta coma y punto (teclado iOS en espanol)', () => {
  assert.equal(parseDecimal('62,5'), 62.5)
  assert.equal(parseDecimal('62.5'), 62.5)
  assert.equal(parseDecimal(' 70 '), 70)
  assert.equal(parseDecimal(',5'), 0.5)
  assert.equal(parseDecimal(0), 0)
})

test('parseDecimal rechaza basura en vez de truncarla', () => {
  for (const malo of ['', '   ', 'abc', '1,2,3', '12kg', '--5', '-5', null, undefined, NaN, Infinity]) {
    assert.equal(parseDecimal(malo), null, `deberia rechazar ${String(malo)}`)
  }
})

test('parseEntero', () => {
  assert.equal(parseEntero('8'), 8)
  assert.equal(parseEntero('8,5'), null)
  assert.equal(parseEntero('0'), 0)
  assert.equal(parseEntero('x'), null)
})

test('ritmo: tus marcas de referencia', () => {
  assert.equal(formatRitmo(ritmoSegKm(10000, 2900)), '4:50')   // 10 km en 48:20
  assert.equal(formatRitmo(ritmoSegKm(21097, 5555)), '4:23')   // 21,097 km en 1:32:35 -> 263 s/km
  assert.equal(formatRitmo(230), '3:50')
  assert.equal(ritmoSegKm(0, 100), null)
  assert.equal(ritmoSegKm(1000, 0), null)
})

test('formatRitmo no devuelve "4:60"', () => {
  assert.equal(formatRitmo(299.7), '5:00')
  assert.equal(formatRitmo(NaN), '--:--')
})

test('formatDuracion', () => {
  assert.equal(formatDuracion(125), '2:05')
  assert.equal(formatDuracion(3725), '1:02:05')
  assert.equal(formatDuracion(-1), '--:--')
})

test('tiempoASegundos valida segundos y vacios', () => {
  assert.equal(tiempoASegundos('23', '30'), 1410)
  assert.equal(tiempoASegundos('', '45'), 45)
  assert.equal(tiempoASegundos('0', '0'), null)
  assert.equal(tiempoASegundos('5', '75'), null)
  assert.equal(tiempoASegundos('x', '10'), null)
})

test('estimar1RM (Epley)', () => {
  assert.deepEqual(estimar1RM(100, 1), { valor: 100, fiable: true })
  assert.deepEqual(estimar1RM(100, 5), { valor: 116.7, fiable: true })
  assert.equal(estimar1RM(100, 15).fiable, false)
  assert.equal(estimar1RM(0, 5), null)
  assert.equal(estimar1RM(100, 0), null)
  assert.equal(estimar1RM(100, 2.5), null)
  assert.equal(tablaPorcentajes(100)[0].kg, 100)
  assert.equal(tablaPorcentajes(100).find((p) => p.pct === 80).kg, 80)
})

// ------------------------------------------------------------------- fechas
test('lunes y dia de la semana', () => {
  assert.equal(diaSemana('2026-11-03'), 1)               // martes
  assert.equal(lunesDe('2026-11-03'), '2026-11-02')
  assert.equal(lunesDe('2026-11-02'), '2026-11-02')
  assert.equal(lunesDe('2026-11-08'), '2026-11-02')      // domingo
  assert.equal(diasDeSemana('2026-11-02')[6], '2026-11-08')
})

test('addDias cruza el cambio de hora sin desfases', () => {
  assert.equal(addDias('2026-10-24', 1), '2026-10-25')
  assert.equal(addDias('2026-10-25', 1), '2026-10-26')   // domingo del cambio a horario de invierno
  assert.equal(addDias('2026-03-28', 2), '2026-03-30')   // cambio a horario de verano
  assert.equal(addDias('2026-12-31', 1), '2027-01-01')
  assert.equal(addDias('2028-02-28', 1), '2028-02-29')
  assert.equal(diasEntre('2026-11-03', '2027-04-30'), 178)
})

test('hoyMadrid usa la hora de Madrid, no la del dispositivo', () => {
  assert.equal(hoyMadrid(new Date('2026-11-03T23:30:00Z')), '2026-11-04')  // CET (UTC+1)
  assert.equal(hoyMadrid(new Date('2026-07-01T22:30:00Z')), '2026-07-02')  // CEST (UTC+2)
  assert.equal(hoyMadrid(new Date('2026-11-03T10:00:00Z')), '2026-11-03')
})

test('esISO rechaza fechas imposibles', () => {
  assert.equal(esISO('2026-11-03'), true)
  assert.equal(esISO('2026-02-30'), false)
  assert.equal(esISO('2026-13-01'), false)
  assert.equal(esISO('03/11/2026'), false)
  assert.equal(esISO(null), false)
})

test('cuadricula de mes (noviembre 2026 empieza en domingo)', () => {
  const semanas = cuadriculaMes(2026, 11)
  assert.equal(semanas.length, 6)
  assert.equal(semanas[0][0], '2026-10-26')
  assert.equal(semanas[0][6], '2026-11-01')
  assert.equal(semanas[5][0], '2026-11-30')
  assert.ok(semanas.every((s) => s.length === 7))
})

test('formatLargo', () => {
  assert.equal(formatLargo('2026-11-03'), 'martes 3 de noviembre')
})

// ------------------------------------------------------------------- rodilla
const fase1 = { id: 1, sesiones_para_subir: 6, molestia_max_subir: 2, molestia_min_bajar: 5 }
const buena = { molestia_durante: 1, molestia_despues: 1, hinchazon: 0 }

test('rodilla: sin datos mantiene', () => {
  assert.equal(evaluarProgresion(fase1, []).accion, 'mantener')
})

test('rodilla: 6 sesiones buenas seguidas sugiere subir', () => {
  const r = evaluarProgresion(fase1, Array(6).fill(buena))
  assert.equal(r.accion, 'subir')
})

test('rodilla: 5 buenas todavia mantiene y cuenta el progreso', () => {
  const r = evaluarProgresion(fase1, Array(5).fill(buena))
  assert.equal(r.accion, 'mantener')
  assert.equal(r.progreso, 5)
})

test('rodilla: una sesion mala rompe la racha', () => {
  const r = evaluarProgresion(fase1, [buena, buena, { molestia_durante: 3, molestia_despues: 3, hinchazon: 0 }, buena, buena, buena])
  assert.equal(r.accion, 'mantener')
  assert.equal(r.progreso, 2)
})

test('rodilla: molestia alta o hinchazon sugiere bajar', () => {
  assert.equal(evaluarProgresion(fase1, [{ molestia_durante: 6, molestia_despues: 2, hinchazon: 0 }, buena]).accion, 'bajar')
  assert.equal(evaluarProgresion(fase1, [{ molestia_durante: 1, molestia_despues: 1, hinchazon: 1 }, buena]).accion, 'bajar')
})

test('rodilla: molestia creciente 3 sesiones seguidas -> vigilar', () => {
  const r = evaluarProgresion(fase1, [
    { molestia_durante: 4, molestia_despues: 4, hinchazon: 0 },
    { molestia_durante: 3, molestia_despues: 3, hinchazon: 0 },
    { molestia_durante: 1, molestia_despues: 1, hinchazon: 0 },
  ])
  assert.equal(r.accion, 'vigilar')
})

test('rodilla: en la ultima fase no sugiere subir', () => {
  const r = evaluarProgresion({ ...fase1, id: 4 }, Array(6).fill(buena), 4)
  assert.equal(r.accion, 'mantener')
})

// ------------------------------------------------------------------- planner
const DURAS = [T.PIERNA_A, T.PIERNA_B, T.AGILIDAD]

test('composicion: 4, 5 y 6 dias dan ese numero de sesiones', () => {
  for (const dias of [4, 5, 6]) assert.equal(composicionSemana({ dias }).length, dias)
  assert.throws(() => composicionSemana({ dias: 3 }))
  assert.throws(() => composicionSemana({ dias: 7 }))
})

test('composicion: nunca dos dias de pierna exigente seguidos', () => {
  for (const dias of [4, 5, 6]) {
    const s = composicionSemana({ dias })
    for (let i = 1; i < s.length; i++) {
      const seguidas = s[i].offset - s[i - 1].offset === 1
      assert.ok(!(seguidas && DURAS.includes(s[i].plantillaId) && DURAS.includes(s[i - 1].plantillaId)),
        `${dias} dias: dos piernas exigentes seguidas en offsets ${s[i - 1].offset}-${s[i].offset}`)
    }
  }
})

test('composicion: el tren superior es 1 dia, o 2 con segundoSuperior', () => {
  const sup = (s) => s.filter((x) => x.plantillaId === T.TORSO_A || x.plantillaId === T.TORSO_B).length
  for (const dias of [4, 5, 6]) {
    assert.equal(sup(composicionSemana({ dias })), 1)
    assert.equal(sup(composicionSemana({ dias, segundoSuperior: true })), 2)
  }
})

test('composicion: semana de carrera quita pista y agilidad', () => {
  const s = composicionSemana({ dias: 6, hayCarrera: true })
  assert.ok(!s.some((x) => x.plantillaId === T.CARRERA_PISTA || x.plantillaId === T.AGILIDAD))
  assert.ok(s.some((x) => x.nota))
})

test('composicion: los offsets son unicos y estan en 0..6', () => {
  for (const dias of Object.keys(PATRONES)) {
    const offs = composicionSemana({ dias: Number(dias) }).map((x) => x.offset)
    assert.equal(new Set(offs).size, offs.length)
    assert.ok(offs.every((o) => o >= 0 && o <= 6))
  }
})

const cat = (id, extra = {}) => ({ id, activo: 1, grupo: 'core', patron: 'core_lateral', tipo_registro: 'isometrico', impacto: 0, fase_rodilla_min: 1, equipamiento: '', ...extra })

test('candidatos: respeta fase, impacto, equipamiento y activo', () => {
  const catalogo = [cat(1), cat(2, { impacto: 3 }), cat(3, { fase_rodilla_min: 2 }), cat(4, { activo: 0 }), cat(5, { equipamiento: 'polea' }), cat(6, { grupo: 'pecho' })]
  const r = candidatosDeHueco(catalogo, { grupo: 'core', patron: 'core_lateral' }, { impactoMax: 2, faseId: 1, excluirEquipo: ['polea'] })
  assert.deepEqual(r.map((e) => e.id), [1])
})

test('variable semanal: nunca repite el ejercicio de la semana anterior', () => {
  const candidatos = [cat(1), cat(2), cat(3)]
  let historial = []
  for (let semana = 0; semana < 12; semana++) {
    const id = elegirVariable({ candidatos, historial, rotacion: 'semanal', porDefecto: 1, semilla: `s${semana}` })
    if (historial.length) assert.notEqual(id, historial[0].ejercicio_id, `semana ${semana} repite`)
    historial = [{ ejercicio_id: id }, ...historial]
  }
})

test('variable semanal: con 3 candidatos usa los 3 antes de repetir', () => {
  const candidatos = [cat(1), cat(2), cat(3)]
  let historial = []
  const usados = []
  for (let semana = 0; semana < 3; semana++) {
    const id = elegirVariable({ candidatos, historial, rotacion: 'semanal', porDefecto: 1, semilla: `x${semana}` })
    usados.push(id)
    historial = [{ ejercicio_id: id }, ...historial]
  }
  assert.equal(new Set(usados).size, 3)
})

test('variable mensual: mantiene 4 semanas y luego cambia', () => {
  const candidatos = [cat(1), cat(2), cat(3)]
  let historial = []
  const secuencia = []
  for (let semana = 0; semana < 9; semana++) {
    const id = elegirVariable({ candidatos, historial, rotacion: 'mensual', porDefecto: 1, semilla: `m${semana}` })
    secuencia.push(id)
    historial = [{ ejercicio_id: id }, ...historial]
  }
  for (let bloque = 0; bloque < 2; bloque++) {
    const trozo = secuencia.slice(bloque * 4, bloque * 4 + 4)
    assert.equal(new Set(trozo).size, 1, `bloque ${bloque} no es estable: ${trozo}`)
  }
  assert.notEqual(secuencia[0], secuencia[4])
  assert.notEqual(secuencia[4], secuencia[8])
})

test('variable: es determinista con la misma semilla', () => {
  const candidatos = [cat(1), cat(2), cat(3), cat(4)]
  const a = elegirVariable({ candidatos, historial: [], rotacion: 'semanal', porDefecto: 1, semilla: 'u1-2026-11-09-h104' })
  const b = elegirVariable({ candidatos, historial: [], rotacion: 'semanal', porDefecto: 1, semilla: 'u1-2026-11-09-h104' })
  assert.equal(a, b)
})

test('variable: casos limite', () => {
  assert.equal(elegirVariable({ candidatos: [], historial: [], rotacion: 'semanal', porDefecto: 7, semilla: 'a' }), 7)
  assert.equal(elegirVariable({ candidatos: [cat(9)], historial: [{ ejercicio_id: 9 }], rotacion: 'semanal', porDefecto: 1, semilla: 'a' }), 9)
  assert.equal(elegirVariable({ candidatos: [cat(1), cat(2)], historial: [{ ejercicio_id: 2 }], rotacion: 'nunca', porDefecto: 1, semilla: 'a' }), 1)
})

test('semillaDe da valores en [0,1) y es estable', () => {
  const r = semillaDe('abc')
  const v = r()
  assert.ok(v >= 0 && v < 1)
  assert.equal(semillaDe('abc')(), v)
})
