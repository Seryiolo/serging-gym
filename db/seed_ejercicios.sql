-- ============================================================================
-- Serging Gym - Catálogo Base de Ejercicios
-- ============================================================================

INSERT OR REPLACE INTO ejercicios 
(id, user_id, nombre, grupo, patron, tipo_registro, unilateral, impacto, fase_rodilla_min, equipamiento, instrucciones, video_url, video_origen, video_validado)
VALUES
-- --- PREPARACIÓN DEL PILAR / MOVILIDAD (Impacto 0) ---
(1, NULL, 'Dorsiflexión tobillo en pared', 'movilidad', 'movilidad_tobillo', 'movilidad', 1, 0, 1, 'pared', 'Llevar rodilla hacia pared sin levantar talón, buscando rango máximo.', NULL, 'ninguno', 0),
(2, NULL, 'Half Kneeling Wall Hip Rotations', 'movilidad', 'rotacion_cadera', 'movilidad', 1, 0, 1, 'pared', 'En posición de caballero junto a pared, rotar cadera manteniendo tronco firme.', NULL, 'ninguno', 0),
(3, NULL, 'Bench Thoracic Spine Mobilization', 'movilidad', 'extension_toracica', 'movilidad', 0, 0, 1, 'banco', 'Codos apoyados en banco con pica/toalla, descender pecho hacia el suelo.', NULL, 'ninguno', 0),
(4, NULL, 'Monster Walk lateral con banda', 'gluteo', 'abduccion', 'fuerza', 0, 0, 1, 'minibanda', 'Caminar lateral manteniendo tensión constante en minibanda y rodillas alineadas.', NULL, 'ninguno', 0),
(5, NULL, 'Plancha frontal isométrica + toque hombro', 'core', 'antirrotacion', 'isometrico', 0, 0, 1, 'esterilla', 'Plancha alta evitando oscilación de cadera al tocar hombro contrario.', NULL, 'ninguno', 0),
(6, NULL, '90/90 cadera + flexión de tronco', 'movilidad', 'movilidad_cadera', 'movilidad', 1, 0, 1, 'esterilla', 'Sentado con piernas a 90/90, inclinar pecho sobre pierna delantera con espalda recta.', NULL, 'ninguno', 0),
(7, NULL, 'Elevated Pigeon Stretch', 'movilidad', 'rotacion_externa', 'movilidad', 1, 0, 1, 'cajon/banco', 'Paloma con pierna elevada sobre banco o cajón para liberar glúteo profundo.', NULL, 'ninguno', 0),

-- --- TREN SUPERIOR: EMPUJE (Pecho, Tríceps, Hombro) ---
(10, NULL, 'Press de banca plano con barra', 'pecho', 'empuje_horizontal', 'fuerza', 0, 0, 1, 'barra, banco', 'Escápulas retraídas, bajar barra a media altura de esternón de forma controlada.', NULL, 'ninguno', 0),
(11, NULL, 'Press inclinado con mancuernas (30°)', 'pecho', 'empuje_inclinado', 'fuerza', 0, 0, 1, 'mancuernas, banco', 'Enfoque en porción clavicular sin hiperextender lumbar.', NULL, 'ninguno', 0),
(12, NULL, 'Aperturas en polea media / crossover', 'pecho', 'aislamiento_pecho', 'fuerza', 0, 0, 1, 'poleas', 'Tensión constante al abrir con ligera flexión de codo, cruzar al frente.', NULL, 'ninguno', 0),
(13, NULL, 'Fondos en paralelas / Dips', 'pecho', 'empuje_vertical_desc', 'fuerza', 0, 0, 1, 'barras paralelas', 'Inclinación de tronco hacia adelante para mayor reclutamiento de pectoral.', NULL, 'ninguno', 0),
(14, NULL, 'Press militar de pie con barra', 'hombro', 'empuje_vertical', 'fuerza', 0, 0, 1, 'barra', 'Core y glúteos activos, empujar vertical pasando la cabeza al bloquear.', NULL, 'ninguno', 0),
(15, NULL, 'Elevaciones laterales con mancuerna / polea', 'hombro', 'abduccion_hombro', 'fuerza', 0, 0, 1, 'mancuernas/polea', 'Elevación controlada hasta altura de hombros sin tirar de trapecio.', NULL, 'ninguno', 0),
(16, NULL, 'Press francés con barra Z', 'triceps', 'extension_codo', 'fuerza', 0, 0, 1, 'barra Z, banco', 'Codos cerrados y fijos apuntando al techo, bajar barra tras la cabeza.', NULL, 'ninguno', 0),
(17, NULL, 'Extensiones de tríceps en polea alta con cuerda', 'triceps', 'extension_codo', 'fuerza', 0, 0, 1, 'polea alta, cuerda', 'Separar extremos de la cuerda abajo manteniendo codos fijos al costado.', NULL, 'ninguno', 0),

