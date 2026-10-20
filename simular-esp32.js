// Emulador del ESP32 para pruebas — envía lecturas al servidor igual que el hardware.
//
//   node simular-esp32.js                 -> 20 lecturas a http://localhost:3000
//   node simular-esp32.js 100             -> 100 lecturas (1 cada 30 s => ~50 min)
//   node simular-esp32.js 10 http://192.168.1.20:3000
//   node simular-esp32.js 10 https://tu-proyecto.vercel.app
//
// La clave se puede cambiar con la variable DEVICE_KEY.
//
// El servidor apaga el modo demostración automáticamente al recibir la primera.
const cantidad = Math.max(1, Number(process.argv[2]) || 20);
const servidor = process.argv[3] || "http://localhost:3000";
const CLAVE = process.env.DEVICE_KEY || "esp32-aula1";
const INTERVALO_MS = 30000;

let temp = 24.5;
let hum = 58;
let presencia = true;

function lectura(fecha) {
  temp += (Math.random() - 0.5) * 0.4;
  temp = Math.min(27, Math.max(22, temp));
  hum += (Math.random() - 0.5) * 2;
  hum = Math.min(70, Math.max(45, hum));
  if (Math.random() < 0.15) presencia = !presencia;
  const nivel = presencia ? Math.round(260 + Math.random() * 450) : Math.round(140 + Math.random() * 140);
  return {
    temperatura_c: Number(temp.toFixed(1)),
    humedad: Math.round(hum),
    presencia: presencia ? 1 : 0,
    nivel_sonido: nivel,
    estado_luminarias: presencia ? 1 : 0,
    modo: "auto",
    corriente_a: presencia ? 0.18 : 0.02,
    rssi_wifi: -(50 + Math.round(Math.random() * 20)),
    firmware: "1.0.0",
    fecha_hora: fecha.toISOString(),
  };
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function enviar(cuerpo) {
  const res = await fetch(`${servidor}/api/lecturas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-key": CLAVE },
    body: JSON.stringify(cuerpo),
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${datos.error || ""}`);
  return datos;
}

async function main() {
  console.log(`Enviando ${cantidad} lecturas a ${servidor}/api/lecturas`);
  let recibidas = 0;
  for (let i = cantidad; i >= 1; i--) {
    const fecha = new Date(Date.now() - i * INTERVALO_MS);
    try {
      await enviar(lectura(fecha));
      recibidas += 1;
    } catch (error) {
      console.error(`Fallo en la lectura ${cantidad - i + 1}: ${error.message}`);
      console.error("¿Está el servidor activo? Ejecuta: npm start");
      process.exit(1);
    }
  }
  console.log(`Listo: ${recibidas} lecturas enviadas. Abre el panel para verlas.`);
  console.log("El simulador del servidor (modo local) se desactiva solo.");
  console.log("Puedes borrar estas lecturas desde la página Dispositivo → 'Borrar datos'.");
}

main();
