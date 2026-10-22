// =============================================================================
// Aula Inteligente — API del panel (Node.js, sin frameworks)
// -----------------------------------------------------------------------------
//   Local:   npm start          → http://localhost:3000  (SQLite en data/aula.db)
//   Nube:    Vercel             → /api/*  (Turso, ver README)
//
//   Ingesta: POST /api/lecturas  (header x-device-key)
// =============================================================================
import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CONFIG_DEFECTO,
  initDB,
  insertarLectura,
  ultimaLectura,
  contarLecturas,
  resumenTabla,
  listarLecturas,
  lecturasDesde,
  borrarLecturas,
  recortarLecturas,
  leerConfig,
  guardarConfig,
  estadoBaseDatos,
  enNube,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT || 3000);
const EN_VERCEL = Boolean(process.env.VERCEL);
const MAX_LECTURAS = 100000;
const MAX_SIM = 6000;
const ENTRE_LEECS_MS = 120000; // "en línea" si la última lectura tiene < 2 min

const RANGOS = {
  "1h": 3600e3,
  "24h": 864e5,
  "7d": 6048e5,
  "30d": 2592e6,
  todo: Infinity,
};

let config = { ...CONFIG_DEFECTO };

// ------------------------------------------------------------- red / utilidades
function ipLocal() {
  for (const interfaz of Object.values(os.networkInterfaces())) {
    for (const dir of interfaz || []) {
      if (dir.family === "IPv4" && !dir.internal) return dir.address;
    }
  }
  return "127.0.0.1";
}

const ahoraISO = () => new Date().toISOString();

/** URL pública del servidor (Vercel usa x-forwarded-*; local usa host o IP de red). */
function baseURL(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  let host = String(req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PUERTO}`).split(",")[0].trim();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    const ip = ipLocal();
    if (ip && ip !== "127.0.0.1") host = `${ip}:${PUERTO}`;
  }
  return `${proto}://${host}`;
}

function json(res, codigo, objeto) {
  const cuerpo = JSON.stringify(objeto, (_clave, valor) => (typeof valor === "bigint" ? Number(valor) : valor));
  res.writeHead(codigo, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-device-key",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(cuerpo);
}

function textoError(res, codigo, mensaje) {
  json(res, codigo, { error: mensaje });
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const trozos = [];
    req.on("data", (trozo) => {
      total += trozo.length;
      if (total > 64 * 1024) {
        reject(new Error("cuerpo demasiado grande"));
        req.destroy();
        return;
      }
      trozos.push(trozo);
    });
    req.on("end", () => {
      // elimina un BOM inicial si la herramienta que envía lo incluye
      resolve(Buffer.concat(trozos).toString("utf8").replace(/^\uFEFF/, ""));
    });
    req.on("error", reject);
  });
}

/** Lee el JSON del cuerpo (Vercel puede entregarlo ya parseado en req.body). */
async function leerJSON(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
    const texto = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
    return JSON.parse(texto || "{}");
  }
  return JSON.parse((await leerCuerpo(req)) || "{}");
}

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function aBooleano(valor) {
  if (typeof valor === "boolean") return valor;
  const texto = String(valor ?? "").trim().toLowerCase();
  if (["1", "true", "si", "sí", "on", "yes", "encendido", "presente"].includes(texto)) return true;
  if (["0", "false", "no", "off", "ausente", "apagado"].includes(texto)) return false;
  return null;
}

function tomar(bruto, ...claves) {
  for (const clave of claves) if (bruto[clave] !== undefined && bruto[clave] !== "") return bruto[clave];
  return undefined;
}

function textoSonido(nivel) {
  if (nivel === null || nivel === undefined) return null;
  if (nivel < 300) return "Bajo";
  if (nivel < 550) return "Medio";
  return "Alto";
}

