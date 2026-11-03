-- ============================================================================
-- Serging Gym - esquema SQLite (Turso)
-- Version 1. Se aplica con scripts/aplicar-sql.ps1
-- Convenciones:
--   * Todas las tablas de datos personales llevan user_id (listo para multiusuario).
--   * ejercicios.user_id NULL = catalogo compartido; con valor = ejercicio personal.
--   * Fechas en texto ISO (YYYY-MM-DD o YYYY-MM-DD HH:MM:SS), hora local de Madrid.
--   * Impacto del ejercicio: 0 sin impacto, 1 bajo, 2 medio, 3 alto.
-- ============================================================================

CREATE TABLE IF NOT EXISTS meta (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- ---------------------------------------------------------------- USUARIOS
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  nombre        TEXT,
  password_hash TEXT,
  rol           TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin','usuario')),
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS perfil (
  user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  objetivo     TEXT,
  dias_min     INTEGER NOT NULL DEFAULT 4 CHECK (dias_min BETWEEN 1 AND 7),
  dias_max     INTEGER NOT NULL DEFAULT 6 CHECK (dias_max BETWEEN 1 AND 7),
  notas        TEXT,
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------- RODILLA POR FASES
-- Catalogo de fases. Los umbrales son parametros editables, no verdades clinicas.
CREATE TABLE IF NOT EXISTS fases_rodilla (
  id                  INTEGER PRIMARY KEY,
  nombre              TEXT NOT NULL,
  descripcion         TEXT,
  impacto_max         INTEGER NOT NULL CHECK (impacto_max BETWEEN 0 AND 3),
  sesiones_para_subir INTEGER NOT NULL DEFAULT 6,
  molestia_max_subir  INTEGER NOT NULL DEFAULT 2 CHECK (molestia_max_subir BETWEEN 0 AND 10),
  molestia_min_bajar  INTEGER NOT NULL DEFAULT 5 CHECK (molestia_min_bajar BETWEEN 0 AND 10)
);

CREATE TABLE IF NOT EXISTS estado_rodilla (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  fase_id   INTEGER NOT NULL REFERENCES fases_rodilla(id),
  desde     TEXT NOT NULL DEFAULT (date('now')),
  modo_auto INTEGER NOT NULL DEFAULT 1 CHECK (modo_auto IN (0,1))
);

CREATE TABLE IF NOT EXISTS historial_fase_rodilla (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fase_id  INTEGER NOT NULL REFERENCES fases_rodilla(id),
  fecha    TEXT NOT NULL DEFAULT (date('now')),
  motivo   TEXT
);
CREATE INDEX IF NOT EXISTS idx_hist_fase_user ON historial_fase_rodilla(user_id, fecha);

-- ------------------------------------------------------------- CARRERA
CREATE TABLE IF NOT EXISTS ritmos_referencia (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  distancia_m   INTEGER NOT NULL CHECK (distancia_m > 0),
  ritmo_seg_km  INTEGER NOT NULL CHECK (ritmo_seg_km > 0),
  fecha         TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE (user_id, distancia_m, fecha)
);

CREATE TABLE IF NOT EXISTS carreras_objetivo (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  fecha             TEXT NOT NULL,
  distancia_m       INTEGER NOT NULL CHECK (distancia_m > 0),
  tiempo_objetivo_s INTEGER
);
CREATE INDEX IF NOT EXISTS idx_carr_obj_user ON carreras_objetivo(user_id, fecha);

-- ---------------------------------------------------- CATALOGO DE EJERCICIOS
CREATE TABLE IF NOT EXISTS ejercicios (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  grupo             TEXT NOT NULL CHECK (grupo IN (
                      'pecho','espalda','hombro','biceps','triceps','core',
                      'cuadriceps','isquios','gluteo','gemelo','movilidad',
                      'pliometria','agilidad','carrera','cuerpo_completo')),
  patron            TEXT,
  tipo_registro     TEXT NOT NULL DEFAULT 'fuerza'
                      CHECK (tipo_registro IN ('fuerza','isometrico','tiempo','movilidad','carrera')),
  unilateral        INTEGER NOT NULL DEFAULT 0 CHECK (unilateral IN (0,1)),
  impacto           INTEGER NOT NULL DEFAULT 0 CHECK (impacto BETWEEN 0 AND 3),
  fase_rodilla_min  INTEGER NOT NULL DEFAULT 1 REFERENCES fases_rodilla(id),
  equipamiento      TEXT,
  instrucciones     TEXT,
  video_url         TEXT,
  video_origen      TEXT NOT NULL DEFAULT 'ninguno' CHECK (video_origen IN ('youtube','propio','otro','ninguno')),
  video_validado    INTEGER NOT NULL DEFAULT 0 CHECK (video_validado IN (0,1)),
  activo            INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  creado_en         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ejercicios_nombre ON ejercicios(COALESCE(user_id,0), nombre);
CREATE INDEX IF NOT EXISTS idx_ejercicios_grupo ON ejercicios(grupo, activo);
CREATE INDEX IF NOT EXISTS idx_ejercicios_user ON ejercicios(user_id);

CREATE TABLE IF NOT EXISTS favoritos_video (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ejercicio_id INTEGER NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, ejercicio_id)
);

-- --------------------------------------------- PLANTILLAS (huecos fijos/variables)
CREATE TABLE IF NOT EXISTS plantillas_sesion (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('superior','inferior','pliometria_agilidad','carrera','mixta','descanso_activo')),
  descripcion TEXT,
  activo      INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_plantillas_user ON plantillas_sesion(user_id);

CREATE TABLE IF NOT EXISTS plantilla_bloques (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  plantilla_id INTEGER NOT NULL REFERENCES plantillas_sesion(id) ON DELETE CASCADE,
  orden        INTEGER NOT NULL,
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('preparacion','plyo','fuerza','accesorios','carrera','vuelta_calma')),
  UNIQUE (plantilla_id, orden)
);

-- rol 'ancla': ejercicio fijo (o con filtro), se mantiene para medir progresion.
-- rol 'variable': rota segun 'rotacion' entre ejercicios que cumplan el filtro.
-- superserie: huecos del mismo bloque con el mismo numero forman una superserie.
CREATE TABLE IF NOT EXISTS plantilla_huecos (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  bloque_id             INTEGER NOT NULL REFERENCES plantilla_bloques(id) ON DELETE CASCADE,
  orden                 INTEGER NOT NULL,
  rol                   TEXT NOT NULL CHECK (rol IN ('ancla','variable')),
  ejercicio_id          INTEGER REFERENCES ejercicios(id),
  filtro_grupo          TEXT,
  filtro_patron         TEXT,
  filtro_tipo_registro  TEXT,
  rotacion              TEXT NOT NULL DEFAULT 'semanal' CHECK (rotacion IN ('semanal','mensual','nunca')),
  superserie            INTEGER,
  series                INTEGER NOT NULL DEFAULT 3 CHECK (series > 0),
  reps                  TEXT NOT NULL DEFAULT '8-10',
  rpe_objetivo          REAL CHECK (rpe_objetivo IS NULL OR rpe_objetivo BETWEEN 1 AND 10),
  descanso_s            INTEGER NOT NULL DEFAULT 90 CHECK (descanso_s >= 0),
  nota                  TEXT,
  UNIQUE (bloque_id, orden)
);

-- ---------------------------------------------------------- PLAN SEMANAL
CREATE TABLE IF NOT EXISTS semanas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lunes          TEXT NOT NULL,
  dias_objetivo  INTEGER NOT NULL DEFAULT 5 CHECK (dias_objetivo BETWEEN 0 AND 7),
  hay_carrera    INTEGER NOT NULL DEFAULT 0 CHECK (hay_carrera IN (0,1)),
  origen         TEXT NOT NULL DEFAULT 'auto' CHECK (origen IN ('auto','manual')),
  creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lunes)
);