-- --- TREN SUPERIOR: TRACCIÓN (Espalda, Bíceps, Core posterior) ---
(20, NULL, 'Dominadas pronas (Pull-ups)', 'espalda', 'traccion_vertical', 'fuerza', 0, 0, 1, 'barra dominadas', 'Rango completo desde bloqueo abajo hasta pasar barbilla por encima de barra.', NULL, 'ninguno', 0),
(21, NULL, 'Remo con barra 45° (Pendlay / Convencional)', 'espalda', 'traccion_horizontal', 'fuerza', 0, 0, 1, 'barra', 'Tronco estable a 45°, tirar con codos guiando hacia la cadera.', NULL, 'ninguno', 0),
(22, NULL, 'Jalón al pecho agarre neutro / ancho', 'espalda', 'traccion_vertical', 'fuerza', 0, 0, 1, 'polea jalones', 'Tirar del dorsal sin balancear el torso exageradamente.', NULL, 'ninguno', 0),
(23, NULL, 'Remo unilateral con mancuerna en banco', 'espalda', 'traccion_horizontal', 'fuerza', 1, 0, 1, 'mancuerna, banco', 'Apoyo sólido, tirar hacia la cresta ilíaca estirando bien el dorsal abajo.', NULL, 'ninguno', 0),
(24, NULL, 'Face Pull en polea alta', 'hombro', 'retraccion_rot_ext', 'fuerza', 0, 0, 1, 'polea, cuerda', 'Tirar a la altura de los ojos rotando manos hacia atrás, manguito rotador.', NULL, 'ninguno', 0),
(25, NULL, 'Curl de bíceps con barra recta / Z', 'biceps', 'flexion_codo', 'fuerza', 0, 0, 1, 'barra', 'Sin balanceo lumbar, apretar arriba y descenso en 2-3 segundos.', NULL, 'ninguno', 0),
(26, NULL, 'Curl martillo con mancuernas', 'biceps', 'flexion_codo_braquial', 'fuerza', 0, 0, 1, 'mancuernas', 'Agarre neutro enfocado en braquiorradial y braquial anterior.', NULL, 'ninguno', 0),

-- --- TREN INFERIOR: FUERZA Y CONTROL RODILLA (Fuerza / Isométricos / Unilateral) ---
(30, NULL, 'Sentadilla trasera asimétrica / Goblet squat', 'cuadriceps', 'sentadilla', 'fuerza', 0, 1, 1, 'barra o kettlebell', 'Carga asimétrica o frontal repartiendo peso con control de valgo de rodilla.', NULL, 'ninguno', 0),
(31, NULL, 'Hamstring Bridge unilateral ISO PUSH', 'isquios', 'flexion_rodilla_iso', 'isometrico', 1, 0, 1, 'esterilla, banco', 'Puente de isquios a 1 pierna presionando con fuerza máxima contra suelo/banco.', NULL, 'ninguno', 0),
(32, NULL, 'Single Leg Extension excéntrica controlada', 'cuadriceps', 'extension_rodilla', 'fuerza', 1, 0, 1, 'maquina extensiones', 'Subir con 2 piernas, descender lento (3-4s) con pierna en recuperación.', NULL, 'ninguno', 0),
(33, NULL, 'Lateral Squat Goblet (Sentadilla lateral)', 'gluteo', 'sentadilla_frontal_lat', 'fuerza', 1, 1, 1, 'kettlebell/mancuerna', 'Desplazar peso a una pierna manteniendo la contraria estirada, tronco erguido.', NULL, 'ninguno', 0),
(34, NULL, 'Peso muerto rumano con barra (RDL)', 'isquios', 'bisagra_cadera', 'fuerza', 0, 1, 1, 'barra/mancuernas', 'Empujar cadera atrás con ligera flexión de rodilla hasta sentir tensión en isquios.', NULL, 'ninguno', 0),
(35, NULL, 'Split squat isométrico con talón elevado', 'cuadriceps', 'zancada_isometrica', 'isometrico', 1, 1, 1, 'cuña/step', 'Zancada estática con carga sobre cuádriceps y tendón rotuliano, talón alto.', NULL, 'ninguno', 0),
(36, NULL, 'Puente glúteo unilateral en suelo', 'gluteo', 'extension_cadera', 'fuerza', 1, 0, 1, 'esterilla', 'Empuje desde el talón bloqueando glúteo arriba sin arquear espalda.', NULL, 'ninguno', 0),
(37, NULL, 'Elevación de gemelos unilateral en step', 'gemelo', 'flexion_plantar', 'fuerza', 1, 1, 1, 'step, kettlebell', 'Subir explosivo, parada de 1 segundo arriba y bajada completa para tendón Aquiles.', NULL, 'ninguno', 0),
(38, NULL, 'Sentadilla búlgara con mancuernas', 'cuadriceps', 'zancada_unilateral', 'fuerza', 1, 1, 1, 'banco, mancuernas', 'Pie trasero apoyado, descender vertical con rodilla delantera estable sin colapso.', NULL, 'ninguno', 0),

