// =============================================================================
// Aula Inteligente — capa de datos SQL
// -----------------------------------------------------------------------------
//   • Local (npm start): SQLite en data/aula.db (no hay que configurar nada)
//   • Nube  (Vercel):    Turso (libSQL) con TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
//
// El esquema es el mismo de schema.sql y se aplica solo la primera vez.
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");

export const CONFIG_DEFECTO = {
  nombre_aula: "Aula 1 · FIA UCV",
  potencia_w: 48,
  tarifa_kwh: 0.55,
  frecuencia_s: 30,
  sim_frecuencia_s: 5,
  clave_dispositivo: "esp32-aula1",
  id_dispositivo: "esp32-aula1",
};

export const enNube = Boolean(process.env.TURSO_DATABASE_URL);
const enVercel = Boolean(process.env.VERCEL);

if (!enVercel) fs.mkdirSync(DATA_DIR, { recursive: true });

const url = enNube ? process.env.TURSO_DATABASE_URL : "file:" + path.join(DATA_DIR, "aula.db").replaceAll("\\", "/");

export const cliente = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// Mismo contenido que schema.sql (duplicado a propósito para no depender del
// sistema de archivos en Vercel al empaquetar la función).
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS lecturas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_hora        TEXT    NOT NULL,
  temperatura_c     REAL,
  humedad           REAL,
  presencia         INTEGER,
  sonido            TEXT,
  nivel_sonido      INTEGER,
  estado_luminarias INTEGER,
  modo              TEXT,
  corriente_a       REAL,
  rssi_wifi         INTEGER,
  id_dispositivo    TEXT,
  firmware          TEXT,
  ip                TEXT,
  fuente            TEXT    NOT NULL DEFAULT 'dispositivo',
  recibido_en       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_lecturas_fecha       ON lecturas (fecha_hora);
CREATE INDEX IF NOT EXISTS idx_lecturas_dispositivo ON lecturas (id_dispositivo);
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
  ('nombre_aula',       'Aula 1 · FIA UCV'),
  ('potencia_w',        '48'),
  ('tarifa_kwh',        '0.55'),
  ('frecuencia_s',      '30'),
  ('sim_frecuencia_s',  '5'),
  ('clave_dispositivo', 'esp32-aula1'),
  ('id_dispositivo',    'esp32-aula1');
`;

let inicializacion = null;

/** Crea las tablas la primera vez que se usa la base de datos. */
export function initDB() {
  if (!inicializacion) {
    inicializacion = (async () => {
      if (enVercel && !enNube) {
        throw new Error(
          "Falta configurar la base de datos en Vercel: agrega TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en Settings → Environment Variables.",
        );
      }
      await cliente.executeMultiple(ESQUEMA);
    })().catch((error) => {
      inicializacion = null; // permite reintentar en la próxima petición
      throw error;
    });
  }
  return inicializacion;
}

/* ------------------------------- utilidades ------------------------------- */
const n = (valor) => (valor === undefined ? null : valor);
const b = (valor) => (valor === null || valor === undefined ? null : valor ? 1 : 0);

function filaObjeto(fila, columnas) {
  const objeto = {};
  columnas.forEach((columna, i) => {
    objeto[columna] = fila[columna] !== undefined ? fila[columna] : fila[i];
  });
  return objeto;
}

function aLectura(fila) {
  return {
    id: Number(fila.id),
    fecha_hora: fila.fecha_hora,
    temperatura_c: fila.temperatura_c === null ? null : Number(fila.temperatura_c),
    humedad: fila.humedad === null ? null : Number(fila.humedad),
    presencia: fila.presencia === null ? null : fila.presencia === 1,
    sonido: fila.sonido,
    nivel_sonido: fila.nivel_sonido === null ? null : Number(fila.nivel_sonido),
    estado_luminarias: fila.estado_luminarias === null ? null : fila.estado_luminarias === 1,
    modo: fila.modo,
    corriente_a: fila.corriente_a === null ? null : Number(fila.corriente_a),
    rssi_wifi: fila.rssi_wifi === null ? null : Number(fila.rssi_wifi),
    id_dispositivo: fila.id_dispositivo,
    firmware: fila.firmware,
    ip: fila.ip,
    fuente: fila.fuente,
  };
}

const mapear = (resultado) => resultado.rows.map((fila) => aLectura(filaObjeto(fila, resultado.columns)));

/* -------------------------------- lecturas -------------------------------- */
export async function insertarLectura(l) {
  await initDB();
  const resultado = await cliente.execute({
    sql: `INSERT INTO lecturas
            (fecha_hora, temperatura_c, humedad, presencia, sonido, nivel_sonido,
             estado_luminarias, modo, corriente_a, rssi_wifi, id_dispositivo, firmware, ip, fuente)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      l.fecha_hora,
      n(l.temperatura_c),
      n(l.humedad),
      b(l.presencia),
      n(l.sonido),
      n(l.nivel_sonido),
      b(l.estado_luminarias),
      n(l.modo),
      n(l.corriente_a),
      n(l.rssi_wifi),
      n(l.id_dispositivo),
      n(l.firmware),
      n(l.ip),
      l.fuente || "dispositivo",
    ],
  });
  return Number(resultado.lastInsertRowid);
}