CREATE TABLE IF NOT EXISTS sesiones_plan (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  semana_id    INTEGER NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha        TEXT NOT NULL,
  plantilla_id INTEGER REFERENCES plantillas_sesion(id) ON DELETE SET NULL,
  tipo         TEXT NOT NULL,
  titulo       TEXT NOT NULL,
  descripcion  TEXT,
  estado       TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completada','omitida'))
);
CREATE INDEX IF NOT EXISTS idx_sesiones_plan_user_fecha ON sesiones_plan(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_sesiones_plan_semana ON sesiones_plan(semana_id);

CREATE TABLE IF NOT EXISTS sesion_ejercicios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  sesion_plan_id INTEGER NOT NULL REFERENCES sesiones_plan(id) ON DELETE CASCADE,
  bloque_orden   INTEGER NOT NULL,
  bloque_nombre  TEXT NOT NULL,
  bloque_tipo    TEXT NOT NULL,
  orden          INTEGER NOT NULL,
  ejercicio_id   INTEGER NOT NULL REFERENCES ejercicios(id),
  rol            TEXT NOT NULL CHECK (rol IN ('ancla','variable')),
  superserie     INTEGER,
  series_obj     INTEGER NOT NULL DEFAULT 3,
  reps_obj       TEXT NOT NULL DEFAULT '8-10',
  rpe_obj        REAL,
  descanso_s     INTEGER NOT NULL DEFAULT 90,
  nota           TEXT,
  sustituye_a    INTEGER REFERENCES ejercicios(id)
);
CREATE INDEX IF NOT EXISTS idx_sesion_ej_sesion ON sesion_ejercicios(sesion_plan_id, bloque_orden, orden);
CREATE INDEX IF NOT EXISTS idx_sesion_ej_ejercicio ON sesion_ejercicios(ejercicio_id);

