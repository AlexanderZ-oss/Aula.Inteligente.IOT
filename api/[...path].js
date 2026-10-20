// Punto de entrada serverless para Vercel.
// Todas las rutas /api/* llegan a esta función, que reutiliza el mismo
// enrutador del servidor local (server.js → manejar).
import { manejar } from "../server.js";

export default function handler(req, res) {
  return manejar(req, res);
}
