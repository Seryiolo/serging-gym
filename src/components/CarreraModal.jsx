import { useMemo, useState } from 'react'
import { ArrowLeft, Timer, Activity } from 'lucide-react'
import {
  parseDecimal,
  parseEntero,
  ritmoSegKm,
  formatRitmo,
} from '../../shared/numeros'
import { hoyMadrid } from '../../shared/fechas'

const TIPOS_CARRERA = [
  { id: 'rodaje', label: 'Rodaje continuo' },
  { id: 'series', label: 'Series en pista / Intervalos' },
  { id: 'tempo', label: 'Tempo / Umbral' },
  { id: 'fartlek', label: 'Fartlek / Cambios ritmo' },
  { id: 'tirada_larga', label: 'Tirada larga' },
  { id: 'tecnica', label: 'Técnica de carrera' },
  { id: 'competicion', label: 'Competición / Test' },
]

const SUPERFICIES = [
  { id: 'asfalto', label: 'Asfalto' },
  { id: 'pista', label: 'Pista atletismo' },
  { id: 'tierra', label: 'Tierra / Parque' },
  { id: 'cinta', label: 'Cinta' },
]

function parseDuracionFlexible(horasStr, minStr, segStr) {
  const h = horasStr === '' ? 0 : parseEntero(horasStr)
  const m = minStr === '' ? 0 : parseEntero(minStr)
  const s = segStr === '' ? 0 : parseEntero(segStr)
  if (h === null || m === null || s === null || s > 59 || (h > 0 && m > 59)) return null
  const total = h * 3600 + m * 60 + s
  return total > 0 ? total : null
}

function detectarZona(segKm, ritmosReferencia = []) {
  if (!segKm || segKm <= 0) return null
  // Ritmo base 10k o media maratón (por defecto 316 s/km = 5:16 HM, 230 s/km = 3:50 1k)
  const r1k = ritmosReferencia.find((r) => r.distancia_m === 1000)?.ritmo_seg_km || 230
  const r21k = ritmosReferencia.find((r) => r.distancia_m >= 21000)?.ritmo_seg_km || 316
  if (segKm <= r1k + 25) return { zona: 'Z5 · VO2máx / Pista rápida', color: 'text-rose-600 bg-rose-50' }
  if (segKm <= r21k - 12) return { zona: 'Z4 · Umbral 10K–15K', color: 'text-[#EE6B2F] bg-[#FEF0E6]' }
  if (segKm <= r21k + 12) return { zona: 'Z3 · Ritmo Media Maratón / Tempo', color: 'text-amber-700 bg-amber-50' }
  if (segKm <= r21k + 45) return { zona: 'Z2 · Rodaje aeróbico', color: 'text-emerald-700 bg-emerald-50' }
  return { zona: 'Z1 · Regenerativo suave', color: 'text-sky-700 bg-sky-50' }
}

