import { useState } from 'react'
import { Play, Dumbbell, Activity, Shield, Flame } from 'lucide-react'
import { getExercisePoster, hasPlayableVideo, GRUPO_LABELS } from '../lib/media'

export default function ExerciseThumb({
  ejercicio,
  sizeClass = 'w-[88px] h-[88px]',
  showPlayOverlay = false,
  onClick,
  roundedClass = '',
}) {
  const [failedPosterUrl, setFailedPosterUrl] = useState(null)
  const poster = getExercisePoster(ejercicio)
  const imgFailed = Boolean(poster && failedPosterUrl === poster)
  const playable = hasPlayableVideo(ejercicio)
  const grupo = ejercicio?.grupo || 'fuerza'

  const renderFallbackIcon = () => {
    if (grupo === 'carrera') return <Activity size={24} className="text-[#EE8641]" />
    if (grupo === 'pliometria' || grupo === 'agilidad') {
      return <Flame size={24} className="text-[#EE8641]" />
    }
    if (grupo === 'movilidad' || grupo === 'core') {
      return <Shield size={24} className="text-[#5B708B]" />
    }
    return <Dumbbell size={24} className="text-[#5B708B]" />
  }

  const content = (
    <div
      className={`relative shrink-0 overflow-hidden bg-[#E9ECF2] flex items-center justify-center ${sizeClass} ${roundedClass}`}
    >
      {poster && !imgFailed ? (
        <img
          src={poster}
          alt={ejercicio?.nombre || 'Ejercicio'}
          loading="lazy"
          onError={() => setFailedPosterUrl(poster)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-1.5 select-none">
          {renderFallbackIcon()}
          <span className="text-[9px] font-medium text-[#6B7280] mt-1 leading-tight line-clamp-1">
            {GRUPO_LABELS[grupo] || 'Ejercicio'}
          </span>
        </div>
      )}

      {showPlayOverlay && (
        <div
          className={`absolute inset-0 flex items-center justify-center transition ${
            playable ? 'bg-black/12 group-hover:bg-black/22' : 'bg-black/5'
          }`}
        >
          <span className="w-10 h-10 rounded-full bg-white/75 backdrop-blur-xs flex items-center justify-center shadow-sm border border-white/60">
            <Play
              size={16}
              strokeWidth={1.8}
              className="text-[#1E2433] translate-x-[1px]"
            />
          </span>
        </div>
      )}

      {!showPlayOverlay && playable && ejercicio?.video_origen === 'propio' && (
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[#242938]/80 text-white text-[9px] font-medium leading-none">
          MP4
        </span>
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ver demostración de ${ejercicio?.nombre || 'ejercicio'}`}
        className="group relative shrink-0 focus:outline-none"
      >
        {content}
      </button>
    )
  }

  return content
}
