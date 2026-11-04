-- ============================================================================
-- Serging Gym - Plantillas de Sesiones Semanales (1..7)
-- Incluye:
--   1. Torso A - Empuje + Core Antirrotacion
--   2. Pierna ACL - Fuerza Unilateral, Pliometria e Isometricos
--   3. Carrera Pista - Drills, Series e Intervalos
--   4. Torso B - Traccion, Manguito y Carries
--   5. Reatletizacion - Agilidad (COD), Frenado y Cadena Posterior
--   6. Carrera Continua - Rodaje Aerobico + Core/Soleo post-carrera
--   7. Pierna B - Cadera, Isometricos y Core Funcional
-- Usa ON CONFLICT(id) DO UPDATE para preservar integridad referencial en Turso.
-- ============================================================================

INSERT INTO plantillas_sesion (id, user_id, nombre, tipo, descripcion, activo) VALUES
(1, NULL, 'Torso A - Empuje (Pecho, Hombro, Tríceps)', 'superior', 'Press pesado, deltoides, tríceps y bloque inicial de movilidad torácica + core.', 1),
(2, NULL, 'Pierna ACL - Fuerza Unilateral y Pliometría', 'inferior', 'Salto controlado, fuerza unilateral de cuádriceps/rodilla e isométricos tendinosos.', 1),
(3, NULL, 'Carrera Pista - Series e Intervalos', 'carrera', 'Técnica reactiva de carrera + series de calidad en pista según tus zonas de ritmo.', 1),
(4, NULL, 'Torso B - Tracción (Espalda, Bíceps y Core)', 'superior', 'Dominadas, remos pesados, salud de hombro y transporte unilateral antirrotación.', 1),
(5, NULL, 'Reatletización - Agilidad y Cadena Posterior', 'pliometria_agilidad', 'Cambios de dirección planificados, aterrizajes unipodales, RDL e isquiotibiales.', 1),
(6, NULL, 'Carrera Continua - Rodaje Aeróbico + Core', 'carrera', 'Base aeróbica en Zona 2 seguida de trabajo breve de sóleo y estabilidad lumbopélvica.', 1),
(7, NULL, 'Pierna B - Cadera, Isométricos y Core', 'inferior', 'Cadena posterior, isométricos analgésicos de rodilla/aductores y acarreos funcionales.', 1)
ON CONFLICT(id) DO UPDATE SET
  nombre = excluded.nombre,
  tipo = excluded.tipo,
  descripcion = excluded.descripcion,
  activo = excluded.activo;

INSERT INTO plantilla_bloques (id, plantilla_id, orden, nombre, tipo) VALUES
-- 1. Torso A
(10, 1, 1, 'Preparación torácica y core', 'preparacion'),
(11, 1, 2, 'Fuerza de empuje principal', 'fuerza'),
(12, 1, 3, 'Accesorios en superserie', 'accesorios'),
-- 2. Pierna ACL
(20, 2, 1, 'Movilidad de tobillo y cadera', 'preparacion'),
(21, 2, 2, 'Pliometría y absorción controlada', 'plyo'),
(22, 2, 3, 'Fuerza principal de rodilla', 'fuerza'),
(23, 2, 4, 'Isométricos y soporte distal', 'accesorios'),
-- 3. Carrera Pista
(30, 3, 1, 'Calentamiento y técnica reactiva', 'preparacion'),
(31, 3, 2, 'Bloque principal de pista', 'carrera'),
(32, 3, 3, 'Enfriamiento regenerativo', 'vuelta_calma'),
-- 4. Torso B
(40, 4, 1, 'Activación escapular y cadera', 'preparacion'),
(41, 4, 2, 'Fuerza de tracción principal', 'fuerza'),
(42, 4, 3, 'Accesorios y core funcional', 'accesorios'),
-- 5. Reatletizacion y Agilidad
(50, 5, 1, 'Movilidad dinámica de cadera', 'preparacion'),
(51, 5, 2, 'Agilidad, frenado y COD', 'plyo'),
(52, 5, 3, 'Cadena posterior y control unilateral', 'fuerza'),
(53, 5, 4, ' Blindaje medial y core', 'accesorios'),
-- 6. Carrera Continua
(60, 6, 1, 'Rodaje continuo en Zona 2', 'carrera'),
(61, 6, 2, 'Recordatorio de sóleo y core (10 min)', 'accesorios'),
-- 7. Pierna B - Cadera, Isometricos y Core
(70, 7, 1, 'Preparación lumbopélvica y glúteo medio', 'preparacion'),
(71, 7, 2, 'Fuerza de cadera y funcional', 'fuerza'),
(72, 7, 3, 'Isométricos tendinosos y core', 'accesorios')
ON CONFLICT(id) DO UPDATE SET
  plantilla_id = excluded.plantilla_id,
  orden = excluded.orden,
  nombre = excluded.nombre,
  tipo = excluded.tipo;

