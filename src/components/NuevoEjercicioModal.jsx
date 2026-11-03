import { useState } from 'react'
import { X, Video, CheckCircle2 } from 'lucide-react'
import { extractYouTubeId, GRUPO_LABELS, IMPACTO_LABELS } from '../lib/media'

const GRUPOS = Object.entries(GRUPO_LABELS)

const TIPOS_REGISTRO = [
  { id: 'fuerza', label: 'Fuerza (Peso + Reps)' },
  { id: 'isometrico', label: 'Isométrico (Segundos + Peso opc.)' },
  { id: 'tiempo', label: 'Por tiempo (Segundos)' },
  { id: 'movilidad', label: 'Movilidad / Activación' },
  { id: 'carrera', label: 'Drill / Carrera' },
]

export default function NuevoEjercicioModal({ onCrear, onClose }) {
  const [nombre, setNombre] = useState('')
  const [grupo, setGrupo] = useState('cuadriceps')
  const [tipoRegistro, setTipoRegistro] = useState('fuerza')
  const [unilateral, setUnilateral] = useState(false)
  const [impacto, setImpacto] = useState(0)
  const [equipamiento, setEquipamiento] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const ytId = extractYouTubeId(videoUrl)
  const esPropio = videoUrl.trim().startsWith('/videos/') || /\.(mp4|webm)(\?|$)/i.test(videoUrl.trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Escribe un nombre para el ejercicio.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onCrear({
        nombre: nombre.trim(),
        grupo,
        tipo_registro: tipoRegistro,
        unilateral: unilateral ? 1 : 0,
        impacto: Number(impacto),
        equipamiento: equipamiento.trim() || undefined,
        instrucciones: instrucciones.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Error al crear el ejercicio')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#EE8641]">
              Catálogo personal
            </span>
            <h3 className="text-[22px] font-light text-[#1E2433] leading-tight">
              Añadir ejercicio o vídeo
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Nombre del ejercicio *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Spanish Squat isométrico con banda"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-11 bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl px-3.5 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Grupo principal
              </label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full h-11 bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl px-3 text-xs font-medium text-[#1E2433]"
              >
                {GRUPOS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Tipo de registro
              </label>
              <select
                value={tipoRegistro}
                onChange={(e) => setTipoRegistro(e.target.value)}
                className="w-full h-11 bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl px-3 text-xs font-medium text-[#1E2433]"
              >
                {TIPOS_REGISTRO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Impacto articular
              </label>
              <select
                value={impacto}
                onChange={(e) => setImpacto(Number(e.target.value))}
                className="w-full h-11 bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl px-3 text-xs font-medium text-[#1E2433]"
              >
                {[0, 1, 2, 3].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl} · {IMPACTO_LABELS[lvl]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Equipamiento
              </label>
              <input
                type="text"
                placeholder="Barra, KB, goma..."
                value={equipamiento}
                onChange={(e) => setEquipamiento(e.target.value)}
                className="w-full h-11 bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl px-3 text-sm text-[#1E2433]"
              />
            </div>
          </div>

          <label className="flex items-center justify-between bg-[#F5F5F7] rounded-xl px-3.5 py-2.5 cursor-pointer">
            <span className="text-xs font-medium text-[#1E2433]">
              Ejercicio unilateral (se ejecuta Izquierda y Derecha)
            </span>
            <input
              type="checkbox"
              checked={unilateral}
              onChange={(e) => setUnilateral(e.target.checked)}
              className="w-4 h-4 accent-[#242938]"
            />
          </label>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              URL de vídeo (YouTube o clip `/videos/...mp4`)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://youtu.be/... o /videos/mi-clip.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full h-11 bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl pl-9 pr-3 text-xs text-[#1E2433]"
              />
              <Video size={15} className="absolute left-3 top-3.5 text-[#6B7280]" />
            </div>
            {(ytId || esPropio) && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 size={12} />
                {ytId ? `Vídeo YouTube detectado (${ytId})` : 'Clip MP4 propio detectado'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Instrucciones biomecánicas / foco de rodilla
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Mantener tibia vertical, controlar bajada en 3s sin valgo..."
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              className="w-full bg-[#F5F5F7] border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#1E2433]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full h-12 rounded-full bg-[#242938] text-white text-sm font-semibold shadow-md hover:opacity-95 transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar ejercicio'}
          </button>
        </form>
      </div>
    </div>
  )
}
