# Aula Inteligente — Panel IoT con base de datos SQL

Panel web para monitorear el aula con un **ESP32 por WiFi**: temperatura, humedad, presencia, sonido y luminarias. Incluye gráficos, cálculo de consumo eléctrico, historial y exportación CSV/JSON.

- **En local** usa SQLite (`data/aula.db`) y no requiere configurar nada.
- **En la nube** usa **Turso** (SQLite serverless) y se despliega en **Vercel**.

## Arquitectura

```
ESP32 ──HTTPS POST──► Vercel (api/[...path].js) ──► Turso (SQL)
                              │
Navegador ────────────────────┘  sirve el panel estático
```

## 1. Base de datos SQL

El esquema está en [`schema.sql`](schema.sql). Este es el código:

```sql
CREATE TABLE IF NOT EXISTS lecturas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_hora        TEXT    NOT NULL,              -- ISO-8601 UTC
  temperatura_c     REAL,
  humedad           REAL,
  presencia         INTEGER,                       -- 1 = sí, 0 = no, NULL = sin dato
  sonido            TEXT,                          -- Bajo | Medio | Alto | —
  nivel_sonido      INTEGER,
  estado_luminarias INTEGER,                       -- 1 = encendidas, 0 = apagadas
  modo              TEXT,                          -- Automático | Manual
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
```

> El servidor aplica este esquema automáticamente al arrancar. Puedes ejecutarlo a mano si prefieres.

## 2. Crear la base de datos en Turso (gratis)

1. Crea una cuenta en **https://turso.tech** (puedes entrar con GitHub).
2. Crea una base de datos llamada `aula-inteligente`.
3. Copia estos dos datos (botón **Connect** de la base):
   - **URL**: `libsql://aula-inteligente-tu-usuario.turso.io`
   - **Token**: un token de acceso (Database → Create Token).
4. (Opcional) Aplica el esquema con la CLI:
   ```bash
   turso db shell aula-inteligente < schema.sql
   ```

También puedes pegar el contenido de `schema.sql` en el **SQL shell** del panel de Turso.

## 3. Desplegar en Vercel

1. Sube este proyecto a tu repositorio de GitHub (rama `main`).
2. En **https://vercel.com/new** importa el repositorio.
3. Framework: **Other**. No cambies el directorio de salida.
4. En **Environment Variables** agrega:
   | Variable | Valor |
   |---|---|
   | `TURSO_DATABASE_URL` | `libsql://aula-inteligente-tu-usuario.turso.io` |
   | `TURSO_AUTH_TOKEN` | el token de Turso |
5. **Deploy**. Vercel detecta la carpeta `api/` y publica:
   - Panel: `https://tu-proyecto.vercel.app`
   - Ingesta ESP32: `https://tu-proyecto.vercel.app/api/lecturas`

Sin las variables de Turso, la API responde con un error claro indicando que falta configurarlas.

## 4. Ejecutar en local

```bash
npm install
npm start
```

- Panel: **http://localhost:3000**
- Base de datos: `data/aula.db` (SQLite, se crea sola)
- Si no hay lecturas reales, se activa el **modo demostración** (solo en local).

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor local en el puerto 3000 |
| `npm run dev` | Igual, reiniciando al editar `server.js` |
| `npm run probar` | Envía 60 lecturas de prueba (simula el ESP32) |

Prueba contra la nube:

```bash
node simular-esp32.js 20 https://tu-proyecto.vercel.app
```

## 5. Conectar el ESP32

El sketch está en `firmware/esp32_aula/esp32_aula.ino`. Edita:

```cpp
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASS = "TU_CLAVE";
const char* SERVIDOR  = "https://tu-proyecto.vercel.app/api/lecturas";
const char* CLAVE_DISPOSITIVO = "esp32-aula1";
```

El firmware ya soporta **HTTPS** (Vercel) y HTTP (servidor local). Envía una lectura cada 30 s y guarda hasta 30 en cola si se cae el WiFi.

Prueba manual con curl:

```bash
curl -X POST https://tu-proyecto.vercel.app/api/lecturas ^
  -H "Content-Type: application/json" ^
  -H "x-device-key: esp32-aula1" ^
  -d "{\"temperatura_c\":23.5,\"humedad\":58,\"presencia\":1,\"nivel_sonido\":210,\"estado_luminarias\":1,\"modo\":\"auto\",\"corriente_a\":0.42}"
```

> En PowerShell la continuación de línea es `` ` `` en lugar de `^`; en Linux/macOS usa `\`.

## 6. Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/lecturas` | Ingesta del ESP32 (header `x-device-key`) |
| `GET` | `/api/lecturas` | Historial con filtros y paginación |
| `DELETE` | `/api/lecturas` | Borra todas las lecturas |
| `GET` | `/api/lecturas/ultima` | Última lectura |
| `GET` | `/api/serie` | Serie para gráficos (`?rango=24h&max=120`) |
| `GET` | `/api/resumen` | KPIs y estadísticas |
| `GET` | `/api/energia` | Consumo y ahorro (kWh y S/) |
| `GET` | `/api/estado` | Estado del servidor y del dispositivo |
| `GET` | `/api/exportar` | CSV/JSON/XLS (`?formato=csv`) |
| `GET/POST` | `/api/configuracion` | Aula, potencia, tarifa |
| `POST` | `/api/simulador` | Demo (solo local) |

Filtros del historial: `rango`, `presencia` (`1`/`0`), `modo`, `anomalias=1`, `orden`, `limit`, `offset`.

## 7. Estructura

```
├── index.html            Panel (landing + dashboard)
├── app.js                Lógica y gráficos del panel
├── styles.css
├── server.js             API + servidor local (módulo compartido)
├── db.js                 Capa SQL (SQLite local / Turso)
├── schema.sql            Esquema SQL de la base de datos
├── api/[...path].js      Función serverless de Vercel
├── simular-esp32.js      Emulador del dispositivo
├── firmware/esp32_aula/  Sketch de Arduino IDE
├── data/aula.db          SQLite local (no se sube a Git)
└── .env.example          Variables para Turso
```

## 8. Solución de problemas

| Problema | Solución |
|---|---|
| `Falta configurar la base de datos en Vercel` | Agrega `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en Vercel y redeploy |
| El ESP32 responde 401 | La clave del firmware debe coincidir con `clave_dispositivo` (por defecto `esp32-aula1`) |
| No conecta desde el ESP32 | Verifica la URL completa con `/api/lecturas` y que sea `https://` en Vercel |
| `EADDRINUSE` en local | El puerto 3000 está ocupado: cierra el otro proceso o usa `set PORT=3001 && npm start` |
| Quiero borrar los datos | Botón **Borrar datos** en el panel, o `curl -X DELETE https://tu-proyecto.vercel.app/api/lecturas` |
| Datos antiguos en local | Se guardan en `data/aula.db`; bórralo para empezar de cero |

## Seguridad

La ingesta exige el header `x-device-key` (configurable). Es una protección básica para un proyecto académico: no expongas datos sensibles reales sin añadir autenticación de usuarios.
