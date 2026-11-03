import React, { useState } from 'react';
import { X, Flame, Timer, Activity } from 'lucide-react';

export default function CarreraModal({ onGuardar, onClose }) {
  const [distanciaKm, setDistanciaKm] = useState('5.0');
  const [minutos, setMinutos] = useState('23');
  const [segundos, setSegundos] = useState('30');
  const [tipo, setTipo] = useState('rodaje');
  const [superficie, setSuperficie] = useState('pista');
  const [molestiaRodilla, setMolestiaRodilla] = useState(1);
  const [guardando, setGuardando] = useState(false);

  // Cálculo de ritmo en tiempo real: seg/km -> MM:SS
  const totalSegundos = (parseInt(minutos, 10) || 0) * 60 + (parseInt(segundos, 10) || 0);
  const dist = parseFloat(distanciaKm) || 0;
  const ritmoSegKm = dist > 0 ? Math.round(totalSegundos / dist) : 0;
  const ritmoMin = Math.floor(ritmoSegKm / 60);
  const ritmoSeg = ritmoSegKm % 60;
  const ritmoFormateado = dist > 0 ? `${ritmoMin}:${String(ritmoSeg).padStart(2, '0')} min/km` : '--:-- min/km';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dist || totalSegundos <= 0) return;
    setGuardando(true);
    try {
      await onGuardar({
        tipo,
        distancia_m: Math.round(dist * 1000),
        duracion_s: totalSegundos,
        superficie,
        molestia_rodilla: molestiaRodilla,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Activity size={20} />
            <h3 className="font-bold text-lg text-slate-100">Registrar Carrera / Pista</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Distancia (km)</label>
              <input
                type="number"
                step="0.01"
                required
                value={distanciaKm}
                onChange={(e) => setDistanciaKm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-center font-mono text-xl focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tiempo (min : seg)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2.5 text-slate-100 text-center font-mono text-lg focus:outline-none focus:border-amber-400"
                />
                <input
                  type="number"
                  placeholder="Seg"
                  value={segundos}
                  onChange={(e) => setSegundos(e.target.value)}
                  className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2.5 text-slate-100 text-center font-mono text-lg focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Ritmo calculado automáticamente */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs text-amber-300 flex items-center gap-1.5 font-medium">
              <Timer size={14} /> Ritmo medio calculado:
            </span>
            <span className="font-mono font-bold text-amber-400 text-lg">{ritmoFormateado}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de sesión</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="rodaje">Rodaje suave</option>
                <option value="series">Series / Intervalos</option>
                <option value="tempo">Tempo / Ritmo sostenido</option>
                <option value="fartlek">Fartlek</option>
                <option value="tirada_larga">Tirada larga</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Superficie</label>
              <select
                value={superficie}
                onChange={(e) => setSuperficie(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="pista">Pista de atletismo</option>
                <option value="asfalto">Asfalto</option>
                <option value="tierra">Tierra / Parque</option>
                <option value="cinta">Cinta de correr</option>
              </select>
            </div>
          </div>

          {/* Control clínico rodilla durante/después carrera */}
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Flame size={13} className={molestiaRodilla > 3 ? "text-red-400" : "text-emerald-400"} />
                Sensación / Molestia en rodilla (0-10)
              </label>
              <span className={`font-mono font-bold text-sm ${molestiaRodilla > 3 ? "text-red-400" : "text-emerald-400"}`}>
                {molestiaRodilla} / 10
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={molestiaRodilla}
              onChange={(e) => setMolestiaRodilla(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0 (Perfecta)</span>
              <span>2 (Aceptable)</span>
              <span>5+ (Alerta)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
          >
            {guardando ? 'Guardando...' : 'Guardar Carrera'}
          </button>
        </form>
      </div>
    </div>
  );
}
