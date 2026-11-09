import { Suspense, lazy, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Award,
  Flag,
  Timer,
  CheckCircle2,
  Scale,
  Edit3,
  TrendingUp,
  Zap,
  Activity,
} from 'lucide-react'
import { diasEntre, formatCorto, nombreMes } from '../../shared/fechas'
import { formatDuracion, formatRitmo, parseEntero } from '../../shared/numeros'
import { IMPACTO_LABELS } from '../lib/media'

const HarbizAreaChart = lazy(() => import('../components/HarbizAreaChart'))

const DISTANCIAS_REF = [
  { distancia_m: 1000, label: '1K Pista' },
  { distancia_m: 5000, label: '5K' },
  { distancia_m: 10000, label: '10K' },
  { distancia_m: 15000, label: '15K' },
  { distancia_m: 21097, label: 'Media Maratón (21K)' },
]

function parseRitmoTextoSeg(texto) {
  if (!texto || typeof texto !== 'string') return null
  const partes = texto.trim().split(':')
  if (partes.length !== 2) return null
  const m = parseEntero(partes[0])
  const s = parseEntero(partes[1])
  if (m === null || s === null || s > 59 || m <= 0) return null
  return m * 60 + s
}

function parseTiempoObjetivoSeg(texto) {
  if (!texto || !texto.trim()) return null
  const partes = texto.trim().split(':')
  if (partes.length === 2) {
    const m = parseEntero(partes[0])
    const s = parseEntero(partes[1])
    if (m === null || s === null || s > 59) return null
    return m * 60 + s
  }
  if (partes.length === 3) {
    const h = parseEntero(partes[0])
    const m = parseEntero(partes[1])
    const s = parseEntero(partes[2])
    if (h === null || m === null || s === null || m > 59 || s > 59) return null
    return h * 3600 + m * 60 + s
  }
  return null
}

function restarDiasSimple(fechaIso, dias) {
  const [y, m, d] = fechaIso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d - dias))
  return dt.toISOString().slice(0, 10)
}