INSERT INTO plantilla_huecos
(id, bloque_id, orden, rol, ejercicio_id, filtro_grupo, filtro_patron, filtro_tipo_registro, rotacion, superserie, series, reps, rpe_objetivo, descanso_s, nota)
VALUES
-- --- 1. TORSO A ---
(101, 10, 1, 'ancla', 3, NULL, NULL, NULL, 'nunca', 1, 2, '8 reps', NULL, 30, 'Extensión torácica en banco exhalando profundo'),
(102, 10, 2, 'variable', 5, 'core', NULL, 'isometrico', 'semanal', 1, 2, '30 seg', NULL, 45, 'Core isométrico antirrotación sin bascular pelvis'),
(103, 11, 1, 'ancla', 10, NULL, NULL, NULL, 'nunca', NULL, 4, '6-8', 8.5, 120, 'Press banca plano: ejercicio ancla de progresión'),
(104, 11, 2, 'variable', 14, 'hombro', 'empuje_vertical', 'fuerza', 'semanal', NULL, 3, '8-10', 8.0, 90, 'Empuje vertical con glúteos y abdomen activos'),
(105, 12, 1, 'variable', 11, 'pecho', NULL, 'fuerza', 'semanal', 2, 3, '10-12', 8.0, 30, 'Accesorio de pectoral en superserie con tríceps'),
(106, 12, 2, 'variable', 17, 'triceps', 'extension_codo', 'fuerza', 'semanal', 2, 3, '12-15', 8.5, 75, 'Extensión de codo controlada sin balanceo'),
(107, 12, 3, 'variable', 15, 'hombro', NULL, 'fuerza', 'semanal', NULL, 3, '12-15', 8.5, 60, 'Trabajo de deltoides lateral sin encoger trapecio'),

-- --- 2. PIERNA ACL ---
(201, 20, 1, 'ancla', 1, NULL, NULL, NULL, 'nunca', 1, 2, '8+8', NULL, 30, 'Dorsiflexión de tobillo en pared vigilando simetría'),
(202, 20, 2, 'variable', 2, 'movilidad', NULL, 'movilidad', 'semanal', 1, 2, '6+6', NULL, 45, 'Movilidad activa de cadera previa al impacto'),
(203, 21, 1, 'ancla', 40, NULL, NULL, NULL, 'nunca', NULL, 3, '5+5', 7.5, 90, 'Salto unilateral a cajón 20 cm clavando la recepción suave'),
(204, 21, 2, 'variable', 42, 'pliometria', NULL, 'fuerza', 'semanal', NULL, 3, '5 reps', 7.5, 90, 'Absorción reactiva y control de valgo dinámico'),
(205, 22, 1, 'ancla', 30, NULL, NULL, NULL, 'nunca', NULL, 4, '6-8', 8.5, 120, 'Sentadilla Goblet / frontal pesada controlada'),
(206, 22, 2, 'variable', 67, 'cuadriceps', NULL, 'fuerza', 'semanal', NULL, 3, '8+8', 8.0, 90, 'Fuerza unilateral de cuádriceps con alineación estricta'),
(207, 23, 1, 'variable', 33, 'gluteo', NULL, 'fuerza', 'semanal', 2, 3, '8+8', 7.5, 30, 'Estabilidad en plano frontal y glúteo medio'),
(208, 23, 2, 'ancla', 60, NULL, NULL, NULL, 'nunca', 2, 3, '8+8', 8.5, 75, 'Puente de isquios unilateral para co-contracción protectora'),
(209, 23, 3, 'variable', 35, 'cuadriceps', NULL, 'isometrico', 'semanal', NULL, 3, '30 seg/lado', 8.0, 60, 'Isométrico tendinoso rotuliano'),
(210, 23, 4, 'ancla', 66, NULL, NULL, NULL, 'nunca', NULL, 3, '10-12', 8.0, 60, 'Fuerza de gemelo y Aquiles en déficit'),

