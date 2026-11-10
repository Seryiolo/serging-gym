import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Play,
  Trash2,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import {
  getSesion,
  obtenerCandidatosSustitucion,
  sustituirEjercicio,
  obtenerCandidatosAnadir,
  anadirEjercicioSesion,
  quitarEjercicioSesion,
  editarEjercicioSesion,
  moverSesion,
  cambiarEstadoSesion,
  eliminarEntreno,
} from '../lib/api'
import ExerciseThumb from '../components/ExerciseThumb'
import { formatLargo } from '../../shared/fechas'
import {
  formatDescanso,
  formatearMarcaLogica,
  extraerSecuenciaDistanciasMetros,
} from '../../shared/numeros'
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
  entrenoActivo = null,
  onBack,
  onStartWorkout,
  onDiscardWorkout,
  onOpenVideo,
  onOpenCarreraModal,
  onOpenReorganizarSemana,
  onSessionUpdated,
}) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [verMasDesc, setVerMasDesc] = useState(false)
  const [colapsados, setColapsados] = useState({})
  const [eliminandoEntreno, setEliminandoEntreno] = useState(false)

  // Modal sustituir o añadir ejercicio
  const [itemSustituir, setItemSustituir] = useState(null)
  const [bloqueAnadir, setBloqueAnadir] = useState(null)
  const [candidatos, setCandidatos] = useState([])
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false)
  const [sustituyendoId, setSustituyendoId] = useState(null)
  const [busquedaCand, setBusquedaCand] = useState('')
  const [filtroCand, setFiltroCand] = useState('grupo') // 'grupo' | 'seccion' | 'mios' | 'todos'
  const [subgrupoCand, setSubgrupoCand] = useState('todos')
  const [quitandoId, setQuitandoId] = useState(null)

  // Modal editar prescripción (series / reps / descanso / nota)
  const [itemEditar, setItemEditar] = useState(null)
  const [editSeries, setEditSeries] = useState(3)
  const [editReps, setEditReps] = useState('')
  const [editDescanso, setEditDescanso] = useState(90)
  const [editNota, setEditNota] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

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
    setBloqueAnadir(null)
    setItemSustituir(item)
    setBusquedaCand('')
    setFiltroCand('grupo')
    setSubgrupoCand('todos')
    setCandidatos([])
    setCargandoCandidatos(true)
    try {
      const res = await obtenerCandidatosSustitucion(seId)
      const lista = res?.candidatos || []
      setCandidatos(lista)
      if (!lista.some((c) => c.es_mismo_grupo)) {
        setFiltroCand('seccion')
      }
    } catch {
      setCandidatos([])
    } finally {
      setCargandoCandidatos(false)
    }
  }

  const abrirAnadirEnBloque = async (bloque) => {
    if (!detalle?.sesion?.id) return
    const primerGrupo = bloque?.items?.[0]?.ejercicio?.grupo || null
    setItemSustituir(null)
    setBloqueAnadir({
      orden: bloque.orden,
      nombre: bloque.nombre,
      tipo: bloque.tipo,
      grupoSugerido: primerGrupo,
    })
    setBusquedaCand('')
    setFiltroCand(primerGrupo ? 'grupo' : 'seccion')
    setSubgrupoCand('todos')
    setCandidatos([])
    setCargandoCandidatos(true)
    try {
      const res = await obtenerCandidatosAnadir({
        sesionPlanId: detalle.sesion.id,
        grupoSugerido: primerGrupo,
      })
      const lista = res?.candidatos || []
      setCandidatos(lista)
      if (!lista.some((c) => c.es_mismo_grupo)) {
        setFiltroCand('seccion')
      }
    } catch {
      setCandidatos([])
    } finally {
      setCargandoCandidatos(false)
    }
  }

  const confirmarSeleccionCatalogo = async (cand) => {
    const nuevoEjercicioId = cand.id
    setSustituyendoId(nuevoEjercicioId)
    try {
      if (itemSustituir) {
        const seId = itemSustituir.sesion_ejercicio_id ?? itemSustituir.id
        await sustituirEjercicio({
          sesionEjercicioId: seId,
          nuevoEjercicioId,
        })
        setItemSustituir(null)
      } else if (bloqueAnadir && detalle?.sesion?.id) {
        await anadirEjercicioSesion({
          sesionPlanId: detalle.sesion.id,
          ejercicioId: nuevoEjercicioId,
          bloqueOrden: bloqueAnadir.orden,
          bloqueNombre: bloqueAnadir.nombre,
          bloqueTipo: bloqueAnadir.tipo,
        })
        setBloqueAnadir(null)
      }
      await cargarSesion()
      onSessionUpdated?.()
    } catch (err) {
      alert(err.message || 'No se pudo guardar el cambio en la sesión')
    } finally {
      setSustituyendoId(null)
    }
  }

  const handleQuitarEjercicio = async (item) => {
    const seId = item.sesion_ejercicio_id ?? item.id
    if (!seId) return
    const totalEjercicios = (detalle?.bloques || []).reduce(
      (acc, b) => acc + (b.items?.length || 0),
      0
    )
    if (totalEjercicios <= 1) {
      alert(
        'La sesión debe mantener al menos un ejercicio. Si prefieres hacer otro distinto, pulsa "Cambiar".'
      )
      return
    }
    const ok = window.confirm(
      `¿Quitar "${item.ejercicio?.nombre || 'este ejercicio'}" de esta sesión?`
    )
    if (!ok) return
    setQuitandoId(seId)
    try {
      await quitarEjercicioSesion(seId)
      await cargarSesion()
      onSessionUpdated?.()
    } catch (err) {
      alert(err.message || 'No se pudo quitar el ejercicio')
    } finally {
      setQuitandoId(null)
    }
  }

  const abrirEditarPrescripcion = (item) => {
    setItemEditar(item)
    setEditSeries(Number(item.series_obj) || 3)
    setEditReps(String(item.reps_obj || '8-10'))
    setEditDescanso(item.descanso_s != null ? Number(item.descanso_s) : 90)
    setEditNota(String(item.nota || ''))
  }

  const handleGuardarEdicion = async (e) => {
    e.preventDefault()
    if (!itemEditar) return
    const seId = itemEditar.sesion_ejercicio_id ?? itemEditar.id
    setGuardandoEdicion(true)
    try {
      await editarEjercicioSesion({
        sesionEjercicioId: seId,
        series_obj: Math.max(1, Math.min(25, Number(editSeries) || 1)),
        reps_obj: editReps.trim() || '8-10',
        descanso_s: Math.max(0, Math.min(600, Number(editDescanso) || 0)),
        nota: editNota.trim(),
      })
      setItemEditar(null)
      await cargarSesion()
      onSessionUpdated?.()
    } catch (err) {
      alert(err.message || 'No se pudo actualizar el ejercicio')
    } finally {
      setGuardandoEdicion(false)
    }
  }

  const gruposDisponiblesModal = useMemo(() => {
    const base =
      filtroCand === 'seccion'
        ? candidatos.filter((c) => c.es_misma_seccion)
        : candidatos
    const setG = new Set(base.map((c) => c.grupo).filter(Boolean))
    return Array.from(setG)
  }, [candidatos, filtroCand])

  const candidatosFiltrados = useMemo(() => {
    const q = busquedaCand.trim().toLowerCase()
    return candidatos.filter((c) => {
      if (q) {
        const texto =
          `${c.nombre || ''} ${GRUPO_LABELS[c.grupo] || c.grupo || ''} ${c.equipamiento || ''} ${c.instrucciones || ''}`.toLowerCase()
        if (!texto.includes(q)) return false
      } else {
        if (filtroCand === 'grupo' && !c.es_mismo_grupo) return false
        if (filtroCand === 'seccion' && !c.es_misma_seccion) return false
        if (filtroCand === 'mios' && !c.es_personal) return false
      }
      if (
        (filtroCand === 'seccion' || filtroCand === 'todos') &&
        subgrupoCand !== 'todos' &&
        c.grupo !== subgrupoCand
      ) {
        return false
      }
      return true
    })
  }, [candidatos, busquedaCand, filtroCand, subgrupoCand])

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
  const sesionEstaEnCursoOPausa = Boolean(
    entrenoActivo &&
      entrenoActivo.sesion &&
      String(entrenoActivo.sesion.id) === String(sesion?.id)
  )

  const handleDescartarEntrenoCompletado = async () => {
    const entrenoId = detalle?.entreno?.id || detalle?.sesion?.entreno_id
    const sesionPlanId = detalle?.sesion?.id
    if (!entrenoId && !sesionPlanId) return
    const ok = window.confirm(
      '¿Descartar este entrenamiento guardado? Se eliminarán sus series y NO contará para la progresión de 6 sesiones de rodilla.'
    )
    if (!ok) return
    setEliminandoEntreno(true)
    try {
      await eliminarEntreno({ entrenoId, sesionPlanId })
      await cargarSesion()
      onSessionUpdated?.()
    } catch (err) {
      alert(err.message || 'Error al descartar el entrenamiento')
    } finally {
      setEliminandoEntreno(false)
    }
  }

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
            <div className="flex items-center gap-1.5">
              {onOpenReorganizarSemana && (
                <button
                  type="button"
                  onClick={() => onOpenReorganizarSemana(sesion.fecha)}
                  className="h-8 px-3 rounded-full bg-white/85 border border-[#D8DCE3] text-[11.5px] font-semibold text-[#1E2433] flex items-center gap-1.5 shadow-2xs hover:bg-white transition whitespace-nowrap"
                >
                  <ArrowUpDown size={12} className="text-[#EE8641] shrink-0" />
                  <span>Mover día</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalAjustes(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E2433]/80 hover:bg-white/60 transition"
                aria-label="Ajustes de la sesión"
              >
                <Settings size={20} strokeWidth={1.5} />
              </button>
            </div>
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
                            const esIntervalosPista =
                              ej.tipo_registro === 'carrera' ||
                              String(item.reps_obj || '').toLowerCase().includes('1000m') ||
                              String(item.reps_obj || '').toLowerCase().includes('metros')
                            const descansoS =
                              item.descanso_s > 0
                                ? item.descanso_s
                                : esIntervalosPista && String(item.reps_obj || '').includes('1000m')
                                ? 120
                                : item.descanso_s === 0
                                ? 0
                                : 90
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
                                        <span className="font-medium text-[#1E2433]">
                                          {formatearMarcaLogica(
                                            item.ultima_marca,
                                            ej.tipo_registro
                                          )}
                                        </span>
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => abrirEditarPrescripcion(item)}
                                      className="inline-flex items-center gap-1 text-left text-[12px] font-medium text-[#1E2433] hover:text-[#EE8641] transition w-fit"
                                      title="Editar series, repeticiones/distancia o descanso"
                                    >
                                      <span>{textoObjetivo}</span>
                                      <SlidersHorizontal size={11} className="text-[#EE8641] shrink-0" />
                                    </button>
                                    {descansoS > 0 && (
                                      <span className="text-[11px] text-[#4B5563]">
                                        Descanso:{' '}
                                        <strong className="text-[#1E2433]">
                                          {formatDescanso(descansoS)}
                                        </strong>{' '}
                                        {esIntervalosPista
                                          ? 'recuperación activa entre series'
                                          : grupo.superserie !== null
                                          ? 'entre ejercicios de la superserie'
                                          : 'entre series'}
                                      </span>
                                    )}
                                    {item.nota && (
                                      <span className="text-[10.5px] text-[#6B7280] italic leading-tight mt-0.5">
                                        {item.nota}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="pr-2.5 py-2 flex flex-col items-end justify-between shrink-0 gap-1">
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => abrirEditarPrescripcion(item)}
                                      className="p-1.5 rounded-full text-[#6B7280] hover:text-[#1E2433] hover:bg-[#F5F5F7] transition"
                                      title="Ajustar series, repeticiones o descanso"
                                      aria-label={`Ajustar series de ${ej.nombre}`}
                                    >
                                      <SlidersHorizontal size={14} strokeWidth={1.6} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={quitandoId === seId}
                                      onClick={() => handleQuitarEjercicio(item)}
                                      className="p-1.5 rounded-full text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                                      title="Quitar este ejercicio de la sesión"
                                      aria-label={`Quitar ${ej.nombre}`}
                                    >
                                      <Trash2 size={14} strokeWidth={1.6} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenVideo(ej, 'teatro', true)}
                                      className="p-1.5 rounded-full text-[#4B5563] hover:bg-[#F5F5F7] transition"
                                      title="Ver demostración e instrucciones"
                                      aria-label={`Ver detalles de ${ej.nombre}`}
                                    >
                                      <ArrowUpRight size={17} strokeWidth={1.5} />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => abrirSustitucion(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold text-[#1E2433] bg-[#F5F5F7] hover:bg-[#ECEEF2] transition"
                                    title="Cambiar por otro ejercicio de la base de datos"
                                  >
                                    <RefreshCw size={11} className="text-[#EE8641]" />
                                    <span>Cambiar</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}

                      <div className="px-4 pt-0.5 pb-1">
                        <button
                          type="button"
                          onClick={() => abrirAnadirEnBloque(bloque)}
                          className="w-full h-9 rounded-xl border border-dashed border-[#CFD4DC] bg-white/70 hover:bg-white text-[12px] font-medium text-[#4B5563] hover:text-[#1E2433] flex items-center justify-center gap-1.5 transition"
                        >
                          <Plus size={14} className="text-[#EE8641]" />
                          <span>Añadir ejercicio a {bloque.nombre}</span>
                        </button>
                      </div>
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
          <div className="max-w-[440px] mx-auto flex flex-col gap-2">
            {sesionEstaEnCursoOPausa ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onStartWorkout({ sesion, bloques })}
                  className="w-full h-12 rounded-full bg-[#242938] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition flex items-center justify-center gap-2"
                >
                  <Play size={16} className="fill-white" />
                  Reanudar entrenamiento {entrenoActivo?.enPausa ? '(en pausa)' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      '¿Descartar este borrador de entrenamiento? No se guardará nada y NO contará para la progresión de 6 sesiones de tu rodilla.'
                    )
                    if (ok) {
                      onDiscardWorkout?.()
                      onBack()
                    }
                  }}
                  className="w-full h-9 rounded-full bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Descartar borrador (no cuenta para rodilla)
                </button>
              </div>
            ) : esCarrera ? (
              <div className="flex flex-col gap-2">
                {tieneEjercicios ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onStartWorkout({ sesion, bloques })}
                      className="w-full h-12 rounded-full bg-[#242938] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition flex items-center justify-center gap-2"
                    >
                      <Play size={15} className="fill-white" />
                      Iniciar sesión (anotar tiempos de cada serie)
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCarreraModal(sesion)}
                      className="w-full h-9 rounded-full border border-[#D8DCE3] text-[#1E2433] text-xs font-semibold bg-white hover:bg-[#F5F5F7] transition flex items-center justify-center gap-1.5"
                    >
                      <Activity size={13} className="text-[#EE8641]" />
                      Registro directo de carrera (resumen total de reloj GPS)
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenCarreraModal(sesion)}
                    className="w-full h-12 rounded-full bg-[#242938] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition"
                  >
                    Registrar carrera completada
                  </button>
                )}
              </div>
            ) : sesion.estado === 'completada' ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onStartWorkout({ sesion, bloques })}
                  className="w-full h-12 rounded-full bg-[#242938] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition"
                >
                  Repetir entrenamiento
                </button>
                <button
                  type="button"
                  disabled={eliminandoEntreno}
                  onClick={handleDescartarEntrenoCompletado}
                  className="w-full h-9 rounded-full bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  {eliminandoEntreno
                    ? 'Descartando...'
                    : 'Descartar entrenamiento guardado (no cuenta para rodilla)'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStartWorkout({ sesion, bloques })}
                className="w-full h-12 rounded-full bg-[#242938] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition"
              >
                Iniciar entrenamiento
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Sustituir o Añadir Ejercicio */}
      {(itemSustituir || bloqueAnadir) && (
        <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[86dvh] flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#EE8641]">
                  {itemSustituir
                    ? 'Cambiar ejercicio de la sesión'
                    : `Añadir a ${bloqueAnadir?.nombre || 'la sesión'}`}
                </span>
                <h3 className="text-base font-medium text-[#1E2433] leading-snug truncate">
                  {itemSustituir
                    ? `Actual: ${itemSustituir.ejercicio?.nombre}`
                    : 'Elige un ejercicio del catálogo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItemSustituir(null)
                  setBloqueAnadir(null)
                }}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563] shrink-0"
              >
                <X size={17} />
              </button>
            </div>

            {/* Buscador y pestañas de filtro */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  type="text"
                  value={busquedaCand}
                  onChange={(e) => setBusquedaCand(e.target.value)}
                  placeholder="Buscar por nombre, músculo, pirámide, fartlek..."
                  className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] text-xs text-[#1E2433] focus:outline-none focus:border-[#242938]"
                />
                {busquedaCand && (
                  <button
                    type="button"
                    onClick={() => setBusquedaCand('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1E2433]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {!busquedaCand && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {[
                    {
                      id: 'grupo',
                      label: `Del grupo (${
                        GRUPO_LABELS[
                          itemSustituir?.ejercicio?.grupo ||
                            bloqueAnadir?.grupoSugerido ||
                            ''
                        ] || 'Mismo tipo'
                      })`,
                      count: candidatos.filter((c) => c.es_mismo_grupo).length,
                    },
                    {
                      id: 'seccion',
                      label: 'Toda la sección',
                      count: candidatos.filter((c) => c.es_misma_seccion).length,
                    },
                    ...(candidatos.some((c) => c.es_personal)
                      ? [
                          {
                            id: 'mios',
                            label: 'Mis creados',
                            count: candidatos.filter((c) => c.es_personal).length,
                          },
                        ]
                      : []),
                    {
                      id: 'todos',
                      label: 'Toda la BBDD',
                      count: candidatos.length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setFiltroCand(tab.id)
                        setSubgrupoCand('todos')
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition ${
                        filtroCand === tab.id
                          ? 'bg-[#242938] text-white'
                          : 'bg-[#F5F5F7] text-[#4B5563] hover:bg-[#ECEEF2]'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              )}

              {!busquedaCand &&
                (filtroCand === 'seccion' || filtroCand === 'todos') &&
                gruposDisponiblesModal.length > 1 && (
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                    <button
                      type="button"
                      onClick={() => setSubgrupoCand('todos')}
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium whitespace-nowrap border transition ${
                        subgrupoCand === 'todos'
                          ? 'bg-[#FEF4EC] border-[#EE8641] text-[#C86626]'
                          : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                      }`}
                    >
                      Todos los grupos
                    </button>
                    {gruposDisponiblesModal.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSubgrupoCand(g)}
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium whitespace-nowrap border transition ${
                          subgrupoCand === g
                            ? 'bg-[#FEF4EC] border-[#EE8641] text-[#C86626]'
                            : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                        }`}
                      >
                        {GRUPO_LABELS[g] || g}
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-0.5">
              {cargandoCandidatos ? (
                <p className="text-xs text-[#6B7280] py-6 text-center">
                  Cargando catálogo de ejercicios...
                </p>
              ) : candidatosFiltrados.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-[#6B7280]">
                    No hay ejercicios con este filtro.
                  </p>
                  {filtroCand !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroCand('todos')
                        setSubgrupoCand('todos')
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#F5F5F7] text-xs font-semibold text-[#1E2433]"
                    >
                      Ver todos los ejercicios de la BBDD ({candidatos.length})
                    </button>
                  )}
                </div>
              ) : (
                candidatosFiltrados.map((cand) => {
                  const presc = cand.prescripcion_sugerida
                  return (
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
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-medium text-[#1E2433] line-clamp-1">
                            {cand.nombre}
                          </p>
                          {cand.es_personal && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#FEF4EC] text-[#C86626] text-[9.5px] font-semibold shrink-0">
                              <Sparkles size={9} /> Mío
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B7280] truncate">
                          {GRUPO_LABELS[cand.grupo] || cand.grupo} ·{' '}
                          {IMPACTO_LABELS[cand.impacto ?? 0]}
                          {cand.equipamiento ? ` · ${cand.equipamiento}` : ''}
                        </p>
                        {presc && (
                          <p className="text-[10.5px] font-medium text-[#1E2433]/80 truncate mt-0.5">
                            Sugerido: {presc.series_obj} series × {presc.reps_obj}
                            {presc.descanso_s > 0
                              ? ` · rec. ${formatDescanso(presc.descanso_s)}`
                              : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={sustituyendoId === cand.id}
                        onClick={() => confirmarSeleccionCatalogo(cand)}
                        className="px-3.5 py-1.5 rounded-full bg-[#242938] text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                      >
                        {sustituyendoId === cand.id
                          ? '...'
                          : itemSustituir
                          ? 'Elegir'
                          : 'Añadir'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Series, Reps/Distancia, Descanso y Nota */}
      {itemEditar && (
        <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#EE8641]">
                  Adaptar volumen o descanso
                </span>
                <h3 className="text-base font-medium text-[#1E2433] leading-snug line-clamp-2">
                  {itemEditar.ejercicio?.nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setItemEditar(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563] shrink-0"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-3.5">
              {(() => {
                const pasos = extraerSecuenciaDistanciasMetros(
                  editReps,
                  itemEditar.ejercicio?.nombre,
                  itemEditar.ejercicio?.instrucciones
                )
                if (!pasos || pasos.length < 3) return null
                return (
                  <div className="rounded-2xl bg-[#FEF4EC] border border-[#F4985C]/40 p-3 space-y-2">
                    <span className="block text-[11px] font-semibold text-[#C86626]">
                      Bloques de Pirámide / Escalera ({pasos.length} tramos por bloque)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map((bloquesNum) => {
                        const totalS = pasos.length * bloquesNum
                        return (
                          <button
                            key={bloquesNum}
                            type="button"
                            onClick={() => setEditSeries(totalS)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition ${
                              Number(editSeries) === totalS
                                ? 'bg-[#242938] text-white border-[#242938]'
                                : 'bg-white text-[#1E2433] border-[#E5E7EB]'
                            }`}
                          >
                            {bloquesNum} {bloquesNum === 1 ? 'bloque' : 'bloques'} ({totalS} series)
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">
                    Número de series
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditSeries((s) => Math.max(1, Number(s) - 1))}
                      className="w-10 h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] flex items-center justify-center text-[#1E2433] font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={editSeries}
                      onChange={(e) => setEditSeries(e.target.value)}
                      className="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] text-center text-sm font-semibold text-[#1E2433]"
                    />
                    <button
                      type="button"
                      onClick={() => setEditSeries((s) => Math.min(25, Number(s) + 1))}
                      className="w-10 h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] flex items-center justify-center text-[#1E2433] font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">
                    Descanso (segundos)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={600}
                    step={5}
                    value={editDescanso}
                    onChange={(e) => setEditDescanso(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] px-3 text-sm font-semibold text-[#1E2433]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[30, 45, 60, 90, 105, 120, 180].map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => setEditDescanso(seg)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                      Number(editDescanso) === seg
                        ? 'bg-[#242938] text-white border-[#242938]'
                        : 'bg-[#F5F5F7] text-[#4B5563] border-[#E5E7EB]'
                    }`}
                  >
                    {formatDescanso(seg)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                  Objetivo de repeticiones / distancia / ritmo
                </label>
                <input
                  type="text"
                  value={editReps}
                  onChange={(e) => setEditReps(e.target.value)}
                  placeholder="Ej: 8-10, 1000m @ Z4-Z5, 400m-500m-600m..."
                  className="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] px-3 text-xs text-[#1E2433]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                  Nota personal / indicación (opcional)
                </label>
                <input
                  type="text"
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  placeholder="Ej: Descanso andando en Z2, cuidar hombro..."
                  className="w-full h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] px-3 text-xs text-[#1E2433]"
                />
              </div>

              <button
                type="submit"
                disabled={guardandoEdicion}
                className="w-full h-11 rounded-full bg-[#242938] text-white text-xs font-semibold shadow-sm hover:opacity-95 transition"
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar ajustes del ejercicio'}
              </button>
            </form>
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
                Mover sesión a otra fecha concreta
              </label>
              <div className="space-y-2">
                <div className="relative w-full">
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full h-11 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] px-3 text-sm text-[#1E2433]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={guardandoAjuste}
                  className="w-full h-11 rounded-full bg-[#242938] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Calendar size={14} />
                  {guardandoAjuste ? 'Moviendo...' : 'Mover a la fecha elegida'}
                </button>
              </div>
            </form>

            {onOpenReorganizarSemana && (
              <div className="pt-2 border-t border-[#ECEEF2]">
                <button
                  type="button"
                  onClick={() => {
                    setModalAjustes(false)
                    onOpenReorganizarSemana(sesion.fecha)
                  }}
                  className="w-full h-11 rounded-full bg-[#FEF4EC] border border-[#F4985C]/50 text-[#1E2433] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#FDE9D9] transition"
                >
                  <ArrowUpDown size={14} className="text-[#EE8641]" />
                  Intercambiar días de esta semana
                </button>
              </div>
            )}

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
