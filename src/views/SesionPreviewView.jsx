import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Settings,
  Plus,
  Minus,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  Calendar,
  X,
  Activity,
} from 'lucide-react'
import {
  getSesion,
  obtenerCandidatosSustitucion,
  sustituirEjercicio,
  moverSesion,
  cambiarEstadoSesion,
} from '../lib/api'
import ExerciseThumb from '../components/ExerciseThumb'
import { formatLargo } from '../../shared/fechas'
import { GRUPO_LABELS, IMPACTO_LABELS } from '../lib/media'

/**
 * Agrupa items consecutivos dentro de un bloque que comparten el mismo número de `superserie`.
 */
function agruparPorSuperserie(items = []) {
  const grupos = []
  for (const item of items) {
    const ss = item.superserie
    const ultimo = grupos[grupos.length - 1]
    if (ss != null && ultimo && ultimo.superserie === ss) {
      ultimo.items.push(item)
    } else {
      grupos.push({
        superserie: ss ?? null,
        rondas: item.series_obj || 2,
        items: [item],
      })
    }
  }
  return grupos
}

export default function SesionPreviewView({
  sesionId,
  TheaterSlot = null,
  onBack,
  onStartWorkout,
  onOpenVideo,
  onOpenCarreraModal,
  onSessionUpdated,
}) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [verMasDesc, setVerMasDesc] = useState(false)
  const [colapsados, setColapsados] = useState({})

  // Modal sustituir ejercicio
  const [itemSustituir, setItemSustituir] = useState(null)
  const [candidatos, setCandidatos] = useState([])
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false)
  const [sustituyendoId, setSustituyendoId] = useState(null)

  // Modal ajustes sesión (mover fecha / estado)
  const [modalAjustes, setModalAjustes] = useState(false)
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [guardandoAjuste, setGuardandoAjuste] = useState(false)

  const cargarSesion = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const res = await getSesion(sesionId)
      setDetalle(res)
      if (res?.sesion?.fecha) setNuevaFecha(res.sesion.fecha)
    } catch (err) {
      setError(err.message || 'No se pudo cargar la sesión')
    } finally {
      setCargando(false)
    }
  }, [sesionId])

  useEffect(() => {
    let cancelado = false
    getSesion(sesionId)
      .then((res) => {
        if (cancelado) return
        setDetalle(res)
        if (res?.sesion?.fecha) setNuevaFecha(res.sesion.fecha)
        setError('')
      })
      .catch((err) => {
        if (!cancelado) setError(err.message || 'No se pudo cargar la sesión')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [sesionId])

  const abrirSustitucion = async (item) => {
    const seId = item.sesion_ejercicio_id ?? item.id
    setItemSustituir(item)
    setCandidatos([])
    setCargandoCandidatos(true)
    try {
      const res = await obtenerCandidatosSustitucion(seId)
      setCandidatos(res?.candidatos || [])
    } catch {
      setCandidatos([])
    } finally {
      setCargandoCandidatos(false)
    }
  }

  const confirmarSustitucion = async (nuevoEjercicioId) => {
    if (!itemSustituir) return
    const seId = itemSustituir.sesion_ejercicio_id ?? itemSustituir.id
    setSustituyendoId(nuevoEjercicioId)
    try {
      await sustituirEjercicio({
        sesionEjercicioId: seId,
        nuevoEjercicioId,
      })
      setItemSustituir(null)
      await cargarSesion()
    } catch {
      // Mantiene abierto si falla
    } finally {
      setSustituyendoId(null)
    }
  }

  const handleMoverFecha = async (e) => {
    e.preventDefault()
    if (!nuevaFecha || !detalle?.sesion) return
    setGuardandoAjuste(true)
    try {
      await moverSesion({ sesionId: detalle.sesion.id, nuevaFecha })
      await cargarSesion()
      onSessionUpdated?.()
      setModalAjustes(false)
    } finally {
      setGuardandoAjuste(false)
    }
  }

  const handleCambiarEstado = async (estado) => {
    if (!detalle?.sesion) return
    setGuardandoAjuste(true)
    try {
      await cambiarEstadoSesion({ sesionId: detalle.sesion.id, estado })
      await cargarSesion()
      onSessionUpdated?.()
      setModalAjustes(false)
    } finally {
      setGuardandoAjuste(false)
    }
  }

  const sesion = detalle?.sesion
  const bloques = detalle?.bloques || []
  const esCarrera = sesion?.tipo === 'carrera'
  const tieneEjercicios = bloques.some((b) => (b.items || []).length > 0)

  const toggleBloque = (orden) => {
    setColapsados((prev) => ({ ...prev, [orden]: !prev[orden] }))
  }

  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex flex-col pb-28">
      {/* Cabecera ambar/dorada idéntica a f_007.jpg y sheet_3.jpg */}
      <div className="harbiz-aura-gold">
        <header className="px-4 pt-safe h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E2433] hover:bg-white/60 transition"
            aria-label="Volver"
          >
            <ArrowLeft size={22} strokeWidth={1.5} />
          </button>

          {sesion && (
            <button
              type="button"
              onClick={() => setModalAjustes(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E2433]/80 hover:bg-white/60 transition"
              aria-label="Ajustes de la sesión"
            >
              <Settings size={20} strokeWidth={1.5} />
            </button>
          )}
        </header>

        {sesion && (
          <div className="px-5 pt-1 pb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-medium capitalize text-[#4B5563]">
                {formatLargo(sesion.fecha)}
              </span>
              {sesion.estado === 'completada' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-semibold">
                  <CheckCircle2 size={11} /> Completada
                </span>
              )}
              {sesion.estado === 'omitida' && (
                <span className="px-2 py-0.5 rounded-full bg-gray-200 text-[#4B5563] text-[10.5px] font-medium">
                  Omitida
                </span>
              )}
            </div>

            <h1 className="text-[28px] font-light text-[#1E2433] leading-[1.16] tracking-tight">
              {sesion.titulo}
            </h1>

            {sesion.descripcion && (
              <div className="mt-2.5 text-[13px] text-[#4B5563] leading-relaxed">
                <p className={verMasDesc ? '' : 'line-clamp-2'}>
                  {sesion.descripcion}
                </p>
                {sesion.descripcion.length > 95 && (
                  <button
                    type="button"
                    onClick={() => setVerMasDesc((v) => !v)}
                    className="mt-0.5 text-[12.5px] text-[#1E2433] underline underline-offset-2 font-normal"
                  >
                    {verMasDesc ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slot opcional de Modo Teatro para previsualizar vídeos aquí mismo */}
      {TheaterSlot}

      {/* Contenido de bloques */}
      {cargando ? (
        <div className="px-5 py-12 text-center text-sm text-[#6B7280]">
          Cargando bloques y ejercicios de la sesión...
        </div>
      ) : error ? (
        <div className="px-5 py-8">
          <div className="bg-white rounded-2xl p-5 border border-red-100 text-center space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={cargarSesion}
              className="px-4 py-2 rounded-full bg-[#242938] text-white text-xs font-semibold"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          {bloques.length === 0 ? (
            <div className="px-5 py-8">
              <div className="bg-white rounded-2xl p-6 border border-[#ECEEF2] text-center space-y-2">
                <Activity size={26} className="mx-auto text-[#EE8641]" />
                <h3 className="text-base font-medium text-[#1E2433]">
                  Sesión de carrera planificada
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Cuando termines tus kilómetros o series en pista, pulsa abajo para registrar distancia, tiempo, ritmo por km y respuesta de la rodilla.
                </p>
              </div>
            </div>
          ) : (
            bloques.map((bloque) => {
              const estaColapsado = Boolean(colapsados[bloque.orden])
              const gruposSS = agruparPorSuperserie(bloque.items || [])

              return (
                <section key={bloque.orden} className="mb-3">
                  {/* Cabecera de bloque Harbiz (f_007.jpg) */}
                  <button
                    type="button"
                    onClick={() => toggleBloque(bloque.orden)}
                    className="w-full px-4 py-3.5 bg-white/55 border-y border-[#CFD4DC] flex items-center justify-between text-left"
                  >
                    <span className="text-[15px] font-normal text-[#1E2433]">
                      {bloque.nombre}
                    </span>
                    {estaColapsado ? (
                      <Plus size={18} strokeWidth={1.4} className="text-[#4B5563]" />
                    ) : (
                      <Minus size={18} strokeWidth={1.4} className="text-[#4B5563]" />
                    )}
                  </button>

                  {!estaColapsado && (
                    <div className="pt-2 space-y-2">
                      {gruposSS.map((grupo, gIdx) => (
                        <div
                          key={`${bloque.orden}_g_${gIdx}`}
                          className="bg-white border-y border-[#E5E7EB]"
                        >
                          {grupo.superserie !== null && (
                            <div className="px-4 py-2.5 border-b border-[#ECEEF2] flex items-center justify-between">
                              <span className="text-[11px] font-normal uppercase tracking-[0.04em] text-[#6B7280]">
                                SUPERSERIE X{grupo.rondas} RONDAS
                              </span>
                              <ArrowUpRight
                                size={15}
                                strokeWidth={1.5}
                                className="text-[#6B7280]"
                              />
                            </div>
                          )}

                          {grupo.items.map((item) => {
                            const seId = item.sesion_ejercicio_id ?? `${bloque.orden}_${item.orden}`
                            const ej = item.ejercicio || {}
                            const textoObjetivo =
                              grupo.superserie !== null
                                ? `${item.reps_obj}${item.rpe_obj ? ` / RPE ${item.rpe_obj}` : ''}`
                                : `${item.series_obj} series | ${item.reps_obj}${
                                    item.rpe_obj ? ` / RPE ${item.rpe_obj}` : ''
                                  }`

                            return (
                              <div
                                key={seId}
                                className="flex items-stretch border-b border-[#E5E7EB] last:border-b-0 min-h-[88px]"
                              >
                                <ExerciseThumb
                                  ejercicio={ej}
                                  sizeClass="w-[88px] h-[88px]"
                                  showPlayOverlay={false}
                                  onClick={() => onOpenVideo(ej, 'teatro', false)}
                                />

                                <div className="flex-1 px-3.5 py-2.5 flex flex-col justify-between min-w-0">
                                  <div>
                                    <h4 className="text-[14.5px] font-light text-[#2A303F] leading-snug line-clamp-2">
                                      {ej.nombre}
                                    </h4>
                                    {item.ultima_marca && (
                                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                                        Última marca:{' '}
                                        {item.ultima_marca.peso_kg
                                          ? `${item.ultima_marca.peso_kg} kg × `
                                          : ''}
                                        {item.ultima_marca.reps
                                          ? `${item.ultima_marca.reps} reps`
                                          : item.ultima_marca.segundos
                                          ? `${item.ultima_marca.segundos}s`
                                          : ''}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[12px] font-medium text-[#1E2433]">
                                      {textoObjetivo}
                                    </span>
                                  </div>
                                </div>

                                <div className="pr-3 py-2 flex flex-col items-end justify-between shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onOpenVideo(ej, 'teatro', true)}
                                    className="p-1.5 rounded-full text-[#4B5563] hover:bg-[#F5F5F7] transition"
                                    title="Ver demostración e instrucciones"
                                    aria-label={`Ver detalles de ${ej.nombre}`}
                                  >
                                    <ArrowUpRight size={18} strokeWidth={1.5} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => abrirSustitucion(item)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium text-[#6B7280] hover:text-[#1E2433] hover:bg-[#F5F5F7] transition"
                                    title="Cambiar por otro ejercicio compatible con tu rodilla"
                                  >
                                    <RefreshCw size={11} />
                                    <span>Cambiar</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })
          )}
        </div>
      )}

      {/* Barra inferior fija Harbiz: el entreno SOLO comienza al pulsar voluntariamente aquí */}
      {sesion && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#ECEEF2] px-4 py-3 pb-safe">
          <div className="max-w-[440px] mx-auto flex gap-2.5">
            {esCarrera ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenCarreraModal(sesion)}
                  className="flex-1 h-12 rounded-full bg-[#242938] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition"
                >
                  Registrar carrera completada
                </button>
                {tieneEjercicios && (
                  <button
                    type="button"
                    onClick={() => onStartWorkout({ sesion, bloques })}
                    className="px-4 h-12 rounded-full border border-[#242938] text-[#1E2433] text-[13px] font-semibold bg-white"
                  >
                    Iniciar bloques
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => onStartWorkout({ sesion, bloques })}
                className="w-full h-12 rounded-full bg-[#242938] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition"
              >
                {sesion.estado === 'completada'
                  ? 'Repetir entrenamiento'
                  : 'Iniciar entrenamiento'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Sustituir Ejercicio */}
      {itemSustituir && (
        <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[82dvh] flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#EE8641]">
                  Alternativas seguras para tu fase
                </span>
                <h3 className="text-lg font-medium text-[#1E2433] leading-snug">
                  Sustituir: {itemSustituir.ejercicio?.nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setItemSustituir(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-0.5">
              {cargandoCandidatos ? (
                <p className="text-xs text-[#6B7280] py-6 text-center">
                  Buscando ejercicios compatibles...
                </p>
              ) : candidatos.length === 0 ? (
                <p className="text-xs text-[#6B7280] py-6 text-center">
                  No hay otras variantes activas del mismo grupo e impacto permitido.
                </p>
              ) : (
                candidatos.map((cand) => (
                  <div
                    key={cand.id}
                    className="flex items-center gap-3 p-2.5 rounded-2xl border border-[#ECEEF2] hover:border-[#242938]/40 transition"
                  >
                    <ExerciseThumb
                      ejercicio={cand}
                      sizeClass="w-14 h-14"
                      roundedClass="rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1E2433] truncate">
                        {cand.nombre}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">
                        {GRUPO_LABELS[cand.grupo] || cand.grupo} ·{' '}
                        {IMPACTO_LABELS[cand.impacto ?? 0]}
                        {cand.equipamiento ? ` · ${cand.equipamiento}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={sustituyendoId === cand.id}
                      onClick={() => confirmarSustitucion(cand.id)}
                      className="px-3.5 py-1.5 rounded-full bg-[#242938] text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                    >
                      {sustituyendoId === cand.id ? '...' : 'Elegir'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajustes de Sesión (Mover fecha / Estado) */}
      {modalAjustes && sesion && (
        <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-[#1E2433]">
                Opciones de la sesión
              </h3>
              <button
                type="button"
                onClick={() => setModalAjustes(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563]"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleMoverFecha} className="space-y-2.5">
              <label className="block text-xs font-medium text-[#6B7280]">
                Mover sesión a otro día
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] px-3 text-sm text-[#1E2433]"
                  />
                  <Calendar
                    size={15}
                    className="pointer-events-none absolute right-3 top-3.5 text-[#6B7280]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={guardandoAjuste}
                  className="px-4 h-11 rounded-xl bg-[#242938] text-white text-xs font-semibold"
                >
                  Mover
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-[#ECEEF2] space-y-2">
              <span className="block text-xs font-medium text-[#6B7280]">
                Estado en la agenda
              </span>
              <div className="grid grid-cols-3 gap-2">
                {['pendiente', 'completada', 'omitida'].map((est) => (
                  <button
                    key={est}
                    type="button"
                    disabled={guardandoAjuste}
                    onClick={() => handleCambiarEstado(est)}
                    className={`h-10 rounded-full text-xs font-semibold capitalize border transition ${
                      sesion.estado === est
                        ? 'bg-[#242938] text-white border-[#242938]'
                        : 'bg-[#F5F5F7] text-[#4B5563] border-[#E5E7EB]'
                    }`}
                  >
                    {est}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
