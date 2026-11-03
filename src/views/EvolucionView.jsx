import React, { useState } from 'react';
import { Plus, TrendingDown, Scale, Trash2, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function EvolucionView({ pesos = [], onRegistrarPeso }) {
  const [modalNuevoPeso, setModalNuevoPeso] = useState(false);
  const [nuevoPeso, setNuevoPeso] = useState('');
  const [fecha, setFecha] = useState('2026-11-03');

  const datosPeso = pesos.length > 0 ? pesos : [
    { fecha: '14/09', kg: 85.0 },
    { fecha: '28/09', kg: 84.4 },
    { fecha: '12/10', kg: 83.9 },
    { fecha: '26/10', kg: 83.5 },
    { fecha: '03/11', kg: 83.1 },
  ];

  const pesoActual = datosPeso[datosPeso.length - 1]?.kg || 83.1;
  const pesoInicial = datosPeso[0]?.kg || 85.0;
  const diferencia = (pesoActual - pesoInicial).toFixed(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(nuevoPeso);
    if (!val || val <= 30 || val >= 300) return;
    onRegistrarPeso({ fecha, kg: val });
    setModalNuevoPeso(false);
    setNuevoPeso('');
  };

  return (
    <div className="space-y-4 pb-20 pt-2">
      <div className="flex justify-between items-center px-1">
        <div>
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Métricas Físicas</span>
          <h1 className="text-2xl font-black text-slate-100">Evolución</h1>
        </div>
        <button
          onClick={() => setModalNuevoPeso(true)}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition"
        >
          <Plus size={16} /> Pesarme
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Actual</span>
          <span className="text-xl font-extrabold text-amber-400 font-mono">{pesoActual}</span>
          <span className="text-[10px] text-slate-500 block">kg</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Inicial</span>
          <span className="text-xl font-bold text-slate-200 font-mono">{pesoInicial}</span>
          <span className="text-[10px] text-slate-500 block">kg</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Cambio</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">{diferencia}</span>
          <span className="text-[10px] text-slate-500 block">kg</span>
        </div>
      </div>

      {/* Gráfica de peso corporal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
            Tendencia de Peso Corporal
          </span>
          <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-mono">
            ÚLTIMAS SEMANAS
          </span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datosPeso}>
              <defs>
                <linearGradient id="colorEvolucion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="fecha" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }}
                itemStyle={{ color: '#fbbf24' }}
              />
              <Area type="monotone" dataKey="kg" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEvolucion)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono px-1">
          Histórico de Pesajes
        </span>

        <div className="space-y-1.5">
          {datosPeso.slice().reverse().map((reg, idx) => (
            <div
              key={idx}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 flex justify-between items-center text-sm shadow-md"
            >
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar size={14} className="text-slate-500" />
                <span className="font-mono text-xs">{reg.fecha}</span>
              </div>
              <span className="font-mono font-bold text-amber-400 text-base">{reg.kg} kg</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal nuevo pesaje */}
      {modalNuevoPeso && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl">
            <h3 className="font-bold text-slate-100 text-base mb-1">Registrar Nuevo Peso</h3>
            <p className="text-xs text-slate-400 mb-4">Pésate preferiblemente en ayunas por la mañana.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Ej. 83.2"
                  value={nuevoPeso}
                  onChange={(e) => setNuevoPeso(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center font-mono text-xl text-amber-400 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 space-y-1.5">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setModalNuevoPeso(false)}
                  className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
