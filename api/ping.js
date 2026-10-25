// Prueba mínima: comprueba que las funciones de Vercel funcionan.
// No importa nada del proyecto, así que si falla el problema es del despliegue.
export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(
    JSON.stringify({
      ok: true,
      mensaje: "La función serverless funciona.",
      hora: new Date().toISOString(),
      node: process.version,
    }),
  );
}