-- --- 3. CARRERA PISTA ---
(301, 30, 1, 'ancla', 55, NULL, NULL, NULL, 'nunca', 1, 3, '40 metros', NULL, 45, 'Skipping y zarpazo reactivo en recta · 45s de descanso caminando'),
(302, 30, 2, 'variable', 101, 'carrera', 'tecnica_carrera', 'carrera', 'semanal', 1, 2, '30 metros', NULL, 45, 'Drill coordinativo de tobillo y postura alta · 45s de descanso caminando'),
(303, 31, 1, 'variable', 51, 'carrera', NULL, 'carrera', 'semanal', NULL, 5, '1000m @ Z4-Z5', 8.5, 120, 'Series de 1000m en Z5 con 2 min de recuperación al trote suave o caminando entre repeticiones'),
(304, 32, 1, 'ancla', 50, NULL, NULL, NULL, 'nunca', NULL, 1, '10-12 min Z1', 5.0, 0, 'Trote suave regenerativo para soltar piernas'),

-- --- 4. TORSO B ---
(401, 40, 1, 'variable', 110, 'movilidad', NULL, 'movilidad', 'semanal', 1, 2, '5+5', NULL, 30, 'Movilidad torácica y flexor de cadera'),
(402, 40, 2, 'ancla', 24, NULL, NULL, NULL, 'nunca', 1, 2, '15 reps', 7.0, 45, 'Face Pull ligero de activación escapular'),
(403, 41, 1, 'ancla', 20, NULL, NULL, NULL, 'nunca', NULL, 4, '6-8', 8.5, 120, 'Dominadas pronas estrictas: ancla de tracción vertical'),
(404, 41, 2, 'ancla', 21, NULL, NULL, NULL, 'nunca', NULL, 4, '8-10', 8.0, 90, 'Remo con barra 45° manteniendo bisagra firme'),
(405, 42, 1, 'variable', 23, 'espalda', 'traccion_horizontal', 'fuerza', 'semanal', 2, 3, '10+10', 8.0, 30, 'Tracción horizontal controlada'),
(406, 42, 2, 'variable', 25, 'biceps', NULL, 'fuerza', 'semanal', 2, 3, '10-12', 8.5, 60, 'Flexión de codo con excéntrica de 3 segundos'),
(407, 42, 3, 'variable', 92, 'core', NULL, NULL, 'semanal', NULL, 3, '30m por lado', 8.0, 60, 'Estabilidad lateral del tronco (Suitcase Carry / Core)'),

