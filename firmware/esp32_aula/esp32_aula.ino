// =============================================================================
// Aula Inteligente — ESP32 (ejemplo de envío de lecturas por WiFi)
// -----------------------------------------------------------------------------
// Recibe del Arduino por serial (JSON en una línea) las lecturas de los
// sensores y las envía al servidor local cada 30 segundos por HTTP POST.
//
//   Arduino  --(JSON por serial 115200)-->  ESP32  --(HTTP POST WiFi)-->  panel
//
// Línea esperada del Arduino (una sola línea terminada en \n):
//   {"temperatura_c":24.5,"humedad":58,"presencia":1,"nivel_sonido":312,
//    "estado_luminarias":1,"modo":"auto","corriente_a":0.18}
//
// Configura WIFI_SSID, WIFI_PASS y SERVIDOR antes de subir el programa.
// Requiere: placa "ESP32 Dev Module" (Arduino IDE) y la librería ArduinoJson
//   (Gestor de bibliotecas -> buscar "ArduinoJson" de Benoit Blanchon).
// =============================================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ------------------------- CONFIGURACIÓN DEL USUARIO -------------------------
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASS = "TU_CONTRASENA";

// URL completa del servidor.
//   Nube (Vercel):  https://TU-PROYECTO.vercel.app/api/lecturas
//   Local:          http://192.168.1.10:3000/api/lecturas  (IP de la PC)
// Si usas HTTPS (Vercel) el programa acepta el certificado automáticamente.
const char* SERVIDOR = "https://TU-PROYECTO.vercel.app/api/lecturas";

const char* CLAVE_DISPOSITIVO = "esp32-aula1";  // debe coincidir con el panel
const char* ID_DISPOSITIVO   = "esp32-aula1";
const char* FIRMWARE         = "1.0.0";

const uint32_t INTERVALO_MS = 30000;   // una lectura cada 30 s (como el informe)
const uint32_t REINTENTOS   = 3;
const int      BAUD_ARDUINO = 115200;
// -----------------------------------------------------------------------------

HardwareSerial& SerialArduino = Serial2;  // RX2 = GPIO16, TX2 = GPIO17
String bufferSerial;

// Cola de lecturas pendientes: si se pierde el WiFi no se pierden los datos.
#define MAX_PENDIENTES 30
String pendientes[MAX_PENDIENTES];
int colaInicio = 0, colaFin = 0, colaTam = 0;

uint32_t ultimoEnvio = 0;
uint32_t inicio = 0;

void conectarWiFi() {
  Serial.printf("[WiFi] Conectando a %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 40) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Conectado. IP: %s  RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] Sin conexión. Se reintentará en el próximo ciclo.");
  }
}

// Lee una línea JSON del Arduino. Devuelve true si llegó una lectura completa.
bool leerArduino(JsonDocument& doc) {
  while (SerialArduino.available()) {
    char c = SerialArduino.read();
    if (c == '\n') {
      bufferSerial.trim();
      if (bufferSerial.length() > 0) {
        bool ok = deserializeJson(doc, bufferSerial) == DeserializationError::Ok;
        bufferSerial = "";
        return ok;
      }
    } else if (bufferSerial.length() < 300) {
      bufferSerial += c;
    }
  }
  return false;
}

String construirPayload(JsonDocument& lectura) {
  JsonDocument payload;
  payload["temperatura_c"]       = lectura["temperatura_c"];
  payload["humedad"]             = lectura["humedad"];
  payload["presencia"]           = lectura["presencia"] | false;
  payload["nivel_sonido"]        = lectura["nivel_sonido"];
  payload["estado_luminarias"]   = lectura["estado_luminarias"] | false;
  payload["modo"]                = lectura["modo"] | "auto";
  payload["corriente_a"]         = lectura["corriente_a"];
  payload["rssi_wifi"]           = WiFi.RSSI();
  payload["id_dispositivo"]      = ID_DISPOSITIVO;
  payload["firmware"]            = FIRMWARE;
  payload["fecha_hora"]          = "";
  String salida;
  serializeJson(payload, salida);
  return salida;
}

bool enviar(const String& cuerpo) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  WiFiClientSecure seguro;
  if (String(SERVIDOR).startsWith("https://")) {
    seguro.setInsecure();  // acepta el certificado del servidor (proyecto escolar)
    http.begin(seguro, SERVIDOR);
  } else {
    http.begin(SERVIDOR);
  }
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", CLAVE_DISPOSITIVO);
  int codigo = http.POST(cuerpo);
  String respuesta = http.getString();
  http.end();

  if (codigo >= 200 && codigo < 300) {
    Serial.printf("[HTTP] Lectura enviada (%d)\n", codigo);
    return true;
  }
  Serial.printf("[HTTP] Error %d: %s\n", codigo, respuesta.c_str());
  return false;
}

void encolar(const String& cuerpo) {
  if (colaTam >= MAX_PENDIENTES) {  // cola llena: se descarta la más antigua
    colaInicio = (colaInicio + 1) % MAX_PENDIENTES;
    colaTam--;
  }
  pendientes[colaFin] = cuerpo;
  colaFin = (colaFin + 1) % MAX_PENDIENTES;
  colaTam++;
}

void reenviarPendientes() {
  while (colaTam > 0) {
    String cuerpo = pendientes[colaInicio];
    bool ok = false;
    for (uint32_t intento = 0; intento < REINTENTOS && !ok; intento++) {
      ok = enviar(cuerpo);
      if (!ok) delay(1000);
    }
    if (!ok) break;  // sigue sin red: se guarda para el próximo ciclo
    colaInicio = (colaInicio + 1) % MAX_PENDIENTES;
    colaTam--;
  }
}

void setup() {
  Serial.begin(115200);          // consola / depuración
  SerialArduino.begin(BAUD_ARDUINO, SERIAL_8N1, 16, 17);  // datos del Arduino
  inicio = millis();
  Serial.println("\n=== Aula Inteligente · ESP32 ===");
  conectarWiFi();
}

void loop() {
  // 1) Recolectar la lectura que envía el Arduino
  JsonDocument lectura;
  bool hayLectura = leerArduino(lectura);

  // 2) Cada INTERVALO_MS: encolar y enviar
  if (millis() - ultimoEnvio >= INTERVALO_MS) {
    ultimoEnvio = millis();

    if (hayLectura) {
      encolar(construirPayload(lectura));
    } else {
      // Sin lectura nueva del Arduino: se envía igual el estado del enlace
      // para que el panel sepa que el ESP32 sigue vivo (RSSI, firmware).
      JsonDocument vacio;
      String cuerpo = construirPayload(vacio);
      encolar(cuerpo);
      Serial.println("[Arduino] Sin lectura nueva; se envía solo estado del ESP32.");
    }

    if (WiFi.status() != WL_CONNECTED) conectarWiFi();
    reenviarPendientes();
  }

  // 3) Diagnóstico en consola cada 10 s
  static uint32_t ultimoLog = 0;
  if (millis() - ultimoLog > 10000) {
    ultimoLog = millis();
    Serial.printf("[Estado] uptime %lus · RSSI %d dBm · cola %d · Arduino %s\n",
                  (unsigned long)((millis() - inicio) / 1000),
                  WiFi.RSSI(), colaTam,
                  hayLectura ? "OK" : "sin datos");
  }

  delay(50);
}
