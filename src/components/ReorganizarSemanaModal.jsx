import { useMemo, useState } from 'react'
import {
  X,
  ArrowUpDown,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react'
import { diasDeSemana, formatCorto } from '../../shared/fechas'

const DIAS_NOMBRE_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function esSesionImpactoPierna(sesion) {
  if (!sesion) return false
  const t = (sesion.titulo || '').toLowerCase()
  const tipo = sesion.tipo || ''
  return (
    tipo === 'carrera' ||
    t.includes('pierna') ||
    t.includes('plyo') ||
    t.includes('salto') ||
    t.includes('agilidad') ||
    t.includes('cod') ||
    t.includes('pista')
  )
}

export default function ReorganizarSemanaModal({
  lunes,
  sesionesSemana = [],
  onReorganizar,
  onClose,
}) {
  const diasSemana = useMemo(() => diasDeSemana(lunes), [lunes])

  // Estado local de asignación: { [fecha]: sesion | null }
  const [asignacion, setAsignacion] = useState(() => {
    const map = {}
    for (const d of diasSemana) {
      map[d] = null
    }
    for (const s of sesionesSemana) {
      if (s.fecha && map[s.fecha] !== undefined) {
        map[s.fecha] = s
      }
    }
    return map
  })

  // Fecha actualmente seleccionada para mover / intercambiar
  const [origenSeleccionado, setOrigenSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Detección de cambios respecto a la posición original
  const cambiosPendientes = useMemo(() => {
    const res = []
    for (const [fecha, sesion] of Object.entries(asignacion)) {
      if (sesion && sesion.fecha !== fecha) {
        res.push({ sesionId: sesion.id, nuevaFecha: fecha })
      }
    }
    return res
  }, [asignacion])

  // Alerta de impacto consecutivo en la rodilla
  const avisoRodillaConsecutiva = useMemo(() => {
    for (let i = 0; i < diasSemana.length - 1; i++) {
      const s1 = asignacion[diasSemana[i]]
      const s2 = asignacion[diasSemana[i + 1]]
      if (esSesionImpactoPierna(s1) && esSesionImpactoPierna(s2)) {
        return `Has colocado "${s1.titulo}" y "${s2.titulo}" en días consecutivos (${DIAS_NOMBRE_CORTO[i]} y ${DIAS_NOMBRE_CORTO[i + 1]}). Si puedes, intercala torso o descanso para dar 24–48h de recuperación a tu rodilla.`
      }
    }
    return null
  }, [asignacion, diasSemana])

  const handleTocarDia = (fechaDestino) => {
    if (!origenSeleccionado) {
      // Si el día está vacío, no hay nada que mover desde aquí
      if (!asignacion[fechaDestino]) return
      setOrigenSeleccionado(fechaDestino)
      return
    }

    // Si toca el mismo día, deselecciona
    if (origenSeleccionado === fechaDestino) {
      setOrigenSeleccionado(null)
      return
    }

    // Intercambiar contenido de origen y destino
    setAsignacion((prev) => {
      const sesionOrigen = prev[origenSeleccionado]
      const sesionDestino = prev[fechaDestino]
      return {
        ...prev,
        [origenSeleccionado]: sesionDestino || null,
        [fechaDestino]: sesionOrigen || null,
      }
    })
    setOrigenSeleccionado(null)
  }

  const handleRestablecer = () => {
    const map = {}
    for (const d of diasSemana) {
      map[d] = null
    }
    for (const s of sesionesSemana) {
      if (s.fecha && map[s.fecha] !== undefined) {
        map[s.fecha] = s
      }
    }
    setAsignacion(map)
    setOrigenSeleccionado(null)
  }

  const handleGuardar = async () => {
    if (cambiosPendientes.length === 0) {
      onClose()
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onReorganizar({ cambios: cambiosPendientes, lunes })
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la reorganización')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-[460px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#EE8641]">
              <ArrowUpDown size={13} /> Horario y calendario
            </span>
            <h3 className="text-[22px] font-light text-[#1E2433] leading-tight mt-0.5">
              Reorganizar semana
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Semana del {formatCorto(lunes)} · Toca dos días para intercambiar sus entrenamientos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563] hover:text-[#1E2433]"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Guía interactiva */}
        <div className="bg-[#F5F5F7] rounded-2xl p-3 text-xs text-[#4B5563] mb-3 flex items-center justify-between">
          <span>
            {origenSeleccionado ? (
              <strong className="text-[#EE6B2F]">
                Toca ahora el día de destino para mover o intercambiar la sesión
              </strong>
            ) : (
              'Pulsa cualquier sesión para seleccionarla y luego pulsa otro día'
            )}
          </span>
          {cambiosPendientes.length > 0 && (
            <button
              type="button"
              onClick={handleRestablecer}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280] hover:text-[#1E2433] shrink-0 ml-2"
              title="Restablecer posiciones originales"
            >
              <RotateCcw size={12} /> Deshacer
            </button>
          )}
        </div>

        {/* Aviso de impacto de rodilla */}
        {avisoRodillaConsecutiva && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">{avisoRodillaConsecutiva}</p>
          </div>
        )}

        {/* Lista de los 7 días de la semana */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {diasSemana.map((fechaIso, idx) => {
            const sesion = asignacion[fechaIso]
            const esSeleccionado = origenSeleccionado === fechaIso
            const haCambiado = sesion && sesion.fecha !== fechaIso
            const completada = sesion?.estado === 'completada'
            const esCarrera = sesion?.tipo === 'carrera'

            return (
              <button
                key={fechaIso}
                type="button"
                onClick={() => handleTocarDia(fechaIso)}
                className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                  esSeleccionado
                    ? 'border-[#EE8641] bg-[#FEF4EC] ring-2 ring-[#EE8641]/30'
                    : haCambiado
                    ? 'border-[#242938] bg-white'
                    : 'border-[#E5E7EB] bg-white hover:border-[#CFD4DC]'
                }`}
              >
                {/* Indicador día (LUN, MAR, etc.) */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                      esSeleccionado
                        ? 'bg-[#EE8641] text-white'
                        : 'bg-[#F5F5F7] text-[#1E2433]'
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase leading-none">
                      {DIAS_NOMBRE_CORTO[idx]}
                    </span>
                    <span className="text-sm font-bold tabular-nums leading-none mt-1">
                      {fechaIso.slice(8, 10)}
                    </span>
                  </div>

                  {/* Detalle sesión o Día de descanso */}
                  <div className="min-w-0 flex-1">
                    {sesion ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              completada
                                ? 'bg-emerald-500'
                                : esCarrera
                                ? 'bg-[#38BDF8]'
                                : 'bg-[#F59E0B]'
                            }`}
                          />
                          <p className="text-[13.5px] font-medium text-[#1E2433] truncate">
                            {sesion.titulo}
                          </p>
                        </div>
                        <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">
                          {completada
                            ? 'Completada'
                            : esCarrera
                            ? 'Carrera / Series'
                            : `${sesion.num_ejercicios || 0} ejercicios`}
                          {haCambiado ? ` · Movido desde ${formatCorto(sesion.fecha)}` : ''}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[13.5px] font-normal text-[#9CA3AF] italic">
                          Día de descanso / Libre
                        </p>
                        <p className="text-[11px] text-[#C5C9D3] mt-0.5">
                          Toca para mover aquí una sesión
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acción a la derecha */}
                <div className="shrink-0">
                  {esSeleccionado ? (
                    <span className="text-[11px] font-semibold text-[#EE6B2F] bg-white px-2.5 py-1 rounded-full border border-[#EE8641]">
                      Mover...
                    </span>
                  ) : haCambiado ? (
                    <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Reubicado
                    </span>
                  ) : sesion ? (
                    <ArrowUpDown size={15} className="text-[#9CA3AF]" />
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-2">
            {error}
          </p>
        )}

        {/* Botones inferiores */}
        <div className="pt-3 border-t border-[#ECEEF2] mt-2 space-y-2">
          <button
            type="button"
            disabled={guardando || cambiosPendientes.length === 0}
            onClick={handleGuardar}
            className="w-full h-12 rounded-full bg-[#242938] text-white text-sm font-semibold shadow-md disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            {guardando ? (
              'Guardando cambios...'
            ) : cambiosPendientes.length > 0 ? (
              <>
                <Check size={16} /> Guardar ({cambiosPendientes.length} cambios)
              </>
            ) : (
              'Sin cambios pendientes'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-9 rounded-full text-xs font-medium text-[#6B7280] hover:text-[#1E2433]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
