import React from 'react';
import { ShieldCheck, User } from 'lucide-react';

export default function Header({ faseRodilla = 'Reatletización (Fase 1)', usuario = 'Sergio' }) {
  return (
    <header className="pt-2 pb-1 flex justify-between items-center border-b border-slate-800/80 mb-3 px-1">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md">
          <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center text-amber-400 font-black text-xs font-mono">
            {usuario[0]}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Buenos días</span>
          <h2 className="text-sm font-extrabold text-slate-100 leading-tight">{usuario}</h2>
        </div>
      </div>

      {/* Badge clínico de la rodilla */}
      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full px-2.5 py-1 text-[11px] font-mono shadow-sm">
        <ShieldCheck size={13} className="text-emerald-400" />
        <span className="text-slate-300 font-semibold">{faseRodilla}</span>
      </div>
    </header>
  );
}