export async function ultimaLectura() {
  await initDB();
  const resultado = await cliente.execute("SELECT * FROM lecturas ORDER BY id DESC LIMIT 1");
  return resultado.rows.length ? aLectura(filaObjeto(resultado.rows[0], resultado.columns)) : null;
}

export async function contarLecturas() {
  await initDB();
  const resultado = await cliente.execute("SELECT COUNT(*) AS n FROM lecturas");
  const fila = resultado.rows[0];
  return Number(fila.n ?? fila[0]);
}

/** Totales y extremos de fecha para el estado del dispositivo. */
export async function resumenTabla() {
  await initDB();
  const resultado = await cliente.execute(
    "SELECT COUNT(*) AS n, MIN(fecha_hora) AS primera, MAX(fecha_hora) AS ultima FROM lecturas",
  );
  const fila = filaObjeto(resultado.rows[0], resultado.columns);
  return { n: Number(fila.n) || 0, primera: fila.primera || null, ultima: fila.ultima || null };
}

/**
 * Lista lecturas con filtros y paginación.
 * @returns {Promise<{total:number, items:object[]}>}
 */
export async function listarLecturas({
  desde = null,
  presencia = null,
  modo = null,
  anomalias = false,
  orden = "desc",
  limit = 50,
  offset = 0,
} = {}) {
  await initDB();
  const condiciones = [];
  const args = [];
  if (desde) {
    condiciones.push("fecha_hora >= ?");
    args.push(desde);
  }
  if (presencia === true) condiciones.push("presencia = 1");
  if (presencia === false) condiciones.push("presencia = 0");
  if (modo) {
    condiciones.push("LOWER(modo) = LOWER(?)");
    args.push(modo);
  }
  if (anomalias) condiciones.push("estado_luminarias = 1 AND presencia = 0");
  const donde = condiciones.length ? ` WHERE ${condiciones.join(" AND ")}` : "";

  const totalRes = await cliente.execute({ sql: `SELECT COUNT(*) AS n FROM lecturas${donde}`, args });
  const totalFila = totalRes.rows[0];
  const total = Number(totalFila.n ?? totalFila[0]);

  const ordenSql = orden === "asc" ? "fecha_hora ASC, id ASC" : "fecha_hora DESC, id DESC";
  const filas = await cliente.execute({
    sql: `SELECT * FROM lecturas${donde} ORDER BY ${ordenSql} LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });
  return { total, items: mapear(filas) };
}

/** Todas las lecturas (hasta 100 000) dentro de una ventana, en orden cronológico. */
export async function lecturasDesde(desde = null) {
  await initDB();
  const resultado = desde
    ? await cliente.execute({
        sql: "SELECT * FROM lecturas WHERE fecha_hora >= ? ORDER BY fecha_hora ASC, id ASC LIMIT 100000",
        args: [desde],
      })
    : await cliente.execute("SELECT * FROM lecturas ORDER BY fecha_hora ASC, id ASC LIMIT 100000");
  return mapear(resultado);
}

export async function borrarLecturas() {
  await initDB();
  await cliente.execute("DELETE FROM lecturas");
  try {
    await cliente.execute("DELETE FROM sqlite_sequence WHERE name = 'lecturas'");
  } catch {
    /* sqlite_sequence puede no existir todavía */
  }
}

/** Mantiene la tabla acotada: elimina las lecturas más antiguas sobre `max`. */
export async function recortarLecturas(max = 100000) {
  await initDB();
  await cliente.execute({
    sql: "DELETE FROM lecturas WHERE id <= (SELECT id FROM lecturas ORDER BY id DESC LIMIT 1 OFFSET ?)",
    args: [max],
  });
}

/* ------------------------------- configuración ------------------------------- */
export async function leerConfig() {
  await initDB();
  const resultado = await cliente.execute("SELECT clave, valor FROM configuracion");
  const config = { ...CONFIG_DEFECTO };
  for (const fila of resultado.rows) {
    const objeto = filaObjeto(fila, resultado.columns);
    const clave = objeto.clave;
    if (!(clave in config)) continue;
    config[clave] = typeof CONFIG_DEFECTO[clave] === "number" ? Number(objeto.valor) : String(objeto.valor);
  }
  return config;
}

export async function guardarConfig(cambios) {
  await initDB();
  const partes = [];
  const args = [];
  for (const [clave, valor] of Object.entries(cambios)) {
    if (!(clave in CONFIG_DEFECTO)) continue;
    partes.push("(?, ?)");
    args.push(clave, String(valor));
  }
  if (!partes.length) return;
  await cliente.execute({
    sql: `INSERT INTO configuracion (clave, valor) VALUES ${partes.join(", ")}
          ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    args,
  });
}
