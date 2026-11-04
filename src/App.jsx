import { useCallback, useEffect, useMemo, useState } from 'react'
import { Play, Timer } from 'lucide-react'
import {
  authCheck,
  authLogout,
  getBootstrap,
  getEvolucion,
  getCarreras,
  getEjercicios,
  generarSemana,
  reorganizarSemana,
  completarSesion,
  eliminarEntreno,
  registrarHinchazonPendiente,
  registrarPeso,
  eliminarPeso,
  cambiarFaseRodilla,
  registrarCarrera,
  actualizarObjetivoCarrera,
  eliminarObjetivoCarrera,
  actualizarRitmoReferencia,
  eliminarCarrera,
  toggleFavoritoEjercicio,
  crearEjercicio,
} from './lib/api'
import { hoyMadrid, lunesDe, addDias } from '../shared/fechas'
import { formatDuracion } from '../shared/numeros'

import Header from './components/Header'
import BottomNav from './components/BottomNav'
import PreparateOverlay from './components/PreparateOverlay'
import WorkoutVideoPlayer from './components/WorkoutVideoPlayer'
import PesoModal from './components/PesoModal'
import CarreraModal from './components/CarreraModal'
import GenerarSemanaModal from './components/GenerarSemanaModal'
import ReorganizarSemanaModal from './components/ReorganizarSemanaModal'
import NuevoEjercicioModal from './components/NuevoEjercicioModal'

import LoginView from './views/LoginView'
import HomeView from './views/HomeView'
import AgendaView from './views/AgendaView'
import VideosView from './views/VideosView'
import EvolucionView from './views/EvolucionView'
import SesionPreviewView from './views/SesionPreviewView'
import EntrenoActivoView from './views/EntrenoActivoView'

const STORAGE_ACTIVE_WORKOUT = 'sg_active_workout_v2'

function extraerNumeroObjetivo(repsObj, fallback) {
  if (!repsObj) return fallback
  const m = String(repsObj).match(/\d+/)
  return m ? m[0] : fallback
}

function construirEstadoEntrenoInicial({ sesion, bloques = [] }) {
  const seriesPorItem = {}
  for (const bloque of bloques) {
    for (const item of bloque.items || []) {
      const itemKey = String(
        item.sesion_ejercicio_id ?? `${bloque.orden}_${item.orden}`
      )
      const totalSeries = Math.max(1, Number(item.series_obj) || 3)
      const tipoReg = item.ejercicio?.tipo_registro || 'fuerza'
      const ultima = item.ultima_marca || null

      const esPorTiempo = tipoReg === 'isometrico' || tipoReg === 'tiempo'
      const defaultSeg = esPorTiempo
        ? ultima?.segundos
          ? String(ultima.segundos)
          : extraerNumeroObjetivo(item.reps_obj, '30')
        : ''
      const defaultReps = !esPorTiempo
        ? ultima?.reps
          ? String(ultima.reps)
          : extraerNumeroObjetivo(item.reps_obj, '8')
        : ''
      const defaultPeso =
        ultima?.peso_kg !== null && ultima?.peso_kg !== undefined
          ? String(ultima.peso_kg)
          : ''

      seriesPorItem[itemKey] = Array.from({ length: totalSeries }, (_, idx) => ({
        ronda: idx + 1,
        lado: 'ambos',
        repsTexto: defaultReps,
        pesoTexto: defaultPeso,
        segTexto: defaultSeg,
        completada: false,
      }))
    }
  }

  return {
    sesion,
    bloques,
    seriesPorItem,
    expandidos: {},
    bloquesColapsados: {},
    inicioEpochMs: Date.now(),
    inicioIso: new Date().toISOString(),
  }
}