export default function EvolucionView({
  hoy,
  initialSubTab = 'metricas',
  evolucion,
  carrerasData,
  onOpenPesoModal,
  onEliminarPeso,
  onCambiarFaseRodilla,
  onResponderHinchazon,
  onOpenCarreraModal,
  onActualizarObjetivo,
  onEliminarObjetivo,
  onActualizarRitmo,
  onEliminarCarrera,
  onEliminarEntreno,
}) {
  const [subTab, setSubTab] = useState(initialSubTab)
  const [prevInitial, setPrevInitial] = useState(initialSubTab)
  if (initialSubTab !== prevInitial) {
    setPrevInitial(initialSubTab)
    setSubTab(initialSubTab)
  }

  // --- Estado Métricas (Peso Corporal únicamente) ---
  const [rangoPeso, setRangoPeso] = useState('todo') // '1m' | '3m' | '6m' | 'todo'
  const [mesesAbiertos, setMesesAbiertos] = useState({})

  // --- Estado Rodilla ---
  const [motivoFase, setMotivoFase] = useState('')
  const [guardandoFase, setGuardandoFase] = useState(false)

  // --- Estado Carrera (Objetivos y Ritmos) ---
  const [mostrarFormObjetivo, setMostrarFormObjetivo] = useState(false)
  const [editObjId, setEditObjId] = useState(null)
  const [objNombre, setObjNombre] = useState('')
  const [objFecha, setObjFecha] = useState('')
  const [objDistKm, setObjDistKm] = useState('15')
  const [objTiempo, setObjTiempo] = useState('1:15:00')
  const [errorObj, setErrorObj] = useState('')

  const [editandoRitmos, setEditandoRitmos] = useState(false)
  const [ritmosDraft, setRitmosDraft] = useState({})
  const [guardandoRitmos, setGuardandoRitmos] = useState(false)

  // --- Estado Logros ---
  const [subTabLogros, setSubTabLogros] = useState('insignias') // 'insignias' | 'prs'
  const [acordeonLogros, setAcordeonLogros] = useState({
    rodilla: true,
    constancia: true,
    carrera: true,
    fuerza: true,
  })

  const pesos = useMemo(() => evolucion?.pesos || [], [evolucion])
  const rodilla = evolucion?.rodilla || null
  const pendientesHinchazon = evolucion?.entrenosPendientesHinchazon || []
  const logros = evolucion?.logros || { insignias: [] }
  const mejoresMarcas = evolucion?.mejoresMarcas || null

  const carreras = carrerasData?.carreras || evolucion?.carrerasResumen?.historial || []
  const ritmosReferencia = useMemo(() => carrerasData?.ritmosReferencia || [], [carrerasData])
  const objetivos = carrerasData?.objetivos || []
  const zonasRitmo = carrerasData?.zonasRitmo || []

  // Filtrado de peso por rango temporal
  const pesosFiltrados = useMemo(() => {
    if (rangoPeso === 'todo') return pesos
    const dias = rangoPeso === '1m' ? 31 : rangoPeso === '3m' ? 92 : 185
    const corte = restarDiasSimple(hoy, dias)
    return pesos.filter((p) => p.fecha >= corte)
  }, [pesos, rangoPeso, hoy])

  const datosGraficaPeso = useMemo(
    () =>
      pesosFiltrados.map((p) => ({
        etiqueta: formatCorto(p.fecha),
        valor: Number(p.kg),
      })),
    [pesosFiltrados]
  )

  const resumenPeso = useMemo(() => {
    if (pesos.length === 0) return null
    const ultimo = pesos[pesos.length - 1]
    const baseLista = pesosFiltrados.length > 0 ? pesosFiltrados : pesos
    const primero = baseLista[0]
    const valores = baseLista.map((p) => Number(p.kg))
    const delta = Math.round((ultimo.kg - primero.kg) * 10) / 10
    return {
      ultimoKg: ultimo.kg,
      ultimaFecha: ultimo.fecha,
      delta,
      minKg: Math.min(...valores),
      maxKg: Math.max(...valores),
    }
  }, [pesos, pesosFiltrados])

  // Agrupación mensual descendente para acordeones estilo Harbiz
  const pesosPorMes = useMemo(() => {
    const mapa = new Map()
    for (let i = pesos.length - 1; i >= 0; i -= 1) {
      const p = pesos[i]
      const claveMes = p.fecha.slice(0, 7) // YYYY-MM
      if (!mapa.has(claveMes)) mapa.set(claveMes, [])
      mapa.get(claveMes).push(p)
    }
    return Array.from(mapa.entries()).map(([ym, items]) => {
      const [y, m] = ym.split('-').map(Number)
      return {
        ym,
        titulo: `${nombreMes(m)} ${y}`,
        items,
      }
    })
  }, [pesos])

  // Vigente por distancia para ritmos de referencia
  const ritmosVigentesMap = useMemo(() => {
    const m = new Map()
    for (const r of ritmosReferencia) {
      const prev = m.get(r.distancia_m)
      if (!prev || String(r.fecha || '') >= String(prev.fecha || '')) {
        m.set(r.distancia_m, r)
      }
    }
    return m
  }, [ritmosReferencia])

  const abrirEditorRitmos = () => {
    const inicial = {}
    for (const d of DISTANCIAS_REF) {
      const ref =
        ritmosVigentesMap.get(d.distancia_m) ||
        (d.distancia_m === 21097 ? ritmosVigentesMap.get(21000) : null)
      inicial[d.distancia_m] = ref ? formatRitmo(ref.ritmo_seg_km) : ''
    }
    setRitmosDraft(inicial)
    setEditandoRitmos(true)
  }

  const guardarTodosRitmos = async (e) => {
    e.preventDefault()
    setGuardandoRitmos(true)
    try {
      for (const d of DISTANCIAS_REF) {
        const seg = parseRitmoTextoSeg(ritmosDraft[d.distancia_m])
        if (seg && seg > 0) {
          await onActualizarRitmo?.({
            distancia_m: d.distancia_m,
            ritmo_seg_km: seg,
            fecha: hoy,
          })
        }
      }
      setEditandoRitmos(false)
    } finally {
      setGuardandoRitmos(false)
    }
  }

  const iniciarNuevoObjetivo = () => {
    setEditObjId(null)
    setObjNombre('')
    setObjFecha('')
    setObjDistKm('15')
    setObjTiempo('1:15:00')
    setErrorObj('')
    setMostrarFormObjetivo(true)
  }

  const iniciarEdicionObjetivo = (obj) => {
    setEditObjId(obj.id)
    setObjNombre(obj.nombre)
    setObjFecha(obj.fecha)
    setObjDistKm(String(Math.round((obj.distancia_m / 1000) * 100) / 100))
    setObjTiempo(obj.tiempo_objetivo_s ? formatDuracion(obj.tiempo_objetivo_s) : '')
    setErrorObj('')
    setMostrarFormObjetivo(true)
  }

  const handleGuardarObjetivo = async (e) => {
    e.preventDefault()
    const distM = Math.round(Number(String(objDistKm).replace(',', '.')) * 1000)
    if (!objNombre.trim() || !objFecha || !(distM > 0)) {
      setErrorObj('Completa nombre, fecha y distancia en km.')
      return
    }
    setErrorObj('')
    try {
      await onActualizarObjetivo?.({
        id: editObjId || undefined,
        nombre: objNombre.trim(),
        fecha: objFecha,
        distancia_m: distM,
        tiempo_objetivo_s: parseTiempoObjetivoSeg(objTiempo),
      })
      setMostrarFormObjetivo(false)
    } catch (err) {
      setErrorObj(err.message || 'No se pudo guardar el objetivo')
    }
  }

  const handleSelectFase = async (faseId, modoAuto) => {
    setGuardandoFase(true)
    try {
      await onCambiarFaseRodilla?.({
        fase_id: faseId,
        modo_auto: modoAuto,
        motivo:
          motivoFase.trim() ||
          (modoAuto
            ? 'Modo progresión automática activado'
            : `Ajuste manual a Fase ${faseId}`),
      })
      setMotivoFase('')
    } finally {
      setGuardandoFase(false)
    }
  }

  return (
    <div className="px-4 pb-28 pt-1 space-y-5">
      {/* Cabecera estilo Harbiz (sheet_4.jpg abajo) */}
      <div className="pt-1">
        <h1 className="text-[31px] font-light tracking-tight text-[#1E2433] leading-[1.15]">
          Evolución
        </h1>
      </div>

      {/* Sub-pestañas subrayadas Harbiz */}
      <div className="flex items-center gap-5 border-b border-[#E5E7EB] overflow-x-auto no-scrollbar">
        {[
          { id: 'metricas', label: 'Métricas' },
          { id: 'rodilla', label: 'Rodilla' },
          { id: 'carrera', label: 'Carrera' },
          { id: 'logros', label: 'Logros' },
        ].map((tab) => {
          const activa = subTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`pb-2.5 text-[14px] relative shrink-0 transition ${
                activa
                  ? 'font-semibold text-[#1E2433]'
                  : 'font-normal text-[#6B7280]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {tab.label}
                {tab.id === 'rodilla' && pendientesHinchazon.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#EE6B2F]" />
                )}
              </span>
              {activa && (
                <span className="absolute left-0 right-0 -bottom-[1px] h-[2.5px] rounded-full bg-[#EE8641]" />
              )}
            </button>
          )
        })}
      </div>

      {/* ========================================================= 1. MÉTRICAS (PESO CORPORAL) */}
      {subTab === 'metricas' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Scale size={13} className="text-[#EE8641]" />
                  Peso corporal
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-[28px] font-semibold text-[#1E2433] tabular-nums">
                    {resumenPeso ? `${resumenPeso.ultimoKg} kg` : '—'}
                  </span>
                  {resumenPeso && pesosFiltrados.length > 1 && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        resumenPeso.delta === 0
                          ? 'bg-[#F5F5F7] text-[#4B5563]'
                          : resumenPeso.delta < 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-[#FEF0E6] text-[#EE6B2F]'
                      }`}
                    >
                      {resumenPeso.delta > 0 ? `+${resumenPeso.delta}` : resumenPeso.delta} kg
                    </span>
                  )}
                </div>
                {resumenPeso && (
                  <p className="text-[11.5px] text-[#6B7280] mt-0.5">
                    Último registro: {formatCorto(resumenPeso.ultimaFecha)} · Rango{' '}
                    {resumenPeso.minKg}–{resumenPeso.maxKg} kg
                  </p>
                )}
              </div>

              {/* Selector de rango */}
              <div className="flex items-center bg-[#F5F5F7] p-0.5 rounded-full">
                {[
                  { id: '1m', label: '1M' },
                  { id: '3m', label: '3M' },
                  { id: '6m', label: '6M' },
                  { id: 'todo', label: 'Todo' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRangoPeso(r.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                      rangoPeso === r.id
                        ? 'bg-[#242938] text-white'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Suspense
              fallback={
                <div className="h-[185px] w-full rounded-2xl bg-[#FAFAFB] animate-pulse" />
              }
            >
              <HarbizAreaChart
                data={datosGraficaPeso}
                dataKey="valor"
                xKey="etiqueta"
                unit="kg"
                height={185}
              />
            </Suspense>
          </div>

          {/* Acordeones mensuales de Registros estilo Harbiz */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-light text-[#1E2433]">Registros</h2>
              <button
                type="button"
                onClick={() => onOpenPesoModal?.(hoy)}
                className="text-xs font-semibold text-[#EE6B2F] hover:underline"
              >
                + Añadir peso
              </button>
            </div>

            {pesosPorMes.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 border border-[#ECEEF2] text-center space-y-2">
                <p className="text-sm text-[#4B5563]">
                  Aún no has registrado tu peso corporal.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenPesoModal?.(hoy)}
                  className="px-4 py-2 rounded-full bg-[#242938] text-white text-xs font-semibold"
                >
                  Registrar peso de hoy
                </button>
              </div>
            ) : (
              pesosPorMes.map((grupo, idx) => {
                const abierto =
                  mesesAbiertos[grupo.ym] !== undefined
                    ? mesesAbiertos[grupo.ym]
                    : idx === 0
                return (
                  <div
                    key={grupo.ym}
                    className="bg-white rounded-2xl border border-[#ECEEF2] shadow-2xs overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setMesesAbiertos((prev) => ({
                          ...prev,
                          [grupo.ym]: !abierto,
                        }))
                      }
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                    >
                      <div>
                        <span className="text-[14px] font-medium text-[#1E2433] capitalize">
                          {grupo.titulo}
                        </span>
                        <span className="text-xs text-[#6B7280] ml-2">
                          ({grupo.items.length})
                        </span>
                      </div>
                      {abierto ? (
                        <ChevronUp size={17} className="text-[#6B7280]" />
                      ) : (
                        <ChevronDown size={17} className="text-[#6B7280]" />
                      )}
                    </button>

                    {abierto && (
                      <div className="divide-y divide-[#F1F3F6] border-t border-[#F1F3F6]">
                        {grupo.items.map((item) => (
                          <div
                            key={item.id}
                            className="px-4 py-2.5 flex items-center justify-between text-sm"
                          >
                            <span className="text-[#4B5563] text-[13px]">
                              {formatCorto(item.fecha)}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-[#1E2433] tabular-nums">
                                {item.kg} kg
                              </span>
                              <button
                                type="button"
                                onClick={() => onEliminarPeso?.(item.id)}
                                aria-label={`Eliminar peso del ${item.fecha}`}
                                className="p-1.5 rounded-full text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Botón flotante + estilo Harbiz (sheet_4.jpg abajo-izquierda) */}
          <button
            type="button"
            onClick={() => onOpenPesoModal?.(hoy)}
            aria-label="Registrar peso corporal"
            className="fixed bottom-24 right-5 z-30 w-13 h-13 rounded-full bg-[#242938] text-white shadow-lg flex items-center justify-center hover:scale-105 transition"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* ========================================================= 2. RODILLA */}
      {subTab === 'rodilla' && (
        <div className="space-y-4">
          {/* Control hinchazón 24h si hay sesiones pendientes */}
          {pendientesHinchazon.map((ent) => (
            <div
              key={ent.id}
              className="bg-white rounded-2xl p-4 border border-[#F4985C]/50 shadow-2xs space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-[#EE6B2F] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[#1E2433]">
                    Respuesta 24h pendiente · {ent.titulo}
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Sesión del {formatCorto(ent.fecha)}. ¿Notaste derrame o hinchazón al día siguiente?
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onResponderHinchazon?.({ entrenoId: ent.id, hinchazon: 0 })
                  }
                  className="h-9 rounded-full bg-[#242938] text-white text-xs font-semibold"
                >
                  Sin hinchazón
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onResponderHinchazon?.({ entrenoId: ent.id, hinchazon: 1 })
                  }
                  className="h-9 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold"
                >
                  Sí, algo hinchada
                </button>
              </div>
            </div>
          ))}

          {/* Fase actual y criterio objetivo */}
          {rodilla && (
            <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF0E6] text-[#EE6B2F] text-[11px] font-semibold">
                    Fase {rodilla.fase_id} activa
                  </span>
                  <h2 className="text-[17px] font-semibold text-[#1E2433] mt-1.5">
                    {rodilla.nombre}
                  </h2>
                  {rodilla.descripcion && (
                    <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                      {rodilla.descripcion}
                    </p>
                  )}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[11px] font-medium text-[#374151] shrink-0">
                  Máx: {IMPACTO_LABELS[rodilla.impacto_max ?? 2]}
                </span>
              </div>

              {rodilla.evaluacion?.objetivo > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#4B5563] font-medium">
                      Estabilidad hacia siguiente fase
                    </span>
                    <span className="font-semibold text-[#1E2433] tabular-nums">
                      {rodilla.evaluacion.progreso}/{rodilla.evaluacion.objetivo} sesiones (≤2/10)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#F0F2F5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#EE8641] rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((rodilla.evaluacion.progreso || 0) /
                              rodilla.evaluacion.objetivo) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  {rodilla.evaluacion.motivo && (
                    <p className="text-[11.5px] text-[#6B7280]">
                      {rodilla.evaluacion.motivo}
                    </p>
                  )}
                </div>
              )}

              {/* Selector de modo automático y ajuste manual de fase */}
              <div className="pt-3 border-t border-[#F1F3F6] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#374151]">
                    Progresión automática según molestia/hinchazón
                  </span>
                  <button
                    type="button"
                    disabled={guardandoFase}
                    onClick={() =>
                      handleSelectFase(
                        rodilla.fase_id,
                        rodilla.modo_auto ? 0 : 1
                      )
                    }
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                      rodilla.modo_auto
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-[#F5F5F7] text-[#6B7280]'
                    }`}
                  >
                    {rodilla.modo_auto ? 'Automático ON' : 'Manual'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(rodilla.fases || []).map((f) => {
                    const esActual = f.id === rodilla.fase_id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={guardandoFase || esActual}
                        onClick={() => handleSelectFase(f.id, rodilla.modo_auto)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          esActual
                            ? 'border-[#242938] bg-[#242938] text-white'
                            : 'border-[#E5E7EB] bg-[#FAFAFB] text-[#1E2433] hover:border-[#9CA3AF]'
                        }`}
                      >
                        <p className="text-xs font-semibold truncate">
                          Fase {f.id}
                        </p>
                        <p
                          className={`text-[10.5px] truncate mt-0.5 ${
                            esActual ? 'text-white/80' : 'text-[#6B7280]'
                          }`}
                        >
                          {f.nombre}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <input
                  type="text"
                  value={motivoFase}
                  onChange={(e) => setMotivoFase(e.target.value)}
                  placeholder="Nota opcional al cambiar de fase (ej. indicación fisio)..."
                  className="w-full h-9 px-3 rounded-xl bg-[#F8F9FB] border border-[#E5E7EB] text-xs text-[#1E2433] placeholder:text-[#9CA3AF] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Respuesta articular por entrenamiento */}
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3">
            <h3 className="text-[15px] font-medium text-[#1E2433]">
              Respuesta de la rodilla en sesiones recientes
            </h3>
            {(rodilla?.entrenosRecientes || []).length === 0 ? (
              <p className="text-xs text-[#6B7280]">
                Al completar entrenamientos verás aquí la molestia durante/después (0–10) y la respuesta a las 24h.
              </p>
            ) : (
              <div className="divide-y divide-[#F1F3F6]">
                {rodilla.entrenosRecientes.slice(0, 12).map((e) => {
                  const pico = Math.max(
                    e.molestia_durante ?? 0,
                    e.molestia_despues ?? 0
                  )
                  return (
                    <div
                      key={e.id}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#1E2433] truncate">
                          {e.titulo}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          {formatCorto(e.fecha)}
                          {e.nota ? ` · ${e.nota}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                            pico <= 2
                              ? 'bg-emerald-50 text-emerald-700'
                              : pico <= 4
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {e.molestia_durante ?? 0}/{e.molestia_despues ?? 0} · 10
                        </span>
                        {e.hinchazon === 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">
                            Hinchazón
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Descartar este entrenamiento registrado (${e.titulo} del ${formatCorto(
                                  e.fecha
                                )})? Se eliminarán sus marcas y NO contará para la progresión de 6 sesiones de tu rodilla.`
                              )
                            ) {
                              onEliminarEntreno?.(e.id)
                            }
                          }}
                          className="p-1 rounded-full text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition"
                          title="Descartar este entrenamiento registrado (no contará para rodilla)"
                          aria-label="Descartar entrenamiento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= 3. CARRERA */}
      {subTab === 'carrera' && (
        <div className="space-y-4">
          {/* Resumen mes + botón rápido registrar carrera */}
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Volumen este mes
              </p>
              <p className="text-[24px] font-semibold text-[#1E2433] mt-0.5 tabular-nums">
                {evolucion?.carrerasResumen?.totalKmMes ?? 0} km
                <span className="text-xs font-normal text-[#6B7280] ml-2">
                  ({evolucion?.carrerasResumen?.totalSesionesMes ?? 0} salidas)
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenCarreraModal?.(null)}
              className="h-10 px-4 rounded-full bg-[#242938] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} />
              <span>Registrar</span>
            </button>
          </div>

          {/* Objetivos de carrera (15K Abril, Media Mayo, etc.) */}
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#1E2433] flex items-center gap-1.5">
                <Flag size={15} className="text-[#EE8641]" />
                Objetivos de competición
              </h3>
              <button
                type="button"
                onClick={iniciarNuevoObjetivo}
                className="text-xs font-semibold text-[#EE6B2F] hover:underline"
              >
                + Nuevo objetivo
              </button>
            </div>

            {mostrarFormObjetivo && (
              <form
                onSubmit={handleGuardarObjetivo}
                className="p-3 rounded-xl bg-[#F8F9FB] border border-[#E5E7EB] space-y-2.5"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={objNombre}
                    onChange={(e) => setObjNombre(e.target.value)}
                    placeholder="Ej. Carrera 15K Primavera"
                    className="col-span-2 h-9 px-3 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#1E2433]"
                  />
                  <input
                    type="date"
                    value={objFecha}
                    onChange={(e) => setObjFecha(e.target.value)}
                    className="h-9 px-2.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#1E2433]"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={objDistKm}
                    onChange={(e) => setObjDistKm(e.target.value)}
                    placeholder="Distancia (km)"
                    className="h-9 px-3 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#1E2433]"
                  />
                  <input
                    type="text"
                    value={objTiempo}
                    onChange={(e) => setObjTiempo(e.target.value)}
                    placeholder="Marca obj. (hh:mm:ss opc.)"
                    className="col-span-2 h-9 px-3 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#1E2433]"
                  />
                </div>
                {errorObj && <p className="text-xs text-rose-600">{errorObj}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarFormObjetivo(false)}
                    className="px-3 py-1.5 rounded-full text-xs text-[#6B7280]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#242938] text-white text-xs font-semibold"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {objetivos.length === 0 ? (
              <p className="text-xs text-[#6B7280]">
                Añade tus próximas pruebas (5K, 10K, 15K Abril o Media Maratón Mayo).
              </p>
            ) : (
              <div className="space-y-2">
                {objetivos.map((o) => {
                  const faltan = diasEntre(hoy, o.fecha)
                  return (
                    <div
                      key={o.id}
                      className="p-3 rounded-xl bg-[#F8F9FB] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1E2433] truncate">
                          {o.nombre}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          {(o.distancia_m / 1000).toFixed(
                            o.distancia_m % 1000 === 0 ? 0 : 1
                          )}{' '}
                          km · {formatCorto(o.fecha)}
                          {o.tiempo_objetivo_s
                            ? ` · Obj: ${formatDuracion(o.tiempo_objetivo_s)}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-[#242938] text-white text-[10.5px] font-semibold">
                          {faltan >= 0 ? `${faltan} d` : 'Pasada'}
                        </span>
                        <button
                          type="button"
                          onClick={() => iniciarEdicionObjetivo(o)}
                          aria-label={`Editar ${o.nombre}`}
                          className="p-1.5 text-[#6B7280] hover:text-[#1E2433]"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEliminarObjetivo?.(o.id)}
                          aria-label={`Eliminar ${o.nombre}`}
                          className="p-1.5 text-[#9CA3AF] hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ritmos de referencia + Zonas Z1-Z5 */}
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#1E2433] flex items-center gap-1.5">
                <Timer size={15} className="text-[#EE8641]" />
                Ritmos de referencia y Zonas Z1–Z5
              </h3>
              <button
                type="button"
                onClick={
                  editandoRitmos ? () => setEditandoRitmos(false) : abrirEditorRitmos
                }
                className="text-xs font-semibold text-[#EE6B2F] hover:underline"
              >
                {editandoRitmos ? 'Cerrar' : 'Editar ritmos'}
              </button>
            </div>

            {editandoRitmos ? (
              <form onSubmit={guardarTodosRitmos} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {DISTANCIAS_REF.map((d) => (
                    <label
                      key={d.distancia_m}
                      className="p-2.5 rounded-xl bg-[#F8F9FB] border border-[#E5E7EB] block"
                    >
                      <span className="text-[10.5px] text-[#6B7280] block">
                        {d.label} (min:seg/km)
                      </span>
                      <input
                        type="text"
                        value={ritmosDraft[d.distancia_m] || ''}
                        onChange={(e) =>
                          setRitmosDraft((prev) => ({
                            ...prev,
                            [d.distancia_m]: e.target.value,
                          }))
                        }
                        placeholder="4:50"
                        className="mt-1 w-full bg-white rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold text-[#1E2433]"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={guardandoRitmos}
                  className="w-full h-9 rounded-full bg-[#242938] text-white text-xs font-semibold"
                >
                  {guardandoRitmos ? 'Actualizando zonas...' : 'Guardar ritmos de referencia'}
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {DISTANCIAS_REF.map((d) => {
                  const ref =
                    ritmosVigentesMap.get(d.distancia_m) ||
                    (d.distancia_m === 21097 ? ritmosVigentesMap.get(21000) : null)
                  if (!ref) return null
                  return (
                    <span
                      key={d.distancia_m}
                      className="px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[11.5px] text-[#1E2433]"
                    >
                      <strong>{d.label.split(' ')[0]}:</strong>{' '}
                      {formatRitmo(ref.ritmo_seg_km)}/km
                    </span>
                  )
                })}
              </div>
            )}

            {zonasRitmo.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#F1F3F6]">
                {zonasRitmo.map((z) => (
                  <div
                    key={z.codigo}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-[#1E2433]">{z.nombre}</span>
                      <p className="text-[10.5px] text-[#6B7280] truncate">
                        {z.descripcion}
                      </p>
                    </div>
                    <span className="font-semibold text-[#EE6B2F] tabular-nums shrink-0">
                      {z.rango}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de salidas y series */}
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3">
            <h3 className="text-[15px] font-medium text-[#1E2433]">
              Historial de carreras y pista
            </h3>
            {carreras.length === 0 ? (
              <p className="text-xs text-[#6B7280]">
                Aún no hay sesiones de carrera registradas.
              </p>
            ) : (
              <div className="divide-y divide-[#F1F3F6]">
                {carreras.map((c) => (
                  <div
                    key={c.id}
                    className="py-2.5 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-[#1E2433] capitalize">
                        {c.tipo.replace('_', ' ')} ·{' '}
                        {(c.distancia_m / 1000).toFixed(2)} km @{' '}
                        {formatRitmo(c.ritmo_seg_km)}/km
                      </p>
                      <p className="text-[11px] text-[#6B7280]">
                        {formatCorto(c.fecha)} · {formatDuracion(c.duracion_s)}
                        {c.superficie ? ` · ${c.superficie}` : ''}
                        {c.molestia_rodilla != null
                          ? ` · Rodilla ${c.molestia_rodilla}/10`
                          : ''}
                      </p>
                      {c.series_detalle && (
                        <p className="text-[11px] text-[#4B5563]">
                          Series: {c.series_detalle}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onEliminarCarrera?.(c.id)}
                      aria-label="Eliminar carrera"
                      className="p-1.5 text-[#9CA3AF] hover:text-rose-600 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= 4. LOGROS */}
      {subTab === 'logros' && (
        <div className="space-y-4">
          {/* Resumen numérico superior */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-2xl p-3.5 border border-[#ECEEF2] shadow-2xs">
              <span className="text-[11px] text-[#6B7280] block">
                Sesiones completadas
              </span>
              <span className="text-[22px] font-semibold text-[#1E2433] tabular-nums">
                {logros.entrenosCompletados ?? 0}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-[#ECEEF2] shadow-2xs">
              <span className="text-[11px] text-[#6B7280] block">
                Racha rodilla estable
              </span>
              <span className="text-[22px] font-semibold text-[#EE6B2F] tabular-nums">
                {logros.rachaRodillaSinDolor ?? 0} ses.
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-[#ECEEF2] shadow-2xs">
              <span className="text-[11px] text-[#6B7280] block">
                Kilómetros acumulados
              </span>
              <span className="text-[22px] font-semibold text-[#1E2433] tabular-nums">
                {logros.kmAcumulados ?? 0} km
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-[#ECEEF2] shadow-2xs">
              <span className="text-[11px] text-[#6B7280] block">
                Ejercicios con marca
              </span>
              <span className="text-[22px] font-semibold text-[#1E2433] tabular-nums">
                {logros.ejerciciosConPR ?? 0}
              </span>
            </div>
          </div>

          {/* Selector de sub-pestaña de Logros: Insignias vs PRs */}
          <div className="flex bg-[#E5E7EB]/70 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setSubTabLogros('insignias')}
              className={`flex-1 h-9 rounded-xl text-xs font-semibold transition ${
                subTabLogros === 'insignias'
                  ? 'bg-white text-[#1E2433] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#1E2433]'
              }`}
            >
              Insignias y Retos ({(logros?.insignias || []).length || 26})
            </button>
            <button
              type="button"
              onClick={() => setSubTabLogros('prs')}
              className={`flex-1 h-9 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                subTabLogros === 'prs'
                  ? 'bg-white text-[#1E2433] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#1E2433]'
              }`}
            >
              <TrendingUp size={13} />
              Récords y Marcas (PRs)
            </button>
          </div>

          {subTabLogros === 'prs' ? (
            <div className="space-y-4">
              {/* Card Récords de Fuerza */}
              <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-[#FEF0E6] text-[#EE6B2F] flex items-center justify-center shrink-0">
                      <Zap size={16} />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1E2433]">
                        Récords de Fuerza
                      </h3>
                      <p className="text-[11px] text-[#6B7280]">
                        Máximo peso levantado por ejercicio y 1RM estimado
                      </p>
                    </div>
                  </div>
                  {mejoresMarcas?.maxPesoGlobal > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-[#242938] text-white text-[11px] font-semibold tabular-nums shrink-0">
                      Máx: {mejoresMarcas.maxPesoGlobal} kg
                    </span>
                  )}
                </div>

                {mejoresMarcas?.fuerza?.length > 0 ? (
                  <div className="divide-y divide-[#F1F3F6]">
                    {mejoresMarcas.fuerza.map((pr) => (
                      <div
                        key={pr.ejercicio_id || pr.nombre}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1E2433] truncate">
                            {pr.nombre}
                          </p>
                          <p className="text-[11px] text-[#6B7280]">
                            {pr.fecha ? formatCorto(pr.fecha) : ''}
                            {(pr.rm1_estimado || pr.estimado_1rm)
                              ? ` · 1RM est: ${pr.rm1_estimado || pr.estimado_1rm} kg`
                              : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[14px] font-bold text-[#EE6B2F] tabular-nums">
                            {pr.max_peso_kg ?? pr.peso_kg} kg
                          </span>
                          <span className="text-[11px] text-[#4B5563] ml-1">
                            × {pr.reps} reps
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7280] py-2">
                    Aún no hay registros de fuerza con peso. Al guardar tus entrenamientos se computarán automáticamente aquí tus PRs.
                  </p>
                )}
              </div>

              {/* Card Récords de Series en Pista e Isométricos */}
              {mejoresMarcas?.seriesPista?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                      <Timer size={16} />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1E2433]">
                        Mejores Series en Pista
                      </h3>
                      <p className="text-[11px] text-[#6B7280]">
                        Mejor tiempo y ritmo registrado en intervalos (1000m, 400m, 2000m)
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-[#F1F3F6]">
                    {mejoresMarcas.seriesPista.map((sp, i) => (
                      <div
                        key={`${sp.ejercicio_id}_${sp.distancia_m}_${i}`}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1E2433] truncate">
                            {sp.nombre} ({sp.distancia_m}m)
                          </p>
                          <p className="text-[11px] text-[#6B7280]">
                            {sp.fecha ? formatCorto(sp.fecha) : ''} · {sp.total_series} series completadas
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[14px] font-bold text-[#0284C7] tabular-nums">
                            {sp.mejor_tiempo_formato}
                          </p>
                          <p className="text-[11px] text-[#4B5563] tabular-nums">
                            {sp.ritmo_formato}/km
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mejoresMarcas?.isometricos?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1E2433]">
                        Isométricos y Estabilidad (Rodilla y Core)
                      </h3>
                      <p className="text-[11px] text-[#6B7280]">
                        Mayor tiempo de contracción sostenida por serie
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-[#F1F3F6]">
                    {mejoresMarcas.isometricos.map((iso) => (
                      <div
                        key={iso.ejercicio_id}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1E2433] truncate">
                            {iso.nombre}
                          </p>
                          <p className="text-[11px] text-[#6B7280]">
                            {iso.fecha ? formatCorto(iso.fecha) : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[14px] font-bold text-emerald-700 tabular-nums">
                            {iso.max_segundos} seg
                          </span>
                          {iso.peso_kg > 0 && (
                            <span className="text-[11px] text-[#4B5563] ml-1">
                              · {iso.peso_kg} kg
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Récords de Carrera */}
              <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                      <Activity size={16} />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1E2433]">
                        Mejores Marcas de Carrera
                      </h3>
                      <p className="text-[11px] text-[#6B7280]">
                        Tiempos y ritmos de referencia en distancias clave
                      </p>
                    </div>
                  </div>
                  {mejoresMarcas?.tiradaMasLargaKm > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-[#0284C7] text-white text-[11px] font-semibold tabular-nums shrink-0">
                      Tirada máx: {mejoresMarcas.tiradaMasLargaKm} km
                    </span>
                  )}
                </div>

                {mejoresMarcas?.carrera?.length > 0 ? (
                  <div className="divide-y divide-[#F1F3F6]">
                    {mejoresMarcas.carrera.map((c) => (
                      <div
                        key={c.distancia_m}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-[#1E2433]">
                            {c.label}
                          </p>
                          <p className="text-[11px] text-[#6B7280]">
                            {c.fecha ? formatCorto(c.fecha) : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[14px] font-bold text-[#0284C7] tabular-nums">
                            {formatRitmo(c.ritmo_seg_km)}/km
                          </p>
                          {(c.tiempo_estimado_s || c.duracion_s) > 0 && (
                            <p className="text-[11px] text-[#4B5563] tabular-nums">
                              {formatDuracion(c.tiempo_estimado_s || c.duracion_s)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7280] py-2">
                    Aún no hay ritmos de referencia o carreras registradas.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Acordeón de Insignias estilo Harbiz (sheet_4.jpg abajo-derecha) */
            [
              {
                key: 'rodilla',
                titulo: 'Salud y Reatletización de Rodilla',
                filtro: (ins) =>
                  ins.categoria === 'rodilla' ||
                  ins.id.includes('rodilla') ||
                  ins.id.includes('fase'),
              },
              {
                key: 'constancia',
                titulo: 'Constancia de Entrenamiento',
                filtro: (ins) =>
                  ins.categoria === 'constancia' ||
                  ins.id.includes('entreno') ||
                  ins.id.includes('constancia') ||
                  ins.id.includes('semanas'),
              },
              {
                key: 'carrera',
                titulo: 'Carrera y Base Aeróbica',
                filtro: (ins) =>
                  ins.categoria === 'carrera' ||
                  ins.id.includes('corredor') ||
                  ins.id.includes('km_') ||
                  ins.id.includes('media_maraton'),
              },
              {
                key: 'fuerza',
                titulo: 'Fuerza y Sobrecarga Progresiva',
                filtro: (ins) =>
                  ins.categoria === 'fuerza' ||
                  ins.id.includes('fuerza') ||
                  ins.id.includes('sobrecarga') ||
                  ins.id.includes('peso_'),
              },
            ].map((grupo) => {
              const items = (logros.insignias || []).filter(grupo.filtro)
              const abierto = acordeonLogros[grupo.key]
              return (
                <div
                  key={grupo.key}
                  className="bg-white rounded-2xl border border-[#ECEEF2] shadow-2xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setAcordeonLogros((prev) => ({
                        ...prev,
                        [grupo.key]: !abierto,
                      }))
                    }
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                  >
                    <span className="text-[14px] font-medium text-[#1E2433]">
                      {grupo.titulo} ({items.filter((i) => i.conseguido).length}/{items.length})
                    </span>
                    {abierto ? (
                      <ChevronUp size={17} className="text-[#6B7280]" />
                    ) : (
                      <ChevronDown size={17} className="text-[#6B7280]" />
                    )}
                  </button>

                  {abierto && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#F1F3F6]">
                      {items.map((ins) => {
                        const pct =
                          ins.objetivo > 0
                            ? Math.min(
                                100,
                                Math.round(((ins.progreso || 0) / ins.objetivo) * 100)
                              )
                            : 0
                        return (
                          <div key={ins.id} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    ins.conseguido
                                      ? 'bg-[#FEF0E6] text-[#EE6B2F]'
                                      : 'bg-[#F5F5F7] text-[#9CA3AF]'
                                  }`}
                                >
                                  {ins.conseguido ? (
                                    <CheckCircle2 size={16} />
                                  ) : (
                                    <Award size={16} />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-medium text-[#1E2433] truncate">
                                    {ins.titulo}
                                  </p>
                                  <p className="text-[11px] text-[#6B7280]">
                                    {ins.descripcion}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-[#4B5563] tabular-nums shrink-0">
                                {ins.progreso}/{ins.objetivo}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-[#F0F2F5] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  ins.conseguido ? 'bg-emerald-500' : 'bg-[#EE8641]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
