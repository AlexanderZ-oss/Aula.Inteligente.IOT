/* =========================================================================
   Aula Inteligente — panel de monitoreo IoT
   --------------------------------------------------------------------------
   Fuentes de datos:
   1) Servidor local (server.js)  -> lecturas REALES del ESP32 por WiFi.
   2) Simulador del servidor      -> modo demostración (se apaga solo al
                                     llegar datos del dispositivo).
   3) Demo local                  -> si abres index.html sin servidor (file://),
                                     se generan datos de ejemplo en el navegador.
   ========================================================================= */

const app = document.querySelector("#app");

const POLL_S = 15; // frecuencia de consulta al servidor
const ZONA = "America/Lima";

/* ------------------------------- catálogo de íconos ------------------------------- */
const icons = {
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  bolt: '<path d="m13 2-3 8h7l-6 12 1-9H6l7-11Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cloud: '<path d="M20 16.2A4.5 4.5 0 0 0 18 7.5a6 6 0 0 0-11.4 1.7A4 4 0 0 0 7 17h12"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  device: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 17h6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z"/>',
  lamp: '<path d="M9 18h6M10 22h4"/><path d="M8.2 14.4A7 7 0 1 1 15.8 14.4c-.9.8-1.3 1.6-1.5 2.6h-4.6c-.2-1-.6-1.8-1.5-2.6Z"/>',
  leaf: '<path d="M20 4c-8 0-14 2-14 9a7 7 0 0 0 7 7c7 0 9-8 7-16Z"/><path d="M4 21c3-5 6-8 11-11"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  moon: '<path d="M20.8 13A8.5 8.5 0 0 1 11 3.2 8.5 8.5 0 1 0 20.8 13Z"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/>',
  sensor: '<path d="M12 12h.01"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.7 5.7a9 9 0 0 0 0 12.6M18.3 5.7a9 9 0 0 1 0 12.6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2.9Z"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  thermometer: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/><path d="M12 11v6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
};

const icon = (name, className = "") =>
  `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.activity}</svg>`;

const navigation = [
  { id: "overview", label: "En vivo", icon: "home" },
  { id: "trends", label: "Tendencias", icon: "chart" },
  { id: "energy", label: "Energía", icon: "bolt" },
  { id: "history", label: "Historial", icon: "history" },
  { id: "device", label: "Dispositivo", icon: "device" },
];

/* ---------------------------------- utilidades ---------------------------------- */
const RANGOS = { "24 horas": "24h", "7 días": "7d", "30 días": "30d" };
const fHora = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fFecha = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, day: "2-digit", month: "2-digit" });
const fFechaHora = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fHoraNum = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, hour: "numeric", hourCycle: "h23" });

const fecha = (iso) => new Date(iso);
const horaDe = (iso) => fHora.format(fecha(iso));
const fechaDe = (iso) => fFecha.format(fecha(iso));
const fechaHoraDe = (iso) => fFechaHora.format(fecha(iso));
const horaPeru = (iso) => Number(fHoraNum.format(fecha(iso)));
const dec = (valor, d = 1) => (Number.isFinite(Number(valor)) ? Number(valor).toFixed(d).replace(".", ",") : "—");
const presente = (valor) => (valor === null || valor === undefined ? "—" : String(valor));

function hace(segundos) {
  if (segundos === null || segundos === undefined) return "—";
  if (segundos < 60) return `hace ${segundos} s`;
  const min = Math.floor(segundos / 60);
  if (min < 60) return `hace ${min} min`;
  const hor = Math.floor(min / 60);
  return `hace ${hor} h ${min % 60} min`;
}

const rangoActual = () => RANGOS[ui.rango] || "24h";
const plural = (n, singular, enPlural) => `${Number(n).toLocaleString("es-PE")} ${n === 1 ? singular : enPlural}`;

/* ------------------------------------ estado ------------------------------------ */
const ui = {
  pagina: "overview",
  rango: "24 horas",
  conectado: null, // true | false
  servidor: null, // respuesta de /api/estado
  serie: [],
  resumen: null,
  energia: null,
  historial: { total: 0, items: [], offset: 0, limit: 20 },
  demo: null, // demo local (sin servidor)
  config: { nombre_aula: "Aula 1 · FIA UCV", potencia_w: 48, tarifa_kwh: 0.55, frecuencia_s: 30 },
  filtros: { presencia: "todos", modo: "", anomalias: false },
  paginaHistorial: 0,
  error: null,
  restante: POLL_S,
  cargando: true,
  temporizadorDato: null,
  temporizadorSeg: null,
  toast: null,
};

/* ------------------------------- cliente de la API ------------------------------- */
async function api(ruta, opciones = {}) {
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 6000);
  try {
    const res = await fetch(ruta, {
      ...opciones,
      signal: control.signal,
      headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
    });
    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(cuerpo.error || `Error HTTP ${res.status}`);
    return cuerpo;
  } finally {
    clearTimeout(limite);
  }
}

async function conectarServidor() {
  try {
    const estado = await api("/api/estado");
    ui.servidor = estado;
    ui.config = { ...ui.config, ...(estado.configuracion || {}) };
    ui.conectado = true;
    return true;
  } catch {
    const primeraVez = ui.conectado !== false;
    ui.conectado = false;
    ui.servidor = null;
    if (primeraVez) inicializarDemoLocal();
    return false;
  }
}

/* ----------------------------- demo local (sin servidor) ----------------------------- */
function pasoLocal(estado, instante) {
  const fechaPaso = new Date(instante);
  const hora = fechaPaso.getHours();
  const dia = fechaPaso.getDay();
  const laborable = dia !== 0 && dia !== 6;
  const horarioClase = laborable && ((hora >= 7 && hora < 14) || (hora >= 15 && hora < 19));
  const prob = horarioClase ? 0.7 : 0.05;
  estado.presencia = Math.random() < 0.45 ? estado.presencia : Math.random() < prob;

  const baseTemp = 22.6 + (horarioClase ? 2.4 : 0.6) + Math.sin((hora / 24) * Math.PI * 2) * 0.9;
  estado.temp += (baseTemp - estado.temp) * 0.08 + (Math.random() - 0.5) * 0.18;
  const baseHum = horarioClase ? 55 : 62;
  estado.hum = Math.max(38, Math.min(78, estado.hum + (baseHum - estado.hum) * 0.06 + (Math.random() - 0.5) * 1.1));

  const anomalía = estado.luces && !estado.presencia && Math.random() < 0.05;
  estado.luces = estado.presencia || anomalía;
  estado.sonido = estado.presencia
    ? Math.round(260 + Math.random() * 480)
    : Math.round(140 + Math.random() * 140);
  estado.corriente = estado.luces ? 0.17 + Math.random() * 0.05 : 0.015 + Math.random() * 0.01;

  const nivel = estado.sonido;
  return {
    t: new Date(instante).toISOString(),
    temperatura_c: Number(estado.temp.toFixed(1)),
    humedad: Math.round(estado.hum),
    presencia: estado.presencia,
    sonido: nivel < 300 ? "Bajo" : nivel < 550 ? "Medio" : "Alto",
    nivel_sonido: nivel,
    estado_luminarias: estado.luces,
    modo: "Automático",
    corriente_a: Number(estado.corriente.toFixed(3)),
    presencia_pct: estado.presencia ? 100 : 0,
    rssi_wifi: -(48 + Math.round(Math.random() * 30)),
    fuente: "demo-local",
  };
}

function inicializarDemoLocal() {
  if (ui.demo) return;
  const ahora = Date.now();
  const tramos = [
    { desde: ahora - 30 * 864e5, hasta: ahora - 7 * 864e5, paso: 1800e3 },
    { desde: ahora - 7 * 864e5, hasta: ahora - 864e5, paso: 900e3 },
    { desde: ahora - 864e5, hasta: ahora, paso: 60e3 },
  ];
  const estado = { temp: 23.6, hum: 60, presencia: false, luces: false, sonido: 250, corriente: 0.02 };
  const lista = [];
  for (const tramo of tramos) {
    for (let t = tramo.desde; t <= tramo.hasta; t += tramo.paso) lista.push(pasoLocal(estado, t));
  }
  ui.demo = { lista, estado, total: lista.length };
}

function tickDemoLocal() {
  if (!ui.demo) return;
  ui.demo.lista.push(pasoLocal(ui.demo.estado, Date.now()));
  ui.demo.total = ui.demo.lista.length;
}

const ventanaLocal = (lista) => {
  const ms = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6 }[rangoActual()] || 864e5;
  const desde = Date.now() - ms;
  return lista.filter((l) => new Date(l.t).getTime() >= desde);
};

function reducir(puntos, max) {
  if (puntos.length <= max) return puntos;
  const paso = Math.ceil(puntos.length / max);
  const salida = [];
  for (let i = 0; i < puntos.length; i += paso) {
    const grupo = puntos.slice(i, i + paso);
    const nums = (campo) => grupo.map((p) => p[campo]).filter(Number.isFinite);
    const prom = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null);
    const votos = (campo) => grupo.filter((p) => p[campo] === true).length >= grupo.length / 2;
    salida.push({
      t: grupo[Math.floor(grupo.length / 2)].t,
      temperatura_c: prom(nums("temperatura_c")),
      humedad: prom(nums("humedad")),
      nivel_sonido: prom(nums("nivel_sonido")),
      corriente_a: prom(nums("corriente_a")),
      sonido: grupo[grupo.length - 1].sonido,
      modo: grupo[grupo.length - 1].modo,
      presencia: votos("presencia"),
      estado_luminarias: votos("estado_luminarias"),
      presencia_pct: Math.round((grupo.filter((p) => p.presencia === true).length / grupo.length) * 100),
      muestras: grupo.length,
    });
  }
  return salida;
}

