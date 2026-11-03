import React from 'react';
import { X, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function HistoricoModal({ ejercicioNombre, datos = [], onClose }) {
  // Datos fallback si aún no hay registros reales para este ejercicio
  const data = datos.length > 0 ? datos : [
    { fecha: '05/10', peso: 50 },
    { fecha: '12/10', peso: 55 },
    { fecha: '19/10', peso: 60 },
    { fecha: '26/10', peso: 65 },
    { fecha: '02/11', peso: 70 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <TrendingUp size={14} />
              <span>Evolución de fuerza</span>
            </div>
            <h3 className="font-bold text-lg text-slate-100">{ejercicioNombre}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Gráfica de área naranja idéntica a Harbiz */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 my-4 h-48">
          <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Peso máximo por día (kg)</span>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="fecha" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#fbbf24' }}
              />
              <Area type="monotone" dataKey="peso" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPeso)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Historial en lista */}
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          <span className="text-[11px] font-semibold text-slate-400 block px-1">Sesiones anteriores</span>
          {data.slice().reverse().map((s, idx) => (
            <div key={idx} className="flex justify-between items-center bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-xs">
              <span className="text-slate-300 font-medium">{s.fecha}</span>
              <span className="font-bold text-amber-400 font-mono text-sm">{s.peso} kg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
