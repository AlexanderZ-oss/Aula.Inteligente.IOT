// =============================================================================
// Aplica schema.sql a tu base de Turso desde tu PC.
// Muestra el error real del servidor si algo falla (el panel de Turso a veces
// devuelve un mensaje genérico).
//
// Uso (PowerShell):
//   $env:TURSO_DATABASE_URL = "libsql://aula-inteligente-....turso.io"
//   $env:TURSO_AUTH_TOKEN   = "eyJ..."
//   node aplicar-esquema.mjs
//
// También se puede pasar por argumentos:
//   node aplicar-esquema.mjs "libsql://..." "eyJ..."
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client/http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const [urlArg, tokenArg] = process.argv.slice(2);
const url = urlArg || process.env.TURSO_DATABASE_URL;
const authToken = tokenArg || process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Faltan datos de conexión.");
  console.error("Define TURSO_DATABASE_URL y TURSO_AUTH_TOKEN, o pásalos como argumentos.");
  process.exit(1);
}

if (!/^(libsql|https?|wss?):\/\//i.test(url)) {
  console.error(`URL inválida: "${url}".`);
  console.error("Debe empezar por libsql:// (por ejemplo: libsql://aula-inteligente-....turso.io)");
  process.exit(1);
}

const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
const cliente = createClient({ url, authToken });

try {
  console.log("Conectando a", url);
  await cliente.executeMultiple(sql);
  console.log("Esquema aplicado correctamente.");

  const tablas = await cliente.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  console.log("Tablas:", tablas.rows.map((fila) => fila.name).join(", "));

  const config = await cliente.execute("SELECT COUNT(*) AS n FROM configuracion");
  const filaConfig = config.rows[0];
  console.log("Configuración:", Number(filaConfig.n ?? filaConfig[0]), "filas");

  const lecturas = await cliente.execute("SELECT COUNT(*) AS n FROM lecturas");
  const filaLecturas = lecturas.rows[0];
  console.log("Lecturas:", Number(filaLecturas.n ?? filaLecturas[0]), "filas (debe ser 0)");
  console.log("\nListo. La base está preparada para recibir datos del ESP32.");
} catch (error) {
  console.error("\nERROR al aplicar el esquema:");
  console.error(error.message);
  if (error.code) console.error("Código:", error.code);
  if (error.cause) console.error("Causa:", error.cause);
  process.exit(1);
}
