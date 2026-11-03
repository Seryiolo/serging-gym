import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Timer,
  Plus,
  Minus,
  TrendingUp,
  MessageSquare,
  Calculator,
  Flag,
  Info,
  Check,
  X,
  Trash2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import ExerciseThumb from '../components/ExerciseThumb'
import Calculadora1RM from '../components/Calculadora1RM'
import HistoricoModal from '../components/HistoricoModal'
import { parseDecimal, parseEntero, formatDuracion } from '../../shared/numeros'
import { formatCorto } from '../../shared/fechas'
import { playRestBeep } from '../lib/media'

function agruparSuperseriesActivo(items = []) {
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

export default function EntrenoActivoView({
  entreno,
  duracionSeg,
  TheaterSlot = null,
  onUpdateEntreno,
  onMinimize,
  onDiscardWorkout,
  onCompleteWorkout,
  onOpenVideo,
}) {
  // Temporizador de descanso automático
  const [descansoSeg, setDescansoSeg] = useState(0)
  const [descansoTotal, setDescansoTotal] = useState(0)

  // Modales auxiliares dentro del entreno
  const [calcTarget, setCalcTarget] = useState(null)
  const [historicoEj, setHistoricoEj] = useState(null)
  const [verMasItem, setVerMasItem] = useState({})
  const [modalTerminar, setModalTerminar] = useState(false)
  const [modalDescartar, setModalDescartar] = useState(false)

  // Formulario post-entreno
  const [molestiaDurante, setMolestiaDurante] = useState(1)
  const [molestiaDespues, setMolestiaDespues] = useState(1)
  const [notaSesion, setNotaSesion] = useState('')
  const [guardandoFin, setGuardandoFin] = useState(false)
  const [errorFin, setErrorFin] = useState('')
  const [resultadoRodilla, setResultadoRodilla] = useState(null)

  useEffect(() => {
    if (descansoSeg <= 0) return undefined
    const id = setInterval(() => {
      setDescansoSeg((prev) => {
        if (prev <= 1) {
          playRestBeep()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [descansoSeg])

  const iniciarDescanso = (segundos) => {
    const s = Number(segundos) > 0 ? Number(segundos) : 60
    setDescansoTotal(s)
    setDescansoSeg(s)
  }

  const ajustarDescanso = (delta) => {
    setDescansoSeg((prev) => Math.max(0, prev + delta))
  }

  const { sesion, bloques = [], seriesPorItem = {}, expandidos = {}, bloquesColapsados = {} } = entreno

  const resumenSeries = useMemo(() => {
    let totales = 0
    let completadas = 0
    for (const lista of Object.values(seriesPorItem)) {
      for (const s of lista) {
        totales += 1
        if (s.completada) completadas += 1
      }
    }
    return { totales, completadas }
  }, [seriesPorItem])

  const toggleBloque = (orden) => {
    onUpdateEntreno((prev) => ({
      ...prev,
      bloquesColapsados: {
        ...prev.bloquesColapsados,
        [orden]: !prev.bloquesColapsados?.[orden],
      },
    }))
  }

  const toggleExpandirMarcas = (itemKey) => {
    onUpdateEntreno((prev) => ({
      ...prev,
      expandidos: {
        ...prev.expandidos,
        [itemKey]: !prev.expandidos?.[itemKey],
      },
    }))
  }

  const actualizarSerie = (itemKey, idx, campo, valor) => {
    onUpdateEntreno((prev) => {
      const actual = prev.seriesPorItem[itemKey] || []
      const copia = actual.map((s, i) => (i === idx ? { ...s, [campo]: valor } : s))
      return {
        ...prev,
        seriesPorItem: { ...prev.seriesPorItem, [itemKey]: copia },
      }
    })
  }

  const toggleSerieCompletada = (itemKey, idx, descansoDefault) => {
    let seCompletoAhora = false
    onUpdateEntreno((prev) => {
      const actual = prev.seriesPorItem[itemKey] || []
      const copia = actual.map((s, i) => {
        if (i !== idx) return s
        seCompletoAhora = !s.completada
        return { ...s, completada: !s.completada }
      })
      return {
        ...prev,
        seriesPorItem: { ...prev.seriesPorItem, [itemKey]: copia },
      }
    })
    if (seCompletoAhora) {
      iniciarDescanso(descansoDefault)
    }
  }

  const toggleCompletarEjercicio = (itemKey, descansoDefault) => {
    let marcarTodas = false
    onUpdateEntreno((prev) => {
      const actual = prev.seriesPorItem[itemKey] || []
      const todasHechas = actual.length > 0 && actual.every((s) => s.completada)
      marcarTodas = !todasHechas
      const copia = actual.map((s) => ({ ...s, completada: marcarTodas }))
      return {
        ...prev,
        seriesPorItem: { ...prev.seriesPorItem, [itemKey]: copia },
      }
    })
    if (marcarTodas) {
      iniciarDescanso(descansoDefault)
    }
  }

  const anadirSerieExtra = (itemKey) => {
    onUpdateEntreno((prev) => {
      const actual = prev.seriesPorItem[itemKey] || []
      const ultima = actual[actual.length - 1] || {
        repsTexto: '8',
        pesoTexto: '',
        segTexto: '',
        lado: 'ambos',
      }
      return {
        ...prev,
        seriesPorItem: {
          ...prev.seriesPorItem,
          [itemKey]: [
            ...actual,
            {
              ...ultima,
              ronda: actual.length + 1,
              completada: false,
            },
          ],
        },
      }
    })
  }

  const marcarTodasRestantes = () => {
    onUpdateEntreno((prev) => {
      const nuevo = {}
      for (const [k, lista] of Object.entries(prev.seriesPorItem)) {
        nuevo[k] = lista.map((s) => ({ ...s, completada: true }))
      }
      return { ...prev, seriesPorItem: nuevo }
    })
  }

  const handleConfirmarTerminar = async () => {
    setGuardandoFin(true)
    setErrorFin('')
    try {
      const seriesPayload = []
      for (const bloque of bloques) {
        for (const item of bloque.items || []) {
          const itemKey = String(
            item.sesion_ejercicio_id ?? `${bloque.orden}_${item.orden}`
          )
          const lista = seriesPorItem[itemKey] || []
          const ej = item.ejercicio || {}
          const tipoReg = ej.tipo_registro || 'fuerza'

          lista.forEach((s, idx) => {
            if (!s.completada) return
            const pesoKg = parseDecimal(s.pesoTexto)
            const repsNum = parseEntero(s.repsTexto)
            const segNum = parseEntero(s.segTexto)

            seriesPayload.push({
              sesion_ejercicio_id: item.sesion_ejercicio_id || undefined,
              ejercicio_id: ej.id,
              ronda: s.ronda || idx + 1,
              lado: s.lado || 'ambos',
              reps:
                tipoReg === 'isometrico' || tipoReg === 'tiempo'
                  ? repsNum ?? undefined
                  : repsNum ?? 0,
              peso_kg: pesoKg !== null ? pesoKg : undefined,
              segundos:
                tipoReg === 'isometrico' || tipoReg === 'tiempo'
                  ? segNum ?? 0
                  : segNum ?? undefined,
              rpe: item.rpe_obj ?? undefined,
              completada: 1,
            })
          })
        }
      }

      const respuesta = await onCompleteWorkout({
        sesionPlanId: sesion?.id || undefined,
        inicio: entreno.inicioIso,
        fin: new Date().toISOString(),
        duracionSeg,
        molestiaDurante,
        molestiaDespues,
        nota: notaSesion.trim() || undefined,
        series: seriesPayload,
      })

      if (respuesta?.evaluacionRodilla) {
        setResultadoRodilla(respuesta.evaluacionRodilla)
      } else {
        onUpdateEntreno(null)
      }
    } catch (err) {
      setErrorFin(err.message || 'Error al guardar el entrenamiento')
    } finally {
      setGuardandoFin(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex flex-col pb-24">
      {/* Barra superior blanca idéntica a f_014.jpg */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 pt-safe h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onMinimize}
            className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center text-[#1E2433] hover:bg-[#F5F5F7] transition"
            title="Minimizar entrenamiento (sigue en curso)"
            aria-label="Minimizar entrenamiento"
          >
            <ArrowLeft size={21} strokeWidth={1.6} />
          </button>
          <span className="text-[13px] font-medium text-[#1E2433] truncate">
            {sesion?.titulo || 'Entrenamiento'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F7] border border-[#E5E7EB] text-[#1E2433] text-xs font-semibold tabular-nums">
            <Timer size={15} strokeWidth={1.7} className="text-[#1E2433]" />
            <span>{formatDuracion(duracionSeg)}</span>
          </div>
          <button
            type="button"
            onClick={() => setModalDescartar(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition"
            title="Cancelar / descartar sesión"
            aria-label="Cancelar sesión"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* Banner automático de descanso entre series */}
      {descansoSeg > 0 && (
        <div className="sticky top-14 z-30 bg-[#242938] text-white px-4 py-2.5 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Timer size={15} className="text-[#F8B07E]" />
              <span className="text-xs font-medium text-white/85">Descanso</span>
              <span className="text-sm font-bold tabular-nums text-[#F8B07E]">
                {formatDuracion(descansoSeg)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => ajustarDescanso(-15)}
                className="px-2 py-0.5 rounded-full bg-white/12 text-[11px] font-medium hover:bg-white/20"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => ajustarDescanso(15)}
                className="px-2 py-0.5 rounded-full bg-white/12 text-[11px] font-medium hover:bg-white/20"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={() => setDescansoSeg(0)}
                className="px-2.5 py-0.5 rounded-full bg-[#EE8641] text-white text-[11px] font-semibold"
              >
                Saltar
              </button>
            </div>
          </div>
          {descansoTotal > 0 && (
            <div className="mt-1.5 h-1 w-full bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#EE8641] transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((descansoSeg / descansoTotal) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Slot de Modo Teatro: mantiene el vídeo arriba mientras haces scroll en tus series */}
      {TheaterSlot}

      {/* Lista de bloques y ejercicios (f_014.jpg & sheet_2.jpg) */}
      <div className="flex-1 space-y-3 pt-2">
        {bloques.map((bloque) => {
          const colapsado = Boolean(bloquesColapsados[bloque.orden])
          const gruposSS = agruparSuperseriesActivo(bloque.items || [])

          return (
            <section key={bloque.orden}>
              <button
                type="button"
                onClick={() => toggleBloque(bloque.orden)}
                className="w-full px-4 py-3 bg-[#EFEFF3] border-y border-[#D4D8E1] flex items-center justify-between text-left"
              >
                <span className="text-[14px] font-medium text-[#1E2433]">
                  {bloque.nombre}
                </span>
                {colapsado ? (
                  <Plus size={17} className="text-[#4B5563]" />
                ) : (
                  <Minus size={17} className="text-[#4B5563]" />
                )}
              </button>

              {!colapsado && (
                <div className="space-y-3 pt-2">
                  {gruposSS.map((grupo, gIdx) => (
                    <div
                      key={`${bloque.orden}_ss_${gIdx}`}
                      className="bg-white border-y border-[#E5E7EB]"
                    >
                      {grupo.superserie !== null && (
                        <div className="px-4 py-2.5 border-b border-[#ECEEF2] bg-[#FAFAFB]">
                          <span className="text-[14px] font-light text-[#4B5563]">
                            Superserie x{grupo.rondas} rondas - {gIdx + 1}/{gruposSS.length}
                          </span>
                        </div>
                      )}

                      {grupo.items.map((item) => {
                        const itemKey = String(
                          item.sesion_ejercicio_id ?? `${bloque.orden}_${item.orden}`
                        )
                        const ej = item.ejercicio || {}
                        const tipoReg = ej.tipo_registro || 'fuerza'
                        const series = seriesPorItem[itemKey] || []
                        const todasCompletadas =
                          series.length > 0 && series.every((s) => s.completada)
                        const marcasAbiertas = Boolean(expandidos[itemKey])
                        const verMas = Boolean(verMasItem[itemKey])
                        const textoCue = item.nota || ej.instrucciones || ''

                        const pesoPara1RM =
                          series.find((s) => parseDecimal(s.pesoTexto))?.pesoTexto ||
                          item.ultima_marca?.peso_kg ||
                          ''
                        const repsPara1RM =
                          series.find((s) => parseEntero(s.repsTexto))?.repsTexto ||
                          item.ultima_marca?.reps ||
                          ''

                        return (
                          <div
                            key={itemKey}
                            className="p-4 border-b border-[#E5E7EB] last:border-b-0"
                          >
                            {/* Fila superior: miniatura 92x92 con Play + título + 3 iconos */}
                            <div className="flex items-start gap-3.5">
                              <ExerciseThumb
                                ejercicio={ej}
                                sizeClass="w-[92px] h-[92px]"
                                roundedClass="rounded-md"
                                showPlayOverlay={true}
                                onClick={() => onOpenVideo(ej, 'teatro', false)}
                              />

                              <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[92px]">
                                <div>
                                  <h3 className="text-[16px] font-normal text-[#1E2433] leading-snug">
                                    {ej.nombre}
                                  </h3>
                                  {ej.unilateral === 1 && (
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#F5F5F7] text-[10.5px] font-medium text-[#4B5563]">
                                      Unilateral · Izq / Dcha
                                    </span>
                                  )}
                                </div>

                                {/* 3 iconos Harbiz: Histórico, Vídeo/Notas, Calculadora 1RM */}
                                <div className="flex items-center gap-4 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setHistoricoEj(ej)}
                                    className="p-1.5 -ml-1.5 rounded-lg text-[#4B5563] hover:text-[#1E2433] hover:bg-[#F5F5F7] transition"
                                    title="Histórico del ejercicio"
                                    aria-label="Histórico del ejercicio"
                                  >
                                    <TrendingUp size={18} strokeWidth={1.5} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onOpenVideo(ej, 'teatro', true)}
                                    className="p-1.5 rounded-lg text-[#4B5563] hover:text-[#1E2433] hover:bg-[#F5F5F7] transition"
                                    title="Vídeo e instrucciones técnicas"
                                    aria-label="Vídeo e instrucciones técnicas"
                                  >
                                    <MessageSquare size={18} strokeWidth={1.5} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCalcTarget({
                                        nombre: ej.nombre,
                                        peso: pesoPara1RM,
                                        reps: repsPara1RM,
                                      })
                                    }
                                    className="p-1.5 rounded-lg text-[#4B5563] hover:text-[#1E2433] hover:bg-[#F5F5F7] transition"
                                    title="Calculadora 1RM"
                                    aria-label="Calculadora 1RM"
                                  >
                                    <Calculator size={18} strokeWidth={1.5} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Bloque Objetivo (f_014.jpg) */}
                            <div className="mt-3.5 space-y-1.5">
                              <span className="block text-[12px] text-[#9CA3AF]">
                                Objetivo
                              </span>

                              <div className="flex items-center gap-2 text-[13.5px] text-[#374151]">
                                <Flag size={14} strokeWidth={1.5} className="text-[#6B7280] shrink-0" />
                                <span>
                                  {item.series_obj}{' '}
                                  {grupo.superserie !== null ? 'rondas' : 'series'} x{' '}
                                  {item.reps_obj}
                                  {item.rpe_obj ? ` / RPE ${item.rpe_obj}` : ''}
                                </span>
                              </div>

                              {item.descanso_s > 0 && (
                                <button
                                  type="button"
                                  onClick={() => iniciarDescanso(item.descanso_s)}
                                  className="flex items-center gap-2 text-[13px] text-[#4B5563] hover:text-[#1E2433]"
                                >
                                  <Timer
                                    size={14}
                                    strokeWidth={1.5}
                                    className="text-[#6B7280] shrink-0"
                                  />
                                  <span>{item.descanso_s}&quot; de descanso</span>
                                </button>
                              )}

                              {item.ultima_marca && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FEF4EC] text-[#B8571D] text-[11.5px] font-medium">
                                  <span>
                                    Última vez:{' '}
                                    {item.ultima_marca.peso_kg
                                      ? `${item.ultima_marca.peso_kg} kg × `
                                      : ''}
                                    {item.ultima_marca.reps
                                      ? `${item.ultima_marca.reps} reps`
                                      : item.ultima_marca.segundos
                                      ? `${item.ultima_marca.segundos}s`
                                      : ''}{' '}
                                    ({formatCorto(item.ultima_marca.fecha)})
                                  </span>
                                </div>
                              )}

                              {textoCue && (
                                <div className="flex items-start gap-2 text-[13px] text-[#4B5563]">
                                  <Info
                                    size={14}
                                    strokeWidth={1.5}
                                    className="text-[#6B7280] shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={verMas ? '' : 'line-clamp-1'}>
                                      {textoCue}
                                    </p>
                                    {textoCue.length > 52 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setVerMasItem((prev) => ({
                                            ...prev,
                                            [itemKey]: !prev[itemKey],
                                          }))
                                        }
                                        className="text-[12px] text-[#4B5563] underline underline-offset-2 float-right"
                                      >
                                        {verMas ? 'Ver menos' : 'Ver más'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Barra de acciones: "+ Insertar marcas" | "✓ Completar" */}
                            <div className="mt-4 pt-2 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => toggleExpandirMarcas(itemKey)}
                                className="inline-flex items-center gap-1.5 text-[13px] font-normal text-[#374151] hover:text-[#1E2433] py-1.5"
                              >
                                {marcasAbiertas ? (
                                  <Minus size={15} strokeWidth={1.6} />
                                ) : (
                                  <Plus size={15} strokeWidth={1.6} />
                                )}
                                <span>Insertar marcas</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleCompletarEjercicio(itemKey, item.descanso_s)
                                }
                                className={`h-10 px-6 rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 border transition ${
                                  todasCompletadas
                                    ? 'bg-[#242938] text-white border-[#242938]'
                                    : 'bg-white text-[#1E2433] border-[#6B7280] hover:border-[#1E2433]'
                                }`}
                              >
                                <Check size={15} strokeWidth={2} />
                                <span>{todasCompletadas ? 'Completado' : 'Completar'}</span>
                              </button>
                            </div>

                            {/* Tabla desplegable de inserción de marcas (sheet_2.jpg arriba-dcha) */}
                            {marcasAbiertas && (
                              <div className="mt-4 pt-3 border-t border-[#ECEEF2] space-y-2">
                                <div className="grid grid-cols-12 gap-2 px-1 text-[11px] text-[#9CA3AF] font-normal">
                                  <span className="col-span-2">Ronda</span>
                                  {tipoReg === 'isometrico' || tipoReg === 'tiempo' ? (
                                    <>
                                      <span className="col-span-4">Segundos</span>
                                      <span className="col-span-4">Peso (kg)</span>
                                    </>
                                  ) : tipoReg === 'movilidad' || tipoReg === 'carrera' ? (
                                    <span className="col-span-8">Repeticiones</span>
                                  ) : (
                                    <>
                                      <span className="col-span-4">Repeticiones</span>
                                      <span className="col-span-4">Peso (kg)</span>
                                    </>
                                  )}
                                  <span className="col-span-2 text-right">OK</span>
                                </div>

                                {series.map((s, sIdx) => (
                                  <div
                                    key={`${itemKey}_r_${sIdx}`}
                                    className={`grid grid-cols-12 gap-2 items-center py-1.5 px-1.5 rounded-xl transition ${
                                      s.completada ? 'bg-emerald-50/60' : ''
                                    }`}
                                  >
                                    <div className="col-span-2 flex flex-col">
                                      <span className="text-xs font-medium text-[#1E2433] pl-1">
                                        {s.ronda}
                                      </span>
                                      {ej.unilateral === 1 && (
                                        <span className="text-[9.5px] text-[#9CA3AF] pl-1">
                                          I+D
                                        </span>
                                      )}
                                    </div>

                                    {tipoReg === 'isometrico' || tipoReg === 'tiempo' ? (
                                      <>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="30"
                                          value={s.segTexto}
                                          onChange={(e) =>
                                            actualizarSerie(
                                              itemKey,
                                              sIdx,
                                              'segTexto',
                                              e.target.value
                                            )
                                          }
                                          className="col-span-4 h-9 border-b border-[#D1D5DB] bg-transparent px-1 text-sm text-[#1E2433] focus:outline-none focus:border-[#1E2433]"
                                        />
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="0"
                                          value={s.pesoTexto}
                                          onChange={(e) =>
                                            actualizarSerie(
                                              itemKey,
                                              sIdx,
                                              'pesoTexto',
                                              e.target.value
                                            )
                                          }
                                          className="col-span-4 h-9 border-b border-[#D1D5DB] bg-transparent px-1 text-sm text-[#1E2433] focus:outline-none focus:border-[#1E2433]"
                                        />
                                      </>
                                    ) : tipoReg === 'movilidad' || tipoReg === 'carrera' ? (
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="8"
                                        value={s.repsTexto}
                                        onChange={(e) =>
                                          actualizarSerie(
                                            itemKey,
                                            sIdx,
                                            'repsTexto',
                                            e.target.value
                                          )
                                        }
                                        className="col-span-8 h-9 border-b border-[#D1D5DB] bg-transparent px-1 text-sm text-[#1E2433] focus:outline-none focus:border-[#1E2433]"
                                      />
                                    ) : (
                                      <>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="0"
                                          value={s.repsTexto}
                                          onChange={(e) =>
                                            actualizarSerie(
                                              itemKey,
                                              sIdx,
                                              'repsTexto',
                                              e.target.value
                                            )
                                          }
                                          className="col-span-4 h-9 border-b border-[#D1D5DB] bg-transparent px-1 text-sm text-[#1E2433] focus:outline-none focus:border-[#1E2433]"
                                        />
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="0"
                                          value={s.pesoTexto}
                                          onChange={(e) =>
                                            actualizarSerie(
                                              itemKey,
                                              sIdx,
                                              'pesoTexto',
                                              e.target.value
                                            )
                                          }
                                          className="col-span-4 h-9 border-b border-[#D1D5DB] bg-transparent px-1 text-sm text-[#1E2433] focus:outline-none focus:border-[#1E2433]"
                                        />
                                      </>
                                    )}

                                    <div className="col-span-2 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSerieCompletada(
                                            itemKey,
                                            sIdx,
                                            item.descanso_s
                                          )
                                        }
                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                                          s.completada
                                            ? 'bg-[#242938] border-[#242938] text-white'
                                            : 'bg-white border-[#9CA3AF] text-[#6B7280]'
                                        }`}
                                        aria-label={`Completar ronda ${s.ronda}`}
                                      >
                                        <Check size={14} strokeWidth={2} />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => anadirSerieExtra(itemKey)}
                                  className="text-xs font-medium text-[#6B7280] hover:text-[#1E2433] inline-flex items-center gap-1 pt-1 pl-1"
                                >
                                  <Plus size={13} /> Añadir serie extra
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Botón fijo inferior "Terminar" idéntico a f_014.jpg */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#ECEEF2] px-4 py-3 pb-safe">
        <div className="max-w-[440px] mx-auto">
          <button
            type="button"
            onClick={() => setModalTerminar(true)}
            className="w-full h-12 rounded-full bg-[#242938] text-white text-[14px] font-semibold shadow-sm hover:opacity-95 transition"
          >
            Terminar
          </button>
        </div>
      </div>

      {/* Modal Resumen Post-Entrenamiento y Control de Rodilla */}
      {modalTerminar && (
        <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
            {resultadoRodilla ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="text-[22px] font-light text-[#1E2433]">
                  ¡Entrenamiento guardado!
                </h3>
                <div className="bg-[#F5F5F7] rounded-2xl p-4 text-left border border-[#E5E7EB] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Evaluación de rodilla
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white border border-[#E5E7EB] capitalize text-[#1E2433]">
                      Sugerencia: {resultadoRodilla.accion}
                    </span>
                  </div>
                  <p className="text-xs text-[#1E2433] leading-relaxed">
                    {resultadoRodilla.motivo}
                  </p>
                  {resultadoRodilla.objetivo > 0 && (
                    <div className="pt-1">
                      <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EE8641]"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((resultadoRodilla.progreso || 0) /
                                  resultadoRodilla.objetivo) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateEntreno(null)}
                  className="w-full h-12 rounded-full bg-[#242938] text-white text-sm font-semibold"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#EE8641]">
                      Resumen de sesión
                    </span>
                    <h3 className="text-[22px] font-light text-[#1E2433]">
                      Finalizar entrenamiento
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalTerminar(false)}
                    className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563]"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#F5F5F7] rounded-2xl p-3 text-center">
                    <span className="text-[11px] text-[#6B7280] block">Duración</span>
                    <span className="text-lg font-semibold text-[#1E2433] tabular-nums">
                      {formatDuracion(duracionSeg)}
                    </span>
                  </div>
                  <div className="bg-[#F5F5F7] rounded-2xl p-3 text-center">
                    <span className="text-[11px] text-[#6B7280] block">
                      Series completadas
                    </span>
                    <span className="text-lg font-semibold text-[#1E2433] tabular-nums">
                      {resumenSeries.completadas} / {resumenSeries.totales}
                    </span>
                  </div>
                </div>

                {resumenSeries.completadas < resumenSeries.totales && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5">
                    <AlertTriangle
                      size={16}
                      className="text-amber-600 shrink-0 mt-0.5"
                    />
                    <div className="text-xs text-amber-900 space-y-1.5 flex-1">
                      <p>
                        Quedan{' '}
                        <strong>
                          {resumenSeries.totales - resumenSeries.completadas} series
                        </strong>{' '}
                        sin marcar. Solo se guardan las series marcadas como hechas.
                      </p>
                      <button
                        type="button"
                        onClick={marcarTodasRestantes}
                        className="text-xs font-semibold underline underline-offset-2 text-amber-950"
                      >
                        Marcar todas como completadas
                      </button>
                    </div>
                  </div>
                )}

                {/* Molestia rodilla durante y al acabar */}
                <div className="bg-[#F5F5F7] rounded-2xl p-4 space-y-4 border border-[#ECEEF2]">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-[#1E2433]">
                        Molestia en rodilla durante (0–10)
                      </span>
                      <span className="font-semibold text-[#1E2433]">
                        {molestiaDurante} / 10
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={molestiaDurante}
                      onChange={(e) => setMolestiaDurante(Number(e.target.value))}
                      className="w-full harbiz-range"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-[#1E2433]">
                        Molestia en rodilla al acabar (0–10)
                      </span>
                      <span className="font-semibold text-[#1E2433]">
                        {molestiaDespues} / 10
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={molestiaDespues}
                      onChange={(e) => setMolestiaDespues(Number(e.target.value))}
                      className="w-full harbiz-range"
                    />
                    <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-1">
                      <span>0–2 Estable</span>
                      <span>3–4 Vigilar</span>
                      <span>5+ Reducir carga</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">
                    Notas de la sesión (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Sensaciones en aterrizajes, estabilidad unilateral, energía..."
                    value={notaSesion}
                    onChange={(e) => setNotaSesion(e.target.value)}
                    className="w-full rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] p-3 text-xs text-[#1E2433] focus:outline-none focus:border-[#242938]"
                  />
                </div>

                {errorFin && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
                    {errorFin}
                  </p>
                )}

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={guardandoFin}
                    onClick={handleConfirmarTerminar}
                    className="w-full h-12 rounded-full bg-[#242938] text-white text-sm font-semibold shadow-md disabled:opacity-50"
                  >
                    {guardandoFin ? 'Guardando entrenamiento...' : 'Guardar y completar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTerminar(false)}
                    className="w-full h-10 rounded-full text-xs font-medium text-[#6B7280] hover:text-[#1E2433]"
                  >
                    Seguir entrenando
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmar descartar sesión */}
      {modalDescartar && (
        <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-lg font-semibold text-[#1E2433]">
              ¿Descartar entrenamiento?
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Si solo quieres consultar la Agenda o los Vídeos, usa la flecha superior izquierda para minimizar sin perder tus series.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onDiscardWorkout}
                className="w-full h-11 rounded-full bg-red-600 text-white text-xs font-semibold"
              >
                Sí, descartar sin guardar
              </button>
              <button
                type="button"
                onClick={() => setModalDescartar(false)}
                className="w-full h-10 rounded-full bg-[#F5F5F7] text-[#1E2433] text-xs font-semibold"
              >
                Volver al entrenamiento
              </button>
            </div>
          </div>
        </div>
      )}

      {calcTarget && (
        <Calculadora1RM
          ejercicioNombre={calcTarget.nombre}
          pesoInicial={calcTarget.peso}
          repsInicial={calcTarget.reps}
          onClose={() => setCalcTarget(null)}
        />
      )}

      {historicoEj && (
        <HistoricoModal
          ejercicio={historicoEj}
          onClose={() => setHistoricoEj(null)}
        />
      )}
    </div>
  )
}
