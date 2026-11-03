-- ============================================================================
-- Serging Gym - Plantillas de Sesiones Semanales (Bloques, Huecos Ancla/Variable y Superseries)
-- ============================================================================

-- 1. PLANTILLA: TORSO A - EMPUJE
INSERT OR REPLACE INTO plantillas_sesion (id, user_id, nombre, tipo, descripcion, activo) VALUES
(1, NULL, 'Torso A - Empuje (Pecho, Hombro, Tríceps)', 'superior', 'Enfoque en press pesado, deltoides y tríceps con superseries de accesorios.', 1);

-- Bloques de Torso A
INSERT OR REPLACE INTO plantilla_bloques (id, plantilla_id, orden, nombre, tipo) VALUES
(10, 1, 1, 'Preparación del pilar', 'preparacion'),
(11, 1, 2, 'Bloque de fuerza principal', 'fuerza'),
(12, 1, 3, 'Accesorios en superserie', 'accesorios');

-- Huecos de Torso A
INSERT OR REPLACE INTO plantilla_huecos 
(id, bloque_id, orden, rol, ejercicio_id, rotacion, superserie, series, reps, rpe_objetivo, descanso_s, nota) VALUES
-- Bloque 1: Preparación
(101, 10, 1, 'ancla', 3, 'nunca', 1, 2, '8 reps', NULL, 45, 'Extensión torácica en banco con respiraciones profundas'),
(102, 10, 2, 'ancla', 5, 'nunca', 1, 2, '8+8 toques', NULL, 60, 'Plancha isométrica alta sin bascular cadera'),
-- Bloque 2: Fuerza
(103, 11, 1, 'ancla', 10, 'nunca', NULL, 4, '6-8', 8.5, 120, 'Press banca plano: movimiento ancla para medir sobrecarga progresiva'),
(104, 11, 2, 'variable', 14, 'semanal', NULL, 3, '8-10', 8.0, 90, 'Press militar con barra o mancuerna (rota con fondos o press neutro)'),
-- Bloque 3: Accesorios
(105, 12, 1, 'variable', 11, 'semanal', 2, 3, '10-12', 8.0, 30, 'Press inclinado mancuernas (superserie con tríceps)'),
(106, 12, 2, 'variable', 17, 'semanal', 2, 3, '12-15', 8.5, 75, 'Extensiones tríceps polea alta (superserie con press inclinado)'),
(107, 12, 3, 'variable', 15, 'semanal', NULL, 3, '12-15', 8.5, 60, 'Elevaciones laterales para cabeza lateral del hombro');


-- 2. PLANTILLA: PIERNA ACL - FUERZA Y PLIOMETRÍA CONTROLADA
INSERT OR REPLACE INTO plantillas_sesion (id, user_id, nombre, tipo, descripcion, activo) VALUES
(2, NULL, 'Pierna ACL - Fuerza Unilateral y Pliometría', 'inferior', 'Progresión de rodilla, trabajo excéntrico, saltos a cajón y estabilidad.', 1);

-- Bloques Pierna ACL
INSERT OR REPLACE INTO plantilla_bloques (id, plantilla_id, orden, nombre, tipo) VALUES
(20, 2, 1, 'Preparación del pilar', 'preparacion'),
(21, 2, 2, 'Bloque plyo (Impacto controlado)', 'plyo'),
(22, 2, 3, 'Bloque de fuerza unilateral', 'fuerza'),
(23, 2, 4, 'Accesorios de rodilla', 'accesorios');

