import { useState } from 'react'
import { X, Calculator, AlertCircle } from 'lucide-react'
import {
  parseDecimal,
  parseEntero,
  estimar1RM,
  tablaPorcentajes,
  redondearA,
} from '../../shared/numeros'

export default function Calculadora1RM({
  ejercicioNombre,
  pesoInicial = '',
  repsInicial = '',
  onClose,
}) {
  const [peso, setPeso] = useState(pesoInicial !== null && pesoInicial !== undefined ? String(pesoInicial) : '')
  const [reps, setReps] = useState(repsInicial !== null && repsInicial !== undefined ? String(repsInicial) : '')

  const pesoNum = parseDecimal(peso)
  const repsNum = parseEntero(reps)
  const resultado =
    pesoNum && repsNum ? estimar1RM(pesoNum, repsNum) : null
  const filas = resultado ? tablaPorcentajes(resultado.valor) : []

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[88dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#EE8641]">
              <Calculator size={14} />
              <span>Calculadora Epley 1RM</span>
            </div>
            <h3 className="text-[20px] font-light text-[#1E2433] leading-snug mt-0.5">
              {ejercicioNombre || 'Estimación de carga máxima'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563]"
            aria-label="Cerrar calculadora"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Peso levantado (kg)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ej. 72,5"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              className="w-full h-12 rounded-2xl bg-[#F5F5F7] border border-[#E5E7EB] px-3.5 text-center text-lg font-semibold text-[#1E2433] focus:outline-none focus:border-[#242938]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Repeticiones (1–30)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej. 6"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full h-12 rounded-2xl bg-[#F5F5F7] border border-[#E5E7EB] px-3.5 text-center text-lg font-semibold text-[#1E2433] focus:outline-none focus:border-[#242938]"
            />
          </div>
        </div>

        {resultado ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#F5F5F7] border border-[#E5E7EB] p-4 text-center">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                1RM estimado
              </span>
              <p className="text-[32px] font-semibold text-[#1E2433] leading-tight mt-0.5">
                {resultado.valor}{' '}
                <span className="text-sm font-normal text-[#6B7280]">kg</span>
              </p>
              {!resultado.fiable && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                  <AlertCircle size={12} /> Con más de 10 reps la estimación es orientativa
                </p>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-[#4B5563] block mb-2">
                Cargas por porcentaje (redondeo a discos de 0,5 kg)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {filas.map(({ pct, kg }) => (
                  <div
                    key={pct}
                    className="rounded-xl border border-[#E5E7EB] bg-white p-2.5 text-center"
                  >
                    <span className="text-[11px] text-[#6B7280] font-medium block">
                      {pct}%
                    </span>
                    <span className="text-sm font-semibold text-[#1E2433]">
                      {redondearA(kg, 0.5)} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#6B7280] text-center py-4 bg-[#F5F5F7] rounded-2xl">
            Introduce peso (admite coma o punto decimal) y repeticiones para ver tu tabla de porcentajes.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full h-12 rounded-full bg-[#242938] text-white text-sm font-semibold"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