/** Convierte lo que envía el ESP32 a la forma interna del panel. */
function normalizarLectura(bruto, ip, cfg) {
  const temperatura = aNumero(tomar(bruto, "temperatura_c", "temperatura", "temperature_c", "temperature", "temp"));
  const humedad = aNumero(tomar(bruto, "humedad", "humidity"));
  const presencia = aBooleano(tomar(bruto, "presencia", "presence", "movimiento", "pir"));
  if (temperatura === null && humedad === null && presencia === null) {
    return { error: "La lectura debe incluir temperatura_c, humedad o presencia." };
  }

  const nivelSonido = aNumero(tomar(bruto, "nivel_sonido", "sound_level", "sonido_nivel"));
  let sonido = tomar(bruto, "sonido", "sound");
  sonido = sonido ? String(sonido) : textoSonido(nivelSonido);

  const modoBruto = tomar(bruto, "modo", "mode");
  const modo = modoBruto
    ? /^a/i.test(String(modoBruto)) ? "Automático" : "Manual"
    : presencia === null ? null : "Automático";

  const fechaBruto = tomar(bruto, "fecha_hora", "timestamp", "ts", "time");
  let fecha = fechaBruto === undefined ? Date.now() : new Date(fechaBruto).getTime();
  if (!Number.isFinite(fecha)) fecha = Date.now();
  if (typeof fechaBruto === "number" && fechaBruto < 1e12) fecha = fechaBruto * 1000;

  return {
    lectura: {
      fecha_hora: new Date(fecha).toISOString(),
      temperatura_c: temperatura,
      humedad: humedad,
      presencia: presencia,
      sonido: sonido ?? "—",
      nivel_sonido: nivelSonido,
      estado_luminarias: aBooleano(tomar(bruto, "estado_luminarias", "luminarias", "lights", "luz")),
      modo: modo ?? "Automático",
      corriente_a: aNumero(tomar(bruto, "corriente_a", "corriente", "current", "amp")),
      rssi_wifi: aNumero(tomar(bruto, "rssi_wifi", "rssi")),
      id_dispositivo: tomar(bruto, "id_dispositivo", "device_id") ?? cfg.id_dispositivo,
      firmware: tomar(bruto, "firmware", "version") ?? null,
      ip,
      fuente: "dispositivo",
    },
  };
}

// ----------------------------------------------------------------- modo demo
// El simulador vive solo en memoria y solo se usa en local (npm start).
function textoSonidoDe(nivel) {
  return textoSonido(nivel) ?? "—";
}

let siguienteIdSim = 1000000;

function pasoSimulacion(estado, instante, cfg) {
  const fecha = new Date(instante);
  const hora = fecha.getHours();
  const dia = fecha.getDay();
  const laborable = dia !== 0 && dia !== 6;
  const horarioClase = laborable && ((hora >= 7 && hora < 14) || (hora >= 15 && hora < 19));
  const probOcupacion = horarioClase ? 0.7 : 0.05;

  // presencia con inercia (el aula no se vacía en un segundo)
  const presenciaNueva = Math.random() < probOcupacion;
  estado.presencia = Math.random() < 0.45 ? estado.presencia : presenciaNueva;

  // temperatura y humedad: paseo aleatorio con base según la hora
  const baseTemp = 22.6 + (horarioClase ? 2.4 : 0.6) + Math.sin((hora / 24) * Math.PI * 2) * 0.9;
  estado.temp += (baseTemp - estado.temp) * 0.08 + (Math.random() - 0.5) * 0.18;
  const baseHum = horarioClase ? 55 : 62;
  estado.hum += (baseHum - estado.hum) * 0.06 + (Math.random() - 0.5) * 1.1;
  estado.hum = Math.max(38, Math.min(78, estado.hum));

  // luminarias en modo automático, con ocasionales anomalías (encendidas sin aula)
  const anomalía = estado.luces && !estado.presencia && Math.random() < 0.05;
  estado.luces = estado.presencia || anomalía;

  estado.sonido = estado.presencia
    ? Math.round(260 + Math.random() * 480)
    : Math.round(140 + Math.random() * 140);
  estado.corriente = estado.luces ? 0.17 + Math.random() * 0.05 : 0.015 + Math.random() * 0.01;

  return {
    id: siguienteIdSim++,
    fecha_hora: new Date(instante).toISOString(),
    temperatura_c: Number(estado.temp.toFixed(1)),
    humedad: Math.round(estado.hum),
    presencia: estado.presencia,
    sonido: textoSonidoDe(estado.sonido),
    nivel_sonido: estado.sonido,
    estado_luminarias: estado.luces,
    modo: "Automático",
    corriente_a: Number(estado.corriente.toFixed(3)),
    rssi_wifi: -(48 + Math.round(Math.random() * 30)),
    id_dispositivo: cfg.id_dispositivo,
    firmware: "demo-1.0.0",
    ip: "simulador",
    fuente: "simulador",
  };
}

