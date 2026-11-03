import { useEffect, useState } from 'react'

const STEPS = ['3', '2', '1', 'GO']

/**
 * Overlay Harbiz "¡PREPÁRATE! VAMOS A EMPEZAR — 3, 2, 1, GO (PULSA PARA SALTAR)"
 * Solo aparece cuando el usuario pulsa voluntariamente "Iniciar entrenamiento".
 */
export default function PreparateOverlay({ onFinish }) {
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    if (stepIdx >= STEPS.length) {
      onFinish()
      return undefined
    }
    const timer = setTimeout(() => {
      setStepIdx((prev) => prev + 1)
    }, stepIdx === STEPS.length - 1 ? 550 : 800)
    return () => clearTimeout(timer)
  }, [stepIdx, onFinish])

  const label = STEPS[Math.min(stepIdx, STEPS.length - 1)]

  return (
    <button
      type="button"
      onClick={onFinish}
      className="fixed inset-0 z-50 w-full h-full bg-[#383E4C]/92 backdrop-blur-md text-white flex flex-col items-center justify-between py-24 px-6 select-none cursor-pointer focus:outline-none"
    >
      <div className="text-center space-y-5 mt-8">
        <p className="text-[32px] font-light tracking-[0.04em] uppercase text-white">
          ¡PREPÁRATE!
        </p>
        <p className="text-[17px] font-light tracking-[0.08em] uppercase text-white/90">
          VAMOS A EMPEZAR
        </p>
      </div>

      <div className="my-auto flex items-center justify-center">
        <span
          key={label}
          className="text-[96px] leading-none font-bold tracking-tight text-white transition-transform duration-200 scale-100"
        >
          {label}
        </span>
      </div>

      <p className="text-[14px] font-light tracking-[0.1em] uppercase text-white/80 mb-8">
        PULSA PARA SALTAR
      </p>
    </button>
  )
}
