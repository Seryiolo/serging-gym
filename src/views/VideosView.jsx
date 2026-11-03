import React, { useState } from 'react';
import { Search, Heart, Play, Film, Tag, Sparkles } from 'lucide-react';

export default function VideosView({ ejercicios = [] }) {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todos');
  const [videoActivo, setVideoActivo] = useState(null);

  // Categorías de filtro
  const categorias = [
    { id: 'todos', label: 'Todos' },
    { id: 'rodilla', label: 'Tus Vídeos Rodilla' },
    { id: 'fuerza', label: 'Fuerza' },
    { id: 'pliometria', label: 'Pliometría & Saltos' },
    { id: 'movilidad', label: 'Movilidad & Pilar' },
    { id: 'carrera', label: 'Técnica Carrera' },
  ];

  // Catálogo de vídeos estructurado (incluyendo los detectados en tus vídeos de OneDrive)
  const catalogoVideos = [
    {
      id: 1,
      titulo: 'Peso muerto rumano con barra (RDL)',
      categoria: 'rodilla',
      grupo: 'isquios',
      duracion: '0:15',
      tags: ['rdl', 'barra', 'isquios', 'control rodilla'],
      descripcion: 'Ejecución con barra olímpica, foco en empuje de cadera atrás y tensión en cadena posterior.',
      esPropio: true
    },
    {
      id: 2,
      titulo: 'Sentadilla lateral Goblet / Cossack',
      categoria: 'rodilla',
      grupo: 'gluteo',
      duracion: '0:14',
      tags: ['cossack', 'kettlebell', 'aductor', 'fuerza frontal'],
      descripcion: 'Desplazamiento lateral con carga al pecho trabajando plano frontal y estabilidad lateral.',
      esPropio: true
    },
    {
      id: 3,
      titulo: 'Split squat con barra tras nuca',
      categoria: 'rodilla',
      grupo: 'cuadriceps',
      duracion: '0:18',
      tags: ['split squat', 'zancada', 'unilateral', 'estabilidad'],
      descripcion: 'Fuerza unilateral y desaceleración con carga en rack.',
      esPropio: true
    },
    {
      id: 4,
      titulo: 'Salto unilateral a cajón 20 cm (Box Jump)',
      categoria: 'pliometria',
      grupo: 'pliometria',
      duracion: '0:12',
      tags: ['box jump', 'cajon 20cm', 'absorcion', 'fase 1'],
      descripcion: 'Salto a 1 pierna con aterrizaje suave y controlado en flexión.',
      esPropio: true
    },
    {
      id: 5,
      titulo: 'Hip Thrust pesado con barra en banco',
      categoria: 'fuerza',
      grupo: 'gluteo',
      duracion: '0:16',
      tags: ['hip thrust', 'gluteo', 'extension cadera'],
      descripcion: 'Empuje de cadera con bloqueo arriba para soporte pélvico en carrera.',
      esPropio: true
    },
    {
      id: 6,
      titulo: 'Plancha lateral con elevación de pierna (Abducción)',
      categoria: 'movilidad',
      grupo: 'core',
      duracion: '0:15',
      tags: ['plancha lateral', 'gluteo medio', 'antivalgo'],
      descripcion: 'Fortalecimiento de glúteo medio para prevenir valgo dinámico de rodilla.',
      esPropio: true
    },
    {
      id: 7,
      titulo: 'Press de banca plano con barra',
      categoria: 'fuerza',
      grupo: 'pecho',
      duracion: '0:25',
      tags: ['press banca', 'pecho', 'empuje horizontal'],
      descripcion: 'Técnica de retracción escapular y trayectoria de barra.',
      esPropio: false
    },
    {
      id: 8,
      titulo: 'Dominadas pronas estrictas',
      categoria: 'fuerza',
      grupo: 'espalda',
      duracion: '0:20',
      tags: ['pull-ups', 'dorsal', 'traccion vertical'],
      descripcion: 'Rango completo sin balanceo ni impulso de cadera.',
      esPropio: false
    },
    {
      id: 9,
      titulo: 'Técnica de carrera: Skipping y zarpazo reactivo',
      categoria: 'carrera',
      grupo: 'carrera',
      duracion: '0:30',
      tags: ['skipping', 'cadencia', 'ritmo 3:50', 'pista'],
      descripcion: 'Drills de reactividad de tobillo y apoyo de mediopié en pista.',
      esPropio: false
    }
  ];

  const videosFiltrados = catalogoVideos.filter((v) => {
    const coincideCat = categoria === 'todos' || v.categoria === categoria;
    const coincideBusqueda = 
      v.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.tags.some(t => t.toLowerCase().includes(busqueda.toLowerCase()));
    return coincideCat && coincideBusqueda;
  });

  return (
    <div className="space-y-4 pb-20 pt-2">
      <div className="px-1">
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Biblioteca Técnica</span>
        <h1 className="text-2xl font-black text-slate-100">Vídeos de Ejercicios</h1>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar ejercicio, grupo o material..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Píldoras de Categorías */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoria(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              categoria === cat.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tarjetas de Vídeos */}
      <div className="space-y-3">
        {videosFiltrados.map((video) => (
          <div
            key={video.id}
            className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {video.esPropio ? (
                    <span className="bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
                      <Sparkles size={10} /> TU VÍDEO (RODILLA)
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                      TÉCNICA
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono">{video.duracion}</span>
                </div>

                <h3 className="font-bold text-slate-100 text-sm leading-snug">{video.titulo}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{video.descripcion}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {video.tags.map((tag) => (
                    <span key={tag} className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Botón Play */}
              <button
                onClick={() => setVideoActivo(video)}
                className="h-10 w-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 transition"
              >
                <Play size={18} fill="currentColor" />
              </button>
            </div>
          </div>
        ))}

        {videosFiltrados.length === 0 && (
          <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            No se encontraron vídeos en esta categoría o búsqueda.
          </div>
        )}
      </div>

      {/* Modal Reproductor */}
      {videoActivo && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-slate-100 text-base mb-1">{videoActivo.titulo}</h3>
            <p className="text-xs text-slate-400 mb-3">{videoActivo.descripcion}</p>

            <div className="bg-slate-950 rounded-2xl aspect-video flex flex-col items-center justify-center border border-slate-800 relative overflow-hidden">
              <Film size={32} className="text-slate-600 mb-2" />
              <span className="text-xs text-slate-400 font-mono">Clip recortado (10-15s)</span>
              <span className="text-[10px] text-amber-400 mt-1 font-mono">Cargado desde OneDrive / Turso</span>
            </div>

            <button
              onClick={() => setVideoActivo(null)}
              className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
