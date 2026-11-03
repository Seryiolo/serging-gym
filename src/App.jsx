import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import AgendaView from './views/AgendaView';
import HoyView from './views/HoyView';
import VideosView from './views/VideosView';
import EvolucionView from './views/EvolucionView';
import CarreraModal from './components/CarreraModal';
import { executeSql } from './lib/turso';

export default function App() {
  const [activeTab, setActiveTab] = useState('agenda');
  const [fechaSeleccionada, setFechaSeleccionada] = useState('2026-11-09');
  const [sesionEnCurso, setSesionEnCurso] = useState(null);
  const [modalCarrera, setModalCarrera] = useState(false);
  const [sesiones, setSesiones] = useState([]);
  const [pesos, setPesos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Cargar sesiones planificadas desde Turso
  useEffect(() => {
    async function cargarDatos() {
      try {
        const rows = await executeSql(
          `SELECT id, fecha, tipo, titulo, estado FROM sesiones_plan WHERE user_id = 10000 ORDER BY fecha`
        );
        if (rows && rows.length > 0) {
          setSesiones(rows);
        } else {
          // Fallback con la semana que generamos
          setSesiones([
            { id: 1, fecha: '2026-11-09', tipo: 'superior', titulo: 'Día 1: Torso A (Empuje)', estado: 'completada' },
            { id: 2, fecha: '2026-11-10', tipo: 'inferior', titulo: 'Día 2: Pierna ACL & Pliometría', estado: 'pendiente' },
            { id: 3, fecha: '2026-11-11', tipo: 'carrera',  titulo: 'Día 3: Carrera Pista (Intervalos)', estado: 'pendiente' },
            { id: 4, fecha: '2026-11-13', tipo: 'superior', titulo: 'Día 4: Torso B (Tracción)', estado: 'pendiente' },
            { id: 5, fecha: '2026-11-14', tipo: 'pliometria_agilidad', titulo: 'Día 5: Agilidad & Cadena Posterior', estado: 'pendiente' }
          ]);
        }

        // Cargar peso
        const pesoRows = await executeSql(`SELECT fecha, kg FROM peso_corporal WHERE user_id = 10000 ORDER BY fecha`);
        if (pesoRows && pesoRows.length > 0) {
          setPesos(pesoRows);
        }
      } catch (err) {
        console.warn('Usando datos locales sincronizados:', err);
        setSesiones([
          { id: 1, fecha: '2026-11-09', tipo: 'superior', titulo: 'Día 1: Torso A (Empuje)', estado: 'completada' },
          { id: 2, fecha: '2026-11-10', tipo: 'inferior', titulo: 'Día 2: Pierna ACL & Pliometría', estado: 'pendiente' },
          { id: 3, fecha: '2026-11-11', tipo: 'carrera',  titulo: 'Día 3: Carrera Pista (Intervalos)', estado: 'pendiente' },
          { id: 4, fecha: '2026-11-13', tipo: 'superior', titulo: 'Día 4: Torso B (Tracción)', estado: 'pendiente' },
          { id: 5, fecha: '2026-11-14', tipo: 'pliometria_agilidad', titulo: 'Día 5: Agilidad & Cadena Posterior', estado: 'pendiente' }
        ]);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  const handleIniciarSesion = (sesion) => {
    setSesionEnCurso(sesion);
    setActiveTab('hoy');
  };

  const handleTerminarSesion = async (datosFinales) => {
    console.log('Sesión completada:', datosFinales);
    if (sesionEnCurso) {
      setSesiones((prev) =>
        prev.map((s) => (s.id === sesionEnCurso.id ? { ...s, estado: 'completada' } : s))
      );
      try {
        await executeSql(
          `UPDATE sesiones_plan SET estado = 'completada' WHERE id = ?`,
          [sesionEnCurso.id]
        );
      } catch (e) {
        console.error('Error actualizando en Turso:', e);
      }
    }
    setSesionEnCurso(null);
    setActiveTab('agenda');
  };

  const handleGuardarCarrera = async (datosCarrera) => {
    console.log('Carrera guardada:', datosCarrera);
    try {
      // Registrar entreno y carrera
      await executeSql(
        `INSERT INTO entrenos (user_id, molestia_rodilla_despues) VALUES (10000, ?)`,
        [datosCarrera.molestia_rodilla]
      );
    } catch (e) {
      console.warn('Guardado localmente:', e);
    }
  };

  const handleRegistrarPeso = async ({ fecha, kg }) => {
    setPesos((prev) => [...prev, { fecha, kg }]);
    try {
      await executeSql(
        `INSERT INTO peso_corporal (user_id, fecha, kg) VALUES (10000, ?, ?)
         ON CONFLICT(user_id, fecha) DO UPDATE SET kg = excluded.kg`,
        [fecha, kg]
      );
    } catch (e) {
      console.warn('Peso guardado en local:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
      <div className="w-full max-w-md px-3 sm:px-4 flex flex-col min-h-screen relative shadow-2xl bg-slate-950">
        <Header faseRodilla="Fase 1: Reatletización" usuario="Sergio" />

        <main className="flex-1">
          {activeTab === 'agenda' && (
            <AgendaView
              sesiones={sesiones}
              fechaSeleccionada={fechaSeleccionada}
              setFechaSeleccionada={setFechaSeleccionada}
              onIniciarSesion={handleIniciarSesion}
              onAbrirCarreraModal={() => setModalCarrera(true)}
            />
          )}

          {activeTab === 'hoy' && (
            <HoyView
              sesionActual={sesionEnCurso}
              onTerminarSesion={handleTerminarSesion}
              onCancelarSesion={() => {
                setSesionEnCurso(null);
                setActiveTab('agenda');
              }}
            />
          )}

          {activeTab === 'videos' && <VideosView />}

          {activeTab === 'evolucion' && (
            <EvolucionView
              pesos={pesos}
              onRegistrarPeso={handleRegistrarPeso}
            />
          )}
        </main>

        {modalCarrera && (
          <CarreraModal
            onGuardar={handleGuardarCarrera}
            onClose={() => setModalCarrera(false)}
          />
        )}

        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeSessionRunning={!!sesionEnCurso}
        />
      </div>
    </div>
  );
}
