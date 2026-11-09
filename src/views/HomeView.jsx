import { useState } from 'react'
import {
  Zap,
  ChevronRight,
  Scale,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Play,
  Sparkles,
  Flag,
  ArrowUpDown,
} from 'lucide-react'
import { diasEntre, formatCorto, lunesDe, addDias } from '../../shared/fechas'
import { getExercisePoster, GRUPO_LABELS } from '../lib/media'

function obtenerSaludoMadrid() {
  try {
    const horaStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      hour12: false,
    }).format(new Date())
    const h = Number(horaStr)
    if (h >= 6 && h < 13) return 'Buenos días'
    if (h >= 13 && h < 21) return 'Buenas tardes'
    return 'Buenas noches'
  } catch {
    return 'Hola'
  }
}

export default function HomeView({
  hoy,
  user,
  rodilla,
  objetivos = [],
  sesionesMes = [],
  resumenSemana,
  videosDestacados = [],
  entrenosPendientesHinchazon = [],
  entrenoActivo = null,
  onReanudarWorkout,
  onDiscardWorkout,
  onOpenSessionPreview,
  onOpenPesoModal,
  onOpenCarreraModal,
  onOpenGenerarSemana,
  onOpenReorganizarSemana,
  onIrAgendaFecha,
  onGoToVideos,
  onGoToRodilla,
  onOpenVideo,
  onResponderHinchazon,
}) {
  const [failedPosters, setFailedPosters] = useState({})
  const saludo = obtenerSaludoMadrid()
  const primerNombre = (user?.nombre || 'Sergio').split(' ')[0]

  const lunesActual = lunesDe(hoy)
  const domingoActual = addDias(lunesActual, 6)

  const sesionesSemanaActual = sesionesMes.filter(
    (s) => s.fecha >= lunesActual && s.fecha <= domingoActual
  )
  const sesionesHoy = sesionesMes.filter((s) => s.fecha === hoy)
  const proximaSesionSemana =
    sesionesSemanaActual.find(
      (s) => s.fecha > hoy && s.estado === 'pendiente'
    ) ||
    sesionesMes
      .filter((s) => s.fecha >= hoy && s.estado === 'pendiente')
      .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]

  const objetivosFuturos = objetivos
    .map((o) => ({ ...o, faltanDias: diasEntre(hoy, o.fecha) }))
    .filter((o) => o.faltanDias >= 0)
    .sort((a, b) => a.faltanDias - b.faltanDias)

  const evaluacion = rodilla?.evaluacion
  const pendienteHinchazon = entrenosPendientesHinchazon[0] || null

  return (
    <div className="px-4 pb-28 pt-1 space-y-5">
      {/* Saludo principal estilo Harbiz (sheet_1.jpg) */}
      <section className="pt-1">
        <p className="text-[13px] text-[#4B5563] font-normal">
          {saludo}, <span className="font-semibold text-[#1E2433]">{primerNombre}</span>
        </p>
        <h1 className="text-[31px] font-light tracking-tight text-[#1E2433] leading-[1.15] mt-0.5">
          Plan de hoy
        </h1>
      </section>

      {/* Banner de sesión en curso o pausada */}
      {entrenoActivo && (
        <section className="bg-[#242938] text-white rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  entrenoActivo.enPausa ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                {entrenoActivo.enPausa ? 'Entrenamiento en pausa' : 'Entrenamiento en curso'}
              </span>
            </div>
            {entrenoActivo.enPausa && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-semibold">
                Guardado
              </span>
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-white">
              {entrenoActivo.sesion?.titulo || 'Sesión'}
            </h3>
            <p className="text-xs text-white/70 mt-0.5">
              Tus marcas y series introducidas se conservan intactas. Puedes reanudarla cuando quieras o descartarla.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onReanudarWorkout}
              className="h-10 rounded-full bg-[#EE8641] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-95 transition"
            >
              <Play size={14} className="fill-white" />
              Reanudar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    '¿Descartar este entrenamiento? No se guardará nada y NO contará para la progresión de 6 sesiones de tu rodilla.'
                  )
                ) {
                  onDiscardWorkout()
                }
              }}
              className="h-10 rounded-full bg-white/10 text-white/80 hover:text-red-300 text-xs font-semibold transition"
            >
              Descartar borrador
            </button>
          </div>
        </section>
      )}

      {/* Banner de inicio oficial del plan: 16 de noviembre de 2026 */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="w-8 h-8 rounded-full bg-[#EE8641] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Calendar size={17} />
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#EE6B2F]">
              Inicio de entrenamiento
            </span>
            <h2 className="text-[14.5px] font-semibold text-[#1E2433] leading-snug mt-0.5">
              El plan comienza el lunes 16 de noviembre de 2026
            </h2>
            <p className="text-xs text-[#6B7280] leading-relaxed mt-1">
              Tu semana de adaptación de rodilla (fuerza unilateral, torso y carrera de calidad) está lista a partir del 16 de noviembre. Puedes consultar el horario y reorganizar los días como mejor te convenga.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onIrAgendaFecha?.('2026-11-16')}
            className="h-10 px-3 rounded-full bg-[#242938] text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap hover:opacity-95 transition"
          >
            <Calendar size={13} className="shrink-0" />
            <span>Semana 16 nov</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenReorganizarSemana?.('2026-11-16')}
            className="h-10 px-3 rounded-full bg-white border border-[#D1D5DB] text-[#1E2433] text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap hover:bg-[#F5F5F7] transition"
          >
            <ArrowUpDown size={13} className="text-[#EE8641] shrink-0" />
            <span>Mover días</span>
          </button>
        </div>
      </section>

      {/* Aviso 24h de control de hinchazón post-entreno si hay sesión reciente pendiente */}
      {pendienteHinchazon && (
        <section className="bg-white rounded-2xl p-4 border border-[#F4985C]/45 shadow-xs space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#FEF0E6] text-[#EE6B2F] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={17} />
            </span>
            <div>
              <h2 className="text-[13.5px] font-semibold text-[#1E2433]">
                Control de rodilla al día siguiente
              </h2>
              <p className="text-xs text-[#6B7280] leading-relaxed mt-0.5">
                ¿Has notado hinchazón o derrame en la rodilla hoy tras la sesión anterior?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onResponderHinchazon({
                  entrenoId: pendienteHinchazon.id,
                  hinchazon: 0,
                })
              }
              className="h-10 rounded-full bg-[#242938] text-white text-xs font-semibold hover:opacity-95 transition"
            >
              Sin hinchazón
            </button>
            <button
              type="button"
              onClick={() =>
                onResponderHinchazon({
                  entrenoId: pendienteHinchazon.id,
                  hinchazon: 1,
                })
              }
              className="h-10 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition"
            >
              Sí, algo hinchada
            </button>
          </div>
        </section>
      )}

      {/* Tarjetas de "Plan de hoy" estilo Harbiz (icono circular a la izq + tarjeta blanca) */}
      <section className="space-y-3">
        {sesionesHoy.length > 0 ? (
          sesionesHoy.map((s) => {
            const completada = s.estado === 'completada'
            const esCarrera = s.tipo === 'carrera'
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpenSessionPreview(s.id)}
                className="w-full flex items-center gap-3 text-left group"
              >
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs ${
                    completada
                      ? 'bg-emerald-500'
                      : esCarrera
                      ? 'bg-[#38BDF8]'
                      : 'bg-[#F59E0B]'
                  }`}
                >
                  {completada ? (
                    <CheckCircle2 size={19} />
                  ) : esCarrera ? (
                    <Activity size={19} />
                  ) : (
                    <Zap size={19} />
                  )}
                </span>

                <div className="flex-1 bg-white rounded-xl px-4 py-3.5 border border-[#ECEEF2] shadow-2xs flex items-center justify-between min-w-0 group-hover:border-[#CFD4DC] transition">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-normal text-[#1E2433] truncate">
                        {s.titulo}
                      </h3>
                      {completada && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                          Hecho
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">
                      {esCarrera && !s.num_ejercicios
                        ? 'Sesión de carrera · Registrar ritmo'
                        : `${s.num_ejercicios || 0} ejercicios | ${s.num_bloques || 0} bloques`}
                    </p>
                  </div>
                  <ChevronRight
                    size={18}
                    strokeWidth={1.6}
                    className="text-[#6B7280] shrink-0"
                  />
                </div>
              </button>
            )
          })
        ) : sesionesSemanaActual.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 border border-[#ECEEF2] shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-[#EE8641]">
              <Calendar size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Semana sin configurar
              </span>
            </div>
            <p className="text-[13.5px] text-[#4B5563] leading-relaxed">
              Aún no has generado las sesiones de esta semana. Elige cuántos días puedes entrenar (4, 5 o 6) y la app adaptará fuerza, pliometría y carrera a tu fase actual de rodilla.
            </p>
            <button
              type="button"
              onClick={() => onOpenGenerarSemana(lunesActual)}
              className="w-full h-11 rounded-full bg-[#242938] text-white text-[13px] font-semibold shadow-xs hover:opacity-95 transition"
            >
              Generar plan de esta semana
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-medium text-[#1E2433]">
                Día libre / Recuperación activa
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {proximaSesionSemana
                  ? `Próxima sesión: ${proximaSesionSemana.titulo} (${formatCorto(
                      proximaSesionSemana.fecha
                    )})`
                  : 'Has completado las sesiones previstas hasta hoy.'}
              </p>
            </div>
            {proximaSesionSemana && (
              <button
                type="button"
                onClick={() => onOpenSessionPreview(proximaSesionSemana.id)}
                className="px-3.5 py-2 rounded-full bg-[#F5F5F7] text-xs font-semibold text-[#1E2433] shrink-0 hover:bg-[#E8EBF0] transition"
              >
                Ver próxima
              </button>
            )}
          </div>
        )}

        {/* Accesos rápidos de hoy: Registrar peso & Registrar carrera */}
        <button
          type="button"
          onClick={() => onOpenPesoModal(hoy)}
          className="w-full flex items-center gap-3 text-left group"
        >
          <span className="w-10 h-10 rounded-full bg-[#67C3F3] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Scale size={18} />
          </span>
          <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-[#ECEEF2] shadow-2xs flex items-center justify-between group-hover:border-[#CFD4DC] transition">
            <div>
              <h3 className="text-[14.5px] font-normal text-[#1E2433]">
                Registrar peso corporal
              </h3>
              <p className="text-[11.5px] text-[#6B7280]">
                {resumenSemana?.ultimoPesoKg
                  ? `Último registro: ${resumenSemana.ultimoPesoKg} kg`
                  : 'Registra y analiza tu evolución'}
              </p>
            </div>
            <ChevronRight size={18} strokeWidth={1.6} className="text-[#6B7280]" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenCarreraModal(null)}
          className="w-full flex items-center gap-3 text-left group"
        >
          <span className="w-10 h-10 rounded-full bg-[#EE8641] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Activity size={18} />
          </span>
          <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-[#ECEEF2] shadow-2xs flex items-center justify-between group-hover:border-[#CFD4DC] transition">
            <div>
              <h3 className="text-[14.5px] font-normal text-[#1E2433]">
                Registrar carrera o series
              </h3>
              <p className="text-[11.5px] text-[#6B7280]">
                {resumenSemana?.kmSemana > 0
                  ? `${resumenSemana.kmSemana} km acumulados esta semana`
                  : 'Anota distancia, tiempo, ritmo y rodilla'}
              </p>
            </div>
            <ChevronRight size={18} strokeWidth={1.6} className="text-[#6B7280]" />
          </div>
        </button>
      </section>

      {/* Tarjeta compacta: Estado de Rodilla & Próximo Objetivo */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="text-[21px] font-light text-[#1E2433] tracking-tight truncate">
            Resumen semanal
          </h2>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenReorganizarSemana?.(lunesActual)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#D8DCE3] text-[11.5px] font-semibold text-[#1E2433] shadow-2xs hover:bg-[#F5F5F7] transition whitespace-nowrap"
            >
              <ArrowUpDown size={12} className="text-[#EE8641] shrink-0" />
              <span>Mover días</span>
            </button>
            <button
              type="button"
              onClick={onGoToRodilla}
              className="px-2.5 py-1.5 rounded-full text-[11.5px] font-medium text-[#6B7280] hover:text-[#1E2433] whitespace-nowrap"
            >
              Detalles
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#ECEEF2] shadow-2xs space-y-4">
          {/* Métricas rápidas semana */}
          <div className="grid grid-cols-3 gap-2 pb-3 border-b border-[#F1F3F6] text-center">
            <div>
              <span className="text-[10.5px] text-[#6B7280] block">Sesiones</span>
              <span className="text-base font-semibold text-[#1E2433]">
                {resumenSemana?.sesionesCompletadas ?? 0}/
                {resumenSemana?.sesionesTotales ?? sesionesSemanaActual.length}
              </span>
            </div>
            <div className="border-x border-[#F1F3F6]">
              <span className="text-[10.5px] text-[#6B7280] block">Carrera sem.</span>
              <span className="text-base font-semibold text-[#1E2433]">
                {resumenSemana?.kmSemana ?? 0} km
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-[#6B7280] block">Fase rodilla</span>
              <span className="text-base font-semibold text-[#EE6B2F]">
                Fase {rodilla?.fase_id ?? 1}
              </span>
            </div>
          </div>

          {/* Progresión rodilla */}
          {rodilla && (
            <button
              type="button"
              onClick={onGoToRodilla}
              className="w-full text-left space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#1E2433] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#EE8641]" />
                  {rodilla.nombre}
                </span>
                {evaluacion?.objetivo > 0 && (
                  <span className="text-[11px] text-[#6B7280] tabular-nums">
                    {evaluacion.progreso}/{evaluacion.objetivo} sesiones estables
                  </span>
                )}
              </div>
              {evaluacion?.objetivo > 0 && (
                <div className="h-1.5 w-full bg-[#F0F2F5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EE8641] rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((evaluacion.progreso || 0) / evaluacion.objetivo) * 100)
                      )}%`,
                    }}
                  />
                </div>
              )}
              {evaluacion?.motivo && (
                <p className="text-[11.5px] text-[#6B7280] leading-snug">
                  {evaluacion.motivo}
                </p>
              )}
            </button>
          )}

          {/* Próximos objetivos de carrera (15k Abril / 21k Mayo) */}
          {objetivosFuturos.length > 0 && (
            <div className="pt-2 border-t border-[#F1F3F6] space-y-2">
              {objetivosFuturos.slice(0, 2).map((obj) => (
                <div
                  key={obj.id}
                  className="flex items-center justify-between text-xs bg-[#F8F9FB] rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Flag size={13} className="text-[#242938] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#1E2433] truncate">{obj.nombre}</p>
                      <p className="text-[10.5px] text-[#6B7280]">
                        {(obj.distancia_m / 1000).toFixed(
                          obj.distancia_m % 1000 === 0 ? 0 : 1
                        )}{' '}
                        km · {formatCorto(obj.fecha)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#242938] text-white text-[10.5px] font-semibold shrink-0">
                    {obj.faltanDias === 0 ? '¡Hoy!' : `Faltan ${obj.faltanDias} d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Carrusel horizontal "Vídeos" estilo Harbiz (sheet_1.jpg centro) */}
      {videosDestacados.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[25px] font-light text-[#1E2433] tracking-tight">
              Vídeos
            </h2>
            <button
              type="button"
              onClick={onGoToVideos}
              className="text-[12.5px] text-[#6B7280] hover:text-[#1E2433]"
            >
              Ver más
            </button>
          </div>

          <div className="flex gap-3.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 snap-x">
            {videosDestacados.map((vid) => {
              const poster = getExercisePoster(vid)
              const showImg = Boolean(poster && !failedPosters[vid.id])
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => onOpenVideo(vid, 'teatro', false)}
                  className="snap-start shrink-0 w-[265px] bg-white rounded-2xl overflow-hidden border border-[#ECEEF2] shadow-2xs text-left group"
                >
                  <div className="relative aspect-video bg-[#222632] flex items-center justify-center overflow-hidden">
                    {showImg ? (
                      <img
                        src={poster}
                        alt={vid.nombre}
                        loading="lazy"
                        onError={() =>
                          setFailedPosters((prev) => ({ ...prev, [vid.id]: true }))
                        }
                        className="w-full h-full object-contain bg-[#1C202B] group-hover:scale-[1.02] transition-transform"
                      />
                    ) : (
                      <span className="text-xs text-white/60">
                        {GRUPO_LABELS[vid.grupo] || vid.grupo}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                      <span className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-xs flex items-center justify-center shadow-sm">
                        <Play
                          size={16}
                          className="text-[#1E2433] translate-x-[1px]"
                        />
                      </span>
                    </div>
                    {vid.video_origen === 'propio' && (
                      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#242938]/85 text-white text-[10px] font-medium">
                        <Sparkles size={10} className="text-[#F8B07E]" /> Mi vídeo
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-[13.5px] font-medium text-[#1E2433] truncate">
                      {vid.nombre}
                    </h3>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 capitalize">
                      {GRUPO_LABELS[vid.grupo] || vid.grupo}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