function leerEntrenoPersistido() {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_WORKOUT)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.bloques)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export default function App() {
  // --- Autenticación ---
  const [authCargando, setAuthCargando] = useState(true)
  const [user, setUser] = useState(null)

  // --- Navegación principal (4 pestañas Harbiz; jamás auto-inicia un entreno) ---
  const [activeTab, setActiveTab] = useState('home')
  const [evolucionSubTab, setEvolucionSubTab] = useState('metricas')
  const [hoy, setHoy] = useState(() => hoyMadrid())
  const [fechaAgenda, setFechaAgenda] = useState(() => hoyMadrid())

  // --- Datos del servidor ---
  const [bootstrap, setBootstrap] = useState(null)
  const [evolucion, setEvolucion] = useState(null)
  const [carrerasData, setCarrerasData] = useState(null)
  const [ejercicios, setEjercicios] = useState([])
  const [cargandoVideos, setCargandoVideos] = useState(false)

  // --- Flujo voluntario de sesión: Preview -> ¡Prepárate! -> EntrenoActivo ---
  const [previewSesionId, setPreviewSesionId] = useState(null)
  const [pendientePreparate, setPendientePreparate] = useState(null)
  const [entrenoActivo, setEntrenoActivo] = useState(() => leerEntrenoPersistido())
  const [entrenoMinimizado, setEntrenoMinimizado] = useState(() =>
    Boolean(leerEntrenoPersistido())
  )
  const [nowMs, setNowMs] = useState(() => Date.now())

  // --- Reproductor Dual de Vídeo (instancia única por pantalla: Teatro <-> Flotante) ---
  const [videoState, setVideoState] = useState(null)

  // --- Modales globales ---
  const [pesoModalFecha, setPesoModalFecha] = useState(null)
  const [carreraModalCtx, setCarreraModalCtx] = useState(undefined) // undefined = cerrado, null = libre, obj = sesionPlan
  const [generarSemanaLunes, setGenerarSemanaLunes] = useState(null)
  const [reorganizarSemanaLunes, setReorganizarSemanaLunes] = useState(null)
  const [modalNuevoEjercicio, setModalNuevoEjercicio] = useState(false)

  // Persistencia automática del entrenamiento en curso
  useEffect(() => {
    try {
      if (entrenoActivo) {
        localStorage.setItem(STORAGE_ACTIVE_WORKOUT, JSON.stringify(entrenoActivo))
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_WORKOUT)
      }
    } catch {
      // Ignorar cuota de almacenamiento llena
    }
  }, [entrenoActivo])

  // Reloj en vivo de 1s mientras hay un entrenamiento activo (no pausado)
  useEffect(() => {
    if (!entrenoActivo || entrenoActivo.enPausa) return undefined
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [entrenoActivo, entrenoActivo?.enPausa])

  const duracionEntrenoSeg = entrenoActivo
    ? entrenoActivo.enPausa
      ? (entrenoActivo.duracionAcumuladaSeg || 0)
      : Math.max(
          entrenoActivo.duracionAcumuladaSeg || 0,
          Math.floor((nowMs - (entrenoActivo.inicioEpochMs || nowMs)) / 1000)
        )
    : 0

  const cargarDatosPrincipales = useCallback(
    async ({ mes, lunes } = {}) => {
      const [bootRes, evoRes, carrRes] = await Promise.all([
        getBootstrap({ mes, lunes }),
        getEvolucion().catch(() => null),
        getCarreras().catch(() => null),
      ])
      if (bootRes) {
        setBootstrap(bootRes)
        if (bootRes.hoy) setHoy(bootRes.hoy)
      }
      if (evoRes) setEvolucion(evoRes)
      if (carrRes) setCarrerasData(carrRes)
    },
    []
  )

  const cargarCatalogoEjercicios = useCallback(async () => {
    await Promise.resolve()
    setCargandoVideos(true)
    try {
      const res = await getEjercicios()
      setEjercicios(res?.ejercicios || [])
    } catch {
      // Mantiene lista previa si falla red puntual
    } finally {
      setCargandoVideos(false)
    }
  }, [])

  // Comprobación inicial de sesión (cookie HttpOnly o auto-login local dev)
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const res = await authCheck()
        if (!cancelado && res?.authenticated && res?.user) {
          setUser(res.user)
        }
      } catch {
        // Sin sesión activa
      } finally {
        if (!cancelado) setAuthCargando(false)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [])

  // Carga inicial tras autenticarse
  useEffect(() => {
    if (!user) return undefined
    let cancelado = false
    Promise.all([
      getBootstrap(),
      getEvolucion().catch(() => null),
      getCarreras().catch(() => null),
      getEjercicios().catch(() => null),
    ]).then(([bootRes, evoRes, carrRes, ejRes]) => {
      if (cancelado) return
      if (bootRes) {
        setBootstrap(bootRes)
        if (bootRes.hoy) setHoy(bootRes.hoy)
      }
      if (evoRes) setEvolucion(evoRes)
      if (carrRes) setCarrerasData(carrRes)
      if (ejRes?.ejercicios) setEjercicios(ejRes.ejercicios)
      setCargandoVideos(false)
    })
    return () => {
      cancelado = true
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await authLogout()
    } finally {
      setUser(null)
      setBootstrap(null)
      setEvolucion(null)
      setCarrerasData(null)
      setPreviewSesionId(null)
    }
  }

  // Mapa rápido fecha -> kg para puntos en AgendaView
  const pesosMap = useMemo(() => {
    const map = {}
    for (const p of evolucion?.pesos || []) {
      map[p.fecha] = p.kg
    }
    return map
  }, [evolucion])

  // --- Handlers de Vídeo ---
  const handleOpenVideo = useCallback(
    (ejercicio, mode = 'teatro', showCue = false) => {
      if (!ejercicio) return
      setVideoState({ ejercicio, mode, showCue })
    },
    []
  )

  const handleReanudarEntreno = useCallback(() => {
    if (!entrenoActivo) return
    const acumulado = entrenoActivo.duracionAcumuladaSeg || 0
    setEntrenoActivo((prev) => ({
      ...prev,
      enPausa: false,
      inicioEpochMs: Date.now() - acumulado * 1000,
    }))
    setNowMs(Date.now())
    setPreviewSesionId(null)
    setEntrenoMinimizado(false)
  }, [entrenoActivo])

  // --- Handlers de Inicio Voluntario de Entrenamiento ---
  const handleRequestStartWorkout = useCallback(
    (detalleSesion) => {
      if (!detalleSesion) return
      if (
        entrenoActivo &&
        entrenoActivo.sesion?.id &&
        String(entrenoActivo.sesion.id) === String(detalleSesion.sesion?.id)
      ) {
        handleReanudarEntreno()
        return
      }
      if (entrenoActivo) {
        const tituloPrevio = entrenoActivo.sesion?.titulo || 'Entrenamiento en curso'
        const ok = window.confirm(
          `Tienes "${tituloPrevio}" en curso o en pausa. ¿Deseas descartarlo para comenzar esta nueva sesión?`
        )
        if (!ok) return
      }
      setPendientePreparate(detalleSesion)
    },
    [entrenoActivo, handleReanudarEntreno]
  )

  const handleFinishPreparate = useCallback(() => {
    if (!pendientePreparate) return
    const nuevo = construirEstadoEntrenoInicial(pendientePreparate)
    setNowMs(Date.now())
    setEntrenoActivo(nuevo)
    setEntrenoMinimizado(false)
    setPendientePreparate(null)
    setPreviewSesionId(null)
  }, [pendientePreparate])

  const handleUpdateEntreno = useCallback((updater) => {
    if (updater === null) {
      setEntrenoActivo(null)
      setEntrenoMinimizado(false)
      return
    }
    setEntrenoActivo((prev) => {
      if (!prev) return null
      return typeof updater === 'function' ? updater(prev) : updater
    })
  }, [])

  const handleDiscardWorkout = useCallback(() => {
    setEntrenoActivo(null)
    setEntrenoMinimizado(false)
  }, [])

  const handleCompleteWorkout = useCallback(
    async (payload) => {
      const res = await completarSesion(payload)
      await cargarDatosPrincipales({
        mes: fechaAgenda.slice(0, 7),
        lunes: lunesDe(fechaAgenda),
      })
      return res
    },
    [cargarDatosPrincipales, fechaAgenda]
  )

  // --- Handlers de Dominio (Semana, Rodilla, Peso, Carrera, Vídeos) ---
  const handleNavigatePeriodo = useCallback(
    async (nuevaFechaIso) => {
      if (!nuevaFechaIso) return
      try {
        const boot = await getBootstrap({
          mes: nuevaFechaIso.slice(0, 7),
          lunes: lunesDe(nuevaFechaIso),
        })
        if (boot) setBootstrap(boot)
      } catch {
        // Ignorar fallo transitorio al cambiar de mes
      }
    },
    []
  )

  const handleGenerarSemana = async (params) => {
    await generarSemana(params)
    await cargarDatosPrincipales({
      mes: params.lunes.slice(0, 7),
      lunes: params.lunes,
    })
  }

  const handleReorganizarSemana = async ({ cambios, lunes }) => {
    const lunesObjetivo = lunes || reorganizarSemanaLunes || lunesDe(fechaAgenda)
    await reorganizarSemana({ cambios, lunes: lunesObjetivo })
    await cargarDatosPrincipales({
      mes: lunesObjetivo.slice(0, 7),
      lunes: lunesObjetivo,
    })
  }

  const handleEliminarEntreno = async (target) => {
    await eliminarEntreno(target)
    await cargarDatosPrincipales({
      mes: fechaAgenda.slice(0, 7),
      lunes: lunesDe(fechaAgenda),
    })
  }

  const handleResponderHinchazon = async ({ entrenoId, hinchazon }) => {
    await registrarHinchazonPendiente({ entrenoId, hinchazon })
    await cargarDatosPrincipales({
      mes: fechaAgenda.slice(0, 7),
      lunes: lunesDe(fechaAgenda),
    })
  }

  const handleGuardarPeso = async ({ fecha, kg }) => {
    const res = await registrarPeso({ fecha, kg })
    if (res?.pesos) {
      setEvolucion((prev) => (prev ? { ...prev, pesos: res.pesos } : prev))
    }
    await cargarDatosPrincipales({
      mes: fechaAgenda.slice(0, 7),
      lunes: lunesDe(fechaAgenda),
    })
  }

  const handleEliminarPeso = async (id) => {
    const res = await eliminarPeso(id)
    if (res?.pesos) {
      setEvolucion((prev) => (prev ? { ...prev, pesos: res.pesos } : prev))
    }
    await cargarDatosPrincipales({
      mes: fechaAgenda.slice(0, 7),
      lunes: lunesDe(fechaAgenda),
    })
  }

  const handleCambiarFaseRodilla = async (payload) => {
    await cambiarFaseRodilla(payload)
    await cargarDatosPrincipales({
      mes: fechaAgenda.slice(0, 7),
      lunes: lunesDe(fechaAgenda),
    })
  }

  const handleGuardarCarrera = async (payload) => {
    await registrarCarrera(payload)
    if (previewSesionId && payload.sesionPlanId === previewSesionId) {
      setPreviewSesionId(null)
    }
    await cargarDatosPrincipales({
      mes: fechaAgenda.slice(0, 7),
      lunes: lunesDe(fechaAgenda),
    })
  }

  const handleActualizarObjetivo = async (payload) => {
    const res = await actualizarObjetivoCarrera(payload)
    if (res?.objetivos) {
      setCarrerasData((prev) =>
        prev ? { ...prev, objetivos: res.objetivos } : prev
      )
      setBootstrap((prev) =>
        prev ? { ...prev, objetivos: res.objetivos } : prev
      )
    }
  }

  const handleEliminarObjetivo = async (id) => {
    const res = await eliminarObjetivoCarrera(id)
    if (res?.objetivos) {
      setCarrerasData((prev) =>
        prev ? { ...prev, objetivos: res.objetivos } : prev
      )
      setBootstrap((prev) =>
        prev ? { ...prev, objetivos: res.objetivos } : prev
      )
    }
  }

  const handleActualizarRitmo = async (payload) => {
    const res = await actualizarRitmoReferencia(payload)
    if (res?.ritmosReferencia) {
      setCarrerasData((prev) =>
        prev
          ? {
              ...prev,
              ritmosReferencia: res.ritmosReferencia,
              zonasRitmo: res.zonasRitmo || prev.zonasRitmo,
            }
          : prev
      )
      setBootstrap((prev) =>
        prev ? { ...prev, ritmos: res.ritmosReferencia } : prev
      )
    }
  }

  const handleEliminarCarrera = async (carreraId) => {
    await eliminarCarrera(carreraId)
    await cargarDatosPrincipales({
      mes: fechaAgenda.slice(0, 7),
      lunes: lunesDe(fechaAgenda),
    })
  }

  const handleToggleFavorito = async (ejercicioId) => {
    // Actualización optimista inmediata
    setEjercicios((prev) =>
      prev.map((e) =>
        e.id === ejercicioId
          ? { ...e, favorito: !(e.favorito || e.es_favorito) }
          : e
      )
    )
    try {
      const res = await toggleFavoritoEjercicio(ejercicioId)
      if (typeof res?.favorito === 'boolean') {
        setEjercicios((prev) =>
          prev.map((e) =>
            e.id === ejercicioId ? { ...e, favorito: res.favorito } : e
          )
        )
      }
    } catch {
      await cargarCatalogoEjercicios()
    }
  }

  const handleCrearEjercicio = async (payload) => {
    const res = await crearEjercicio(payload)
    if (res?.ejercicio) {
      setEjercicios((prev) => [res.ejercicio, ...prev])
    } else {
      await cargarCatalogoEjercicios()
    }
  }

  // --- Pantalla de carga inicial ---
  if (authCargando) {
    return (
      <div className="min-h-dvh bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-9 h-9 rounded-full border-2 border-[#242938] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-medium text-[#6B7280]">Cargando Serging Gym...</p>
        </div>
      </div>
    )
  }

  // --- Login / Registro ---
  if (!user) {
    return <LoginView onAuthenticated={(u) => setUser(u)} />
  }

  // Instancia única de reproductor para que alternar Teatro <-> Flotante no reinicie nunca el vídeo
  const playerNode = videoState?.ejercicio ? (
    <WorkoutVideoPlayer
      key={videoState.ejercicio.id}
      ejercicio={videoState.ejercicio}
      mode={videoState.mode}
      initialShowCue={videoState.showCue}
      onChangeMode={(nuevoModo) =>
        setVideoState((prev) => (prev ? { ...prev, mode: nuevoModo } : null))
      }
      onClose={() => setVideoState(null)}
    />
  ) : null

  const entrenosPendientesHinchazon =
    evolucion?.entrenosPendientesHinchazon || []
  const rodillaActiva = evolucion?.rodilla || bootstrap?.rodilla || null
  const mostrarEntrenoPantallaCompleta = Boolean(
    entrenoActivo && !entrenoMinimizado
  )

  return (
    <div className="min-h-dvh bg-[#F5F5F7] text-[#1E2433] flex justify-center">
      <div className="w-full max-w-[460px] min-h-dvh bg-[#F5F5F7] relative flex flex-col shadow-xs">
        {mostrarEntrenoPantallaCompleta ? (
          <EntrenoActivoView
            entreno={entrenoActivo}
            duracionSeg={duracionEntrenoSeg}
            TheaterSlot={playerNode}
            onUpdateEntreno={handleUpdateEntreno}
            onMinimize={() => setEntrenoMinimizado(true)}
            onDiscardWorkout={handleDiscardWorkout}
            onCompleteWorkout={handleCompleteWorkout}
            onOpenVideo={handleOpenVideo}
          />
        ) : previewSesionId ? (
          <SesionPreviewView
            sesionId={previewSesionId}
            TheaterSlot={playerNode}
            entrenoActivo={entrenoActivo}
            onBack={() => setPreviewSesionId(null)}
            onStartWorkout={handleRequestStartWorkout}
            onDiscardWorkout={handleDiscardWorkout}
            onOpenVideo={handleOpenVideo}
            onOpenCarreraModal={(sesionPlan) => setCarreraModalCtx(sesionPlan)}
            onSessionUpdated={() =>
              cargarDatosPrincipales({
                mes: fechaAgenda.slice(0, 7),
                lunes: lunesDe(fechaAgenda),
              })
            }
          />
        ) : (
          <>
            <Header
              activeTab={activeTab}
              user={user}
              rodilla={rodillaActiva}
              pendingSwellingCount={entrenosPendientesHinchazon.length}
              onOpenRodilla={() => {
                setEvolucionSubTab('rodilla')
                setActiveTab('evolucion')
              }}
              onLogout={handleLogout}
            />

            {playerNode}

            <main className="flex-1">
              {activeTab === 'home' && (
                <HomeView
                  hoy={hoy}
                  user={user}
                  rodilla={rodillaActiva}
                  objetivos={
                    carrerasData?.objetivos || bootstrap?.objetivos || []
                  }
                  sesionesMes={bootstrap?.sesionesMes || []}
                  resumenSemana={bootstrap?.resumenSemana}
                  videosDestacados={bootstrap?.videosDestacados || []}
                  entrenosPendientesHinchazon={entrenosPendientesHinchazon}
                  entrenoActivo={entrenoActivo}
                  onReanudarWorkout={handleReanudarEntreno}
                  onDiscardWorkout={handleDiscardWorkout}
                  onOpenSessionPreview={(id) => setPreviewSesionId(id)}
                  onOpenPesoModal={(f) => setPesoModalFecha(f || hoy)}
                  onOpenCarreraModal={(sp) => setCarreraModalCtx(sp ?? null)}
                  onOpenGenerarSemana={(lunes) =>
                    setGenerarSemanaLunes(lunes || lunesDe(hoy))
                  }
                  onOpenReorganizarSemana={(lunes) =>
                    setReorganizarSemanaLunes(lunes || lunesDe(hoy))
                  }
                  onIrAgendaFecha={(fecha) => {
                    setFechaAgenda(fecha)
                    setActiveTab('agenda')
                  }}
                  onGoToVideos={() => setActiveTab('videos')}
                  onGoToRodilla={() => {
                    setEvolucionSubTab('rodilla')
                    setActiveTab('evolucion')
                  }}
                  onOpenVideo={handleOpenVideo}
                  onResponderHinchazon={handleResponderHinchazon}
                />
              )}

              {activeTab === 'agenda' && (
                <AgendaView
                  hoy={hoy}
                  fechaSeleccionada={fechaAgenda}
                  onSelectFecha={setFechaAgenda}
                  sesionesMes={bootstrap?.sesionesMes || []}
                  pesosMap={pesosMap}
                  onNavigatePeriodo={handleNavigatePeriodo}
                  onOpenSessionPreview={(id) => setPreviewSesionId(id)}
                  onOpenGenerarSemana={(lunes) =>
                    setGenerarSemanaLunes(lunes || lunesDe(fechaAgenda))
                  }
                  onOpenReorganizarSemana={(lunes) =>
                    setReorganizarSemanaLunes(lunes || lunesDe(fechaAgenda))
                  }
                  onOpenCarreraModal={(sp) => setCarreraModalCtx(sp ?? null)}
                  onOpenPesoModal={(f) => setPesoModalFecha(f || fechaAgenda)}
                  activeWorkoutRunning={Boolean(entrenoActivo)}
                />
              )}

              {activeTab === 'videos' && (
                <VideosView
                  ejercicios={ejercicios}
                  cargando={cargandoVideos}
                  onToggleFavorito={handleToggleFavorito}
                  onOpenNuevoEjercicio={() => setModalNuevoEjercicio(true)}
                  onOpenVideo={handleOpenVideo}
                />
              )}

              {activeTab === 'evolucion' && (
                <EvolucionView
                  hoy={hoy}
                  initialSubTab={evolucionSubTab}
                  evolucion={evolucion}
                  carrerasData={carrerasData}
                  onOpenPesoModal={(f) => setPesoModalFecha(f || hoy)}
                  onEliminarPeso={handleEliminarPeso}
                  onCambiarFaseRodilla={handleCambiarFaseRodilla}
                  onResponderHinchazon={handleResponderHinchazon}
                  onOpenCarreraModal={(sp) => setCarreraModalCtx(sp ?? null)}
                  onActualizarObjetivo={handleActualizarObjetivo}
                  onEliminarObjetivo={handleEliminarObjetivo}
                  onActualizarRitmo={handleActualizarRitmo}
                  onEliminarCarrera={handleEliminarCarrera}
                  onEliminarEntreno={handleEliminarEntreno}
                />
              )}
            </main>

            {/* Barra flotante cuando hay un entrenamiento minimizado en curso */}
            {entrenoActivo && entrenoMinimizado && (
              <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[436px] z-40">
                <button
                  type="button"
                  onClick={handleReanudarEntreno}
                  className="w-full h-12 px-4 rounded-2xl bg-[#242938] text-white shadow-lg flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        entrenoActivo.enPausa
                          ? 'bg-amber-400'
                          : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                    <span className="text-xs font-semibold truncate">
                      {entrenoActivo.sesion?.titulo || 'Entrenamiento en curso'}
                      {entrenoActivo.enPausa ? ' (En pausa)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-white/85 inline-flex items-center gap-1 tabular-nums">
                      <Timer size={13} />
                      {formatDuracion(duracionEntrenoSeg)}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#EE8641] text-white text-[11px] font-semibold inline-flex items-center gap-1">
                      <Play size={10} className="fill-white" />
                      {entrenoActivo.enPausa ? 'Reanudar' : 'Volver'}
                    </span>
                  </div>
                </button>
              </div>
            )}

            <BottomNav
              activeTab={activeTab}
              onSelectTab={(tab) => {
                if (tab === 'evolucion') setEvolucionSubTab('metricas')
                setActiveTab(tab)
              }}
            />
          </>
        )}

        {/* Cuenta atrás "¡PREPÁRATE! 3, 2, 1, GO" — solo tras pulsar voluntariamente "Iniciar entrenamiento" */}
        {pendientePreparate && (
          <PreparateOverlay onFinish={handleFinishPreparate} />
        )}

        {/* Modales transversales */}
        {pesoModalFecha && (
          <PesoModal
            fechaInicial={pesoModalFecha}
            ultimoPesoKg={bootstrap?.resumenSemana?.ultimoPesoKg}
            onGuardar={handleGuardarPeso}
            onClose={() => setPesoModalFecha(null)}
          />
        )}

        {carreraModalCtx !== undefined && (
          <CarreraModal
            fechaInicial={fechaAgenda}
            sesionPlan={carreraModalCtx}
            ritmosReferencia={
              carrerasData?.ritmosReferencia || bootstrap?.ritmos || []
            }
            onGuardar={handleGuardarCarrera}
            onClose={() => setCarreraModalCtx(undefined)}
          />
        )}

        {generarSemanaLunes && (
          <GenerarSemanaModal
            lunes={generarSemanaLunes}
            rodilla={rodillaActiva}
            onGenerar={handleGenerarSemana}
            onClose={() => setGenerarSemanaLunes(null)}
          />
        )}

        {reorganizarSemanaLunes && (
          <ReorganizarSemanaModal
            lunes={reorganizarSemanaLunes}
            sesionesSemana={
              (bootstrap?.sesionesMes || []).filter(
                (s) =>
                  s.fecha >= reorganizarSemanaLunes &&
                  s.fecha <= addDias(reorganizarSemanaLunes, 6)
              )
            }
            onReorganizar={handleReorganizarSemana}
            onClose={() => setReorganizarSemanaLunes(null)}
          />
        )}

        {modalNuevoEjercicio && (
          <NuevoEjercicioModal
            onCrear={handleCrearEjercicio}
            onClose={() => setModalNuevoEjercicio(false)}
          />
        )}
      </div>
    </div>
  )
}