let simulaciones = [];
const estadoSim = { temp: 24.2, hum: 58, presencia: true, luces: true, sonido: 310, corriente: 0.18 };
let temporizadorSim = null;

// Crea historial de 30 días para que todos los rangos tengan datos al abrir.
function sembrarSimulacion() {
  const ahora = Date.now();
  const tramos = [
    { desde: ahora - 30 * 864e5, hasta: ahora - 7 * 864e5, paso: 1800 * 1000 },
    { desde: ahora - 7 * 864e5, hasta: ahora - 24 * 3600 * 1000, paso: 900 * 1000 },
    { desde: ahora - 24 * 3600 * 1000, hasta: ahora, paso: 60 * 1000 },
  ];
  const semilla = { temp: 23.4, hum: 61, presencia: false, luces: false, sonido: 250, corriente: 0.02 };
  for (const tramo of tramos) {
    for (let t = tramo.desde; t <= tramo.hasta; t += tramo.paso) {
      simulaciones.push(pasoSimulacion(semilla, t, config));
    }
  }
  Object.assign(estadoSim, semilla);
  if (simulaciones.length > MAX_SIM) simulaciones.splice(0, simulaciones.length - MAX_SIM);
}

let simuladorActivo = false;

function activarSimulador(activo) {
  if (activo && !simuladorActivo) {
    if (simulaciones.length === 0) sembrarSimulacion();
    simuladorActivo = true;
    clearInterval(temporizadorSim);
    temporizadorSim = setInterval(() => {
      simulaciones.push(pasoSimulacion(estadoSim, Date.now(), config));
      if (simulaciones.length > MAX_SIM) simulaciones.shift();
    }, Math.max(2, config.sim_frecuencia_s) * 1000);
    console.log("[simulador] activado");
  } else if (!activo && simuladorActivo) {
    simuladorActivo = false;
    clearInterval(temporizadorSim);
    temporizadorSim = null;
    console.log("[simulador] desactivado");
  }
  return simuladorActivo;
}

// ------------------------------------------------------------- consultas
function ventana(lista, rango) {
  const ms = RANGOS[rango] ?? RANGOS["24h"];
  if (!Number.isFinite(ms)) return lista;
  const desde = Date.now() - ms;
  return lista.filter((l) => new Date(l.fecha_hora).getTime() >= desde);
}

function aplicarFiltros(lista, params) {
  let salida = lista;
  if (params.get("presencia") === "1") salida = salida.filter((l) => l.presencia === true);
  if (params.get("presencia") === "0") salida = salida.filter((l) => l.presencia === false);
  if (params.get("modo")) {
    const modo = params.get("modo");
    salida = salida.filter((l) => String(l.modo || "").toLowerCase() === modo.toLowerCase());
  }
  if (params.get("anomalias") === "1") {
    salida = salida.filter((l) => l.estado_luminarias === true && l.presencia === false);
  }
  return salida;
}

function desdeDeRango(rango) {
  const ms = RANGOS[rango] ?? RANGOS["24h"];
  return Number.isFinite(ms) ? new Date(Date.now() - ms).toISOString() : null;
}

function opcionesFiltro(params) {
  return {
    presencia:
      params.get("presencia") === "1" ? true : params.get("presencia") === "0" ? false : null,
    modo: params.get("modo") || null,
    anomalias: params.get("anomalias") === "1",
  };
}

/** Filas de la fuente activa (simulador local o base SQL), en orden cronológico. */
async function listaFuente(rango, params = null) {
  if (simuladorActivo) {
    let lista = ventana(simulaciones, rango);
    if (params) lista = aplicarFiltros(lista, params);
    return lista;
  }
  const filtros = params ? opcionesFiltro(params) : { presencia: null, modo: null, anomalias: false };
  const { items } = await listarLecturas({
    desde: desdeDeRango(rango),
    ...filtros,
    orden: "asc",
    limit: 100000,
    offset: 0,
  });
  return items;
}