/* ------------------------- cálculos locales (modo sin servidor) ------------------------- */
function estadisticos(valores) {
  const v = valores.filter(Number.isFinite);
  if (!v.length) return null;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const prom = v.reduce((a, b) => a + b, 0) / v.length;
  const desv = Math.sqrt(v.reduce((a, b) => a + (b - prom) ** 2, 0) / v.length);
  const r = (n) => Math.round(n * 100) / 100;
  return { min: r(min), max: r(max), prom: r(prom), desv: r(desv), ultima: r(v[v.length - 1]) };
}

function calcularHoras(lista) {
  let monitoreadas = 0;
  let luces = 0;
  let vacias = 0;
  for (let i = 1; i < lista.length; i++) {
    const a = new Date(lista[i - 1].t).getTime();
    const b = new Date(lista[i].t).getTime();
    const delta = Math.min(Math.max(b - a, 0), 300000) / 3600000;
    monitoreadas += delta;
    if (lista[i].estado_luminarias === true) luces += delta;
    if (lista[i].estado_luminarias === true && lista[i].presencia === false) vacias += delta;
  }
  const r = (n) => Math.round(n * 1000) / 1000;
  return { monitoreadas: r(monitoreadas), luces: r(luces), vacias: r(vacias) };
}

function resumenLocal() {
  const lista = ventanaLocal(ui.demo.lista);
  const horas = calcularHoras(lista);
  const cuenta = (fn) => lista.filter(fn).length;
  const conPresencia = cuenta((p) => p.presencia === true);
  const niveles = lista.map((p) => p.nivel_sonido).filter(Number.isFinite);
  return {
    rango: rangoActual(),
    lecturas: lista.length,
    desde: lista.length ? lista[0].t : null,
    hasta: lista.length ? lista[lista.length - 1].t : null,
    temperatura: estadisticos(lista.map((p) => p.temperatura_c)),
    humedad: estadisticos(lista.map((p) => p.humedad)),
    corriente: estadisticos(lista.map((p) => p.corriente_a)),
    presencia_pct: lista.length ? Math.round((conPresencia / lista.length) * 100) : 0,
    sonido: {
      bajo: cuenta((p) => p.sonido === "Bajo"),
      medio: cuenta((p) => p.sonido === "Medio"),
      alto: cuenta((p) => p.sonido === "Alto"),
      nivel_prom: niveles.length ? Math.round(niveles.reduce((a, b) => a + b, 0) / niveles.length) : null,
    },
    horas_monitoreadas: horas.monitoreadas,
    horas_luces_encendidas: horas.luces,
    horas_vacias_con_luces: horas.vacias,
    minutos_vacias_con_luces: Math.round(horas.vacias * 60),
    anomalias: cuenta((p) => p.estado_luminarias === true && p.presencia === false),
  };
}

function energiaLocal(potencia = ui.config.potencia_w, tarifa = ui.config.tarifa_kwh) {
  const resumen = resumenLocal();
  const ca = (potencia * resumen.horas_luces_encendidas) / 1000;
  const cm = (potencia * resumen.horas_monitoreadas) / 1000;
  const ahorro = Math.max(0, cm - ca);
  const r = (n) => Math.round(n * 1000) / 1000;
  return {
    rango: rangoActual(),
    potencia_w: potencia,
    tarifa_kwh: tarifa,
    horas_monitoreadas: resumen.horas_monitoreadas,
    horas_luces_encendidas: resumen.horas_luces_encendidas,
    horas_vacias_con_luces: resumen.horas_vacias_con_luces,
    minutos_vacias_con_luces: resumen.minutos_vacias_con_luces,
    consumo_automatico_kwh: r(ca),
    consumo_manual_kwh: r(cm),
    ahorro_kwh: r(ahorro),
    ahorro_pct: cm > 0 ? Math.round((ahorro / cm) * 1000) / 10 : 0,
    ahorro_soles: Math.round(ahorro * tarifa * 100) / 100,
    lecturas: resumen.lecturas,
    temperatura: resumen.temperatura,
    humedad: resumen.humedad,
    formula: "E = P × t / 1000",
  };
}

function historialLocal() {
  let lista = ventanaLocal(ui.demo.lista).slice().reverse();
  if (ui.filtros.presencia === "1") lista = lista.filter((p) => p.presencia === true);
  if (ui.filtros.presencia === "0") lista = lista.filter((p) => p.presencia === false);
  if (ui.filtros.modo && ui.filtros.modo !== "todos") lista = lista.filter((p) => (p.modo || "").toLowerCase() === ui.filtros.modo);
  if (ui.filtros.anomalias) lista = lista.filter((p) => p.estado_luminarias === true && p.presencia === false);
  const offset = ui.paginaHistorial * ui.historial.limit;
  return { total: lista.length, items: lista.slice(offset, offset + ui.historial.limit), offset, limit: ui.historial.limit };
}

/* ------------------------------- obtención de datos ------------------------------- */
let secuenciaCarga = 0;

async function cargarDatos({ forzar = false } = {}) {
  const miOrden = ++secuenciaCarga;
  const vigente = () => miOrden === secuenciaCarga;
  const conectado = await conectarServidor();
  if (!vigente()) return; // otra carga más reciente ya tomó el relevo
  const rango = rangoActual();
  ui.error = null;

  if (conectado) {
    try {
      const [serie, resumen] = await Promise.all([
        api(`/api/serie?rango=${rango}&max=120`),
        api(`/api/resumen?rango=${rango}`),
      ]);
      if (!vigente()) return;
      ui.serie = serie.puntos;
      ui.resumen = resumen;

      if (ui.pagina === "energy" || ui.pagina === "overview") {
        const energia = await api(`/api/energia?rango=${rango}`);
        if (!vigente()) return;
        ui.energia = energia;
      }
      if (ui.pagina === "history") {
        const params = new URLSearchParams({
          rango,
          limit: String(ui.historial.limit),
          offset: String(ui.paginaHistorial * ui.historial.limit),
          orden: "desc",
        });
        if (ui.filtros.presencia !== "todos") params.set("presencia", ui.filtros.presencia);
        if (ui.filtros.modo && ui.filtros.modo !== "todos") params.set("modo", ui.filtros.modo);
        if (ui.filtros.anomalias) params.set("anomalias", "1");
        const historial = await api(`/api/lecturas?${params.toString()}`);
        if (!vigente()) return;
        ui.historial = historial;
      }
    } catch (error) {
      if (!vigente()) return;
      ui.error = `No se pudieron leer los datos del servidor: ${error.message}`;
    }
  } else {
    inicializarDemoLocal();
    ui.serie = reducir(ventanaLocal(ui.demo.lista), 120);
    ui.resumen = resumenLocal();
    if (ui.pagina === "energy" || ui.pagina === "overview") ui.energia = energiaLocal();
    if (ui.pagina === "history") ui.historial = historialLocal();
  }

  ui.cargando = false;
  if (vigente()) {
    if (forzar || document.activeElement?.tagName !== "INPUT") renderPage();
    actualizarCabecera();
    actualizarBanner();
  }
}

function actualizarCabecera() {
  const estado = estadoConexion();
  const nodo = document.querySelector("#connection-status");
  if (nodo) {
    nodo.className = `connection-status is-${estado.clase}`;
    nodo.innerHTML = `<span class="status-dot" aria-hidden="true"></span>${estado.texto}`;
  }
  const tarjeta = document.querySelector("#fuente-card");
  if (tarjeta) tarjeta.innerHTML = tarjetaFuente();
  const nombre = document.querySelector("#aula-nombre");
  if (nombre) nombre.textContent = ui.config.nombre_aula.toUpperCase();
}

function actualizarBanner() {
  const raiz = document.querySelector("#global-banner");
  if (!raiz) return;
  if (ui.error) {
    raiz.innerHTML = `<div class="banner banner-error" role="alert">${icon("alert")}<span>${ui.error}</span><button class="button button-small" type="button" data-action="retry">Reintentar</button></div>`;
    return;
  }
  if (ui.conectado === false) {
    raiz.innerHTML = `<div class="banner banner-warn" role="status">${icon("alert")}<span>Sin conexión con el servidor local: se muestran datos de demostración del navegador. Ejecuta <code>npm start</code> y vuelve a intentar para ver lecturas reales del ESP32.</span><button class="button button-small" type="button" data-action="retry">Reintentar</button></div>`;
    return;
  }
  raiz.innerHTML = "";
}

