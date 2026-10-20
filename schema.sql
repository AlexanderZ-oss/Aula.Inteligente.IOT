-- =============================================================================
-- Aula Inteligente — esquema de base de datos SQL (Turso / SQLite)
-- -----------------------------------------------------------------------------
-- Cómo aplicarlo en la nube (Turso):
--   turso db shell aula-inteligente < schema.sql
-- o pegando este archivo en el "SQL shell" del panel de Turso.
--
-- El servidor crea las tablas automáticamente al arrancar, así que este archivo
-- es opcional: sirve como documentación y para ejecutarlo a mano si prefieres.
-- =============================================================================

-- Lecturas enviadas por el ESP32 (y por el simulador en modo local).
CREATE TABLE IF NOT EXISTS lecturas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_hora        TEXT    NOT NULL,              -- ISO-8601 UTC: 2026-10-20T09:16:54.535Z
  temperatura_c     REAL,                          -- °C
  humedad           REAL,                          -- %
  presencia         INTEGER,                       -- 1 = hay personas, 0 = no, NULL = sin dato
  sonido            TEXT,                          -- Bajo | Medio | Alto | —
  nivel_sonido      INTEGER,                       -- valor crudo del sensor de sonido
  estado_luminarias INTEGER,                       -- 1 = encendidas, 0 = apagadas, NULL = sin dato
  modo              TEXT,                          -- Automático | Manual
  corriente_a       REAL,                          -- amperios
  rssi_wifi         INTEGER,                       -- dBm
  id_dispositivo    TEXT,                          -- p. ej. esp32-aula1
  firmware          TEXT,
  ip                TEXT,                          -- IP desde la que llegó el POST
  fuente            TEXT    NOT NULL DEFAULT 'dispositivo',
  recibido_en       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Índices para las consultas del panel (historial por fecha y por dispositivo).
CREATE INDEX IF NOT EXISTS idx_lecturas_fecha        ON lecturas (fecha_hora);
CREATE INDEX IF NOT EXISTS idx_lecturas_dispositivo  ON lecturas (id_dispositivo);

-- Configuración del aula (una fila por clave).
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- Valores iniciales (solo se insertan si no existen).
INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
  ('nombre_aula',       'Aula 1 · FIA UCV'),
  ('potencia_w',        '48'),
  ('tarifa_kwh',        '0.55'),
  ('frecuencia_s',      '30'),
  ('sim_frecuencia_s',  '5'),
  ('clave_dispositivo', 'esp32-aula1'),
  ('id_dispositivo',    'esp32-aula1');