function estadisticos(valores) {
  const v = valores.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const prom = v.reduce((a, b) => a + b, 0) / v.length;
  const desv = Math.sqrt(v.reduce((a, b) => a + (b - prom) ** 2, 0) / v.length);
  const r = (n) => Math.round(n * 100) / 100;
  return { min: r(min), max: r(max), prom: r(prom), desv: r(desv), ultima: r(v[v.length - 1]) };
}

// Horas acumuladas considerando el intervalo real entre lecturas (tope 5 min).
function calcularHoras(lista) {
  let monitoreadas = 0;
  let luces = 0;
  let vaciasConLuces = 0;
  for (let i = 1; i < lista.length; i++) {
    const previa = new Date(lista[i - 1].fecha_hora).getTime();
    const actual = new Date(lista[i].fecha_hora).getTime();
    const delta = Math.min(Math.max(actual - previa, 0), 300000) / 3600000;
    monitoreadas += delta;
    if (lista[i].estado_luminarias === true) luces += delta;
    if (lista[i].estado_luminarias === true && lista[i].presencia === false) vaciasConLuces += delta;
  }
  const r = (n) => Math.round(n * 1000) / 1000;
  return { monitoreadas: r(monitoreadas), luces: r(luces), vaciasConLuces: r(vaciasConLuces) };
}

function resumenDe(lista, rango) {
  const horas = calcularHoras(lista);
  const conteo = (fn) => lista.filter(fn).length;
  const conPresencia = conteo((l) => l.presencia === true);
  const niveles = lista.map((l) => l.nivel_sonido).filter(Number.isFinite);
  const anomalias = conteo((l) => l.estado_luminarias === true && l.presencia === false);
  return {
    rango,
    lecturas: lista.length,
    desde: lista.length ? lista[0].fecha_hora : null,
    hasta: lista.length ? lista[lista.length - 1].fecha_hora : null,
    temperatura: estadisticos(lista.map((l) => l.temperatura_c)),
    humedad: estadisticos(lista.map((l) => l.humedad)),
    corriente: estadisticos(lista.map((l) => l.corriente_a)),
    presencia_pct: lista.length ? Math.round((conPresencia / lista.length) * 100) : 0,
    sonido: {
      bajo: conteo((l) => l.sonido === "Bajo"),
      medio: conteo((l) => l.sonido === "Medio"),
      alto: conteo((l) => l.sonido === "Alto"),
      nivel_prom: niveles.length ? Math.round(niveles.reduce((a, b) => a + b, 0) / niveles.length) : null,
    },
    horas_monitoreadas: horas.monitoreadas,
    horas_luces_encendidas: horas.luces,
    horas_vacias_con_luces: horas.vaciasConLuces,
    minutos_vacias_con_luces: Math.round(horas.vaciasConLuces * 60),
    anomalias,
  };
}

function serieDe(lista, maxPuntos) {
  if (!lista.length) return [];
  const objetivo = Math.max(10, Math.min(Number(maxPuntos) || 120, 600));
  if (lista.length <= objetivo) return lista.map(mapaSerie);

  const tamano = Math.ceil(lista.length / objetivo);
  const salida = [];
  for (let i = 0; i < lista.length; i += tamano) {
    const grupo = lista.slice(i, i + tamano);
    const nums = (campo) => grupo.map((l) => l[campo]).filter(Number.isFinite);
    const prom = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null);
    const votos = (campo) => {
      const si = grupo.filter((l) => l[campo] === true).length;
      return si >= grupo.length / 2;
    };
    salida.push({
      t: grupo[Math.floor(grupo.length / 2)].fecha_hora,
      temperatura_c: prom(nums("temperatura_c")),
      humedad: prom(nums("humedad")),
      nivel_sonido: prom(nums("nivel_sonido")),
      corriente_a: prom(nums("corriente_a")),
      presencia_pct: Math.round((grupo.filter((l) => l.presencia === true).length / grupo.length) * 100),
      presencia: votos("presencia"),
      estado_luminarias: votos("estado_luminarias"),
      sonido: grupo[grupo.length - 1].sonido,
      modo: grupo[grupo.length - 1].modo,
      muestras: grupo.length,
    });
  }
  return salida;
}

