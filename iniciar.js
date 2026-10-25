// Arranque del servidor local (npm start / npm run dev).
// En Vercel este archivo no se ejecuta: la función usa server.js → manejar.
import { arrancar, cerrar } from "./server.js";

process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);

arrancar().catch((error) => {
  console.error("[arranque]", error);
  process.exit(1);
});