-- ------------------------------------------------------ ENTRENOS REALIZADOS
CREATE TABLE IF NOT EXISTS entrenos (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sesion_plan_id           INTEGER REFERENCES sesiones_plan(id) ON DELETE SET NULL,
  inicio                   TEXT NOT NULL DEFAULT (datetime('now')),
  fin                      TEXT,
  molestia_rodilla_durante INTEGER CHECK (molestia_rodilla_durante IS NULL OR molestia_rodilla_durante BETWEEN 0 AND 10),
  molestia_rodilla_despues INTEGER CHECK (molestia_rodilla_despues IS NULL OR molestia_rodilla_despues BETWEEN 0 AND 10),
  hinchazon_dia_siguiente  INTEGER CHECK (hinchazon_dia_siguiente IS NULL OR hinchazon_dia_siguiente IN (0,1)),
  nota                     TEXT
);
CREATE INDEX IF NOT EXISTS idx_entrenos_user_inicio ON entrenos(user_id, inicio);
CREATE INDEX IF NOT EXISTS idx_entrenos_sesion ON entrenos(sesion_plan_id);

CREATE TABLE IF NOT EXISTS series_registradas (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  entreno_id         INTEGER NOT NULL REFERENCES entrenos(id) ON DELETE CASCADE,
  sesion_ejercicio_id INTEGER REFERENCES sesion_ejercicios(id) ON DELETE SET NULL,
  ejercicio_id       INTEGER NOT NULL REFERENCES ejercicios(id),
  ronda              INTEGER NOT NULL CHECK (ronda > 0),
  lado               TEXT NOT NULL DEFAULT 'ambos' CHECK (lado IN ('ambos','izq','dcha')),
  reps               INTEGER CHECK (reps IS NULL OR reps >= 0),
  peso_kg            REAL CHECK (peso_kg IS NULL OR peso_kg >= 0),
  segundos           INTEGER CHECK (segundos IS NULL OR segundos >= 0),
  rpe                REAL CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  completada         INTEGER NOT NULL DEFAULT 0 CHECK (completada IN (0,1)),
  creado_en          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_series_entreno ON series_registradas(entreno_id);
CREATE INDEX IF NOT EXISTS idx_series_ejercicio ON series_registradas(ejercicio_id, creado_en);

CREATE TABLE IF NOT EXISTS carreras (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  entreno_id        INTEGER NOT NULL REFERENCES entrenos(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('rodaje','series','fartlek','tempo','tirada_larga','competicion','tecnica')),
  distancia_m       INTEGER NOT NULL CHECK (distancia_m > 0),
  duracion_s        INTEGER NOT NULL CHECK (duracion_s > 0),
  ritmo_seg_km      INTEGER GENERATED ALWAYS AS (duracion_s * 1000 / distancia_m) VIRTUAL,
  superficie        TEXT CHECK (superficie IS NULL OR superficie IN ('pista','asfalto','tierra','cinta')),
  molestia_rodilla  INTEGER CHECK (molestia_rodilla IS NULL OR molestia_rodilla BETWEEN 0 AND 10),
  nota              TEXT
);
CREATE INDEX IF NOT EXISTS idx_carreras_entreno ON carreras(entreno_id);

-- ---------------------------------------------------------- METRICAS
CREATE TABLE IF NOT EXISTS peso_corporal (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha    TEXT NOT NULL,
  kg       REAL NOT NULL CHECK (kg > 0 AND kg < 400),
  UNIQUE (user_id, fecha)
);

INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '1');
