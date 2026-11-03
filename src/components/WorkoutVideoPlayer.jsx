import { useRef, useState } from 'react'
import {
  X,
  Minimize2,
  Maximize2,
  ArrowUpDown,
  PictureInPicture2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PlaySquare as Youtube,
  Info,
} from 'lucide-react'
import {
  getExercisePoster,
  getYouTubeEmbedUrl,
  isDirectVideoExercise,
  isYouTubeExercise,
  GRUPO_LABELS,
  IMPACTO_LABELS,
} from '../lib/media'

/**
 * Reproductor Dual de Entrenamiento:
 * - mode === 'teatro': Panel oscuro superior (sticky/fixed en la parte alta del contenedor móvil)
 *   que respeta clips verticales 9:16 sin recortar cabeza ni pies, manteniendo las series desplazables debajo.
 * - mode === 'flotante': Mini-reproductor en esquina (intercambiable arriba-dcha / abajo-dcha con 1 toque)
 *   para no tapar jamás ningún campo de kg o repeticiones, más soporte PiP nativo.
 *
 * Se monta una única instancia por ejercicio para que al alternar Teatro <-> Flotante
 * el vídeo continúe reproduciéndose sin reiniciarse.
 */
export default function WorkoutVideoPlayer({
  ejercicio,
  mode = 'teatro',
  initialShowCue = false,
  onChangeMode,
  onClose,
}) {
  const videoRef = useRef(null)
  const [isVertical, setIsVertical] = useState(
    () => ejercicio?.video_origen === 'propio'
  )
  const [corner, setCorner] = useState('bottom-right') // 'bottom-right' | 'top-right'
  const [showCue, setShowCue] = useState(initialShowCue)
  const [failedVideoUrl, setFailedVideoUrl] = useState(null)

  if (!ejercicio) return null

  const directVideo = isDirectVideoExercise(ejercicio)
  const videoFailed = Boolean(directVideo && failedVideoUrl === ejercicio.video_url)
  const youtubeVideo = isYouTubeExercise(ejercicio)
  const ytEmbedUrl = youtubeVideo ? getYouTubeEmbedUrl(ejercicio.video_url, true) : null
  const posterUrl = getExercisePoster(ejercicio)
  const canNativePiP =
    directVideo &&
    !videoFailed &&
    typeof document !== 'undefined' &&
    Boolean(document.pictureInPictureEnabled)

  const handleNativePiP = async () => {
    const el = videoRef.current
    if (!el) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (el.requestPictureInPicture) {
        await el.requestPictureInPicture()
      }
    } catch {
      // Ignorar si el navegador rechaza PiP aún sin metadatos cargados
    }
  }

  const toggleCorner = () => {
    setCorner((prev) => (prev === 'bottom-right' ? 'top-right' : 'bottom-right'))
  }

  const isTheater = mode === 'teatro'

  const floatingPositionClass =
    corner === 'top-right'
      ? 'fixed top-16 right-3 z-50'
      : 'fixed bottom-28 right-3 z-50'

  const floatingSizeClass = isVertical ? 'w-32' : 'w-44'

  return (
    <>
      <div
        className={
          isTheater
            ? 'sticky top-0 z-40 w-full bg-[#161A24] text-white shadow-xl border-b border-white/10'
            : `${floatingPositionClass} ${floatingSizeClass} rounded-2xl bg-[#161A24] text-white shadow-2xl border border-white/15 overflow-hidden`
        }
      >
        {/* Barra superior de controles */}
        {isTheater ? (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#1E2330] border-b border-white/10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                {ejercicio.video_origen === 'propio' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EE8641]/20 text-[#F8B07E] text-[10px] font-semibold">
                    <Sparkles size={10} /> Mi vídeo
                  </span>
                ) : youtubeVideo ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-white/80 text-[10px] font-medium">
                    <Youtube size={11} /> YouTube
                  </span>
                ) : null}
                <span className="text-[10px] text-white/60 uppercase tracking-wider">
                  {GRUPO_LABELS[ejercicio.grupo] || ejercicio.grupo}
                </span>
              </div>
              <h4 className="text-[13px] font-semibold text-white truncate">
                {ejercicio.nombre}
              </h4>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onChangeMode('flotante')}
                className="px-2.5 py-1.5 rounded-full bg-white/12 hover:bg-white/20 text-[11px] font-medium text-white inline-flex items-center gap-1 transition"
                title="Minimizar a ventana flotante"
              >
                <Minimize2 size={12} />
                <span>Minimizar a flotante</span>
              </button>

              {canNativePiP && (
                <button
                  type="button"
                  onClick={handleNativePiP}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition"
                  title="Picture-in-Picture nativo"
                  aria-label="Activar Picture-in-Picture"
                >
                  <PictureInPicture2 size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition"
                aria-label="Cerrar reproductor"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-1.5 bg-[#1E2330]/95 border-b border-white/10">
            <button
              type="button"
              onClick={toggleCorner}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              title="Cambiar esquina arriba / abajo"
              aria-label="Cambiar esquina del reproductor flotante"
            >
              <ArrowUpDown size={12} />
            </button>

            <button
              type="button"
              onClick={() => onChangeMode('teatro')}
              className="px-1.5 py-0.5 rounded bg-white/12 hover:bg-white/22 text-[10px] font-medium text-white inline-flex items-center gap-1"
              title="Expandir a modo teatro"
            >
              <Maximize2 size={10} />
              <span>Teatro</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              aria-label="Cerrar vídeo flotante"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Escenario de vídeo */}
        <div
          className={
            isTheater
              ? 'w-full max-h-[41dvh] bg-[#0E1118] flex items-center justify-center overflow-hidden'
              : `w-full bg-[#0E1118] flex items-center justify-center overflow-hidden ${
                  isVertical ? 'aspect-[9/15]' : 'aspect-video'
                }`
          }
        >
          {directVideo && !videoFailed ? (
            <video
              ref={videoRef}
              src={ejercicio.video_url}
              poster={posterUrl || undefined}
              playsInline
              loop
              muted
              autoPlay
              controls={isTheater}
              onError={() => setFailedVideoUrl(ejercicio.video_url)}
              onClick={
                !isTheater
                  ? () => {
                      const el = videoRef.current
                      if (!el) return
                      if (el.paused) el.play().catch(() => {})
                      else el.pause()
                    }
                  : undefined
              }
              onLoadedMetadata={(e) => {
                const v = e.currentTarget
                if (v.videoHeight && v.videoWidth) {
                  setIsVertical(v.videoHeight > v.videoWidth)
                }
              }}
              className={
                isTheater
                  ? 'max-h-[41dvh] w-auto max-w-full object-contain mx-auto'
                  : 'w-full h-full object-contain'
              }
            />
          ) : ytEmbedUrl ? (
            <iframe
              src={ytEmbedUrl}
              title={`Demostración de ${ejercicio.nombre}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={
                isTheater
                  ? 'w-full aspect-video max-h-[40dvh]'
                  : 'w-full h-full aspect-video'
              }
            />
          ) : (
            <div className="p-5 text-center space-y-1.5">
              <Info size={22} className="mx-auto text-[#F8B07E]" />
              <p className="text-xs text-white/85 font-medium">
                {videoFailed
                  ? 'Clip local pendiente de generar en public/videos/rodilla'
                  : 'Sin clip de vídeo adjunto'}
              </p>
              {ejercicio.instrucciones && (
                <p className="text-[11px] text-white/65 max-w-xs mx-auto leading-relaxed">
                  {ejercicio.instrucciones}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Barra plegable de indicaciones técnicas en Modo Teatro */}
        {isTheater && (ejercicio.instrucciones || ejercicio.equipamiento != null) && (
          <div className="bg-[#1B202C] px-3.5 py-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowCue((prev) => !prev)}
              className="w-full flex items-center justify-between text-left text-[11.5px] text-white/85 font-medium"
            >
              <span className="truncate pr-2">
                {showCue
                  ? 'Claves técnicas y control de rodilla'
                  : ejercicio.instrucciones || 'Ver claves técnicas del ejercicio'}
              </span>
              {showCue ? (
                <ChevronUp size={15} className="shrink-0 text-white/60" />
              ) : (
                <ChevronDown size={15} className="shrink-0 text-white/60" />
              )}
            </button>

            {showCue && (
              <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/80 space-y-1.5 leading-relaxed">
                {ejercicio.instrucciones && <p>{ejercicio.instrucciones}</p>}
                <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10.5px] text-white/70">
                  {ejercicio.equipamiento && (
                    <span className="px-2 py-0.5 rounded-full bg-white/8">
                      Material: {ejercicio.equipamiento}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-white/8">
                    {IMPACTO_LABELS[ejercicio.impacto ?? 0]}
                  </span>
                  {ejercicio.unilateral === 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#EE8641]/20 text-[#F8B07E]">
                      Unilateral (Izq / Dcha)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Etiqueta compacta inferior en Modo Flotante */}
        {!isTheater && (
          <div className="px-2 py-1 bg-[#161A24] border-t border-white/10">
            <p className="text-[10px] text-white/85 truncate font-medium">
              {ejercicio.nombre}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
