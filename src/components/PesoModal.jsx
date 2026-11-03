import { useState } from 'react'
import { ArrowLeft, Calendar } from 'lucide-react'
import { parseDecimal } from '../../shared/numeros'
import { hoyMadrid } from '../../shared/fechas'

/**
 * Pantalla/Modal "Registrar métricas" estilo Harbiz (sheet_3.jpg arriba-centro),
 * registrando exclusivamente Fecha y Peso Corporal (sin dolor en reposo ni perímetro).
 */
export default function PesoModal({
  fechaInicial,
  ultimoPesoKg,
  onGuardar,
  onClose,
}) {
  const [fecha, setFecha] = useState(fechaInicial || hoyMadrid())
  const [pesoTexto, setPesoTexto] = useState(
    ultimoPesoKg != null ? String(ultimoPesoKg) : ''
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const pesoValido = (() => {
    const n = parseDecimal(pesoTexto)
    return n !== null && n >= 30 && n <= 250 ? n : null
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pesoValido) {
      setError('Introduce un peso válido entre 30 y 250 kg (puedes usar coma o punto).')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onGuardar({ fecha, kg: Math.round(pesoValido * 10) / 10 })
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el peso corporal')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F5F7] overflow-y-auto">
      <div className="max-w-[440px] mx-auto min-h-dvh flex flex-col harbiz-aura-sky">
        <header className="px-4 pt-safe h-14 flex items-center">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#1E2433] hover:bg-white/60 transition"
            aria-label="Volver"
          >
            <ArrowLeft size={21} strokeWidth={1.6} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 pt-2 pb-8">
          <h2 className="text-[30px] font-light text-[#1E2433] tracking-tight mb-6">
            Registrar métricas
          </h2>

          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Fecha del registro
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full h-12 bg-white border border-[#E5E7EB] rounded-lg px-3.5 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
                />
                <Calendar
                  size={16}
                  className="pointer-events-none absolute right-3.5 top-3.5 text-[#6B7280]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Peso Corporal
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="00,0"
                  autoFocus
                  value={pesoTexto}
                  onChange={(e) => setPesoTexto(e.target.value)}
                  className="flex-1 h-12 bg-white border border-[#E5E7EB] rounded-lg px-3.5 text-[16px] text-[#1E2433] focus:outline-none focus:border-[#242938]"
                />
                <span className="text-sm text-[#6B7280] w-6">kg</span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-2">
                Pésate preferiblemente en ayunas. Si ya existe un registro en esta fecha, se actualizará automáticamente.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!pesoValido || guardando}
            className={`w-full h-12 rounded-full text-sm font-semibold transition ${
              pesoValido && !guardando
                ? 'bg-[#242938] text-white shadow-md hover:opacity-95'
                : 'bg-[#A6ACB8] text-white cursor-not-allowed'
            }`}
          >
            {guardando ? 'Guardando...' : 'Guardar métricas'}
          </button>
        </form>
      </div>
    </div>
  )
}
