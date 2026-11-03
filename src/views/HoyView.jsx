import React, { useState, useEffect } from 'react';
import { 
  Play, Square, Check, Calculator, TrendingUp, AlertCircle, ChevronDown, 
  ChevronUp, RotateCcw, Video, Flame, CheckCircle2 
} from 'lucide-react';
import Calculadora1RM from '../components/Calculadora1RM';
import HistoricoModal from '../components/HistoricoModal';

export default function HoyView({ 
  sesionActual, 
  onTerminarSesion, 
  onCancelarSesion 
}) {
  const [segundos, setSegundos] = useState(0);
  const [timerActivo, setTimerActivo] = useState(true);
  const [modal1RM, setModal1RM] = useState(false);
  const [modalHistorico, setModalHistorico] = useState(null);
  const [confirmarTerminar, setConfirmarTerminar] = useState(false);
  const [molestiaDurante, setMolestiaDurante] = useState(1);
  const [molestiaDespues, setMolestiaDespues] = useState(1);
  const [guardando, setGuardando] = useState(false);

  // Estado local para los ejercicios y sus series marcadas
  const [ejercicios, setEjercicios] = useState([]);

  useEffect(() => {
    // Si viene de una sesión seleccionada, mapear sus ejercicios o mock estructurado
    if (sesionActual?.ejercicios?.length > 0) {
      setEjercicios(sesionActual.ejercicios);
    } else {
      // Mock realista con superseries y bloques idéntico a Harbiz
      setEjercicios([
        {
          id: 1,
          bloque: 'Preparación del pilar',
          superserie: 1,
          nombre: 'Dorsiflexión tobillo en pared',
          objetivo: '2 rondas x 8+8',
          descanso: 45,
          desplegado: true,
          series: [
            { ronda: 1, reps: 8, peso: 0, hecha: true },
            { ronda: 2, reps: 8, peso: 0, hecha: false }
          ]
        },
        {
          id: 2,
          bloque: 'Preparación del pilar',
          superserie: 1,
          nombre: 'Half Kneeling Wall Hip Rotations',
          objetivo: '2 rondas x 6+6',
          descanso: 60,
          desplegado: true,
          series: [
            { ronda: 1, reps: 6, peso: 0, hecha: true },
            { ronda: 2, reps: 6, peso: 0, hecha: false }
          ]
        },
        {
          id: 3,
          bloque: 'Bloque plyo (Impacto controlado)',
          superserie: null,
          nombre: 'Salto unilateral a cajón 20 cm (Box Jump)',
          objetivo: '3 series x 5+5 | RPE 7.5',
          descanso: 90,
          desplegado: true,
          series: [
            { ronda: 1, reps: 5, peso: 0, hecha: false },
            { ronda: 2, reps: 5, peso: 0, hecha: false },
            { ronda: 3, reps: 5, peso: 0, hecha: false }
          ]
        },
        {
          id: 4,
          bloque: 'Bloque de fuerza unilateral',
          superserie: null,
          nombre: 'Sentadilla trasera asimétrica / Goblet',
          objetivo: '4 series x 6-8 | RPE 8.5',
          descanso: 120,
          desplegado: true,
          series: [
            { ronda: 1, reps: 8, peso: 60, hecha: false },
            { ronda: 2, reps: 8, peso: 65, hecha: false },
            { ronda: 3, reps: 6, peso: 70, hecha: false },
            { ronda: 4, reps: 6, peso: 70, hecha: false }
          ]
        },
        {
          id: 5,
          bloque: 'Accesorios de rodilla',
          superserie: 2,
          nombre: 'Hamstring Bridge unilateral ISO PUSH',
          objetivo: '3 series x 3+3 (5s máx) | RPE 9',
          descanso: 75,
          desplegado: true,
          series: [
            { ronda: 1, reps: 3, peso: 0, hecha: false },
            { ronda: 2, reps: 3, peso: 0, hecha: false },
            { ronda: 3, reps: 3, peso: 0, hecha: false }
          ]
        },
        {
          id: 6,
          bloque: 'Accesorios de rodilla',
          superserie: 2,
          nombre: 'Lateral Squat Goblet (Sentadilla lateral)',
          objetivo: '3 series x 8+8 | RPE 7.5',
          descanso: 45,
          desplegado: true,
          series: [
            { ronda: 1, reps: 8, peso: 16, hecha: false },
            { ronda: 2, reps: 8, peso: 16, hecha: false },
            { ronda: 3, reps: 8, peso: 16, hecha: false }
          ]
        }
      ]);
    }
  }, [sesionActual]);

  // Cronómetro activo segundo a segundo
  useEffect(() => {
    let interval = null;
    if (timerActivo) {
      interval = setInterval(() => setSegundos((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActivo]);

  const toggleCheckSerie = (ejercicioId, indexSerie) => {
    setEjercicios((prev) =>
      prev.map((ej) => {
        if (ej.id !== ejercicioId) return ej;
        const nuevasSeries = [...ej.series];
        nuevasSeries[indexSerie] = {
          ...nuevasSeries[indexSerie],
          hecha: !nuevasSeries[indexSerie].hecha
        };
        return { ...ej, series: nuevasSeries };
      })
    );
  };

  const actualizarValorSerie = (ejercicioId, indexSerie, campo, valor) => {
    setEjercicios((prev) =>
      prev.map((ej) => {
        if (ej.id !== ejercicioId) return ej;
        const nuevasSeries = [...ej.series];
        nuevasSeries[indexSerie] = {
          ...nuevasSeries[indexSerie],
          [campo]: valor
        };
        return { ...ej, series: nuevasSeries };
      })
    );
  };

  const formatTiempo = (totalSeg) => {
    const m = String(Math.floor(totalSeg / 60)).padStart(2, '0');
    const s = String(totalSeg % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFinalizarEntreno = async () => {
    setGuardando(true);
    try {
      await onTerminarSesion({
        duracion_s: segundos,
        molestia_durante: molestiaDurante,
        molestia_despues: molestiaDespues,
        ejercicios_registrados: ejercicios
      });
    } catch (e) {
      console.error(e);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="pb-24 pt-1">
      {/* Barra superior de sesión con cronómetro en vivo */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 py-3 px-2 flex justify-between items-center -mx-2 mb-4">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
            Sesión en curso
          </span>
          <h2 className="text-sm font-black text-slate-100 truncate max-w-[200px]">
            {sesionActual?.titulo || 'Día 2: Pierna ACL & Pliometría'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Cronómetro */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl font-mono text-amber-400 font-bold text-sm shadow-inner">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {formatTiempo(segundos)}
          </div>

          <button
            onClick={() => setConfirmarTerminar(true)}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition"
          >
            Terminar
          </button>
        </div>
      </div>

      {/* Lista de bloques y ejercicios */}
      <div className="space-y-4">
        {ejercicios.map((ej) => (
          <div 
            key={ej.id} 
            className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-xl transition"
          >
            {/* Header del Bloque o Superserie */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {ej.bloque}
              </span>
              {ej.superserie && (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase font-mono">
                  Superserie x{ej.superserie}
                </span>
              )}
            </div>

            {/* Ejercicio: Miniatura + Título + Iconos de Acción */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-100 text-base leading-tight">
                  {ej.nombre}
                </h3>
                <p className="text-xs text-amber-400/90 font-mono mt-1 font-semibold">
                  {ej.objetivo} · {ej.descanso}s descanso
                </p>
              </div>

              {/* Botones de acción rápida: Gráfica Histórico y Calculadora 1RM */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setModalHistorico(ej.nombre)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-xl transition border border-slate-700/50"
                  title="Ver histórico de pesos"
                >
                  <TrendingUp size={16} />
                </button>
                <button
                  onClick={() => setModal1RM(true)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-xl transition border border-slate-700/50"
                  title="Calculadora 1RM"
                >
                  <Calculator size={16} />
                </button>
              </div>
            </div>

            {/* Tabla de inserción de marcas (Series, Reps, Kg y Check) */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 uppercase font-mono mb-1.5 px-1">
                <span className="col-span-2 text-center">Serie</span>
                <span className="col-span-4 text-center">Reps</span>
                <span className="col-span-4 text-center">Peso (kg)</span>
                <span className="col-span-2 text-center">Hecha</span>
              </div>

              <div className="space-y-2">
                {ej.series.map((s, idx) => (
                  <div 
                    key={idx} 
                    className={`grid grid-cols-12 gap-2 items-center p-1.5 rounded-xl border transition ${
                      s.hecha 
                        ? 'bg-emerald-950/20 border-emerald-500/30' 
                        : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    <span className="col-span-2 text-center font-mono font-bold text-xs text-slate-300">
                      #{s.ronda}
                    </span>

                    <input
                      type="number"
                      value={s.reps || ''}
                      onChange={(e) => actualizarValorSerie(ej.id, idx, 'reps', parseInt(e.target.value, 10))}
                      placeholder="Reps"
                      className="col-span-4 bg-slate-900 border border-slate-700/60 rounded-lg py-1.5 px-2 text-center font-mono text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    />

                    <input
                      type="number"
                      step="0.5"
                      value={s.peso ?? ''}
                      onChange={(e) => actualizarValorSerie(ej.id, idx, 'peso', parseFloat(e.target.value))}
                      placeholder="Kg"
                      className="col-span-4 bg-slate-900 border border-slate-700/60 rounded-lg py-1.5 px-2 text-center font-mono text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    />

                    <div className="col-span-2 flex justify-center">
                      <button
                        onClick={() => toggleCheckSerie(ej.id, idx)}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${
                          s.hecha
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botón flotante inferior para finalizar */}
      <div className="fixed bottom-16 left-0 right-0 p-3 max-w-md mx-auto z-20">
        <button
          onClick={() => setConfirmarTerminar(true)}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 transition"
        >
          <Square size={16} fill="currentColor" /> Terminar Sesión
        </button>
      </div>

      {/* Modal de confirmación y reporte de rodilla al terminar */}
      {confirmarTerminar && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="text-center">
              <span className="text-3xl block mb-2">🏁</span>
              <h3 className="font-extrabold text-xl text-slate-100">¿Terminar Entrenamiento?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Tiempo total registrado: <span className="font-mono text-amber-400 font-bold">{formatTiempo(segundos)}</span>
              </p>
            </div>

            {/* Check clínico de rodilla */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-slate-300">Molestia durante la sesión:</span>
                  <span className="font-mono text-amber-400 font-bold">{molestiaDurante}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={molestiaDurante}
                  onChange={(e) => setMolestiaDurante(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-slate-300">Sensación final al terminar:</span>
                  <span className="font-mono text-amber-400 font-bold">{molestiaDespues}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={molestiaDespues}
                  onChange={(e) => setMolestiaDespues(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleFinalizarEntreno}
                disabled={guardando}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
              >
                {guardando ? 'Guardando en la nube...' : 'Guardar y Completar'}
              </button>

              <button
                onClick={() => setConfirmarTerminar(false)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
              >
                Continuar entrenando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales secundarios */}
      {modal1RM && <Calculadora1RM onClose={() => setModal1RM(false)} />}
      {modalHistorico && (
        <HistoricoModal 
          ejercicioNombre={modalHistorico} 
          onClose={() => setModalHistorico(null)} 
        />
      )}
    </div>
  );
}