-- --- 5. REATLETIZACION, AGILIDAD Y CADENA POSTERIOR ---
(501, 50, 1, 'variable', 79, 'movilidad', NULL, NULL, 'semanal', NULL, 2, '6+6', NULL, 45, 'Apertura activa de cadera y aductores'),
(502, 51, 1, 'ancla', 43, NULL, NULL, NULL, 'nunca', NULL, 4, '4+4 pasadas', 7.5, 75, 'Cambios de dirección a 45° ganando confianza en el apoyo exterior'),
(503, 51, 2, 'variable', 45, 'pliometria', NULL, 'fuerza', 'semanal', NULL, 3, '4+4 recepciones', 8.0, 75, 'Recepción unipodal clavando 2 segundos la estabilidad'),
(504, 52, 1, 'ancla', 34, NULL, NULL, NULL, 'nunca', NULL, 4, '8-10', 8.5, 105, 'Peso muerto rumano con barra: ancla de cadena posterior'),
(505, 52, 2, 'variable', 38, 'cuadriceps', NULL, 'fuerza', 'semanal', NULL, 3, '8+8', 8.0, 90, 'Sentadilla búlgara / variante unilateral pesada'),
(506, 53, 1, 'ancla', 75, NULL, NULL, NULL, 'nunca', 2, 3, '25 seg/lado', 8.0, 45, 'Plancha Copenhague para aductores y estabilidad medial'),
(507, 53, 2, 'variable', 83, 'core', NULL, NULL, 'semanal', 2, 3, '8+8', 7.5, 45, 'Control lumbopélvico antiextensión'),

-- --- 6. CARRERA CONTINUA + CORE/SOLEO ---
(601, 60, 1, 'ancla', 50, NULL, NULL, NULL, 'nunca', NULL, 1, '8k - 14k Z2', 6.5, 0, 'Rodaje aeróbico cómodo vigilando sensaciones de rodilla'),
(602, 61, 1, 'variable', 89, 'gemelo', NULL, 'isometrico', 'semanal', 1, 3, '35 seg/lado', 7.5, 30, 'Sóleo isométrico post-rodaje para proteger Aquiles y tibia'),
(603, 61, 2, 'variable', 85, 'core', NULL, 'isometrico', 'semanal', 1, 3, '30 seg/lado', 7.5, 45, 'Plancha lateral + glúteo medio para evitar caída pélvica en carrera'),

-- --- 7. PIERNA B - CADERA, ISOMETRICOS Y CORE ---
(701, 70, 1, 'ancla', 6, NULL, NULL, NULL, 'nunca', 1, 2, '45 seg/lado', NULL, 30, '90/90 cadera con columna neutra'),
(702, 70, 2, 'ancla', 4, NULL, NULL, NULL, 'nunca', 1, 2, '12+12 pasos', NULL, 45, 'Monster Walk lateral activando glúteo medio'),
(703, 71, 1, 'ancla', 76, NULL, NULL, NULL, 'nunca', NULL, 4, '8-10', 8.5, 105, 'Hip Thrust con barra: fuerza máxima de extensión de cadera'),
(704, 71, 2, 'variable', 69, 'isquios', NULL, 'fuerza', 'semanal', NULL, 3, '8+8', 8.0, 90, 'Bisagra unilateral / Curl Nórdico asistido'),
(705, 71, 3, 'variable', 93, 'cuerpo_completo', NULL, 'tiempo', 'semanal', NULL, 3, '35 metros', 8.0, 75, 'Transporte pesado o trineo sin impacto excéntrico'),
(706, 72, 1, 'variable', 80, 'cuadriceps', NULL, 'isometrico', 'semanal', 2, 3, '35-40 seg', 8.0, 45, 'Isométrico analgésico de cuádriceps (Spanish Squat / Split ISO)'),
(707, 72, 2, 'variable', 63, 'core', NULL, 'isometrico', 'semanal', 2, 3, '30 seg/lado', 8.0, 60, 'Core antirrotación bajo carga')
ON CONFLICT(id) DO UPDATE SET
  bloque_id = excluded.bloque_id,
  orden = excluded.orden,
  rol = excluded.rol,
  ejercicio_id = excluded.ejercicio_id,
  filtro_grupo = excluded.filtro_grupo,
  filtro_patron = excluded.filtro_patron,
  filtro_tipo_registro = excluded.filtro_tipo_registro,
  rotacion = excluded.rotacion,
  superserie = excluded.superserie,
  series = excluded.series,
  reps = excluded.reps,
  rpe_objetivo = excluded.rpe_objetivo,
  descanso_s = excluded.descanso_s,
  nota = excluded.nota;
