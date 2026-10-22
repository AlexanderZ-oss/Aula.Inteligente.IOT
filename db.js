// =============================================================================
// Aula Inteligente — capa de datos SQL
// -----------------------------------------------------------------------------
//   • Local (npm start): SQLite en data/aula.db (no hay que configurar nada)
//   • Nube  (Vercel):    Turso (libSQL) con TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
//
// La conexión se crea de forma perezosa (en la primera petición). Así, si falta
// configuración en Vercel, la función responde con un error JSON claro en vez
// de tumbar el proceso al importar el módulo (FUNCTION_INVOCATION_FAILED).
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const enVercel = Boolean(process.env.VERCEL);

export const CONFIG_DEFECTO = {
  nombre_aula: "Aula 1 · FIA UCV",
  potencia_w: 48,
  tarifa_kwh: 0.55,
  frecuencia_s: 30,
  sim_frecuencia_s: 5,
  clave_dispositivo: "esp32-aula1",
  id_dispositivo: "esp32-aula1",
};

/** true cuando se usa Turso (hay TURSO_DATABASE_URL). */
export const enNube = Boolean(process.env.TURSO_DATABASE_URL);

let cliente = null;
let creacion = null;
let inicializacion = null;

async function crearCliente() {
  if (enNube) {
    // Cliente HTTP puro: no necesita binarios nativos y funciona igual en Node
    // y en la función serverless de Vercel.
    const { createClient } = await import("@libsql/client/http");
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }

  if (enVercel) {
    throw new Error(
      "Falta configurar la base de datos en Vercel: agrega TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en Settings → Environment Variables y vuelve a desplegar.",
    );
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const { createClient } = await import("@libsql/client");
  return createClient({ url: "file:" + path.join(DATA_DIR, "aula.db").replaceAll("\\", "/") });
}

function obtenerCliente() {
  if (!creacion) {
    creacion = crearCliente()
      .then((nuevo) => {
        cliente = nuevo;
        return nuevo;
      })
      .catch((error) => {
        creacion = null; // permite reintentar en la próxima petición
        throw error;
      });
  }
  return creacion;
}

/** Cliente listo para consultar (crea el cliente y el esquema si hace falta). */
async function bd() {
  await initDB();
  if (!cliente) throw new Error("La base de datos no está disponible.");
  return cliente;
}

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

/** Crea las tablas la primera vez que se usa la base de datos. */
export function initDB() {
  if (!inicializacion) {
    inicializacion = (async () => {
      const conexion = await obtenerCliente();
      await conexion.executeMultiple(ESQUEMA);
    })().catch((error) => {
      inicializacion = null; // permite reintentar en la próxima petición
      throw error;
    });
  }
  return inicializacion;
}

/** Estado de la base de datos para /api/salud (nunca lanza). */
export async function estadoBaseDatos() {
  try {
    await initDB();
    return { conectada: true, motor: enNube ? "turso" : "sqlite_local", error: null };
  } catch (error) {
    return { conectada: false, motor: enNube ? "turso" : "sqlite_local", error: error.message };
  }
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

const mapear = (resultado) =>
  resultado.rows.map((fila) => aLectura(filaObjeto(fila, resultado.columns)));

/* -------------------------------- lecturas -------------------------------- */
export async function insertarLectura(l) {
  const conexion = await bd();
  const resultado = await conexion.execute({
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
  const conexion = await bd();
  const resultado = await conexion.execute("SELECT * FROM lecturas ORDER BY id DESC LIMIT 1");
  return resultado.rows.length ? aLectura(filaObjeto(resultado.rows[0], resultado.columns)) : null;
}

export async function contarLecturas() {
  const conexion = await bd();
  const resultado = await conexion.execute("SELECT COUNT(*) AS n FROM lecturas");
  const fila = resultado.rows[0];
  return Number(fila.n ?? fila[0]);
}

/** Totales y extremos de fecha para el estado del dispositivo. */
export async function resumenTabla() {
  const conexion = await bd();
  const resultado = await conexion.execute(
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
  const conexion = await bd();
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

  const totalRes = await conexion.execute({ sql: `SELECT COUNT(*) AS n FROM lecturas${donde}`, args });
  const totalFila = totalRes.rows[0];
  const total = Number(totalFila.n ?? totalFila[0]);

  const ordenSql = orden === "asc" ? "fecha_hora ASC, id ASC" : "fecha_hora DESC, id DESC";
  const filas = await conexion.execute({
    sql: `SELECT * FROM lecturas${donde} ORDER BY ${ordenSql} LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });
  return { total, items: mapear(filas) };
}

/** Todas las lecturas (hasta 100 000) dentro de una ventana, en orden cronológico. */
export async function lecturasDesde(desde = null) {
  const conexion = await bd();
  const resultado = desde
    ? await conexion.execute({
        sql: "SELECT * FROM lecturas WHERE fecha_hora >= ? ORDER BY fecha_hora ASC, id ASC LIMIT 100000",
        args: [desde],
      })
    : await conexion.execute("SELECT * FROM lecturas ORDER BY fecha_hora ASC, id ASC LIMIT 100000");
  return mapear(resultado);
}

export async function borrarLecturas() {
  const conexion = await bd();
  await conexion.execute("DELETE FROM lecturas");
  try {
    await conexion.execute("DELETE FROM sqlite_sequence WHERE name = 'lecturas'");
  } catch {
    /* sqlite_sequence puede no existir todavía */
  }
}

/** Mantiene la tabla acotada: elimina las lecturas más antiguas sobre `max`. */
export async function recortarLecturas(max = 100000) {
  const conexion = await bd();
  await conexion.execute({
    sql: "DELETE FROM lecturas WHERE id <= (SELECT id FROM lecturas ORDER BY id DESC LIMIT 1 OFFSET ?)",
    args: [max],
  });
}

/* ------------------------------- configuración ------------------------------- */
export async function leerConfig() {
  const conexion = await bd();
  const resultado = await conexion.execute("SELECT clave, valor FROM configuracion");
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
  const conexion = await bd();
  const partes = [];
  const args = [];
  for (const [clave, valor] of Object.entries(cambios)) {
    if (!(clave in CONFIG_DEFECTO)) continue;
    partes.push("(?, ?)");
    args.push(clave, String(valor));
  }
  if (!partes.length) return;
  await conexion.execute({
    sql: `INSERT INTO configuracion (clave, valor) VALUES ${partes.join(", ")}
          ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    args,
  });
}
