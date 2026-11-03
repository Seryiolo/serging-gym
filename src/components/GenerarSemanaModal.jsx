import { useMemo, useState } from 'react'
import { X, Calendar, Sparkles } from 'lucide-react'
import { composicionSemana, fechasDeSemana, T } from '../../shared/planner'
import { formatCorto, nombreDia } from '../../shared/fechas'

const PLANTILLA_NOMBRES = {
  [T.TORSO_A]: 'Torso A (Empuje + Core)',
  [T.PIERNA_A]: 'Pierna A (Fuerza Unilateral + Plyo)',
  [T.CARRERA_PISTA]: 'Carrera Calidad / Series Pista',
  [T.TORSO_B]: 'Torso B (Tracción + Hombro)',
  [T.AGILIDAD]: 'Reatletización COD & Cadena Posterior',
  [T.RODAJE]: 'Rodaje Aeróbico + Pilar',
  [T.PIERNA_B]: 'Pierna B (Cadera, Isométricos & Core)',
}

export default function GenerarSemanaModal({
  lunes,
  rodilla,
  onGenerar,
  onClose,
}) {
  const [dias, setDias] = useState(5)
  const [hayCarrera, setHayCarrera] = useState(false)
  const [segundoSuperior, setSegundoSuperior] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const preview = useMemo(() => {
    try {
      const comp = composicionSemana({ dias, hayCarrera, segundoSuperior })
      return fechasDeSemana(lunes, comp)
    } catch {
      return []
    }
  }, [lunes, dias, hayCarrera, segundoSuperior])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGenerando(true)
    setError('')
    try {
      await onGenerar({
        lunes,
        dias,
        hayCarrera,
        segundoSuperior,
        sobreescribir: true,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo generar la planificación semanal')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#EE8641]">
              <Sparkles size={13} /> Planificador inteligente
            </span>
            <h3 className="text-[22px] font-light text-[#1E2433] leading-tight mt-0.5">
              Configurar semana ({formatCorto(lunes)})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563]"
          >
            <X size={18} />
          </button>
        </div>

        {rodilla && (
          <p className="text-xs text-[#6B7280] bg-[#F5F5F7] rounded-xl px-3.5 py-2.5 mb-4">
            Adaptado a <strong className="text-[#1E2433]">Fase {rodilla.fase_id} ({rodilla.nombre})</strong> · Impacto máx. nivel {rodilla.impacto_max}. Las sesiones ya completadas de esta semana se conservan intactas.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-2">
              Días disponibles para entrenar
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDias(n)}
                  className={`h-11 rounded-full text-sm font-semibold border transition ${
                    dias === n
                      ? 'bg-[#242938] text-white border-[#242938]'
                      : 'bg-white text-[#1E2433] border-[#D1D5DB] hover:bg-[#F5F5F7]'
                  }`}
                >
                  {n} días
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between bg-[#F5F5F7] rounded-2xl px-4 py-3 cursor-pointer">
              <div className="pr-3">
                <span className="text-sm font-medium text-[#1E2433] block">
                  2º día de tren superior
                </span>
                <span className="text-[11px] text-[#6B7280]">
                  Añade Torso B (Tracción) en lugar de un rodaje/accesorio
                </span>
              </div>
              <input
                type="checkbox"
                checked={segundoSuperior}
                onChange={(e) => setSegundoSuperior(e.target.checked)}
                className="w-5 h-5 accent-[#242938] rounded"
              />
            </label>

            <label className="flex items-center justify-between bg-[#F5F5F7] rounded-2xl px-4 py-3 cursor-pointer">
              <div className="pr-3">
                <span className="text-sm font-medium text-[#1E2433] block">
                  Semana de competición / test
                </span>
                <span className="text-[11px] text-[#6B7280]">
                  Descarga series intensas y agilidad para llegar fresco
                </span>
              </div>
              <input
                type="checkbox"
                checked={hayCarrera}
                onChange={(e) => setHayCarrera(e.target.checked)}
                className="w-5 h-5 accent-[#242938] rounded"
              />
            </label>
          </div>

          {/* Vista previa de la distribución */}
          <div className="border border-[#ECEEF2] rounded-2xl p-3.5 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
              <Calendar size={13} /> Distribución prevista
            </span>
            <div className="space-y-1.5">
              {preview.map((item) => (
                <div
                  key={item.fecha}
                  className="flex items-center justify-between text-xs py-1 border-b border-[#F3F4F6] last:border-b-0"
                >
                  <span className="capitalize text-[#6B7280] w-24">
                    {nombreDia(item.fecha)} {formatCorto(item.fecha)}
                  </span>
                  <span className="font-medium text-[#1E2433] text-right flex-1">
                    {PLANTILLA_NOMBRES[item.plantillaId] || `Plantilla #${item.plantillaId}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={generando}
            className="w-full h-12 rounded-full bg-[#242938] text-white text-sm font-semibold shadow-md hover:opacity-95 transition disabled:opacity-50"
          >
            {generando ? 'Generando sesiones...' : 'Generar plan semanal'}
          </button>
        </form>
      </div>
    </div>
  )
}