function estadoConexion() {
  if (ui.conectado === false) return { texto: "Sin servidor", clase: "error" };
  const s = ui.servidor;
  if (!s) return { texto: "Conectando…", clase: "demo" };
  if (s.fuente === "simulador") return { texto: "Modo demostración", clase: "demo" };
  if (s.fuente === "ninguna") return { texto: "Esperando datos", clase: "error" };
  return s.en_linea
    ? { texto: `En línea · ${hace(s.antiguedad_s)}`, clase: "ok" }
    : { texto: `Sin señal · ${hace(s.antiguedad_s)}`, clase: "error" };
}

/* ----------------------------------- componentes ----------------------------------- */
const icono = (name) => `<span class="metric-icon">${icon(name)}</span>`;

const metricCard = (label, value, unit, meta, iconName, clase = "") => `
  <article class="metric-card${clase ? ` ${clase}` : ""}">
    <div class="metric-topline"><span class="metric-label">${label}</span><span class="metric-icon">${icon(iconName)}</span></div>
    <div class="metric-value">${value}${unit ? `<small>${unit}</small>` : ""}</div>
    <div class="metric-meta">${meta}</div>
  </article>`;

const estadoVacio = (titulo, detalle, boton = "") => `
  <div class="empty-state">
    <span class="card-icon">${icon("cloud")}</span>
    <strong>${titulo}</strong>
    <p>${detalle}</p>
    ${boton}
  </div>`;

const paginaCabecera = (titulo, subtitulo, controles = "") => `
  <div class="page-heading">
    <div><h1>${titulo}</h1><p>${subtitulo}</p></div>
    ${controles ? `<div class="heading-controls">${controles}</div>` : ""}
  </div>`;

const selectorRango = () => `
  <label class="sr-only" for="range-select">Rango de tiempo</label>
  <select class="select-control" id="range-select" aria-label="Rango de tiempo">
    ${Object.keys(RANGOS).map((r) => `<option${ui.rango === r ? " selected" : ""}>${r}</option>`).join("")}
  </select>`;

function tarjetaFuente() {
  if (ui.conectado === false) {
    return `<div class="demo-card-heading"><span class="demo-dot dot-error"></span>Sin servidor</div>
      <p>Ejecuta <code>npm start</code> en la carpeta del proyecto y recarga para ver datos reales.</p>`;
  }
  const s = ui.servidor;
  if (s?.fuente === "simulador") {
    return `<div class="demo-card-heading"><span class="demo-dot dot-demo"></span>Modo demostración</div>
      <p>${plural(s.total_lecturas, "lectura simulada", "lecturas simuladas")}. Al enviar datos el ESP32 se apaga solo.</p>`;
  }
  if (s?.fuente === "dispositivo") {
    return `<div class="demo-card-heading"><span class="demo-dot dot-ok"></span>ESP32 conectado</div>
      <p>${plural(s.total_reales, "lectura real", "lecturas reales")} · ${hace(s.antiguedad_s)}.</p>`;
  }
  return `<div class="demo-card-heading"><span class="demo-dot dot-error"></span>Sin datos</div>
    <p>Aún no ha llegado la primera lectura del dispositivo.</p>`;
}

