import { useMemo, useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  Heart,
  Play,
  Plus,
  Sparkles,
  PlaySquare as Youtube,
  PictureInPicture2,
  X,
  Dumbbell,
} from 'lucide-react'
import {
  getExercisePoster,
  hasPlayableVideo,
  GRUPO_LABELS,
  IMPACTO_LABELS,
} from '../lib/media'

const CATEGORIAS = [
  { id: 'todos', label: 'Todos' },
  { id: 'propios', label: 'Mis Vídeos' },
  { id: 'core_iso', label: 'Core & Isométricos' },
  { id: 'pierna', label: 'Pierna & Cadera' },
  { id: 'plyo_cod', label: 'Pliometría & Agilidad' },
  { id: 'carrera', label: 'Carrera & Técnica' },
  { id: 'superior', label: 'Tren Superior' },
  { id: 'movilidad', label: 'Movilidad' },
]

function perteneceCategoria(ej, catId) {
  if (catId === 'todos') return true
  if (catId === 'propios') return ej.video_origen === 'propio'
  if (catId === 'core_iso') {
    return ej.grupo === 'core' || ej.tipo_registro === 'isometrico'
  }
  if (catId === 'pierna') {
    return [
      'cuadriceps',
      'isquios',
      'gluteo',
      'gemelo',
      'cuerpo_completo',
    ].includes(ej.grupo)
  }
  if (catId === 'plyo_cod') {
    return ej.grupo === 'pliometria' || ej.grupo === 'agilidad'
  }
  if (catId === 'carrera') return ej.grupo === 'carrera'
  if (catId === 'superior') {
    return ['pecho', 'espalda', 'hombro', 'biceps', 'triceps'].includes(ej.grupo)
  }
  if (catId === 'movilidad') return ej.grupo === 'movilidad'
  return true
}

