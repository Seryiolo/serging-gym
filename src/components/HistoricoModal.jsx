import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { getEjercicioHistorico } from '../lib/api'
import { anioDe, mesDe, nombreMes, formatCorto } from '../../shared/fechas'

const HarbizAreaChart = lazy(() => import('./HarbizAreaChart'))

function formatFechaHistorico(iso) {
  if (!iso || iso.length < 10) return iso || ''
  const d = Number(iso.slice(8, 10))
  const m = nombreMes(mesDe(iso))
  const y = anioDe(iso)
  return `${String(d).padStart(2, '0')} ${m} ${y}`
}

export default function HistoricoModal({ ejercicio, onClose }) {
  const ejercicioId = ejercicio?.id
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mesFiltro, setMesFiltro] = useState('todos')
  const [abiertos, setAbiertos] = useState({})

  useEffect(() => {
    if (!ejercicioId) return undefined
    let cancelado = false
    getEjercicioHistorico(ejercicioId)
      .then((res) => {
        if (!cancelado) {
          setData(res)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelado) setError(err.message || 'No se pudo cargar el histórico')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [ejercicioId])

  const mesesDisponibles = useMemo(() => {
    const sesiones = data?.sesiones || []
    const vistos = new Map()
    for (const s of sesiones) {
      if (!s.fecha || s.fecha.length < 7) continue
      const key = s.fecha.slice(0, 7)
      if (!vistos.has(key)) {
        const label = nombreMes(mesDe(s.fecha))
        vistos.set(key, label.charAt(0).toUpperCase() + label.slice(1))
      }
    }
    return Array.from(vistos.entries()).map(([key, label]) => ({ key, label }))
  }, [data])

  const esPorTiempo = useMemo(() => {
    const tipo = data?.ejercicio?.tipo_registro || ejercicio?.tipo_registro
    if (tipo === 'isometrico' || tipo === 'tiempo') {
      const algunPeso = (data?.puntosGrafica || []).some((p) => (p.maxKg || 0) > 0)
      return !algunPeso
    }
    return false
  }, [data, ejercicio])

  const puntosFiltrados = useMemo(() => {
    const puntos = data?.puntosGrafica || []
    const base =
      mesFiltro === 'todos'
        ? puntos
        : puntos.filter((p) => p.fecha?.startsWith(mesFiltro))
    return base.map((p) => ({
      etiqueta: formatCorto(p.fecha),
      valor: esPorTiempo ? p.maxSeg ?? 0 : p.maxKg ?? 0,
    }))
  }, [data, mesFiltro, esPorTiempo])

  const sesionesFiltradas = useMemo(() => {
    const sesiones = data?.sesiones || []
    if (mesFiltro === 'todos') return sesiones
    return sesiones.filter((s) => s.fecha?.startsWith(mesFiltro))
  }, [data, mesFiltro])

  const toggleSesion = (key) => {
    setAbiertos((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F5F7] overflow-y-auto">
      <div className="max-w-[440px] mx-auto min-h-dvh flex flex-col pb-10">
        {/* Cabecera idéntica a sheet_2.jpg */}
        <header className="sticky top-0 z-20 bg-[#F5F5F7]/95 backdrop-blur-md px-4 pt-safe h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E2433] hover:bg-white/70 transition"
            aria-label="Volver"
          >
            <ArrowLeft size={21} strokeWidth={1.6} />
          </button>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#1E2433] truncate">
            {data?.ejercicio?.nombre || ejercicio?.nombre || 'Histórico'}
          </span>
        </header>

        <div className="px-5 pt-2 pb-4">
          <h2 className="text-[28px] font-light text-[#1E2433] leading-tight">
            Histórico: {data?.ejercicio?.nombre || ejercicio?.nombre}
          </h2>
        </div>

        {/* Pestañas de meses si existen datos */}
        {mesesDisponibles.length > 0 && (
          <div className="flex items-center gap-5 px-5 border-b border-[#D8DCE3] overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setMesFiltro('todos')}
              className={`pb-2.5 text-[15px] whitespace-nowrap border-b-2 transition ${
                mesFiltro === 'todos'
                  ? 'border-[#1E2433] text-[#1E2433] font-medium'
                  : 'border-transparent text-[#6B7280] font-light'
              }`}
            >
              Todos
            </button>
            {mesesDisponibles.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMesFiltro(m.key)}
                className={`pb-2.5 text-[15px] whitespace-nowrap border-b-2 transition ${
                  mesFiltro === m.key
                    ? 'border-[#1E2433] text-[#1E2433] font-medium'
                    : 'border-transparent text-[#6B7280] font-light'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pt-5 space-y-5 flex-1">
          {cargando ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#6B7280] border border-[#ECEEF2]">
              Cargando evolución de marcas...
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-red-600 border border-red-100">
              {error}
            </div>
          ) : (
            <>
              {/* Tarjeta blanca de gráfica estilo Harbiz */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#ECEEF2]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[13px] font-semibold text-[#1E2433]">
                      {esPorTiempo ? 'Tiempo (s)' : 'Peso (Kg)'}
                    </h3>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {esPorTiempo ? ' Duración máxima por día' : 'Peso máximo por día'}
                    </p>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-[#FEF0E6] text-[#EE6B2F] flex items-center justify-center">
                    <TrendingUp size={15} />
                  </span>
                </div>

                <Suspense
                  fallback={
                    <div className="h-[185px] flex items-center justify-center text-xs text-[#9CA3AF]">
                      Preparando gráfica...
                    </div>
                  }
                >
                  <HarbizAreaChart
                    data={puntosFiltrados}
                    dataKey="valor"
                    xKey="etiqueta"
                    unit={esPorTiempo ? 's' : 'kg'}
                    height={185}
                  />
                </Suspense>
              </div>

              {/* Lista desplegable de sesiones pasadas idéntica a sheet_2.jpg */}
              <div className="space-y-2.5">
                {sesionesFiltradas.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center text-xs text-[#6B7280] border border-[#ECEEF2]">
                    Aún no hay series registradas para este ejercicio. Tus marcas aparecerán aquí en cuanto completes tu primera sesión.
                  </div>
                ) : (
                  sesionesFiltradas.map((ses, idx) => {
                    const rowKey = `${ses.entreno_id}_${idx}`
                    const isOpen = Boolean(abiertos[rowKey] ?? idx === 0)
                    const resumenMarca = esPorTiempo
                      ? `${Math.max(0, ...(ses.series || []).map((s) => s.segundos || 0))} s`
                      : `${ses.max_kg ?? 0} kg`

                    return (
                      <div
                        key={rowKey}
                        className="bg-white rounded-xl border border-[#ECEEF2] overflow-hidden shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSesion(rowKey)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                        >
                          <span className="text-[14px] text-[#4B5563] font-normal">
                            {formatFechaHistorico(ses.fecha)} ({resumenMarca})
                          </span>
                          {isOpen ? (
                            <ChevronUp size={17} className="text-[#6B7280]" />
                          ) : (
                            <ChevronDown size={17} className="text-[#6B7280]" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-3.5 pt-1 border-t border-[#F1F3F6] bg-[#FAFAFB] space-y-2">
                            {ses.sesion_titulo && (
                              <p className="text-xs font-medium text-[#1E2433]">
                                {ses.sesion_titulo}
                              </p>
                            )}
                            <div className="space-y-1">
                              {(ses.series || []).map((sr, sIdx) => (
                                <div
                                  key={`${rowKey}_s_${sIdx}`}
                                  className="flex items-center justify-between text-xs text-[#4B5563] py-1 border-b border-[#ECEEF2] last:border-b-0"
                                >
                                  <span>
                                    Serie {sr.ronda}
                                    {sr.lado && sr.lado !== 'ambos' ? ` (${sr.lado})` : ''}
                                  </span>
                                  <span className="font-medium text-[#1E2433]">
                                    {sr.peso_kg != null && sr.peso_kg > 0 ? `${sr.peso_kg} kg` : ''}
                                    {sr.peso_kg > 0 && sr.reps != null ? ' × ' : ''}
                                    {sr.reps != null ? `${sr.reps} reps` : ''}
                                    {sr.segundos != null ? ` ${sr.segundos}s` : ''}
                                    {sr.rpe != null ? ` · RPE ${sr.rpe}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