-- Huecos Pierna ACL
INSERT OR REPLACE INTO plantilla_huecos 
(id, bloque_id, orden, rol, ejercicio_id, rotacion, superserie, series, reps, rpe_objetivo, descanso_s, nota) VALUES
-- Bloque 1: Prep
(201, 20, 1, 'ancla', 1, 'nunca', 1, 2, '8+8', NULL, 45, 'Dorsiflexión tobillo en pared (fundamental para simetría)'),
(202, 20, 2, 'ancla', 2, 'nunca', 1, 2, '6+6', NULL, 60, 'Half kneeling wall hip rotations'),
-- Bloque 2: Plyo
(203, 21, 1, 'ancla', 40, 'nunca', NULL, 3, '5+5', 7.5, 90, 'Salto unilateral a cajón 20 cm: aterrizar clavando la absorción'),
(204, 21, 2, 'variable', 41, 'semanal', NULL, 3, '6 reps', 8.0, 90, 'Tuck jumps con absorción bilateral suave'),
-- Bloque 3: Fuerza
(205, 22, 1, 'ancla', 30, 'nunca', NULL, 4, '6-8', 8.5, 120, 'Sentadilla asimétrica o Goblet squat pesada (movimiento ancla)'),
(206, 22, 2, 'ancla', 32, 'nunca', NULL, 3, '3+3 (excéntrico)', 8.0, 90, 'Single leg extension: subir con 2, aguantar bajada 4s con pierna de control'),
-- Bloque 4: Accesorios
(207, 23, 1, 'variable', 33, 'semanal', 2, 3, '8+8', 7.5, 30, 'Lateral squat goblet (superserie con isquios)'),
(208, 23, 2, 'ancla', 31, 'nunca', 2, 3, '3+3 ISO PUSH', 9.0, 75, 'Hamstring bridge unilateral ISO PUSH (fuerza isométrica isquios)'),
(209, 23, 3, 'variable', 35, 'semanal', NULL, 2, '25+25 seg', 8.0, 60, 'Split isométrico talón elevado (resistencia tendinosa)'),
(210, 23, 4, 'ancla', 37, 'nunca', NULL, 3, '10+10', 8.0, 60, 'Gemelo unilateral con peso en step para soporte en carrera');


-- 3. PLANTILLA: CARRERA EN PISTA - INTERVALOS / TEMPO
INSERT OR REPLACE INTO plantillas_sesion (id, user_id, nombre, tipo, descripcion, activo) VALUES
(3, NULL, 'Carrera Pista - Series e Intervalos', 'carrera', 'Entrenamiento de calidad aeróbica en pista de atletismo según ritmos objetivo.', 1);

INSERT OR REPLACE INTO plantilla_bloques (id, plantilla_id, orden, nombre, tipo) VALUES
(30, 3, 1, 'Calentamiento y técnica', 'preparacion'),
(31, 3, 2, 'Bloque principal de carrera', 'carrera'),
(32, 3, 3, 'Vuelta a la calma', 'vuelta_calma');

INSERT OR REPLACE INTO plantilla_huecos 
(id, bloque_id, orden, rol, ejercicio_id, rotacion, superserie, series, reps, rpe_objetivo, descanso_s, nota) VALUES
(301, 30, 1, 'ancla', 55, 'nunca', NULL, 3, '40 metros', NULL, 45, 'Drills técnica carrera: skipping, zarpazo y reactividad de tobillo'),
(302, 31, 1, 'variable', 51, 'semanal', NULL, 4, '1000m @ 3:50-4:10', 8.5, 120, 'Repeticiones de 1000m en pista de atletismo con trote suave de recuperación'),
(303, 32, 1, 'ancla', 50, 'nunca', NULL, 1, '1000m suave', 5.0, 0, 'Trote regenerativo y soltar piernas');


-- 4. PLANTILLA: TORSO B - TRACCIÓN
INSERT OR REPLACE INTO plantillas_sesion (id, user_id, nombre, tipo, descripcion, activo) VALUES
(4, NULL, 'Torso B - Tracción (Espalda, Bíceps, Core)', 'superior', 'Dominadas, tracción horizontal con barra, manguito rotador y brazos.', 1);

INSERT OR REPLACE INTO plantilla_bloques (id, plantilla_id, orden, nombre, tipo) VALUES
(40, 4, 1, 'Preparación del pilar', 'preparacion'),
(41, 4, 2, 'Fuerza tracción principal', 'fuerza'),
(42, 4, 3, 'Accesorios en superserie', 'accesorios');