export default function CarreraModal({
  fechaInicial,
  sesionPlan = null,
  ritmosReferencia = [],
  onGuardar,
  onClose,
}) {
  const [fecha, setFecha] = useState(sesionPlan?.fecha || fechaInicial || hoyMadrid())
  const [tipo, setTipo] = useState(
    sesionPlan?.titulo?.toLowerCase().includes('pista') ||
      sesionPlan?.titulo?.toLowerCase().includes('series')
      ? 'series'
      : 'rodaje'
  )
  const [distanciaKm, setDistanciaKm] = useState('8,0')
  const [horas, setHoras] = useState('')
  const [minutos, setMinutos] = useState('42')
  const [segundos, setSegundos] = useState('00')
  const [superficie, setSuperficie] = useState(tipo === 'series' ? 'pista' : 'asfalto')
  const [molestiaRodilla, setMolestiaRodilla] = useState(1)
  const [seriesDetalle, setSeriesDetalle] = useState('')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const distanciaM = useMemo(() => {
    const km = parseDecimal(distanciaKm)
    return km && km > 0 ? Math.round(km * 1000) : null
  }, [distanciaKm])

  const duracionS = useMemo(
    () => parseDuracionFlexible(horas, minutos, segundos),
    [horas, minutos, segundos]
  )

  const segPorKm = useMemo(
    () => (distanciaM && duracionS ? ritmoSegKm(distanciaM, duracionS) : null),
    [distanciaM, duracionS]
  )

  const infoZona = useMemo(
    () => detectarZona(segPorKm, ritmosReferencia),
    [segPorKm, ritmosReferencia]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!distanciaM || !duracionS) {
      setError('Revisa la distancia (km) y el tiempo total de la sesión.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onGuardar({
        fecha,
        tipo,
        distancia_m: distanciaM,
        duracion_s: duracionS,
        superficie,
        molestia_rodilla: molestiaRodilla,
        series_detalle: seriesDetalle.trim() || undefined,
        nota: nota.trim() || undefined,
        sesionPlanId: sesionPlan?.id || undefined,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la carrera')
    } finally {
      setGuardando(false)
    }
  }

  const molestiaBadge =
    molestiaRodilla <= 2
      ? 'text-emerald-700 bg-emerald-50'
      : molestiaRodilla <= 4
      ? 'text-amber-700 bg-amber-50'
      : 'text-red-700 bg-red-50'

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F5F7] overflow-y-auto">
      <div className="max-w-[440px] mx-auto min-h-dvh flex flex-col harbiz-aura">
        <header className="px-4 pt-safe h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E2433] hover:bg-white/60 transition"
            aria-label="Cerrar"
          >
            <ArrowLeft size={21} strokeWidth={1.6} />
          </button>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#1E2433]/80">
            Registro de carrera
          </span>
          <div className="w-9" />
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 pt-1 pb-8 space-y-4">
          <div>
            <h2 className="text-[28px] font-light text-[#1E2433] leading-tight">
              {sesionPlan ? sesionPlan.titulo : 'Registrar carrera'}
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Calcula tu ritmo medio al instante y guarda la respuesta de la rodilla.
            </p>
          </div>

          {/* Tarjeta ritmo calculado en vivo */}
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#6B7280] flex items-center gap-1.5">
                <Timer size={14} className="text-[#EE8641]" />
                Ritmo medio calculado
              </span>
              <p className="text-[26px] font-semibold text-[#1E2433] leading-tight mt-0.5">
                {segPorKm ? formatRitmo(segPorKm) : '--:--'}{' '}
                <span className="text-xs font-normal text-[#6B7280]">min/km</span>
              </p>
            </div>
            {infoZona ? (
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${infoZona.color}`}
              >
                {infoZona.zona}
              </span>
            ) : (
              <Activity size={22} className="text-[#D1D5DB]" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full h-11 bg-white border border-[#E5E7EB] rounded-xl px-3 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Distancia (km)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ej. 10,5"
                value={distanciaKm}
                onChange={(e) => setDistanciaKm(e.target.value)}
                className="w-full h-11 bg-white border border-[#E5E7EB] rounded-xl px-3 text-center text-base font-semibold text-[#1E2433] focus:outline-none focus:border-[#242938]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Tiempo total (hh : mm : ss)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  className="w-full h-11 bg-white border border-[#E5E7EB] rounded-xl px-3 pr-7 text-center font-semibold text-[#1E2433] focus:outline-none focus:border-[#242938]"
                />
                <span className="absolute right-2.5 top-3 text-xs text-[#9CA3AF]">h</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="42"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="w-full h-11 bg-white border border-[#E5E7EB] rounded-xl px-3 pr-8 text-center font-semibold text-[#1E2433] focus:outline-none focus:border-[#242938]"
                />
                <span className="absolute right-2 top-3 text-xs text-[#9CA3AF]">min</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00"
                  value={segundos}
                  onChange={(e) => setSegundos(e.target.value)}
                  className="w-full h-11 bg-white border border-[#E5E7EB] rounded-xl px-3 pr-7 text-center font-semibold text-[#1E2433] focus:outline-none focus:border-[#242938]"
                />
                <span className="absolute right-2.5 top-3 text-xs text-[#9CA3AF]">s</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Tipo de sesión
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-11 bg-white border border-[#E5E7EB] rounded-xl px-3 text-xs font-medium text-[#1E2433] focus:outline-none focus:border-[#242938]"
              >
                {TIPOS_CARRERA.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Superficie
              </label>
              <select
                value={superficie}
                onChange={(e) => setSuperficie(e.target.value)}
                className="w-full h-11 bg-white border border-[#E5E7EB] rounded-xl px-3 text-xs font-medium text-[#1E2433] focus:outline-none focus:border-[#242938]"
              >
                {SUPERFICIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(tipo === 'series' || tipo === 'fartlek' || tipo === 'tempo') && (
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Detalle de intervalos / parciales (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. 6x1000m rec 90s a 3:55/km"
                value={seriesDetalle}
                onChange={(e) => setSeriesDetalle(e.target.value)}
                className="w-full h-11 bg-white border border-[#E5E7EB] rounded-xl px-3.5 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
              />
            </div>
          )}

          {/* Control rodilla 0-10 */}
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#1E2433]">
                Sensación / molestia en rodilla
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${molestiaBadge}`}>
                {molestiaRodilla} / 10
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={molestiaRodilla}
              onChange={(e) => setMolestiaRodilla(Number(e.target.value))}
              className="w-full harbiz-range"
            />
            <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-1.5">
              <span>0 · Estable</span>
              <span>2 · Tolerable</span>
              <span>5+ · Reducir impacto</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Notas (zapatillas, sensaciones, pulso...)
            </label>
            <textarea
              rows={2}
              placeholder="Opcional..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="pt-2 mt-auto">
            <button
              type="submit"
              disabled={guardando}
              className="w-full h-12 rounded-full bg-[#242938] text-white text-sm font-semibold shadow-md hover:opacity-95 transition disabled:opacity-50"
            >
              {guardando ? 'Guardando carrera...' : 'Guardar carrera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