/* ------------------------------------ gráficos ------------------------------------ */
function graficoLineas(puntos, { grande = false } = {}) {
  if (!puntos || puntos.length === 0) return "";
  const width = 620;
  const height = grande ? 250 : 200;
  const left = 46;
  const right = width - 40;
  const top = 14;
  const bottom = height - 26;

  const temps = puntos.map((p) => p.temperatura_c).filter(Number.isFinite);
  const hums = puntos.map((p) => p.humedad).filter(Number.isFinite);
  if (!temps.length && !hums.length) return "";

  let tMin = temps.length ? Math.min(...temps) : 0;
  let tMax = temps.length ? Math.max(...temps) : 1;
  if (tMax - tMin < 3) {
    const medio = (tMax + tMin) / 2;
    tMin = medio - 1.5;
    tMax = medio + 1.5;
  } else {
    tMin -= 1;
    tMax += 1;
  }

  const n = puntos.length;
  const x = (i) => (n === 1 ? (left + right) / 2 : left + (i * (right - left)) / (n - 1));
  const yT = (v) => top + ((tMax - v) / (tMax - tMin)) * (bottom - top);
  const yH = (v) => top + ((100 - v) / 100) * (bottom - top);

  const trazo = (campo, escala) => {
    let salida = "";
    let abierto = false;
    puntos.forEach((p, i) => {
      const valor = p[campo];
      if (!Number.isFinite(valor)) {
        abierto = false;
        return;
      }
      salida += `${abierto ? "L" : "M"} ${x(i).toFixed(1)} ${escala(valor).toFixed(1)} `;
      abierto = true;
    });
    return salida.trim();
  };

  const rejilla = [0, 25, 50, 75, 100]
    .map((nivel) => {
      const y = yH(nivel);
      const tempEnNivel = tMax - ((100 - nivel) / 100) * (tMax - tMin);
      return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" class="chart-gridline"/>
        <text x="${left - 7}" y="${y + 3}" text-anchor="end" class="chart-axis-label">${dec(tempEnNivel, 1)}°</text>
        <text x="${right + 7}" y="${y + 3}" class="chart-axis-label">${nivel}%</text>`;
    })
    .join("");

  const marcas = [0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4));
  const etiquetas = marcas
    .map((indice, k) => {
      const texto = ui.rango === "24 horas" ? horaDe(puntos[indice].t) : fechaDe(puntos[indice].t);
      return `<text x="${x(indice)}" y="${height - 6}" text-anchor="${k === 0 ? "start" : k === 4 ? "end" : "middle"}" class="chart-axis-label">${texto}</text>`;
    })
    .join("");

  const ultimo = puntos[n - 1];
  const puntoTemp = Number.isFinite(ultimo.temperatura_c)
    ? `<circle cx="${x(n - 1)}" cy="${yT(ultimo.temperatura_c)}" r="4" class="chart-temp-dot"/>`
    : "";
  const puntoHum = Number.isFinite(ultimo.humedad)
    ? `<circle cx="${x(n - 1)}" cy="${yH(ultimo.humedad)}" r="3.5" class="chart-humidity-dot"/>`
    : "";

  const accesible = temps.length ? `Temperatura entre ${dec(Math.min(...temps))} y ${dec(Math.max(...temps))} grados.` : "";

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de temperatura y humedad. ${accesible}">
      ${rejilla}
      ${hums.length ? `<path d="${trazo("humedad", yH)}" class="chart-humidity-line"/>` : ""}
      ${temps.length ? `<path d="${trazo("temperatura_c", yT)}" class="chart-temp-line"/>` : ""}
      ${puntoTemp}
      ${puntoHum}
      ${etiquetas}
    </svg>`;
}

function franjasTimeline(puntos) {
  if (!puntos.length) return "";
  const fila = (campo, etiqueta, clase) => `
    <div class="timeline-row">
      <span class="timeline-label">${etiqueta}</span>
      <div class="timeline-track ${clase}" role="img" aria-label="Línea de tiempo de ${etiqueta.toLowerCase()}">
        ${puntos.map((p) => `<span class="${p[campo] ? "on" : ""}"></span>`).join("")}
      </div>
    </div>`;
  return `<div class="timeline">${fila("presencia", "Presencia", "")}${fila("estado_luminarias", "Luminarias", "lights")}</div>`;
}

function graficoOcupacion(puntos) {
  const horas = Array.from({ length: 24 }, () => ({ suma: 0, n: 0 }));
  for (const p of puntos) {
    const h = horaPeru(p.t);
    if (Number.isFinite(h) && h >= 0 && h < 24) {
      horas[h].suma += p.presencia_pct ?? (p.presencia ? 100 : 0);
      horas[h].n += 1;
    }
  }
  const conDatos = horas.map((b, i) => ({ hora: i, valor: b.n ? Math.round(b.suma / b.n) : null })).filter((b) => b.valor !== null);
  if (!conDatos.length) return estadoVacio("Sin datos de ocupación", "No hay lecturas suficientes en este rango.");

  const ancho = 620;
  const base = 190;
  const anchoSlot = (ancho - 60) / 24;
  const barras = conDatos
    .map(({ hora, valor }) => {
      const bx = 44 + hora * anchoSlot;
      const alto = (valor / 100) * 150;
      const destacado = valor === Math.max(...conDatos.map((c) => c.valor));
      return `<rect x="${bx}" y="${base - alto}" width="${Math.max(8, anchoSlot - 7)}" height="${alto}" rx="3" fill="${destacado ? "#242622" : "#d7d8d4"}"/>
        ${hora % 3 === 0 ? `<text x="${bx + (anchoSlot - 7) / 2}" y="${base + 16}" text-anchor="middle" class="chart-axis-label">${String(hora).padStart(2, "0")}h</text>` : ""}`;
    })
    .join("");
  return `<div class="chart-container"><svg viewBox="0 0 ${ancho} 220" role="img" aria-label="Ocupación promedio por hora">
    <line x1="44" y1="${base}" x2="${ancho - 16}" y2="${base}" class="chart-gridline"/>
    <text x="6" y="${base + 3}" class="chart-axis-label">0%</text>
    <text x="6" y="${base - 147}" class="chart-axis-label">100%</text>
    ${barras}
  </svg></div>`;
}

function graficoConsumo(energia) {
  const maximo = Math.max(energia.consumo_manual_kwh, energia.consumo_automatico_kwh, 0.001);
  const alto = (valor) => Math.max(6, (valor / maximo) * 125);
  const hManual = alto(energia.consumo_manual_kwh);
  const hAuto = alto(energia.consumo_automatico_kwh);
  return `<div class="chart-container"><svg viewBox="0 0 620 230" role="img" aria-label="Comparación del consumo manual y automático">
    <line x1="38" y1="186" x2="604" y2="186" class="chart-gridline"/>
    <rect x="145" y="${186 - hManual}" width="100" height="${hManual}" rx="6" fill="#b7b9b3"/>
    <rect x="360" y="${186 - hAuto}" width="100" height="${hAuto}" rx="6" fill="#242622"/>
    <text x="195" y="${180 - hManual}" text-anchor="middle" class="chart-axis-label">${dec(energia.consumo_manual_kwh, 2)} kWh</text>
    <text x="410" y="${180 - hAuto}" text-anchor="middle" class="chart-axis-label">${dec(energia.consumo_automatico_kwh, 2)} kWh</text>
    <text x="195" y="207" text-anchor="middle" class="chart-axis-label">Manual (referencia)</text>
    <text x="410" y="207" text-anchor="middle" class="chart-axis-label">Automático (medido)</text>
  </svg></div>`;
}

/* ---------------------------------- navegación/ shell ---------------------------------- */
const renderLanding = () => `
  <div class="landing">
    <header class="public-header">
      <nav class="public-nav" aria-label="Navegación principal">
        <a class="brand-lockup" href="#inicio" aria-label="Aula Inteligente, inicio">
          <span class="brand-mark">AI</span>
          <span class="brand-name">Aula Inteligente<small>Universidad César Vallejo</small></span>
        </a>
        <div class="public-links">
          <a href="#proyecto">Proyecto</a>
          <a href="#funcionamiento">Funcionamiento</a>
          <button class="button button-small" data-action="open-dashboard">Ver panel ${icon("arrow")}</button>
        </div>
      </nav>
    </header>

    <main class="landing-main" id="inicio">
      <section class="hero" aria-labelledby="hero-title">
        <div>
          <span class="eyebrow"><span class="eyebrow-mark" aria-hidden="true"></span> Tecnología aplicada a la educación</span>
          <h1 id="hero-title">Iluminación que se adapta al aula, <span>no al descuido.</span></h1>
          <p class="hero-copy">Sistema de monitoreo IoT que recibe las lecturas del ESP32 por WiFi y convierte los datos de los sensores en decisiones de energía.</p>
          <div class="hero-actions">
            <button class="button" data-action="open-dashboard">Explorar el panel ${icon("arrow")}</button>
            <a class="button button-secondary" href="#proyecto">Conocer el proyecto</a>
          </div>
          <div class="hero-note">${icon("shield")} Sin cámaras ni identificación personal. Solo datos ambientales.</div>
        </div>
        <div class="hero-visual" role="img" aria-label="Ilustración abstracta de sensores conectados a un sistema central">
          <div class="visual-grid"></div>
          <div class="visual-orbit"></div>
          <div class="visual-center">${icon("device")}</div>
          <span class="sensor-node node-one">${icon("thermometer")}</span>
          <span class="sensor-node node-two">${icon("sensor")}</span>
          <span class="sensor-node node-three">${icon("volume")}</span>
          <span class="sensor-node node-four">${icon("lamp")}</span>
          <div class="visual-label label-top"><strong>ESP32</strong><span>Unidad de comunicación</span></div>
          <div class="visual-label label-bottom"><strong>Monitoreo ambiental</strong><span>Lecturas cada 30 s</span></div>
        </div>
      </section>

      <section class="stats-strip" aria-label="Datos clave del proyecto">
        <div class="stat-item"><span class="stat-value">6</span><span class="stat-label">Sensores del prototipo</span></div>
        <div class="stat-item"><span class="stat-value">30 s</span><span class="stat-label">Frecuencia de lectura</span></div>
        <div class="stat-item"><span class="stat-value">WiFi</span><span class="stat-label">ESP32 → servidor local</span></div>
        <div class="stat-item"><span class="stat-value">ODS 7</span><span class="stat-label">Energía asequible y no contaminante</span></div>
      </section>

      <section class="content-section" id="proyecto">
        <div class="section-heading">
          <span class="eyebrow">Propósito</span>
          <h2>Una gestión de energía más consciente.</h2>
          <p>Sensores accesibles y análisis de datos para dar visibilidad al uso de la iluminación en el entorno educativo.</p>
        </div>
        <div class="mission-grid">
          <article class="info-card">
            <span class="card-icon">${icon("target")}</span>
            <h3>Misión</h3>
            <p>Optimizar el consumo de energía eléctrica en aulas educativas mediante un sistema IoT que automatiza la iluminación según la presencia real de personas.</p>
          </article>
          <article class="info-card">
            <span class="card-icon">${icon("leaf")}</span>
            <h3>Visión</h3>
            <p>Ser un modelo replicable de eficiencia energética para instituciones educativas del Perú, con tecnología accesible, abierta y de bajo costo.</p>
          </article>
        </div>
      </section>

      <section class="process-section" id="funcionamiento">
        <div class="section-heading">
          <span class="eyebrow">Arquitectura</span>
          <h2>Del aula a información útil.</h2>
          <p>El ESP32 envía un JSON por HTTP POST cada 30 segundos; el servidor lo guarda y el panel lo grafica.</p>
        </div>
        <div class="process-track" aria-label="Flujo de datos del sistema">
          <div class="process-step"><span class="step-number">01</span><strong>Sensores</strong><span>Captura ambiental</span></div>
          <div class="process-step"><span class="step-number">02</span><strong>Arduino</strong><span>Control local</span></div>
          <div class="process-step"><span class="step-number">03</span><strong>ESP32</strong><span>Envío por WiFi</span></div>
          <div class="process-step"><span class="step-number">04</span><strong>Servidor</strong><span>Guarda y valida</span></div>
          <div class="process-step"><span class="step-number">05</span><strong>Panel</strong><span>Visualización y exportación</span></div>
        </div>
      </section>

      <aside class="privacy-note">
        <span class="card-icon">${icon("lock")}</span>
        <div><strong>Privacidad desde el diseño</strong><p>El sistema registra presencia, sonido y condiciones ambientales; no identifica a estudiantes ni almacena imágenes o grabaciones.</p></div>
      </aside>
    </main>
    <footer class="public-footer">
      <div class="footer-inner"><span>Universidad César Vallejo · Trujillo · 2026</span><span>Proyecto de eficiencia energética · ODS 7</span></div>
    </footer>
  </div>`;

function navButton(item) {
  return `<button class="nav-item" type="button" data-page="${item.id}" aria-current="${ui.pagina === item.id ? "page" : "false"}">${icon(item.icon)}<span>${item.label}</span></button>`;
}

const renderShell = () => `
  <div class="dashboard">
    <div class="dashboard-shell">
      <aside class="sidebar">
        <a class="brand-lockup" href="#" data-action="open-landing" aria-label="Volver a inicio">
          <span class="brand-mark">AI</span>
          <span class="brand-name">Aula Inteligente<small>Panel de monitoreo</small></span>
        </a>
        <p class="sidebar-label">Espacio de trabajo</p>
        <nav class="sidebar-nav" aria-label="Navegación del panel">
          ${navigation.map((item) => navButton(item)).join("")}
        </nav>
        <div class="sidebar-spacer"></div>
        <div class="demo-card" id="fuente-card">${tarjetaFuente()}</div>
        <div class="sidebar-footer"><span class="avatar" aria-hidden="true">AI</span><span class="profile-copy"><strong>Panel de monitoreo</strong><span>Lecturas del ESP32</span></span></div>
      </aside>
      <div class="main-column">
        <header class="dashboard-header">
          <div class="breadcrumbs"><span id="aula-nombre">${ui.config.nombre_aula.toUpperCase()}</span><strong id="page-breadcrumb">En vivo</strong></div>
          <div class="header-actions">
            <span class="connection-status" id="connection-status"><span class="status-dot" aria-hidden="true"></span>Conectando…</span>
            <span class="header-divider" aria-hidden="true"></span>
            <button class="icon-button" type="button" data-action="refresh" aria-label="Actualizar ahora" title="Actualizar ahora">${icon("refresh")}</button>
          </div>
        </header>
        <div id="global-banner"></div>
        <main class="dashboard-main" id="dashboard-content"></main>
      </div>
    </div>
    <nav class="mobile-bottom-nav" aria-label="Navegación móvil">
      ${["overview", "trends", "energy", "history"].map((id) => navButton(navigation.find((item) => item.id === id))).join("")}
    </nav>
    <div id="toast-root" aria-live="polite"></div>
  </div>`;

/* -------------------------------------- páginas -------------------------------------- */
function ultimaLectura() {
  if (ui.conectado === false) return ui.demo?.lista[ui.demo.lista.length - 1] ?? null;
  return ui.servidor?.ultima_lectura ?? null;
}

function eventosDesdeSerie(puntos) {
  const eventos = [];
  let previa = null;
  for (const p of puntos) {
    if (previa) {
      if (p.presencia !== previa.presencia) {
        eventos.push({
          t: p.t,
          titulo: p.presencia ? "Presencia detectada" : "Aula sin presencia",
          detalle: `Temperatura ${dec(p.temperatura_c)} °C · humedad ${dec(p.humedad, 0)} %`,
          icono: "users",
        });
      }
      if (p.estado_luminarias !== previa.estado_luminarias) {
        eventos.push({
          t: p.t,
          titulo: p.estado_luminarias ? "Iluminación encendida" : "Iluminación apagada",
          detalle: p.estado_luminarias ? "Modo automático · presencia confirmada" : "Sin actividad · modo automático",
          icono: "lamp",
        });
      }
      if (p.modo && previa.modo && p.modo !== previa.modo) {
        eventos.push({ t: p.t, titulo: `Modo ${p.modo.toLowerCase()}`, detalle: "Cambio de modo de control", icono: "settings" });
      }
    }
    previa = p;
  }
  return eventos.slice(-6).reverse();
}

function renderOverview() {
  const u = ultimaLectura();
  const r = ui.resumen;
  const e = ui.energia;
  const estado = estadoConexion();

  const metaTemp = r?.temperatura ? `Mín ${dec(r.temperatura.min)} · Máx ${dec(r.temperatura.max)} · prom ${dec(r.temperatura.prom)}` : "Sin lecturas en el rango";
  const metaHum = r?.humedad ? `Mín ${dec(r.humedad.min, 0)} · Máx ${dec(r.humedad.max, 0)} · prom ${dec(r.humedad.prom, 0)} %` : "Sin lecturas en el rango";
  const metaPres = r ? `Ocupación ${r.presencia_pct} % del rango · ${plural(r.lecturas, "lectura", "lecturas")}` : "Sin lecturas en el rango";
  const metaSonido = r?.sonido?.nivel_prom ? `Nivel promedio ${r.sonido.nivel_prom} · Bajo ${r.sonido.bajo} · Medio ${r.sonido.medio} · Alto ${r.sonido.alto}` : "Lectura relativa · no calibrada";

  const claseTemp = r?.temperatura ? (r.temperatura.max > 30 ? "is-warn" : "is-ok") : "";
  const claseEstado = estado.clase === "ok" ? "is-ok" : estado.clase === "demo" ? "is-warn" : "is-error";

  const controles = `
    ${selectorRango()}
    <button class="button button-small" type="button" data-action="refresh">${icon("refresh")} Actualizar</button>`;

  const cuerpo = `
    <section class="metric-grid" aria-label="Métricas actuales">
      ${metricCard("Temperatura", u && Number.isFinite(u.temperatura_c) ? dec(u.temperatura_c) : "—", u?.temperatura_c != null ? "°C" : "", metaTemp, "thermometer", claseTemp)}
      ${metricCard("Humedad", u && Number.isFinite(u.humedad) ? dec(u.humedad, 0) : "—", u?.humedad != null ? "%" : "", metaHum, "cloud")}
      ${metricCard("Presencia", u?.presencia === true ? "Sí" : u?.presencia === false ? "No" : "—", "", metaPres, "users", u?.presencia ? "is-ok" : "")}
      ${metricCard("Nivel de sonido", presente(u?.sonido), "", metaSonido, "volume")}
      ${metricCard("Luminarias", u?.estado_luminarias === true ? "Encendidas" : u?.estado_luminarias === false ? "Apagadas" : "—", "", u ? `Modo ${String(u.modo || "automático").toLowerCase()} · ${e ? `${dec(e.consumo_automatico_kwh, 2)} kWh consumidos` : "consumo en cálculo"}` : "Sin lecturas en el rango", "lamp", u?.estado_luminarias ? "is-warn" : "")}
      ${metricCard("Dispositivo", estado.texto.split(" · ")[0], "", estadoDetalle(), "device", claseEstado)}
    </section>

    <div class="dashboard-grid">
      <section class="panel" aria-labelledby="chart-panel-title">
        <div class="panel-header">
          <div class="panel-title"><strong id="chart-panel-title">Condiciones del aula</strong><span>Temperatura y humedad · ${ui.rango.toLowerCase()}</span></div>
          <div class="chart-legend"><span class="legend-item"><span class="legend-line"></span>Temp.</span><span class="legend-item"><span class="legend-line humidity"></span>Humedad</span></div>
        </div>
        ${
          ui.serie.length
            ? `<div class="chart-container">${graficoLineas(ui.serie)}</div>${franjasTimeline(ui.serie)}`
            : `<div class="chart-container">${estadoVacio("Sin lecturas todavía", ui.conectado === false ? "Generando datos locales…" : "Esperando que el ESP32 envíe sus primeras lecturas al servidor.")}</div>`
        }
      </section>
      <section class="panel" aria-labelledby="events-panel-title">
        <div class="panel-header"><div class="panel-title"><strong id="events-panel-title">Actividad reciente</strong><span>Cambios detectados en las lecturas</span></div><span class="card-icon">${icon("clock")}</span></div>
        ${
          ui.serie.length
            ? `<div class="event-list">${eventosDesdeSerie(ui.serie).map(renderEvento).join("") || `<div class="event-empty">Sin cambios de estado en el rango seleccionado.</div>`}</div>`
            : `<div class="chart-container">${estadoVacio("Sin eventos", "Aún no hay lecturas suficientes para detectar cambios.")}</div>`
        }
      </section>
    </div>

    <section class="summary-grid" aria-label="Resumen del rango">
      <article class="summary-card">${icono("lamp")}<span class="summary-copy"><span>Luces encendidas en el rango</span><strong>${r ? `${dec(r.horas_luces_encendidas, 2)} h` : "—"}</strong></span></article>
      <article class="summary-card">${icono("users")}<span class="summary-copy"><span>Aula vacía con luces encendidas</span><strong>${r ? `${r.minutos_vacias_con_luces} min` : "—"}</strong></span></article>
      <article class="summary-card">${icono("bolt")}<span class="summary-copy"><span>Consumo automático estimado</span><strong>${e ? `${dec(e.consumo_automatico_kwh, 2)} kWh` : "—"}</strong></span></article>
    </section>
    <p class="dashboard-footer">Fuente: <span>${fuenteTexto()}</span> · Última lectura <span>${u ? fechaHoraDe(u.t || u.fecha_hora) : "—"}</span> · Próxima actualización en <span id="countdown">${ui.restante}</span> s</p>`;

  return paginaCabecera("Resumen del aula", `Lecturas de ${fuenteTexto().toLowerCase()} en tiempo real.`, controles) + cuerpo;
}

function estadoDetalle() {
  if (ui.conectado === false) return "Servidor local desconectado · demo del navegador";
  const s = ui.servidor;
  if (!s) return "Consultando al servidor…";
  if (s.fuente === "simulador") return "Datos simulados · se apaga con el ESP32 real";
  if (s.fuente === "ninguna") return "Esperando la primera lectura";
  const rssi = s.dispositivo?.rssi != null ? `${s.dispositivo.rssi} dBm · ` : "";
  return `${rssi}${hace(s.antiguedad_s)} · firmware ${s.dispositivo?.firmware || "—"}`;
}

function fuenteTexto() {
  if (ui.conectado === false) return "Demo local del navegador";
  const s = ui.servidor;
  if (!s) return "conectando";
  if (s.fuente === "simulador") return "Simulador del servidor (demo)";
  if (s.fuente === "dispositivo") return "ESP32 por WiFi";
  return "sin datos";
}

function renderEvento(ev) {
  return `<div class="event-item"><span class="event-time">${horaDe(ev.t)}</span><span class="event-icon">${icon(ev.icono)}</span><span class="event-text"><strong>${ev.titulo}</strong><span>${ev.detalle}</span></span></div>`;
}

function renderTrends() {
  const r = ui.resumen;
  const controles = `${selectorRango()}<button class="button button-secondary button-small" type="button" data-action="export-serie">${icon("download")} CSV</button>`;
  const cuerpo = `
    <section class="panel section-panel">
      <div class="panel-header">
        <div class="panel-title"><strong>Temperatura y humedad</strong><span>${r?.lecturas ? `${r.lecturas.toLocaleString("es-PE")} lecturas procesadas · ` : ""}${ui.rango.toLowerCase()}</span></div>
        <div class="chart-legend"><span class="legend-item"><span class="legend-line"></span>Temp.</span><span class="legend-item"><span class="legend-line humidity"></span>Humedad</span></div>
      </div>
      ${
        ui.serie.length
          ? `<div class="chart-container">${graficoLineas(ui.serie, { grande: true })}</div>${franjasTimeline(ui.serie)}`
          : `<div class="chart-container">${estadoVacio("Sin datos en el rango", "Selecciona otro rango o espera nuevas lecturas.")}</div>`
      }
    </section>

    <section class="panel section-panel">
      <div class="panel-header"><div class="panel-title"><strong>Ocupación por hora</strong><span>Presencia promedio según la hora de Perú</span></div></div>
      ${ui.serie.length ? graficoOcupacion(ui.serie) : `<div class="chart-container">${estadoVacio("Sin datos", "No hay lecturas para calcular la ocupación.")}</div>`}
    </section>

    <section class="metric-grid section-panel" aria-label="Estadísticos del rango">
      ${metricCard("Temperatura promedio", r?.temperatura ? dec(r.temperatura.prom) : "—", r?.temperatura ? "°C" : "", r?.temperatura ? `Desv. ${dec(r.temperatura.desv)} · mín ${dec(r.temperatura.min)} · máx ${dec(r.temperatura.max)}` : "Sin lecturas", "thermometer")}
      ${metricCard("Humedad promedio", r?.humedad ? dec(r.humedad.prom, 0) : "—", r?.humedad ? "%" : "", r?.humedad ? `Desv. ${dec(r.humedad.desv)} · mín ${dec(r.humedad.min, 0)} · máx ${dec(r.humedad.max, 0)}` : "Sin lecturas", "cloud")}
      ${metricCard("Anomalías detectadas", r ? String(r.anomalias) : "—", "", r ? "Luces encendidas sin presencia" : "Sin lecturas", "alert", r?.anomalias ? "is-warn" : "")}
    </section>
    <p class="dashboard-footer">Fuente: ${fuenteTexto()} · ${r?.desde ? `datos desde ${fechaHoraDe(r.desde)}` : "sin datos"}.</p>`;
  return paginaCabecera("Tendencias", "Comportamiento ambiental y de ocupación del aula.", controles) + cuerpo;
}

function renderEnergy() {
  const e = ui.energia;
  const controles = `<button class="button button-secondary button-small" type="button" data-action="export-energia">${icon("download")} Exportar CSV</button>`;
  const cuerpo = `
    <div class="energy-grid">
      <article class="energy-highlight">
        <span>Ahorro estimado · ${ui.rango.toLowerCase()}</span>
        <div><strong>${e ? `${dec(e.ahorro_pct)} %` : "—"}</strong><p>${e ? `${dec(e.ahorro_kwh, 2)} kWh · S/ ${dec(e.ahorro_soles, 2)} de ahorro` : "Sin lecturas en el rango"}</p></div>
      </article>
      <article class="formula-card">
        <h3>Parámetros del cálculo</h3>
        <span class="formula">${e ? e.formula : "E = P × t / 1000"}</span>
        <div class="field-row">
          <label class="field"><span>Potencia de luminarias (W)</span><input class="input-control" id="cfg-potencia" type="number" min="1" step="1" value="${ui.config.potencia_w}"></label>
          <label class="field"><span>Tarifa por kWh (S/)</span><input class="input-control" id="cfg-tarifa" type="number" min="0" step="0.01" value="${ui.config.tarifa_kwh}"></label>
          <button class="button button-small" type="button" data-action="guardar-config">Guardar</button>
        </div>
      </article>
    </div>

    <section class="metric-grid section-panel" aria-label="Indicadores de energía">
      ${metricCard("Consumo manual (referencia)", e ? dec(e.consumo_manual_kwh, 2) : "—", e ? "kWh" : "", e ? `${dec(e.horas_monitoreadas, 1)} h monitoreadas · luces todo el tiempo` : "Sin lecturas", "bolt")}
      ${metricCard("Consumo automático (medido)", e ? dec(e.consumo_automatico_kwh, 2) : "—", e ? "kWh" : "", e ? `${dec(e.horas_luces_encendidas, 1)} h con luces encendidas` : "Sin lecturas", "bolt", "is-ok")}
      ${metricCard("Ahorro estimado", e ? `S/ ${dec(e.ahorro_soles, 2)}` : "—", "", e ? `Tarifa S/ ${dec(e.tarifa_kwh, 2)} por kWh · ${dec(e.ahorro_kwh, 2)} kWh` : "Sin lecturas", "leaf", "is-ok")}
    </section>

    <section class="metric-grid section-panel" aria-label="Indicadores complementarios">
      ${metricCard("Aula vacía con luces", e ? `${e.minutos_vacias_con_luces}` : "—", e ? "min" : "", "Tiempo encendido sin ocupación", "users", e?.minutos_vacias_con_luces > 0 ? "is-warn" : "")}
      ${metricCard("Lecturas analizadas", e ? e.lecturas.toLocaleString("es-PE") : "—", "", `Fuente: ${fuenteTexto()}`, "activity")}
      ${metricCard("Frecuencia del dispositivo", `${ui.config.frecuencia_s}`, "s", "Intervalo configurado para el ESP32", "clock")}
    </section>

    <section class="panel section-panel">
      <div class="panel-header"><div class="panel-title"><strong>Consumo por modo</strong><span>Comparación del periodo · ${ui.rango.toLowerCase()}</span></div></div>
      ${e && e.lecturas ? graficoConsumo(e) : `<div class="chart-container">${estadoVacio("Sin datos de consumo", "Se necesitan lecturas con el estado de las luminarias para calcular el consumo.")}</div>`}
    </section>
    <p class="dashboard-footer">Estimación con base en las lecturas de ${fuenteTexto().toLowerCase()}. La fórmula y los parámetros son editables y quedan guardados en el servidor.</p>`;
  return paginaCabecera("Energía y ahorro", "Cálculo real a partir del tiempo con luminarias encendidas.", controles) + cuerpo;
}

function renderHistory() {
  const h = ui.historial;
  const total = h.total || 0;
  const desde = total ? h.offset + 1 : 0;
  const hasta = Math.min(h.offset + h.items.length, total);
  const paginas = Math.max(1, Math.ceil(total / h.limit));

  const controles = `
    <label class="sr-only" for="f-presencia">Presencia</label>
    <select class="select-control" id="f-presencia">
      <option value="todos"${ui.filtros.presencia === "todos" ? " selected" : ""}>Presencia: todas</option>
      <option value="1"${ui.filtros.presencia === "1" ? " selected" : ""}>Solo con presencia</option>
      <option value="0"${ui.filtros.presencia === "0" ? " selected" : ""}>Sin presencia</option>
    </select>
    <label class="sr-only" for="f-modo">Modo</label>
    <select class="select-control" id="f-modo">
      <option value=""${!ui.filtros.modo ? " selected" : ""}>Modo: todos</option>
      <option value="automático"${ui.filtros.modo === "automático" ? " selected" : ""}>Automático</option>
      <option value="manual"${ui.filtros.modo === "manual" ? " selected" : ""}>Manual</option>
    </select>
    <label class="check-control"><input type="checkbox" id="f-anomalias"${ui.filtros.anomalias ? " checked" : ""}> Solo anomalías</label>
    <button class="button button-secondary button-small" type="button" data-action="export-csv">${icon("download")} CSV</button>
    <button class="button button-secondary button-small" type="button" data-action="export-json">${icon("download")} JSON</button>`;

  const filas = h.items
    .map((l) => {
      const t = l.t || l.fecha_hora;
      const anomalia = l.estado_luminarias === true && l.presencia === false;
      return `<tr${anomalia ? ' class="row-alert"' : ""}>
      <td>${fechaHoraDe(t)}</td>
      <td>${dec(l.temperatura_c)} °C</td>
      <td>${dec(l.humedad, 0)} %</td>
      <td>${l.presencia === true ? "Sí" : l.presencia === false ? "No" : "—"}</td>
      <td>${presente(l.sonido)}${Number.isFinite(l.nivel_sonido) ? ` (${l.nivel_sonido})` : ""}</td>
      <td><span class="state-label">${l.estado_luminarias === true ? "Encendidas" : l.estado_luminarias === false ? "Apagadas" : "—"}</span></td>
      <td>${presente(l.modo)}</td>
      ${anomalia ? '<td><span class="badge badge-warn">Anomalía</span></td>' : ""}
    </tr>`;
    })
    .join("");

  const cuerpo = `
    <section class="panel section-panel">
      <div class="panel-header">
        <div class="panel-title"><strong>Lecturas registradas</strong><span>${total.toLocaleString("es-PE")} registros en ${ui.rango.toLowerCase()} · ${fuenteTexto()}</span></div>
        <span class="panel-title"><span>Página ${paginas > 1 ? Math.floor(h.offset / h.limit) + 1 : 1} de ${paginas}</span></span>
      </div>
      ${
        h.items.length
          ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Fecha y hora</th><th>Temperatura</th><th>Humedad</th><th>Presencia</th><th>Sonido</th><th>Luminarias</th><th>Modo</th>${ui.filtros.anomalias ? "<th>Estado</th>" : ""}</tr></thead><tbody>${filas}</tbody></table></div>
        <div class="pagination">
          <span>Mostrando ${desde}–${hasta} de ${total.toLocaleString("es-PE")}</span>
          <div class="pagination-buttons">
            <button class="button button-secondary button-small" type="button" data-action="pag-prev" ${h.offset === 0 ? "disabled" : ""}>Anterior</button>
            <button class="button button-secondary button-small" type="button" data-action="pag-next" ${hasta >= total ? "disabled" : ""}>Siguiente</button>
          </div>
        </div>`
          : `<div class="chart-container">${estadoVacio("Sin lecturas con esos filtros", "Cambia los filtros o el rango de tiempo para ver registros.", '<button class="button button-small" type="button" data-action="limpiar-filtros">Limpiar filtros</button>')}</div>`
      }
    </section>
    <p class="dashboard-footer">Filas resaltadas: luminarias encendidas sin presencia (anomalía). La exportación usa los filtros activos.</p>`;
  return paginaCabecera("Historial de lecturas", "Consulta, filtra y exporta los datos registrados.", controles) + cuerpo;
}

function renderDevice() {
  const s = ui.servidor;
  const u = ultimaLectura();
  const conectado = ui.conectado !== false;
  const d = s?.dispositivo || {};
  const estado = estadoConexion();

  const sensores = [
    { nombre: "DHT11 / DHT22", detalle: "Temperatura y humedad", ok: u?.temperatura_c != null, valor: u?.temperatura_c != null ? `${dec(u.temperatura_c)} °C · ${dec(u.humedad, 0)} %` : "sin datos" },
    { nombre: "PIR (presencia)", detalle: "Detección de movimiento", ok: typeof u?.presencia === "boolean", valor: typeof u?.presencia === "boolean" ? (u.presencia ? "detectando" : "sin movimiento") : "sin datos" },
    { nombre: "KY-037 (sonido)", detalle: "Nivel de sonido relativo", ok: u?.nivel_sonido != null, valor: u?.nivel_sonido != null ? `${u.nivel_sonido} · ${u.sonido}` : "sin datos" },
    { nombre: "ACS712 (corriente)", detalle: "Corriente eléctrica", ok: u?.corriente_a != null, valor: u?.corriente_a != null ? `${dec(u.corriente_a, 3)} A` : "sin datos" },
  ];

  const controles = conectado
    ? `${s?.nube ? "" : `<button class="button button-secondary button-small" type="button" data-action="simulador">${s?.simulador_activo ? "Desactivar demo" : "Activar demo"}</button>`}
       <button class="button button-secondary button-small" type="button" data-action="borrar-datos">${icon("trash")} Borrar datos</button>`
    : "";

  const cuerpo = `
    <section class="metric-grid" aria-label="Estado de conexión">
      ${metricCard("Conexión", estado.texto.split(" · ")[0], "", estadoDetalle(), "device", estado.clase === "ok" ? "is-ok" : estado.clase === "demo" ? "is-warn" : "is-error")}
      ${metricCard("Última lectura", u ? fechaHoraDe(u.t || u.fecha_hora) : "—", "", u ? hace(Math.max(0, Math.round((Date.now() - fecha(u.t || u.fecha_hora).getTime()) / 1000))) : "Sin lecturas", "clock")}
      ${metricCard("Señal Wi-Fi", d.rssi != null ? String(d.rssi) : "—", d.rssi != null ? "dBm" : "", d.rssi != null ? `RSSI reportado por el ESP32 ${d.rssi < -75 ? "· señal débil" : "· señal aceptable"}` : "Disponible al enviar datos", "wifi", d.rssi != null && d.rssi < -75 ? "is-warn" : "")}
    </section>

    <section class="panel section-panel">
      <div class="panel-header">
        <div class="panel-title"><strong>Dispositivo</strong><span>${d.id ? `Identificador ${d.id}` : "Sin identificador"}</span></div>
        <span class="badge ${estado.clase === "ok" ? "badge-ok" : estado.clase === "demo" ? "badge-warn" : "badge-danger"}">${estado.texto}</span>
      </div>
      <div class="event-list">
        <div class="event-item"><span class="event-icon">${icon("wifi")}</span><span class="event-text"><strong>Dirección de envío (POST)</strong><span>${s?.endpoints?.ingesta || "http://<tu-ip>:3000/api/lecturas"}</span></span><button class="icon-button" type="button" data-action="copiar-endpoint" aria-label="Copiar dirección" title="Copiar">${icon("copy")}</button></div>
        <div class="event-item"><span class="event-icon">${icon("lock")}</span><span class="event-text"><strong>Clave del dispositivo</strong><span>Header x-device-key: ${ui.config.clave_dispositivo || "(sin clave)"}</span></span></div>
        <div class="event-item"><span class="event-icon">${icon("clock")}</span><span class="event-text"><strong>Frecuencia de envío</strong><span>Cada ${ui.config.frecuencia_s} s · enlace activo hace ${Math.round((s?.dispositivo?.tiempo_encendido_s || 0) / 60)} min</span></span></div>
        <div class="event-item"><span class="event-icon">${icon("activity")}</span><span class="event-text"><strong>Lecturas recibidas vs esperadas</strong><span>${d.recibidas != null ? `${d.recibidas.toLocaleString("es-PE")} recibidas de ${d.esperadas != null ? d.esperadas.toLocaleString("es-PE") : "—"} esperadas · ${d.exito_pct != null ? d.exito_pct : "—"} % exitosas` : "Sin datos de envío"}</span></span></div>
        <div class="event-item"><span class="event-icon">${icon("cloud")}</span><span class="event-text"><strong>Firmware e IP</strong><span>${d.firmware || "—"} · última IP ${d.ip_ultima || "—"}</span></span></div>
        <div class="event-item"><span class="event-icon">${icon("refresh")}</span><span class="event-text"><strong>Origen de los datos</strong><span>${fuenteTexto()}${s?.total_lecturas ? ` · ${s.total_lecturas.toLocaleString("es-PE")} lecturas disponibles` : ""}</span></span></div>
      </div>
    </section>

    <section class="panel section-panel">
      <div class="panel-header"><div class="panel-title"><strong>Sensores</strong><span>Estado según la última lectura recibida</span></div></div>
      <div class="event-list">
        ${sensores
          .map(
            (x) => `<div class="event-item"><span class="event-icon">${icon(x.ok ? "check" : "alert")}</span><span class="event-text"><strong>${x.nombre}</strong><span>${x.detalle} · ${x.valor}</span></span><span class="badge ${x.ok ? "badge-ok" : "badge-danger"}">${x.ok ? "Recibiendo" : "Sin datos"}</span></div>`,
          )
          .join("")}
      </div>
    </section>

    <section class="panel section-panel">
      <div class="panel-header"><div class="panel-title"><strong>Plantilla de envío</strong><span>Copia este JSON en el ESP32, Postman o curl para probar</span></div></div>
      <pre class="code-block">POST /api/lecturas HTTP/1.1
Content-Type: application/json
x-device-key: ${ui.config.clave_dispositivo || "tu-clave"}

{
  "temperatura_c": 24.5,
  "humedad": 58,
  "presencia": 1,
  "nivel_sonido": 312,
  "estado_luminarias": 1,
  "modo": "auto",
  "corriente_a": 0.18,
  "rssi_wifi": -58,
  "firmware": "1.0.0"
}</pre>
    </section>
    <p class="dashboard-footer">${conectado ? (s?.nube ? "Lecturas guardadas en la base SQL de la nube (Turso)." : "Al llegar una lectura real, el simulador se desactiva automáticamente.") : "Sin servidor local: esta vista no puede consultar el estado del ESP32."}</p>`;

  return paginaCabecera("Estado del dispositivo", "Conectividad del ESP32, sensores y calidad de los envíos.", controles) + cuerpo;
}

const pageContent = {
  overview: renderOverview,
  trends: renderTrends,
  energy: renderEnergy,
  history: renderHistory,
  device: renderDevice,
};

function renderPage() {
  const contenido = document.querySelector("#dashboard-content");
  if (!contenido) return;
  contenido.innerHTML = pageContent[ui.pagina]();
  document.querySelectorAll(".nav-item[data-page]").forEach((boton) => {
    boton.setAttribute("aria-current", boton.dataset.page === ui.pagina ? "page" : "false");
  });
  const miga = document.querySelector("#page-breadcrumb");
  if (miga) miga.textContent = navigation.find((item) => item.id === ui.pagina)?.label || "Panel";
}

/* -------------------------------------- acciones -------------------------------------- */
function abrirPanel() {
  detenerTemporizadores();
  ui.pagina = "overview";
  ui.cargando = true;
  app.innerHTML = renderShell();
  renderPage();
  cargarDatos({ forzar: true });
  arrancarTemporizadores();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirLanding() {
  detenerTemporizadores();
  app.innerHTML = renderLanding();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function detenerTemporizadores() {
  window.clearInterval(ui.temporizadorDato);
  window.clearInterval(ui.temporizadorSeg);
}

function arrancarTemporizadores() {
  detenerTemporizadores();
  ui.restante = POLL_S;
  ui.temporizadorDato = window.setInterval(() => cargarDatos(), POLL_S * 1000);
  ui.temporizadorSeg = window.setInterval(() => {
    if (ui.conectado === false) tickDemoLocal();
    ui.restante -= 1;
    if (ui.restante <= 0) ui.restante = POLL_S;
    const nodo = document.querySelector("#countdown");
    if (nodo) nodo.textContent = String(ui.restante);
  }, 1000);
}

function showToast(mensaje) {
  const raiz = document.querySelector("#toast-root");
  if (!raiz) return;
  window.clearTimeout(ui.toast);
  raiz.innerHTML = `<div class="toast" role="status">${mensaje}</div>`;
  ui.toast = window.setTimeout(() => {
    const toast = raiz.querySelector(".toast");
    if (toast) toast.remove();
  }, 2800);
}

/* ------------------------------------ exportación ------------------------------------ */
function celdaCSV(valor) {
  if (valor === null || valor === undefined) return '""';
  return `"${String(valor).replaceAll('"', '""')}"`;
}

function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

const fechaSello = () => new Date().toISOString().slice(0, 10).replaceAll("-", "");

function exportarCSVCliente(nombre, columnas, filas) {
  const csv = "\uFEFF" + [columnas, ...filas].map((f) => f.map(celdaCSV).join(",")).join("\r\n");
  descargar(nombre, csv, "text/csv;charset=utf-8");
  showToast("Archivo CSV generado.");
}

function exportarHistorialServidor(formato) {
  const params = new URLSearchParams({ rango: rangoActual(), formato });
  if (ui.filtros.presencia !== "todos") params.set("presencia", ui.filtros.presencia);
  if (ui.filtros.modo && ui.filtros.modo !== "todos") params.set("modo", ui.filtros.modo);
  if (ui.filtros.anomalias) params.set("anomalias", "1");
  const enlace = document.createElement("a");
  enlace.href = `/api/exportar?${params.toString()}`;
  enlace.click();
  showToast(`Descargando ${formato.toUpperCase()} con los filtros activos.`);
}

const COLUMNAS_HISTORIAL = ["Fecha y hora (Perú)", "Temperatura (°C)", "Humedad (%)", "Presencia", "Sonido", "Nivel", "Luminarias", "Modo", "Corriente (A)"];

function filasHistorial(lista) {
  return lista.map((l) => [
    fechaHoraDe(l.t || l.fecha_hora),
    l.temperatura_c,
    l.humedad,
    l.presencia === true ? "Sí" : "No",
    l.sonido,
    l.nivel_sonido,
    l.estado_luminarias === true ? "Encendidas" : "Apagadas",
    l.modo,
    l.corriente_a,
  ]);
}

function exportarHistorial(formato) {
  if (ui.conectado) {
    exportarHistorialServidor(formato);
    return;
  }
  if (formato === "json") {
    const lista = ventanaLocal(ui.demo.lista).slice().reverse();
    descargar(`lecturas-aula-${fechaSello()}.json`, JSON.stringify(lista, null, 2), "application/json");
    showToast("Archivo JSON generado.");
    return;
  }
  exportarCSVCliente(`lecturas-aula-${fechaSello()}.csv`, COLUMNAS_HISTORIAL, filasHistorial(ventanaLocal(ui.demo.lista).slice().reverse()));
}

function exportarSerie() {
  exportarCSVCliente(
    `serie-aula-${fechaSello()}.csv`,
    ["Fecha y hora (Perú)", "Temperatura (°C)", "Humedad (%)", "Presencia (%)", "Luminarias", "Sonido", "Modo"],
    ui.serie.map((p) => [
      fechaHoraDe(p.t),
      p.temperatura_c,
      p.humedad,
      p.presencia_pct,
      p.estado_luminarias === true ? "Encendidas" : "Apagadas",
      p.sonido,
      p.modo,
    ]),
  );
}

function exportarEnergia() {
  const e = ui.energia;
  if (!e) return showToast("No hay datos de energía para exportar.");
  exportarCSVCliente(
    `energia-aula-${fechaSello()}.csv`,
    ["Indicador", "Valor"],
    [
      ["Rango", ui.rango],
      ["Fuente", fuenteTexto()],
      ["Lecturas analizadas", e.lecturas],
      ["Potencia de luminarias (W)", e.potencia_w],
      ["Tarifa por kWh (S/)", e.tarifa_kwh],
      ["Horas monitoreadas", e.horas_monitoreadas],
      ["Horas con luces encendidas", e.horas_luces_encendidas],
      ["Minutos aula vacía con luces", e.minutos_vacias_con_luces],
      ["Consumo manual (kWh)", e.consumo_manual_kwh],
      ["Consumo automático (kWh)", e.consumo_automatico_kwh],
      ["Ahorro (kWh)", e.ahorro_kwh],
      ["Ahorro (%)", e.ahorro_pct],
      ["Ahorro (S/)", e.ahorro_soles],
      ["Temperatura mín (°C)", e.temperatura?.min ?? ""],
      ["Temperatura prom (°C)", e.temperatura?.prom ?? ""],
      ["Temperatura máx (°C)", e.temperatura?.max ?? ""],
      ["Humedad mín (%)", e.humedad?.min ?? ""],
      ["Humedad prom (%)", e.humedad?.prom ?? ""],
      ["Humedad máx (%)", e.humedad?.max ?? ""],
      ["Fórmula", e.formula],
    ],
  );
}

/* -------------------------------------- eventos -------------------------------------- */
document.addEventListener("click", async (evento) => {
  const destino = evento.target instanceof Element ? evento.target.closest("[data-action], [data-page]") : null;
  if (!destino) return;

  if (destino.dataset.action === "open-dashboard") abrirPanel();
  if (destino.dataset.action === "open-landing") {
    evento.preventDefault();
    abrirLanding();
  }
  if (destino.dataset.action === "refresh" || destino.dataset.action === "retry") {
    showToast("Actualizando…");
    await cargarDatos({ forzar: true });
  }
  if (destino.dataset.action === "export-csv") exportarHistorial("csv");
  if (destino.dataset.action === "export-json") exportarHistorial("json");
  if (destino.dataset.action === "export-serie") exportarSerie();
  if (destino.dataset.action === "export-energia") exportarEnergia();

  if (destino.dataset.action === "pag-prev" && ui.paginaHistorial > 0) {
    ui.paginaHistorial -= 1;
    await cargarDatos({ forzar: true });
  }
  if (destino.dataset.action === "pag-next") {
    ui.paginaHistorial += 1;
    await cargarDatos({ forzar: true });
  }
  if (destino.dataset.action === "limpiar-filtros") {
    ui.filtros = { presencia: "todos", modo: "", anomalias: false };
    ui.paginaHistorial = 0;
    await cargarDatos({ forzar: true });
  }

  if (destino.dataset.action === "guardar-config") {
    const potencia = Number(document.querySelector("#cfg-potencia")?.value);
    const tarifa = Number(document.querySelector("#cfg-tarifa")?.value);
    if (!Number.isFinite(potencia) || potencia <= 0 || !Number.isFinite(tarifa) || tarifa < 0) {
      return showToast("Revisa los valores: potencia > 0 y tarifa ≥ 0.");
    }
    if (ui.conectado === false) {
      ui.config.potencia_w = potencia;
      ui.config.tarifa_kwh = tarifa;
      ui.energia = energiaLocal(potencia, tarifa);
      renderPage();
      return showToast("Parámetros guardados en este navegador.");
    }
    try {
      ui.config = await api("/api/configuracion", { method: "POST", body: JSON.stringify({ potencia_w: potencia, tarifa_kwh: tarifa }) });
      await cargarDatos({ forzar: true });
      showToast("Parámetros guardados en el servidor.");
    } catch (error) {
      showToast(`No se pudo guardar: ${error.message}`);
    }
  }

  if (destino.dataset.action === "simulador") {
    try {
      const actual = ui.servidor?.simulador_activo;
      await api("/api/simulador", { method: "POST", body: JSON.stringify({ activo: !actual }) });
      await cargarDatos({ forzar: true });
      showToast(actual ? "Simulador desactivado." : "Simulador activado.");
    } catch (error) {
      showToast(`No se pudo cambiar el simulador: ${error.message}`);
    }
  }

  if (destino.dataset.action === "borrar-datos") {
    const fuente = ui.servidor?.fuente === "simulador" ? "simulador" : "dispositivo";
    const aviso = fuente === "simulador"
      ? "¿Borrar las lecturas simuladas?"
      : "¿Borrar TODAS las lecturas reales guardadas? Esta acción no se puede deshacer.";
    if (!window.confirm(aviso)) return;
    try {
      await api(`/api/lecturas${fuente === "simulador" ? "?fuente=simulador" : ""}`, { method: "DELETE" });
      await cargarDatos({ forzar: true });
      showToast("Datos eliminados.");
    } catch (error) {
      showToast(`No se pudo borrar: ${error.message}`);
    }
  }

  if (destino.dataset.action === "copiar-endpoint") {
    const texto = ui.servidor?.endpoints?.ingesta || "";
    try {
      await navigator.clipboard.writeText(texto);
      showToast("Dirección copiada.");
    } catch {
      showToast(texto);
    }
  }

  if (destino.dataset.page && pageContent[destino.dataset.page]) {
    ui.pagina = destino.dataset.page;
    ui.paginaHistorial = 0;
    renderPage();
    await cargarDatos({ forzar: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

document.addEventListener("change", async (evento) => {
  const objetivo = evento.target;
  if (!(objetivo instanceof HTMLSelectElement || objetivo instanceof HTMLInputElement)) return;

  if (objetivo.id === "range-select") {
    ui.rango = objetivo.value;
    ui.paginaHistorial = 0;
    renderPage();
    await cargarDatos({ forzar: true });
  }
  if (objetivo.id === "f-presencia") {
    ui.filtros.presencia = objetivo.value;
    ui.paginaHistorial = 0;
    await cargarDatos({ forzar: true });
  }
  if (objetivo.id === "f-modo") {
    ui.filtros.modo = objetivo.value;
    ui.paginaHistorial = 0;
    await cargarDatos({ forzar: true });
  }
  if (objetivo.id === "f-anomalias") {
    ui.filtros.anomalias = objetivo.checked;
    ui.paginaHistorial = 0;
    await cargarDatos({ forzar: true });
  }
});

/* --------------------------------------- arranque --------------------------------------- */
abrirLanding();