-- --- PLIOMETRÍA, SALTOS Y REATLETIZACIÓN (Progresión rodilla) ---
(40, NULL, 'Salto unilateral a cajón 20 cm (Box Jump)', 'pliometria', 'salto_vertical_uni', 'fuerza', 1, 2, 1, 'cajon 20cm', 'Salto a una pierna sobre cajón con aterrizaje suave y controlado (absorción).', NULL, 'ninguno', 0),
(41, NULL, 'Tuck Jumps con absorción', 'pliometria', 'salto_vertical_bi', 'fuerza', 0, 2, 1, 'suelo blando', 'Salto llevando rodillas al pecho con aterrizaje simétrico amortiguado.', NULL, 'ninguno', 0),
(42, NULL, 'Drop Lands bilaterales desde 20-30 cm', 'pliometria', 'desaceleracion', 'fuerza', 0, 2, 1, 'cajon bajo', 'Dejarse caer del cajón y clavar el aterrizaje en flexión de 90° sin rebote.', NULL, 'ninguno', 0),
(43, NULL, 'Cambios de dirección a 45° planificados (conos)', 'agilidad', 'cambio_direccion', 'carrera', 1, 2, 1, 'conos', 'Trote a velocidad controlada con freno y salida a 45° buscando confianza de apoyo.', NULL, 'ninguno', 0),
(44, NULL, 'Cambios de dirección a 90° en T-Test', 'agilidad', 'cambio_direccion_90', 'carrera', 1, 2, 2, 'conos', 'Carrera con desaceleración y empuje lateral en 90°.', NULL, 'ninguno', 0),
(45, NULL, 'Single Leg Hop & Stick (Salto horizontal unipodal)', 'pliometria', 'freno_unipodal', 'fuerza', 1, 2, 1, 'suelo', 'Salto horizontal corto a 1 pierna clavando la estabilidad 2 segundos.', NULL, 'ninguno', 0),

-- --- CARRERA Y PISTA DE ATLETISMO ---
(50, NULL, 'Carrera Continua Rodaje Suave (Base Aeróbica)', 'carrera', 'carrera_continua', 'carrera', 0, 2, 1, 'asfalto/pista', 'Ritmo regenerativo y cómodo (5:15 - 5:35 min/km) con zancada relajada.', NULL, 'ninguno', 0),
(51, NULL, 'Series de 1000m en Pista de Atletismo', 'carrera', 'intervalos_largos', 'carrera', 0, 3, 1, 'pista atletismo', 'Repeticiones de 1 km a ritmo objetivo 3:50 - 4:10 min/km con recuperación activa.', NULL, 'ninguno', 0),
(52, NULL, 'Series cortas de 400m / 500m (Potencia aeróbica)', 'carrera', 'intervalos_medios', 'carrera', 0, 3, 2, 'pista atletismo', 'Intervalos rápidos controlando técnica y frecuencia de paso.', NULL, 'ninguno', 0),
(53, NULL, 'Tempo Run / Ritmo Controlado (10k-15k)', 'carrera', 'ritmo_tempo', 'carrera', 0, 2, 1, 'asfalto/pista', 'Bloque de 20-40 min a ritmo 4:50 - 5:00 min/km sostenible.', NULL, 'ninguno', 0),
(54, NULL, 'Fartlek dinámico (Cambios de ritmo)', 'carrera', 'fartlek', 'carrera', 0, 2, 1, 'terreno variado', 'Alternar 2 min vivos (4:15-4:30) con 1 min trote suave continuo.', NULL, 'ninguno', 0),
(55, NULL, 'Técnica de carrera: Skipping y zancadas reactivas', 'carrera', 'tecnica_carrera', 'carrera', 0, 1, 1, 'pista/césped', 'Skipping bajo/alto, talón al glúteo con foco en aterrizaje metatarsal.', NULL, 'ninguno', 0);