const mapaSerie = (l) => ({
  t: l.fecha_hora,
  temperatura_c: l.temperatura_c,
  humedad: l.humedad,
  nivel_sonido: l.nivel_sonido,
  corriente_a: l.corriente_a,
  presencia_pct: l.presencia === true ? 100 : 0,
  presencia: l.presencia,
  estado_luminarias: l.estado_luminarias,
  sonido: l.sonido,
  modo: l.modo,
  muestras: 1,
});

async function construirEstado(req) {
  const cfg = await leerConfig();
  const totales = await resumenTabla();
  const ultimaReal = totales.n ? await ultimaLectura() : null;
  const fuente = simuladorActivo ? "simulador" : totales.n ? "dispositivo" : "ninguna";
  const ultima = simuladorActivo ? simulaciones[simulaciones.length - 1] ?? null : ultimaReal;
  const ahora = Date.now();
  const antiguedad_s = ultima ? Math.max(0, Math.round((ahora - new Date(ultima.fecha_hora).getTime()) / 1000)) : null;

  const primeraReal = totales.primera ? new Date(totales.primera).getTime() : null;
  const ultimaRealMs = totales.ultima ? new Date(totales.ultima).getTime() : null;
  let esperadas = null;
  if (primeraReal !== null && ultimaRealMs !== null) {
    esperadas = Math.max(1, Math.floor((ultimaRealMs - primeraReal) / (cfg.frecuencia_s * 1000)) + 1);
  }
  const recibidas = totales.n;

  const en_linea_real = ultimaRealMs !== null && ahora - ultimaRealMs <= ENTRE_LEECS_MS;

  return {
    servidor_en_linea: true,
    hora_servidor: ahoraISO(),
    fuente,
    simulador_activo: simuladorActivo,
    nube: EN_VERCEL,
    total_lecturas: simuladorActivo ? simulaciones.length : totales.n,
    total_reales: totales.n,
    total_simuladas: simulaciones.length,
    ultima_lectura: ultima,
    antiguedad_s,
    en_linea: fuente === "simulador" ? true : en_linea_real,
    en_linea_dispositivo: en_linea_real,
    dispositivo: {
      id: cfg.id_dispositivo,
      ip_ultima: ultimaReal ? ultimaReal.ip : null,
      rssi: ultimaReal ? ultimaReal.rssi_wifi : null,
      firmware: ultimaReal ? ultimaReal.firmware : null,
      recibidas,
      esperadas,
      exito_pct: esperadas ? Math.min(100, Math.round((recibidas / esperadas) * 100)) : null,
      primera_lectura: primeraReal ? new Date(primeraReal).toISOString() : null,
      ultima_lectura_real: ultimaRealMs ? new Date(ultimaRealMs).toISOString() : null,
      frecuencia_s: cfg.frecuencia_s,
      tiempo_encendido_s: Math.round(process.uptime()),
    },
    configuracion: { ...cfg },
    endpoints: {
      ingesta: `${baseURL(req)}/api/lecturas`,
      panel: `${baseURL(req)}/`,
    },
  };
}

// ------------------------------------------------------------------- exportar
const COLUMNAS_CSV = [
  ["fecha_hora", "Fecha y hora (UTC)"],
  ["temperatura_c", "Temperatura (°C)"],
  ["humedad", "Humedad (%)"],
  ["presencia", "Presencia"],
  ["sonido", "Sonido"],
  ["nivel_sonido", "Nivel de sonido"],
  ["estado_luminarias", "Luminarias"],
  ["modo", "Modo"],
  ["corriente_a", "Corriente (A)"],
  ["rssi_wifi", "RSSI WiFi (dBm)"],
  ["id_dispositivo", "Dispositivo"],
  ["fuente", "Fuente"],
];

function escaparCSV(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  return `"${texto.replaceAll('"', '""')}"`;
}

