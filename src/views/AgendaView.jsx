import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  X,
  Zap,
  Activity,
  CheckCircle2,
  Scale,
  Calendar,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react'
import {
  addDias,
  anioDe,
  cuadriculaMes,
  diasDeSemana,
  lunesDe,
  mesDe,
  nombreMes,
} from '../../shared/fechas'

const LETRAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

function Calendar31ToggleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M8 2.8v3.4M16 2.8v3.4M3.5 9h17" />
      <text
        x="12"
        y="17.2"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="8"
        fontWeight="600"
      >
        31
      </text>
    </svg>
  )
}

function etiquetaSemanaHarbiz(diasSemanaIso) {
  const primero = diasSemanaIso[0]
  const ultimo = diasSemanaIso[6]
  const m = MESES_CORTOS[mesDe(primero) - 1]
  const y = anioDe(primero)
  const d1 = Number(primero.slice(8, 10))
  const d2 = Number(ultimo.slice(8, 10))
  return `${m} ${y} - Semana ${d1} al ${d2}`
}

export default function AgendaView({
  hoy,
  fechaSeleccionada,
  onSelectFecha,
  sesionesMes = [],
  pesosMap = {},
  onNavigatePeriodo,
  onOpenSessionPreview,
  onOpenGenerarSemana,
  onOpenReorganizarSemana,
  onOpenCarreraModal,
  onOpenPesoModal,
  activeWorkoutRunning = false,
}) {
  const [modoVista, setModoVista] = useState('semanal') // 'semanal' | 'mensual'
  const [fabAbierto, setFabAbierto] = useState(false)

  const lunesActualVista = useMemo(
    () => lunesDe(fechaSeleccionada),
    [fechaSeleccionada]
  )
  const diasSemanaIso = useMemo(
    () => diasDeSemana(lunesActualVista),
    [lunesActualVista]
  )

  const anioVista = anioDe(fechaSeleccionada)
  const mesVista = mesDe(fechaSeleccionada)
  const semanasMes = useMemo(
    () => cuadriculaMes(anioVista, mesVista),
    [anioVista, mesVista]
  )

  // Índice rápido de sesiones por fecha ISO
  const sesionesPorFecha = useMemo(() => {
    const map = {}
    for (const s of sesionesMes) {
      if (!map[s.fecha]) map[s.fecha] = []
      map[s.fecha].push(s)
    }
    return map
  }, [sesionesMes])

  const sesionesDelDia = sesionesPorFecha[fechaSeleccionada] || []
  const sesionesEnEstaSemana = diasSemanaIso.reduce(
    (acc, iso) => acc + (sesionesPorFecha[iso]?.length || 0),
    0
  )

  const irAnterior = () => {
    if (modoVista === 'semanal') {
      const nueva = addDias(fechaSeleccionada, -7)
      onSelectFecha(nueva)
      onNavigatePeriodo?.(nueva)
    } else {
      const prevMes = mesVista === 1 ? 12 : mesVista - 1
      const prevAnio = mesVista === 1 ? anioVista - 1 : anioVista
      const nueva = `${prevAnio}-${String(prevMes).padStart(2, '0')}-01`
      onSelectFecha(nueva)
      onNavigatePeriodo?.(nueva)
    }
  }

  const irSiguiente = () => {
    if (modoVista === 'semanal') {
      const nueva = addDias(fechaSeleccionada, 7)
      onSelectFecha(nueva)
      onNavigatePeriodo?.(nueva)
    } else {
      const sigMes = mesVista === 12 ? 1 : mesVista + 1
      const sigAnio = mesVista === 12 ? anioVista + 1 : anioVista
      const nueva = `${sigAnio}-${String(sigMes).padStart(2, '0')}-01`
      onSelectFecha(nueva)
      onNavigatePeriodo?.(nueva)
    }
  }

  const renderDotsDia = (iso, selected) => {
    const lista = sesionesPorFecha[iso] || []
    const tienePeso = Boolean(pesosMap[iso])
    if (lista.length === 0 && !tienePeso) {
      return <span className="h-1.5" />
    }
    return (
      <div className="flex items-center justify-center gap-1 h-1.5">
        {lista.slice(0, 2).map((s) => {
          const dotColor =
            s.estado === 'completada'
              ? 'bg-emerald-400'
              : s.tipo === 'carrera'
              ? 'bg-[#38BDF8]'
              : 'bg-[#F59E0B]'
          return (
            <span
              key={s.id}
              className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
            />
          )
        })}
        {tienePeso && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              selected ? 'bg-sky-300' : 'bg-[#67C3F3]'
            }`}
          />
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pb-32 pt-1 space-y-5">
      {/* Cabecera "Agenda" idéntica a f_022.jpg y sheet_3.jpg */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-[32px] font-light tracking-tight text-[#1E2433] leading-none">
          Agenda
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenReorganizarSemana?.(lunesActualVista)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#1E2433]/80 hover:bg-white/70 transition"
            title="Reorganizar semana (intercambiar días)"
            aria-label="Reorganizar semana"
          >
            <ArrowUpDown size={19} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() =>
              setModoVista((m) => (m === 'semanal' ? 'mensual' : 'semanal'))
            }
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#1E2433]/80 hover:bg-white/70 transition"
            title={
              modoVista === 'semanal'
                ? 'Cambiar a calendario mensual'
                : 'Cambiar a vista semanal'
            }
            aria-label="Alternar vista semanal o mensual"
          >
            {modoVista === 'semanal' ? (
              <Calendar31ToggleIcon />
            ) : (
              <List size={21} strokeWidth={1.6} />
            )}
          </button>
        </div>
      </div>

      {/* Banner rápido para saltar al 16 nov si la fecha seleccionada es anterior */}
      {fechaSeleccionada < '2026-11-16' && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-2.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar size={16} className="text-[#EE8641] shrink-0" />
            <span className="text-amber-950 truncate">
              Inicio oficial del entreno: <strong>16 nov 2026</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectFecha('2026-11-16')
              onNavigatePeriodo?.('2026-11-16')
            }}
            className="px-3 py-1 rounded-full bg-[#242938] text-white text-[11px] font-semibold shrink-0 hover:opacity-95"
          >
            Ir a semana
          </button>
        </div>
      )}

      {/* Selector de periodo < Nov 2026 - Semana 2 al 8 > */}
      <div className="flex items-center justify-between px-0.5">
        <button
          type="button"
          onClick={irAnterior}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#4B5563] hover:bg-white/70 transition"
          aria-label="Periodo anterior"
        >
          <ChevronLeft size={21} strokeWidth={1.5} />
        </button>

        <span className="text-[12.5px] font-semibold text-[#1E2433]">
          {modoVista === 'semanal'
            ? etiquetaSemanaHarbiz(diasSemanaIso)
            : `${MESES_CORTOS[mesVista - 1]} ${anioVista}`}
        </span>

        <button
          type="button"
          onClick={irSiguiente}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#4B5563] hover:bg-white/70 transition"
          aria-label="Periodo siguiente"
        >
          <ChevronRight size={21} strokeWidth={1.5} />
        </button>
      </div>

      {/* Vista Semanal: 7 píldoras verticales estadio (f_022.jpg) */}
      {modoVista === 'semanal' ? (
        <div className="grid grid-cols-7 gap-2">
          {diasSemanaIso.map((iso, idx) => {
            const seleccionado = iso === fechaSeleccionada
            const esHoy = iso === hoy
            const numDia = iso.slice(8, 10)

            const pillClasses = seleccionado
              ? 'bg-[#242938] text-white border-[#242938] shadow-xs'
              : esHoy
              ? 'bg-[#CFD3DC]/85 text-[#1E2433] border-[#9CA3AF]'
              : 'bg-white/95 text-[#1E2433] border-[#9CA3AF]/65 hover:border-[#242938]/50'

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectFecha(iso)}
                className={`rounded-full border py-3 min-h-[92px] flex flex-col items-center justify-between transition ${pillClasses}`}
              >
                <span
                  className={`text-[12px] font-light ${
                    seleccionado ? 'text-white/85' : 'text-[#6B7280]'
                  }`}
                >
                  {LETRAS_SEMANA[idx]}
                </span>
                <span className="text-[14px] font-semibold tracking-tight">
                  {numDia}
                </span>
                {renderDotsDia(iso, seleccionado)}
              </button>
            )
          })}
        </div>
      ) : (
        /* Vista Mensual: cuadrícula limpia estilo Harbiz (sheet_3.jpg fila inferior) */
        <div className="pt-1">
          <div className="grid grid-cols-7 text-center mb-3">
            {LETRAS_SEMANA.map((letra) => (
              <span
                key={letra}
                className="text-[11px] font-semibold text-[#1E2433]"
              >
                {letra}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {semanasMes.map((semana) => (
              <div key={semana[0]} className="grid grid-cols-7 text-center">
                {semana.map((iso) => {
                  const enMes = mesDe(iso) === mesVista
                  const seleccionado = iso === fechaSeleccionada
                  const numDia = Number(iso.slice(8, 10))

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => onSelectFecha(iso)}
                      className="flex flex-col items-center justify-start py-1 gap-1"
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] transition ${
                          seleccionado
                            ? 'bg-[#242938] text-white font-semibold'
                            : enMes
                            ? 'text-[#1E2433] font-semibold hover:bg-white'
                            : 'text-[#C5C9D3] font-normal'
                        }`}
                      >
                        {numDia}
                      </span>
                      {renderDotsDia(iso, seleccionado)}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tarjetas del día seleccionado (sheet_4.jpg arriba-izquierda & f_022.jpg) */}
      <div className="space-y-3 pt-1">
        {sesionesDelDia.map((s) => {
          const completada = s.estado === 'completada'
          const esCarrera = s.tipo === 'carrera'
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onOpenSessionPreview(s.id)}
              className="w-full flex items-center gap-3 text-left group"
            >
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs ${
                  completada
                    ? 'bg-emerald-500'
                    : esCarrera
                    ? 'bg-[#38BDF8]'
                    : 'bg-[#F59E0B]'
                }`}
              >
                {completada ? (
                  <CheckCircle2 size={19} />
                ) : esCarrera ? (
                  <Activity size={19} />
                ) : (
                  <Zap size={19} />
                )}
              </span>

              <div className="flex-1 bg-white rounded-xl px-4 py-3.5 border border-[#ECEEF2] shadow-2xs flex items-center justify-between min-w-0 group-hover:border-[#CFD4DC] transition">
                <div className="min-w-0 pr-2">
                  <h3 className="text-[15px] font-normal text-[#1E2433] truncate">
                    {s.titulo}
                  </h3>
                  <p className="text-[12px] text-[#6B7280] mt-0.5">
                    {esCarrera && !s.num_ejercicios
                      ? 'Sesión de carrera · Ver detalles'
                      : `${s.num_ejercicios || 0} ejercicios | ${s.num_bloques || 0} bloques`}
                    {s.estado === 'completada'
                      ? ' · Completada'
                      : s.estado === 'omitida'
                      ? ' · Omitida'
                      : ''}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  strokeWidth={1.6}
                  className="text-[#6B7280] shrink-0"
                />
              </div>
            </button>
          )
        })}

        {/* Tarjeta Métricas personales idéntica a sheet_4.jpg arriba-izquierda */}
        <button
          type="button"
          onClick={() => onOpenPesoModal(fechaSeleccionada)}
          className="w-full flex items-center gap-3 text-left group"
        >
          <span className="w-10 h-10 rounded-full bg-[#67C3F3] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Scale size={18} />
          </span>
          <div className="flex-1 bg-white rounded-xl px-4 py-3.5 border border-[#ECEEF2] shadow-2xs flex items-center justify-between group-hover:border-[#CFD4DC] transition">
            <div>
              <h3 className="text-[15px] font-normal text-[#1E2433]">
                Métricas personales
              </h3>
              <p className="text-[12px] text-[#6B7280] mt-0.5">
                {pesosMap[fechaSeleccionada]
                  ? `Peso registrado: ${pesosMap[fechaSeleccionada]} kg`
                  : 'Registra y analiza tu evolución'}
              </p>
            </div>
            <ChevronRight
              size={18}
              strokeWidth={1.6}
              className="text-[#6B7280] shrink-0"
            />
          </div>
        </button>

        {/* Si la semana no tiene plan generado, invitación directa */}
        {sesionesEnEstaSemana === 0 && (
          <div className="bg-white/80 rounded-2xl p-4 border border-dashed border-[#CFD4DC] text-center space-y-2.5">
            <p className="text-xs text-[#6B7280]">
              Esta semana ({nombreMes(mesDe(lunesActualVista))}) aún no tiene sesiones planificadas.
            </p>
            <button
              type="button"
              onClick={() => onOpenGenerarSemana(lunesActualVista)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#242938] text-white text-xs font-semibold"
            >
              <Sparkles size={13} />
              Generar semana (4–6 días)
            </button>
          </div>
        )}
      </div>

      {/* Botón flotante '+' oscuro Harbiz abajo a la derecha (f_022.jpg) */}
      <div
        className={`fixed right-0 left-0 pointer-events-none z-20 ${
          activeWorkoutRunning ? 'bottom-[126px]' : 'bottom-[74px]'
        }`}
      >
        <div className="max-w-[440px] mx-auto px-4 flex justify-end">
          <button
            type="button"
            onClick={() => setFabAbierto(true)}
            aria-label="Acciones rápidas de agenda"
            className="pointer-events-auto w-[52px] h-[52px] rounded-full bg-[#242938] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition"
          >
            <Plus size={23} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Menú rápido del botón '+' */}
      {fabAbierto && (
        <div className="fixed inset-0 z-50 bg-[#1E2433]/40 backdrop-blur-xs flex items-end justify-center">
          <div className="bg-white w-full max-w-[440px] rounded-t-3xl p-5 pb-8 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Añadir o planificar
              </span>
              <button
                type="button"
                onClick={() => setFabAbierto(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563]"
              >
                <X size={17} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setFabAbierto(false)
                onOpenReorganizarSemana?.(lunesActualVista)
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F5F5F7] hover:bg-[#ECEFF4] text-left transition"
            >
              <span className="w-10 h-10 rounded-full bg-[#EE8641] text-white flex items-center justify-center shrink-0">
                <ArrowUpDown size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1E2433]">
                  Reorganizar semana (intercambiar días)
                </p>
                <p className="text-xs text-[#6B7280]">
                  Intercambia días de carrera o torso para ajustar a tus horarios
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFabAbierto(false)
                onOpenGenerarSemana(lunesActualVista)
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F5F5F7] hover:bg-[#ECEFF4] text-left transition"
            >
              <span className="w-10 h-10 rounded-full bg-[#242938] text-white flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1E2433]">
                  Configurar / Generar semana (4–6 días)
                </p>
                <p className="text-xs text-[#6B7280]">
                  Distribuye fuerza, pliometría y carrera según tu fase de rodilla
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFabAbierto(false)
                onOpenCarreraModal(null)
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F5F5F7] hover:bg-[#ECEFF4] text-left transition"
            >
              <span className="w-10 h-10 rounded-full bg-[#EE8641] text-white flex items-center justify-center shrink-0">
                <Activity size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1E2433]">
                  Registrar carrera / pista
                </p>
                <p className="text-xs text-[#6B7280]">
                  Guarda kilómetros, ritmo medio, superficie y sensación en rodilla
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFabAbierto(false)
                onOpenPesoModal(fechaSeleccionada)
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F5F5F7] hover:bg-[#ECEFF4] text-left transition"
            >
              <span className="w-10 h-10 rounded-full bg-[#67C3F3] text-white flex items-center justify-center shrink-0">
                <Scale size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1E2433]">
                  Registrar peso corporal
                </p>
                <p className="text-xs text-[#6B7280]">
                  Añade el peso del día ({fechaSeleccionada})
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