export default function VideosView({
  ejercicios = [],
  cargando = false,
  onToggleFavorito,
  onOpenNuevoEjercicio,
  onOpenVideo,
}) {
  const [subTab, setSubTab] = useState('todos') // 'todos' | 'favoritos'
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [impactoMax, setImpactoMax] = useState(3)
  const [soloUnilateral, setSoloUnilateral] = useState(false)
  const [soloConVideo, setSoloConVideo] = useState(true)
  const [failedPosters, setFailedPosters] = useState({})

  const conteoPropios = useMemo(
    () => ejercicios.filter((e) => e.video_origen === 'propio').length,
    [ejercicios]
  )

  const conteoFavoritos = useMemo(
    () => ejercicios.filter((e) => Boolean(e.favorito || e.es_favorito)).length,
    [ejercicios]
  )

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return ejercicios
      .filter((ej) => {
        const esFav = Boolean(ej.favorito || ej.es_favorito)
        if (subTab === 'favoritos' && !esFav) return false
        if (soloConVideo && !hasPlayableVideo(ej)) return false
        if (!perteneceCategoria(ej, categoria)) return false
        if ((ej.impacto ?? 0) > impactoMax) return false
        if (soloUnilateral && ej.unilateral !== 1) return false
        if (q) {
          const texto = `${ej.nombre || ''} ${ej.grupo || ''} ${ej.patron || ''} ${
            ej.equipamiento || ''
          } ${ej.instrucciones || ''}`.toLowerCase()
          if (!texto.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        // Priorizar vídeos personales reales primero cuando se navega en general
        const pA = a.video_origen === 'propio' ? 0 : hasPlayableVideo(a) ? 1 : 2
        const pB = b.video_origen === 'propio' ? 0 : hasPlayableVideo(b) ? 1 : 2
        if (pA !== pB) return pA - pB
        return (a.nombre || '').localeCompare(b.nombre || '', 'es')
      })
  }, [
    ejercicios,
    subTab,
    soloConVideo,
    categoria,
    impactoMax,
    soloUnilateral,
    busqueda,
  ])

  const filtrosActivos =
    impactoMax < 3 || soloUnilateral || !soloConVideo

  return (
    <div className="px-4 pb-28 pt-1 space-y-4">
      {/* Cabecera estilo Harbiz (sheet_4.jpg arriba) */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-[31px] font-light tracking-tight text-[#1E2433] leading-[1.15]">
          Vídeos
        </h1>
        <button
          type="button"
          onClick={onOpenNuevoEjercicio}
          className="h-9 px-3.5 rounded-full bg-[#242938] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs hover:opacity-95 transition"
        >
          <Plus size={15} />
          <span>Añadir</span>
        </button>
      </div>

      {/* Pestañas subrayadas Harbiz: Todos | Favoritos */}
      <div className="flex items-center gap-6 border-b border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => setSubTab('todos')}
          className={`pb-2.5 text-[14px] relative transition ${
            subTab === 'todos'
              ? 'font-semibold text-[#1E2433]'
              : 'font-normal text-[#6B7280]'
          }`}
        >
          Todos
          {subTab === 'todos' && (
            <span className="absolute left-0 right-0 -bottom-[1px] h-[2.5px] rounded-full bg-[#EE8641]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('favoritos')}
          className={`pb-2.5 text-[14px] relative inline-flex items-center gap-1.5 transition ${
            subTab === 'favoritos'
              ? 'font-semibold text-[#1E2433]'
              : 'font-normal text-[#6B7280]'
          }`}
        >
          <span>Favoritos</span>
          {conteoFavoritos > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#FEF0E6] text-[#EE6B2F] text-[10.5px] font-semibold leading-none">
              {conteoFavoritos}
            </span>
          )}
          {subTab === 'favoritos' && (
            <span className="absolute left-0 right-0 -bottom-[1px] h-[2.5px] rounded-full bg-[#EE8641]" />
          )}
        </button>
      </div>

      {/* Buscador + Botón de filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar ejercicio, material o patrón..."
            className="w-full h-10 pl-9 pr-8 rounded-full bg-white border border-[#E5E7EB] text-[13px] text-[#1E2433] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#242938]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1E2433]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMostrarFiltros((v) => !v)}
          aria-label="Filtrar ejercicios"
          className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition ${
            mostrarFiltros || filtrosActivos
              ? 'bg-[#242938] border-[#242938] text-white'
              : 'bg-white border-[#E5E7EB] text-[#4B5563]'
          }`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Panel plegable de filtros clínicos / biomecánicos */}
      {mostrarFiltros && (
        <div className="bg-white rounded-2xl p-3.5 border border-[#ECEEF2] shadow-2xs space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
              Impacto máximo en rodilla
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 3, label: 'Todos' },
                { val: 0, label: '0 · Cero' },
                { val: 1, label: '≤1 · Bajo' },
                { val: 2, label: '≤2 · Medio' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setImpactoMax(opt.val)}
                  className={`py-1.5 px-2 rounded-full text-[11px] font-medium transition ${
                    impactoMax === opt.val
                      ? 'bg-[#242938] text-white'
                      : 'bg-[#F5F5F7] text-[#4B5563]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F1F3F6]">
            <button
              type="button"
              onClick={() => setSoloUnilateral((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                soloUnilateral
                  ? 'bg-[#FEF0E6] text-[#EE6B2F] border border-[#F4985C]/50'
                  : 'bg-[#F5F5F7] text-[#4B5563]'
              }`}
            >
              Solo unilaterales (Izq/Dcha)
            </button>

            <button
              type="button"
              onClick={() => setSoloConVideo((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                !soloConVideo
                  ? 'bg-[#242938] text-white'
                  : 'bg-[#F5F5F7] text-[#4B5563]'
              }`}
            >
              {soloConVideo ? 'Mostrar también sin clip' : 'Mostrando catálogo completo'}
            </button>
          </div>
        </div>
      )}

      {/* Píldoras horizontales de categoría */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
        {CATEGORIAS.map((cat) => {
          const activa = categoria === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoria(cat.id)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[12px] font-medium inline-flex items-center gap-1.5 transition ${
                activa
                  ? 'bg-[#242938] text-white shadow-2xs'
                  : 'bg-white text-[#4B5563] border border-[#E5E7EB]'
              }`}
            >
              {cat.id === 'propios' && (
                <Sparkles
                  size={12}
                  className={activa ? 'text-[#F8B07E]' : 'text-[#EE8641]'}
                />
              )}
              <span>{cat.label}</span>
              {cat.id === 'propios' && conteoPropios > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activa ? 'bg-white/15 text-white' : 'bg-[#F5F5F7] text-[#1E2433]'
                  }`}
                >
                  {conteoPropios}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Contador sutil */}
      <div className="flex items-center justify-between text-[11.5px] text-[#6B7280]">
        <span>
          {listaFiltrada.length}{' '}
          {listaFiltrada.length === 1 ? 'ejercicio disponible' : 'ejercicios disponibles'}
        </span>
        {soloConVideo && ejercicios.length > listaFiltrada.length && busqueda && (
          <button
            type="button"
            onClick={() => setSoloConVideo(false)}
            className="text-[#EE6B2F] font-medium hover:underline"
          >
            Buscar también sin vídeo
          </button>
        )}
      </div>

      {/* Listado de tarjetas de vídeo estilo Harbiz (sheet_4.jpg arriba) */}
      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#ECEEF2] overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-[#E5E7EB]" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 w-2/3 bg-[#E5E7EB] rounded" />
                <div className="h-3 w-1/3 bg-[#F0F2F5] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-[#ECEEF2] text-center space-y-2.5">
          <Dumbbell size={26} className="mx-auto text-[#9CA3AF]" />
          <p className="text-[14px] font-medium text-[#1E2433]">
            {subTab === 'favoritos'
              ? 'Todavía no tienes vídeos marcados como favoritos'
              : 'No hay ejercicios que coincidan con este filtro'}
          </p>
          <p className="text-xs text-[#6B7280]">
            {subTab === 'favoritos'
              ? 'Pulsa el icono del corazón en cualquier vídeo para guardarlo aquí a mano.'
              : 'Prueba otra categoría o añade un ejercicio personalizado con enlace de YouTube o MP4.'}
          </p>
          {soloConVideo && subTab === 'todos' && (
            <button
              type="button"
              onClick={() => setSoloConVideo(false)}
              className="mt-1 px-4 py-2 rounded-full bg-[#F5F5F7] text-xs font-semibold text-[#1E2433]"
            >
              Ver también ejercicios sin vídeo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {listaFiltrada.map((ej) => {
            const poster = getExercisePoster(ej)
            const showPoster = Boolean(poster && !failedPosters[ej.id])
            const playable = hasPlayableVideo(ej)
            const esPropio = ej.video_origen === 'propio'
            const esYoutube = ej.video_origen === 'youtube'
            const esFav = Boolean(ej.favorito || ej.es_favorito)

            return (
              <article
                key={ej.id}
                className="bg-white rounded-2xl overflow-hidden border border-[#ECEEF2] shadow-2xs"
              >
                {/* Escenario 16:9 oscuro */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenVideo(ej, 'teatro', !playable)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onOpenVideo(ej, 'teatro', !playable)
                    }
                  }}
                  className="relative aspect-video bg-[#1B1F2B] flex items-center justify-center overflow-hidden cursor-pointer group"
                >
                  {showPoster ? (
                    <img
                      src={poster}
                      alt={ej.nombre}
                      loading="lazy"
                      onError={() =>
                        setFailedPosters((prev) => ({ ...prev, [ej.id]: true }))
                      }
                      className={`w-full h-full transition-transform duration-300 group-hover:scale-[1.02] ${
                        esPropio ? 'object-contain bg-[#141720]' : 'object-cover'
                      }`}
                    />
                  ) : (
                    <div className="text-center px-6">
                      <p className="text-xs font-medium text-white/75">
                        {GRUPO_LABELS[ej.grupo] || ej.grupo}
                      </p>
                      {ej.instrucciones && (
                        <p className="text-[11px] text-white/50 mt-1 line-clamp-2">
                          {ej.instrucciones}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Sombra sutil y botón central Play */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/15 flex items-center justify-center">
                    <span className="w-12 h-12 rounded-full bg-white/88 backdrop-blur-xs flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Play
                        size={19}
                        strokeWidth={1.9}
                        className="text-[#1E2433] translate-x-[1px]"
                      />
                    </span>
                  </div>

                  {/* Insignia origen arriba izquierda */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {esPropio ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#242938]/90 text-white text-[10.5px] font-semibold backdrop-blur-xs">
                        <Sparkles size={11} className="text-[#F8B07E]" />
                        Mi vídeo
                      </span>
                    ) : esYoutube ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 text-white/90 text-[10.5px] font-medium backdrop-blur-xs">
                        <Youtube size={11} />
                        YouTube
                      </span>
                    ) : null}
                  </div>

                  {/* Botón Corazón Favorito arriba derecha */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorito?.(ej.id)
                    }}
                    aria-label={
                      esFav ? 'Quitar de favoritos' : 'Añadir a favoritos'
                    }
                    className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center shadow-xs hover:bg-white transition"
                  >
                    <Heart
                      size={16}
                      className={
                        esFav
                          ? 'text-[#EE6B2F] fill-[#EE6B2F]'
                          : 'text-[#374151]'
                      }
                    />
                  </button>
                </div>

                {/* Pie de tarjeta con metadatos y botón directo a Flotante */}
                <div className="p-3.5 flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14.5px] font-medium text-[#1E2433] leading-snug">
                      {ej.nombre}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#4B5563] text-[10.5px] font-medium">
                        {GRUPO_LABELS[ej.grupo] || ej.grupo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#6B7280] text-[10.5px]">
                        {IMPACTO_LABELS[ej.impacto ?? 0]}
                      </span>
                      {ej.tipo_registro === 'isometrico' && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[10.5px] font-medium">
                          Isométrico
                        </span>
                      )}
                      {ej.unilateral === 1 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF0E6] text-[#EE6B2F] text-[10.5px] font-medium">
                          Unilateral
                        </span>
                      )}
                    </div>
                  </div>

                  {playable && (
                    <button
                      type="button"
                      onClick={() => onOpenVideo(ej, 'flotante', false)}
                      title="Abrir en mini-ventana flotante"
                      className="shrink-0 h-8 px-2.5 rounded-full bg-[#F5F5F7] hover:bg-[#E7E9EF] text-[#1E2433] text-[11px] font-medium inline-flex items-center gap-1 transition"
                    >
                      <PictureInPicture2 size={13} />
                      <span>Flotante</span>
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
