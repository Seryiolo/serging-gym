import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Circle, Dumbbell, Activity, Plus } from 'lucide-react';

export default function AgendaView({ 
  sesiones = [], 
  fechaSeleccionada, 
  setFechaSeleccionada, 
  onIniciarSesion,
  onAbrirCarreraModal 
}) {
  const [vistaMensual, setVistaMensual] = useState(false);
  const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Calcular los 7 días de la semana actual basados en el lunes actual
  const getWeekDates = () => {
    const curr = new Date(fechaSeleccionada || '2026-11-09');
    const day = curr.getDay(); // 0 es domingo
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // ajustar a lunes
    const monday = new Date(curr.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  const weekDates = getWeekDates();
  const sesionDelDia = sesiones.find((s) => s.fecha === fechaSeleccionada);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header Agenda */}
      <div className="flex justify-between items-center pt-2 px-1">
        <div>
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Planificación Semanal</span>
          <h1 className="text-2xl font-black text-slate-100">Agenda</h1>
        </div>
        <button
          onClick={() => setVistaMensual(!vistaMensual)}
          className={`p-2.5 rounded-xl border transition ${
            vistaMensual ? 'bg-amber-500/20 border-amber-400 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
          title="Alternar vista mensual"
        >
          <CalendarIcon size={18} />
        </button>
      </div>

      {/* Selector Semanal estilo Harbiz (Píldoras L-M-X-J-V-S-D) */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3 shadow-lg">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-xs font-bold text-slate-300 font-mono">
            {weekDates[0].slice(5)} al {weekDates[6].slice(5)}
          </span>
          <div className="flex gap-1 text-slate-400">
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono">5 Días Activos</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {weekDates.map((fecha, idx) => {
            const esHoy = fecha === fechaSeleccionada;
            const tieneSesion = sesiones.some((s) => s.fecha === fecha);
            const sesion = sesiones.find((s) => s.fecha === fecha);
            const completada = sesion?.estado === 'completada';
            const diaNum = fecha.split('-')[2];

            return (
              <button
                key={fecha}
                onClick={() => setFechaSeleccionada(fecha)}
                className={`flex flex-col items-center py-2.5 rounded-xl transition duration-150 relative ${
                  esHoy
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className={`text-[10px] uppercase font-bold ${esHoy ? 'text-slate-900' : 'text-slate-400'}`}>
                  {diasSemana[idx]}
                </span>
                <span className="text-sm font-mono mt-0.5">{diaNum}</span>

                {/* Punto de estado idéntico a Harbiz */}
                {tieneSesion && (
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 rounded-full ${
                      completada ? 'bg-emerald-400' : esHoy ? 'bg-slate-950' : 'bg-amber-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tarjeta de sesión programada para el día seleccionado */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-mono">
            Entrenamiento de hoy ({fechaSeleccionada})
          </h2>
        </div>

        {sesionDelDia ? (
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300" />

            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full mb-2 font-mono">
                  {sesionDelDia.tipo.toUpperCase()}
                </span>
                <h3 className="text-lg font-black text-slate-100">{sesionDelDia.titulo}</h3>
              </div>

              {sesionDelDia.estado === 'completada' ? (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/50 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <CheckCircle2 size={14} /> Completado
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold bg-amber-950/50 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  <Circle size={10} fill="currentColor" /> Pendiente
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-2">
              {sesionDelDia.tipo === 'carrera'
                ? 'Sesión de calidad en pista / rodaje continuo. Pulsa abajo para registrar tiempos y ritmo.'
                : 'Sesión por bloques: Preparación del pilar, Fuerza principal, Superseries de accesorios.'}
            </p>

            <div className="mt-5 flex gap-2">
              {sesionDelDia.tipo === 'carrera' ? (
                <button
                  onClick={onAbrirCarreraModal}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Activity size={18} /> Registrar Tiempos de Carrera
                </button>
              ) : (
                <button
                  onClick={() => onIniciarSesion(sesionDelDia)}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Dumbbell size={18} /> Iniciar Entrenamiento
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8 text-center">
            <span className="text-3xl block mb-2">🧘</span>
            <h3 className="font-bold text-slate-200 text-base">Día de Descanso / Recuperación Activa</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Hoy no tienes sesión pesada programada. Aprovecha para descansar o hacer movilidad de rodilla.
            </p>
            <button
              onClick={onAbrirCarreraModal}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
            >
              <Plus size={14} /> Añadir carrera no programada
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