INSERT OR REPLACE INTO plantilla_huecos 
(id, bloque_id, orden, rol, ejercicio_id, rotacion, superserie, series, reps, rpe_objetivo, descanso_s, nota) VALUES
(401, 40, 1, 'ancla', 6, 'nunca', 1, 2, '45 seg por lado', NULL, 30, '90/90 cadera y elongación'),
(402, 40, 2, 'ancla', 4, 'nunca', 1, 2, '10+10 pasos', NULL, 45, 'Monster walk con banda'),
(403, 41, 1, 'ancla', 20, 'nunca', NULL, 4, '6-8', 8.5, 120, 'Dominadas pronas estrictas (ancla de tracción vertical)'),
(404, 41, 2, 'ancla', 21, 'nunca', NULL, 4, '8-10', 8.0, 90, 'Remo con barra 45° con codos cerrados hacia cadera'),
(405, 42, 1, 'variable', 23, 'semanal', 2, 3, '10+10', 8.0, 30, 'Remo unilateral mancuerna (superserie con hombro posterior)'),
(406, 42, 2, 'ancla', 24, 'nunca', 2, 3, '15 reps', 8.0, 60, 'Face Pull en polea alta (manguito y deltoides posterior)'),
(407, 42, 3, 'variable', 25, 'semanal', NULL, 3, '10-12', 8.5, 60, 'Curl bíceps con barra Z');


-- 5. PLANTILLA: REATLETIZACIÓN, AGILIDAD Y CADENA POSTERIOR
INSERT OR REPLACE INTO plantillas_sesion (id, user_id, nombre, tipo, descripcion, activo) VALUES
(5, NULL, 'Reatletización - Agilidad y Cadena Posterior', 'pliometria_agilidad', 'Cambios de dirección, frenado excéntrico, isquiotibiales y glúteos.', 1);

INSERT OR REPLACE INTO plantilla_bloques (id, plantilla_id, orden, nombre, tipo) VALUES
(50, 5, 1, 'Preparación del pilar', 'preparacion'),
(51, 5, 2, 'Agilidad y cambios de dirección', 'plyo'),
(52, 5, 3, 'Fuerza excéntrica posterior', 'fuerza'),
(53, 5, 4, 'Estabilidad dinámica', 'accesorios');

INSERT OR REPLACE INTO plantilla_huecos 
(id, bloque_id, orden, rol, ejercicio_id, rotacion, superserie, series, reps, rpe_objetivo, descanso_s, nota) VALUES
(501, 50, 1, 'ancla', 7, 'nunca', NULL, 2, '45 seg por pierna', NULL, 30, 'Elevated Pigeon Stretch para movilidad profunda de cadera'),
(502, 51, 1, 'ancla', 43, 'nunca', NULL, 4, '4+4 pasadas', 7.5, 75, 'Cambios de dirección a 45° planificados con conos (freno controlado)'),
(503, 51, 2, 'variable', 45, 'semanal', NULL, 3, '4+4 saltos', 8.0, 60, 'Single Leg Hop & Stick clavando 2 segundos la estabilidad unipodal'),
(504, 52, 1, 'ancla', 34, 'nunca', NULL, 4, '8-10', 8.5, 100, 'Peso muerto rumano (RDL) pesado para tensión excéntrica de isquios'),
(505, 52, 2, 'variable', 38, 'semanal', NULL, 3, '8+8', 8.0, 90, 'Sentadilla búlgara con mancuernas controlando la rodilla'),
(506, 53, 1, 'ancla', 36, 'nunca', NULL, 3, '12+12', 8.0, 45, 'Puente de glúteo unilateral en suelo');


-- 6. PLANTILLA: CARRERA RODAJE AERÓBICO / CONTINUA
INSERT OR REPLACE INTO plantillas_sesion (id, user_id, nombre, tipo, descripcion, activo) VALUES
(6, NULL, 'Carrera Continua - Rodaje Aeróbico', 'carrera', 'Volumen de kilómetros aeróbicos a ritmo regenerativo sin fatiga articular.', 1);

INSERT OR REPLACE INTO plantilla_bloques (id, plantilla_id, orden, nombre, tipo) VALUES
(60, 6, 1, 'Bloque de rodaje continuo', 'carrera');

INSERT OR REPLACE INTO plantilla_huecos 
(id, bloque_id, orden, rol, ejercicio_id, rotacion, superserie, series, reps, rpe_objetivo, descanso_s, nota) VALUES
(601, 60, 1, 'ancla', 50, 'nunca', NULL, 1, '8k - 12k continuo', 6.5, 0, 'Rodaje continuo a ritmo cómodo (5:15 - 5:35 min/km), observando sensaciones');
