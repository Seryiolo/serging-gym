import React, { useState } from 'react';
import { X, Calculator } from 'lucide-react';

export default function Calculadora1RM({ onClose }) {
  const [peso, setPeso] = useState('');
  const [reps, setReps] = useState('');
  const [rm, setRm] = useState(null);

  const calcular = (e) => {
    e.preventDefault();
    const p = parseFloat(peso);
    const r = parseInt(reps, 10);
    if (!p || !r || p <= 0 || r <= 0) return;

    // Fórmula de Epley: 1RM = Peso * (1 + Reps/30)
    const estimado = r === 1 ? p : Math.round(p * (1 + r / 30) * 10) / 10;
    setRm(estimado);
  };

  const porcentajes = [100, 95, 90, 85, 80, 75, 70, 65, 60];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Calculator size={20} />
            <h3 className="font-bold text-lg text-slate-100">Calculadora 1RM</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Calcula el peso máximo orientativo que puedes levantar a una repetición a partir de tus series.
        </p>

        <form onSubmit={calcular} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.5"
                placeholder="Ej. 70"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-center font-mono text-lg focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reps realizadas</label>
              <input
                type="number"
                placeholder="Ej. 6"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-center font-mono text-lg focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
          >
            Calcular 1RM
          </button>
        </form>

        {rm !== null && (
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="text-center mb-4">
              <span className="text-xs text-slate-400 uppercase tracking-wider">1RM Teórico Estimado</span>
              <p className="text-3xl font-extrabold text-amber-400 font-mono mt-0.5">{rm} <span className="text-sm font-normal text-slate-400">kg</span></p>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 max-h-48 overflow-y-auto">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2 px-1">Tabla de porcentajes de trabajo</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {porcentajes.map((pct) => (
                  <div key={pct} className="bg-slate-900 border border-slate-800/60 rounded-lg p-1.5">
                    <span className="text-slate-400 font-mono">{pct}%</span>
                    <p className="font-bold text-slate-200 font-mono">{(rm * pct / 100).toFixed(1)} kg</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
