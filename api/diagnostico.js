// Diagnóstico de configuración: no se conecta a la base de datos.
// Sirve para confirmar que las variables de entorno llegaron bien a Vercel.
export default function handler(req, res) {
  const url = process.env.TURSO_DATABASE_URL || "";
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(
    JSON.stringify({
      ok: true,
      hora: new Date().toISOString(),
      node: process.version,
      vercel: Boolean(process.env.VERCEL),
      turso_url_configurada: Boolean(url),
      turso_url_valida: /^libsql:\/\//i.test(url),
      turso_token_configurado: Boolean(process.env.TURSO_AUTH_TOKEN),
    }),
  );
}
