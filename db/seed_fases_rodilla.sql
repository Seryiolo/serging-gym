-- Fases de rodilla (propuesta inicial, EDITABLE). No sustituye criterio profesional.
-- Punto de partida del usuario (nov 2026): maraton completada, saltos unilaterales
-- a cajon de 20 cm sin molestia, cambios de direccion con algo de respeto.
-- Regla de progresion: se sugiere subir de fase tras N sesiones de impacto seguidas con
-- molestia <= molestia_max_subir y sin hinchazon al dia siguiente; se sugiere bajar si
-- la molestia llega a molestia_min_bajar o hay hinchazon.
INSERT OR REPLACE INTO fases_rodilla
  (id, nombre, descripcion, impacto_max, sesiones_para_subir, molestia_max_subir, molestia_min_bajar) VALUES
 (1, 'Reatletizacion controlada',
     'Carrera continua y tempo, saltos unilaterales a cajon bajo, cambios de direccion planificados a velocidad media, fuerza unilateral de cadena posterior y cuadriceps.',
     2, 6, 2, 5),
 (2, 'Pliometria y agilidad progresiva',
     'Saltos a vallas bajas, caidas (drop jumps) bajas, cambios de direccion a 90 grados a mas velocidad, series en pista, aceleraciones.',
     3, 6, 2, 5),
 (3, 'Alta intensidad',
     'Sprints maximos, bounding, cambios de direccion agresivos y reactivos, pliometria de contacto corto.',
     3, 8, 2, 5),
 (4, 'Retorno completo',
     'Sin restricciones de impacto: saltos maximos, giros y cortes reactivos, deporte.',
     3, 8, 2, 5);