function generarCSV(lista) {
  const filas = [COLUMNAS_CSV.map(([, titulo]) => escaparCSV(titulo)).join(",")];
  for (const l of lista) {
    filas.push(COLUMNAS_CSV.map(([campo]) => escaparCSV(l[campo])).join(","));
  }
  return "\uFEFF" + filas.join("\r\n");
}

function descargar(res, nombre, tipo, cuerpo) {
  res.writeHead(200, {
    "Content-Type": tipo,
    "Content-Disposition": `attachment; filename="${nombre}"`,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(cuerpo);
}

// ------------------------------------------------------------------ estáticos
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".sql": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ino": "text/plain; charset=utf-8",
};

function servirEstatico(res, ruta) {
  const relativa = ruta === "/" ? "/index.html" : ruta;
  const resuelto = path.normalize(path.join(__dirname, relativa));
  if (!resuelto.startsWith(__dirname)) return textoError(res, 403, "Ruta no permitida.");
  if (!fs.existsSync(resuelto) || !fs.statSync(resuelto).isFile()) {
    return textoError(res, 404, "Recurso no encontrado.");
  }
  const ext = path.extname(resuelto).toLowerCase();
  if (!MIME[ext]) return textoError(res, 404, "Recurso no encontrado.");
  res.writeHead(200, { "Content-Type": MIME[ext], "Cache-Control": "no-cache" });
  fs.createReadStream(resuelto).pipe(res);
}

let insercionesDesdeLimpieza = 0;

// ------------------------------------------------------------------- rutas API
export async function manejar(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let ruta = url.pathname;
  const params = url.searchParams;
  // En Vercel el catch-all entrega los segmentos en req.query.path.
  if (!ruta.startsWith("/api/") && Array.isArray(req.query?.path) && req.query.path.length) {
    ruta = "/api/" + req.query.path.join("/");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-device-key",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    });
    return res.end();
  }

  try {
    // --- diagnóstico (no exige base de datos) ---
    if (ruta === "/api/salud" && req.method === "GET") {
      const base_de_datos = await estadoBaseDatos();
      return json(res, 200, {
        ok: true,
        hora: ahoraISO(),
        nube: EN_VERCEL,
        turso: enNube,
        node: process.version,
        base_de_datos,
      });
    }

    await initDB();

    // --- recepción de datos del ESP32 ---
    if (ruta === "/api/lecturas" && req.method === "POST") {
      let bruto;
      try {
        bruto = await leerJSON(req);
      } catch {
        return textoError(res, 400, "El cuerpo debe ser JSON válido.");
      }

      const cfg = await leerConfig();
      const clave = req.headers["x-device-key"] ?? bruto.device_key;
      if (cfg.clave_dispositivo && clave !== cfg.clave_dispositivo) {
        return textoError(res, 401, "Clave de dispositivo incorrecta (header x-device-key).");
      }

      const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
      const resultado = normalizarLectura(bruto, ip, cfg);
      if (resultado.error) return textoError(res, 400, resultado.error);

      const simuladorSeApago = simuladorActivo;
      if (simuladorActivo) activarSimulador(false); // el dispositivo real manda
      const id = await insertarLectura(resultado.lectura);

      if (++insercionesDesdeLimpieza >= 200) {
        insercionesDesdeLimpieza = 0;
        await recortarLecturas(MAX_LECTURAS);
      }

      return json(res, 201, {
        ok: true,
        id,
        recibida_en: ahoraISO(),
        simulador_desactivado: simuladorSeApago,
      });
    }

    // --- estado general (lo consulta el panel cada 15 s) ---
    if (ruta === "/api/estado" && req.method === "GET") {
      return json(res, 200, await construirEstado(req));
    }

    // --- última lectura ---
    if (ruta === "/api/lecturas/ultima" && req.method === "GET") {
      if (simuladorActivo) return json(res, 200, simulaciones[simulaciones.length - 1] ?? null);
      return json(res, 200, await ultimaLectura());
    }

    // --- historial con filtros y paginación ---
    if (ruta === "/api/lecturas" && req.method === "GET") {
      const rango = params.get("rango") || "24h";
      const limit = Math.max(1, Math.min(Number(params.get("limit")) || 50, 500));
      const offset = Math.max(0, Number(params.get("offset")) || 0);
      const orden = (params.get("orden") || "desc") === "asc" ? "asc" : "desc";

      if (simuladorActivo) {
        let lista = aplicarFiltros(ventana(simulaciones, rango), params);
        lista = [...lista].reverse(); // más recientes primero
        if (orden === "asc") lista.reverse();
        return json(res, 200, {
          total: lista.length,
          rango,
          limit,
          offset,
          items: lista.slice(offset, offset + limit),
        });
      }

      const { total, items } = await listarLecturas({
        desde: desdeDeRango(rango),
        ...opcionesFiltro(params),
        orden,
        limit,
        offset,
      });
      return json(res, 200, { total, rango, limit, offset, items });
    }

    // --- serie para gráficos (puntos promediados) ---
    if (ruta === "/api/serie" && req.method === "GET") {
      const rango = params.get("rango") || "24h";
      const lista = await listaFuente(rango);
      const puntos = serieDe(lista, Number(params.get("max")) || 120);
      return json(res, 200, { rango, puntos, muestras: lista.length });
    }

    // --- resumen estadístico ---
    if (ruta === "/api/resumen" && req.method === "GET") {
      const rango = params.get("rango") || "24h";
      return json(res, 200, resumenDe(await listaFuente(rango), rango));
    }

    // --- energía y ahorro ---
    if (ruta === "/api/energia" && req.method === "GET") {
      const rango = params.get("rango") || "24h";
      const cfg = await leerConfig();
      const potencia = Math.max(1, Number(params.get("potencia_w")) || cfg.potencia_w);
      const tarifa = Math.max(0, Number(params.get("tarifa_kwh")) || cfg.tarifa_kwh);
      const lista = await listaFuente(rango);
      const resumen = resumenDe(lista, rango);
      const horas = {
        monitoreadas: resumen.horas_monitoreadas,
        luces: resumen.horas_luces_encendidas,
        vacias: resumen.horas_vacias_con_luces,
      };
      const consumoAutomatico = (potencia * horas.luces) / 1000;
      const consumoManual = (potencia * horas.monitoreadas) / 1000;
      const ahorroKwh = Math.max(0, consumoManual - consumoAutomatico);
      const ahorroPct = consumoManual > 0 ? (ahorroKwh / consumoManual) * 100 : 0;
      const r = (n) => Math.round(n * 1000) / 1000;
      return json(res, 200, {
        rango,
        potencia_w: potencia,
        tarifa_kwh: tarifa,
        horas_monitoreadas: horas.monitoreadas,
        horas_luces_encendidas: horas.luces,
        horas_vacias_con_luces: horas.vacias,
        minutos_vacias_con_luces: resumen.minutos_vacias_con_luces,
        consumo_automatico_kwh: r(consumoAutomatico),
        consumo_manual_kwh: r(consumoManual),
        ahorro_kwh: r(ahorroKwh),
        ahorro_pct: Math.round(ahorroPct * 10) / 10,
        ahorro_soles: Math.round(ahorroKwh * tarifa * 100) / 100,
        lecturas: resumen.lecturas,
        temperatura: resumen.temperatura,
        humedad: resumen.humedad,
        formula: "E = P × t / 1000",
      });
    }

    // --- exportación real desde el servidor ---
    if (ruta === "/api/exportar" && req.method === "GET") {
      const rango = params.get("rango") || "todo";
      const lista = await listaFuente(rango, params);
      const fecha = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      const formato = (params.get("formato") || "csv").toLowerCase();
      if (formato === "json") {
        return descargar(
          res,
          `lecturas-aula-${fecha}.json`,
          "application/json; charset=utf-8",
          JSON.stringify(lista, null, 2),
        );
      }
      if (formato === "xlsx") {
        return descargar(res, `lecturas-aula-${fecha}.xls`, "application/vnd.ms-excel", generarCSV(lista));
      }
      return descargar(res, `lecturas-aula-${fecha}.csv`, "text/csv;charset=utf-8", generarCSV(lista));
    }

    // --- simulador (solo local; en Vercel no hay proceso persistente) ---
    if (ruta === "/api/simulador" && req.method === "POST") {
      if (EN_VERCEL) {
        return textoError(
          res,
          400,
          "El modo demostración no está disponible en la nube. Envía lecturas reales desde el ESP32 o ejecuta npm start en local.",
        );
      }
      const cuerpo = await leerJSON(req);
      activarSimulador(Boolean(cuerpo.activo));
      return json(res, 200, { simulador_activo: simuladorActivo, total: simuladorActivo ? simulaciones.length : 0 });
    }
    if (ruta === "/api/simulador" && req.method === "GET") {
      return json(res, 200, { simulador_activo: simuladorActivo, disponible: !EN_VERCEL });
    }

    // --- configuración ---
    if (ruta === "/api/configuracion" && req.method === "GET") {
      return json(res, 200, await leerConfig());
    }
    if (ruta === "/api/configuracion" && req.method === "POST") {
      const cuerpo = await leerJSON(req);
      const cambios = {};
      const numeros = ["potencia_w", "tarifa_kwh", "frecuencia_s", "sim_frecuencia_s"];
      for (const clave of numeros) {
        if (cuerpo[clave] !== undefined) {
          const valor = Number(cuerpo[clave]);
          if (!Number.isFinite(valor) || valor <= 0) return textoError(res, 400, `Valor inválido para ${clave}.`);
          cambios[clave] = valor;
        }
      }
      if (cuerpo.nombre_aula !== undefined) cambios.nombre_aula = String(cuerpo.nombre_aula).slice(0, 60);
      if (cuerpo.id_dispositivo !== undefined) cambios.id_dispositivo = String(cuerpo.id_dispositivo).slice(0, 40);
      if (cuerpo.clave_dispositivo !== undefined) cambios.clave_dispositivo = String(cuerpo.clave_dispositivo).slice(0, 80);
      await guardarConfig(cambios);
      config = await leerConfig();
      return json(res, 200, config);
    }

    // --- limpiar datos ---
    if (ruta === "/api/lecturas" && req.method === "DELETE") {
      const soloSimulador = params.get("fuente") === "simulador";
      if (soloSimulador) {
        simulaciones = [];
        activarSimulador(false);
        return json(res, 200, { ok: true, fuente: "simulador", total: 0 });
      }
      await borrarLecturas();
      return json(res, 200, { ok: true, fuente: "dispositivo", total: 0 });
    }

    if (ruta.startsWith("/api/")) {
      return textoError(res, 404, "Endpoint no encontrado.");
    }

    if (req.method !== "GET") return textoError(res, 405, "Método no permitido.");
    return servirEstatico(res, ruta);
  } catch (error) {
    console.error("[servidor]", error);
    return textoError(res, 500, "Error interno: " + error.message);
  }
}

// --------------------------------------------------------------------- arranque
const ejecutadoDirecto = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ejecutadoDirecto) {
  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return manejar(req, res);
    if (req.method !== "GET") return textoError(res, 405, "Método no permitido.");
    return servirEstatico(res, url.pathname);
  });

  const arrancar = async () => {
    await initDB();
    config = await leerConfig();
    const total = await contarLecturas();
    servidor.listen(PUERTO, "0.0.0.0", () => {
      if (total === 0) activarSimulador(true); // primera vez sin hardware → demo
      const ip = ipLocal();
      console.log("──────────────────────────────────────────────");
      console.log(" Aula Inteligente — servidor local");
      console.log(` Panel:        http://localhost:${PUERTO}`);
      console.log(` En la red:    http://${ip}:${PUERTO}`);
      console.log(` Ingesta ESP32: http://${ip}:${PUERTO}/api/lecturas`);
      console.log(` Clave:        ${config.clave_dispositivo || "(sin clave)"}  [header x-device-key]`);
      console.log(` Base de datos: SQLite local (data/aula.db) · ${total} lecturas reales`);
      console.log(` Modo demostración: ${simuladorActivo ? "ACTIVO (se apaga solo al llegar datos reales)" : "inactivo"}`);
      console.log("──────────────────────────────────────────────");
    });
  };

  const cerrar = () => {
    clearInterval(temporizadorSim);
    servidor.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  };

  process.on("SIGINT", cerrar);
  process.on("SIGTERM", cerrar);

  arrancar().catch((error) => {
    console.error("[arranque]", error);
    process.exit(1);
  });
}
