import React from 'react';
import { Calendar, Dumbbell, Video, TrendingUp } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, activeSessionRunning }) {
  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'hoy', label: 'Entrenar', icon: Dumbbell, highlight: activeSessionRunning },
    { id: 'videos', label: 'Vídeos', icon: Video },
    { id: 'evolucion', label: 'Evolución', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1 max-w-md mx-auto">
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center w-16 py-1 transition-all duration-200 ${
                isActive ? 'text-amber-400 font-semibold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.highlight && (
                <span className="absolute -top-1 right-3 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
              <Icon size={22} strokeWidth={isActive ? 2.3 : 1.8} />
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
