Panel de Monitoreo IoT: Aula Inteligente
Documento de diseño de interfaces, capas y funciones Proyecto: Sistema IoT basado en Arduino para el control automático de iluminación en un aula educativa en Trujillo, 2026 Equipo: Leon Cruz, Mendoza Chigne, Romero Liñan, Venegas Morales, Zumaran Urquiza. Asesor: Mgtr. Bermejo Terrones Henry Paúl
1. Resumen y recomendaciones clave
La aplicación tiene tres propósitos: mostrar en tiempo casi real lo que mide el ESP32 (temperatura, humedad, movimiento, sonido, estado de luces y consumo), analizar esos datos con Power BI y con una IA, y presentar el proyecto con su misión, visión y objetivos.
Recomendaciones principales
1. Separar la web en dos zonas: una zona pública (Inicio con misión y visión, Acerca del proyecto, Login) y una zona privada (dashboard, Power BI, reportes IA). Así el proyecto se presenta sin exponer datos.
2. Usar React Native con Expo y React Native Web si quieren una sola base de código para web y móvil. Si solo necesitan web, React con TypeScript (como dice el informe) es más simple y rápido de terminar. Vercel despliega la versión web en ambos casos.
3. La API key de la IA vive solo en el backend (Azure Functions + Key Vault). Nunca en el frontend ni en GitHub.
4. Power BI con embed token generado por el backend. Evitar "Publicar en la web", porque deja los datos públicos.
5. Polling cada 30 s es suficiente, porque el ESP32 envía una lectura cada 30 s. No hace falta WebSockets para la primera versión.
6. Enviar a la IA resúmenes estadísticos, no miles de filas. Es más barato, más rápido y más preciso.
7. Agregar nivel_sonido (FLOAT) y corriente_a (FLOAT) a la tabla lecturas. El informe mide dB y kWh (Tabla 1), pero la tabla actual solo guarda sonido como sí/no, y el consumo depende del ACS712.
8. Roles de usuario: Administrador, Docente/Investigador y Visitante. Cada uno ve distintas pantallas.
9. Diseño móvil primero. El aula se monitorea desde el celular tanto como desde la laptop.
10. Pensar en la sustentación: incluir un modo "Demo" con datos simulados por si el prototipo no está conectado ese día.
2. Arquitectura por capas
El informe define tres capas físicas. La aplicación web agrega dos más.
Capa
Componentes
Función
1. Percepción
2 PIR, 2 DHT11, 2 KY-037, ACS712
Capta movimiento, temperatura, humedad, sonido y corriente
2. Procesamiento y control
Arduino Uno R3 + relé
Ejecuta la lógica: encender con movimiento, apagar tras 5 min sin actividad
3. Comunicación
ESP32 + WiFi
Recibe datos del Arduino por serial y los envía por HTTP POST cada 30 s
4. Backend y datos (Azure)
Azure Functions (API REST), Azure SQL Database, Key Vault, Application Insights
Recibe, valida, guarda y sirve los datos; protege los secretos
5. Presentación y análisis
Web en Vercel (React Native Web / React + TS), Power BI, proveedor de IA
Visualiza, analiza y genera reportes
Flujo de datos: sensores → Arduino → ESP32 → API Azure Functions → Azure SQL → (a) Power BI por DirectQuery, (b) la web por la API, (c) la IA a través del backend.
3. Mapa de navegación
Zona pública (sin login)
• Inicio (landing con misión y visión)
• Acerca del proyecto (problema, objetivos, ODS 7, equipo)
• Cómo funciona (arquitectura simplificada)
• Iniciar sesión
Zona privada (con login)
• Dashboard en vivo
• Tendencias
• Energía y ahorro
• Power BI
• Reportes con IA
• Historial
• Alertas
• Dispositivo
• Ajustes (perfil, parámetros, usuarios solo para Administrador)
Permisos por rol
Pantalla
Visitante
Docente/Investigador
Administrador
Zona pública
Sí
Sí
Sí
Dashboard en vivo
Solo lectura (opcional)
Sí
Sí
Tendencias, Energía
No
Sí
Sí
Power BI
No
Sí
Sí
Reportes IA
No
Generar y ver
Generar, ver y borrar
Historial y exportar
No
Sí
Sí
Alertas
No
Ver
Ver y configurar
Dispositivo
No
Ver
Ver y configurar
Gestión de usuarios
No
No
Sí
4. Sistema de diseño (cómo debe verse)
Estilo general: limpio, tecnológico, tipo panel de control. Mucho espacio en blanco, tarjetas con esquinas redondeadas (12 px) y sombras suaves. Debe transmitir sostenibilidad y precisión.
Paleta de colores
Uso
Color sugerido
Primario (marca)
Azul profundo #0B3C5D
Secundario (energía)
Verde #2E9E6B
Acento (alerta suave)
Ámbar #F5A623
Peligro
Rojo #D64545
Fondo claro
#F5F7FA
Fondo oscuro
#0F1720
Texto
#1B2733 (claro) / #E6EDF3 (oscuro)
Semántica de color en sensores
• Luminarias encendidas: ámbar. Apagadas: gris.
• Temperatura normal: verde. Alta: ámbar. Crítica: rojo.
• Dispositivo en línea: verde. Sin señal: rojo.
Tipografía: Inter o Poppins para títulos y texto; números grandes de las tarjetas en peso 700.
Componentes base: Botón (primario, secundario, peligro), Tarjeta de métrica, Tarjeta de gráfico, Tabla con filtros, Badge de estado, Selector de rango de fechas, Modal, Toast de notificación, Skeleton de carga, Estado vacío, Barra de navegación (lateral en escritorio, inferior en móvil).
Responsive
• Móvil (menos de 640 px): una columna, navegación inferior con 5 íconos.
• Tablet: dos columnas.
• Escritorio (más de 1024 px): barra lateral fija + contenido en cuadrícula de 12 columnas.
Accesibilidad: contraste mínimo AA, textos alternativos, no depender solo del color (agregar íconos y texto), tamaños táctiles de al menos 44 px, modo claro y oscuro.
Estados obligatorios en toda pantalla: cargando (skeleton), error (mensaje con botón "Reintentar"), vacío (ilustración y explicación), sin conexión.
5. Pantallas en detalle
5.1 Inicio (landing pública)
Es la primera pantalla que ve cualquier persona. Presenta el proyecto y lleva al login.
┌──────────────────────────────────────────────────────────┐
│ [Logo] Aula Inteligente UCV      Inicio  Proyecto  Cómo  │
│                                   funciona   [Ingresar]  │
├──────────────────────────────────────────────────────────┤
│  HERO                                                    │
│  "Iluminación que se adapta al aula,                     │
│   no al descuido"                                        │
│  Sistema IoT para ahorrar energía en aulas educativas    │
│  [Ingresar al panel]   [Conocer el proyecto]             │
│                                  [imagen de la maqueta]  │
├──────────────────────────────────────────────────────────┤
│  CIFRAS CLAVE (tarjetas)                                 │
│  6 sensores | 30 s por lectura | hasta 61,7% de ahorro   │
│  (en literatura) | ODS 7                                 │
├──────────────────────────────────────────────────────────┤
│  MISIÓN                    │  VISIÓN                     │
│  (tarjeta con ícono)       │  (tarjeta con ícono)        │
├──────────────────────────────────────────────────────────┤
│  EL PROBLEMA → LA SOLUCIÓN (2 columnas)                  │
├──────────────────────────────────────────────────────────┤
│  ¿CÓMO FUNCIONA? Sensores → Arduino → ESP32 → Azure →    │
│  Panel + Power BI + IA   (5 íconos conectados por flecha)│
├──────────────────────────────────────────────────────────┤
│  OBJETIVOS (3 tarjetas, uno por objetivo específico)     │
├──────────────────────────────────────────────────────────┤
│  EQUIPO (5 tarjetas con nombre, ciclo y correo) + ASESOR │
├──────────────────────────────────────────────────────────┤
│  Pie: Universidad César Vallejo, Trujillo 2026 | ODS 7   │
└──────────────────────────────────────────────────────────┘
Textos propuestos (ajústenlos con su asesor)
Misión: Optimizar el consumo de energía eléctrica en aulas educativas mediante un sistema IoT que automatiza la iluminación según la presencia real de personas y convierte los datos de los sensores en información clara para tomar mejores decisiones.
Visión: Ser un modelo replicable de eficiencia energética para instituciones educativas del Perú, aportando al ODS 7 con tecnología accesible, abierta y de bajo costo.
Valores o principios (opcional, 3 tarjetas): Sostenibilidad, Innovación abierta, Transparencia de datos.
Funciones de la pantalla: menú con scroll suave a cada sección, botón "Ingresar", animaciones discretas al hacer scroll, enlace a descargar el informe del proyecto (PDF), selector de modo claro/oscuro.
5.2 Login
┌─────────────────────────────┬────────────────────────────┐
│  (panel izquierdo, color    │   Bienvenido               │
│   de marca)                 │   Ingresa a tu cuenta      │
│  Logo + frase corta         │                            │
│  "Monitorea y ahorra        │   Correo  [____________]   │
│   energía en tu aula"       │   Contraseña [_________] 👁│
│  Ilustración de sensores    │   [ ] Recordarme           │
│                             │   [      Ingresar      ]   │
│                             │   ¿Olvidaste tu contraseña?│
│                             │   ── o ──                  │
│                             │   [ Continuar con Microsoft]│
│                             │   Volver al inicio         │
└─────────────────────────────┴────────────────────────────┘
Funciones
• Inicio de sesión con correo y contraseña, y opción Microsoft Entra ID (recomendado: los estudiantes ya tienen cuenta @ucvvirtual.edu.pe).
• Validación en tiempo real (formato de correo, contraseña mínima de 8 caracteres).
• Mostrar u ocultar contraseña.
• Mensajes de error claros sin revelar si el correo existe.
• Bloqueo temporal tras 5 intentos fallidos.
• Recuperación de contraseña por correo (pantalla propia con un campo y confirmación).
• Sesión con JWT de corta duración + refresh token; cierre automático por inactividad (30 min).
• Redirección según rol al iniciar sesión.
• En móvil, el panel izquierdo se oculta y queda solo el formulario.
Pantallas relacionadas: Recuperar contraseña, Restablecer contraseña, Cuenta pendiente de aprobación (si el registro requiere que un Administrador apruebe).
Registro: recomendado solo por invitación del Administrador, para que no cualquiera cree cuentas.
5.3 Dashboard en vivo (pantalla principal tras el login)
┌────────┬─────────────────────────────────────────────────┐
│ MENÚ   │ Aula 1 · FIA UCV         ● En línea  hace 12 s  │
│ ────── │ ───────────────────────────────────────────────│
│ En vivo│ [Temp 24,5°C] [Humedad 58%] [Presencia SÍ]      │
│ Tendenc│ [Sonido ACTIVO] [Luces ENCENDIDAS] [Modo AUTO]  │
│ Energía│ ───────────────────────────────────────────────│
│ Power BI│ Gráfico: temperatura y humedad (últimas 2 h)   │
│ Reportes│ ───────────────────────────────────────────────│
│ Historial│ Línea de tiempo de presencia | Eventos recientes│
│ Alertas│ "10:42 Luces apagadas por inactividad"          │
│ Disposit│ "10:31 Movimiento detectado"                    │
│ Ajustes│                                                 │
└────────┴─────────────────────────────────────────────────┘
Funciones
• 6 tarjetas de métricas con valor actual, ícono, color por estado y flecha de tendencia (sube, baja, estable).
• Indicador de dispositivo: En línea (última lectura menor a 2 min), Sin señal (mayor a 2 min).
• Actualización automática cada 30 s con cuenta regresiva discreta.
• Gráfico de temperatura y humedad de las últimas 2 horas.
• Línea de tiempo de presencia, sonido y luces.
• Lista de eventos recientes (cambios de estado de luces y modo).
• Botón de encendido/apagado manual de luminarias (solo si el firmware lo admite; ver recomendaciones de hardware más abajo).
• Resumen rápido del día: horas con luces encendidas, horas con aula vacía y luces encendidas, consumo estimado.
5.4 Tendencias
• Selector de rango: Hoy, 7 días, 30 días, personalizado.
• Gráficos: temperatura (línea, con mín. y máx.), humedad (línea), ocupación por hora (barras), actividad de sonido (barras o área).
• Mapa de calor: ocupación por día de la semana y hora (muestra cuándo se usa realmente el aula).
• Comparar dos periodos (por ejemplo, semana manual vs semana automática).
• Exportar gráfico como imagen.
5.5 Energía y ahorro
Es la pantalla más importante para demostrar la hipótesis del informe.
• Parámetros editables: potencia total de luminarias (W), tarifa por kWh (S/).
• Fórmula visible: E = P × t / 1000.
• Tarjetas: consumo manual (Cm), consumo automático (Ca), ahorro % = (Cm − Ca) / Cm × 100, ahorro en soles, minutos con luces encendidas y aula vacía.
• Gráfico de barras comparando ambos periodos.
• Estadística descriptiva por periodo: media, desviación estándar, mínimo y máximo.
• Resultado de la prueba estadística (Shapiro-Wilk, luego t de Student o Wilcoxon) si deciden calcularla en el backend; si no, un espacio para pegar el resultado de SPSS.
• Exportar a Excel o PDF.
5.6 Power BI
• Reporte incrustado a pantalla completa con botón "Pantalla completa".
• Conexión DirectQuery a Azure SQL, con actualización automática de página.
• Botón "Actualizar" y botón "Abrir en Power BI Service".
• Mensaje claro si falla el token o no hay licencia, con la opción alternativa del enlace.
• Visuales sugeridos para el reporte: tarjetas de temperatura y humedad, línea de tiempo de presencia, barras de horas encendidas, medidor de ahorro, tabla de eventos, segmentadores de fecha y modo.
5.7 Reportes con IA
┌──────────────────────────────────────────────────────────┐
│ Reportes con IA                                          │
│ Rango: [01/10/2026] → [07/10/2026]  Tipo: [Completo ▾]   │
│ Enfoque: ( ) General ( ) Energía ( ) Confort ( ) Anomalías│
│ [ ✨ Generar reporte ]                                   │
├──────────────────────────────────────────────────────────┤
│ Reporte generado (Markdown renderizado)                  │
│  1. Resumen ejecutivo                                    │
│  2. Hallazgos de temperatura y humedad                   │
│  3. Patrones de ocupación                                │
│  4. Eficiencia energética                                │
│  5. Anomalías detectadas                                 │
│  6. Recomendaciones                                      │
│ [Descargar PDF] [Copiar] [Guardar]                       │
├──────────────────────────────────────────────────────────┤
│ Historial de reportes (fecha, rango, autor, ver)         │
└──────────────────────────────────────────────────────────┘
Funciones
• Tipos de reporte: diario, semanal, personalizado.
• Enfoques: general, energía, confort ambiental, anomalías.
• Indicador de progreso mientras se genera (con texto "Analizando 5 120 lecturas").
• Reporte en Markdown con secciones fijas, tablas y recomendaciones accionables.
• Pregunta libre sobre los datos (chat corto): "¿Cuándo se desperdició más energía esta semana?". Opcional para una segunda versión.
• Guardar reportes en la base de datos con su historial, y descarga en PDF.
• Aviso visible: "Reporte generado por IA a partir de datos del sensor; verifique antes de usarlo en decisiones".
• Límite de uso por usuario y caché para no repetir llamadas idénticas.
5.8 Historial
• Tabla con: fecha y hora, temperatura, humedad, presencia, sonido, luces, modo.
• Filtros: fechas, modo, solo presencia, solo anomalías.
• Paginación, orden por columna, búsqueda.
• Exportar CSV y Excel.
• Insignias de color en estados y fila resaltada para anomalías (luces encendidas sin presencia).
5.9 Alertas
• Reglas configurables por el Administrador:
    ◦ Temperatura mayor a X °C.
    ◦ Humedad fuera de rango.
    ◦ Luces encendidas más de N minutos sin presencia.
    ◦ Dispositivo sin enviar datos por más de 5 minutos.
    ◦ Corriente anormal (si usan el ACS712).
• Lista de alertas con severidad (info, advertencia, crítica), estado (nueva, vista, resuelta) y hora.
• Notificación en la app y por correo.
• Contador (badge) en el menú.
5.10 Dispositivo
• Estado del ESP32: en línea, última lectura, señal WiFi (RSSI), tiempo encendido, versión de firmware.
• Estado por sensor (PIR 1 y 2, DHT11 1 y 2, sonido 1 y 2, ACS712): OK o con falla (valores fuera de rango o sin cambios por mucho tiempo).
• Porcentaje de lecturas recibidas vs esperadas (indicador "envíos exitosos" de la Tabla 1).
• Clave del dispositivo (rotar o regenerar) solo para Administrador.
5.11 Ajustes y administración
• Perfil: nombre, correo, contraseña, tema claro u oscuro, idioma.
• Parámetros del sistema: potencia de luminarias, tarifa eléctrica, tiempo de espera de apagado (informativo, 5 min), umbrales de alerta.
• Usuarios (solo Administrador): invitar, cambiar rol, desactivar.
• Integraciones: estado de conexión con Azure SQL, Power BI y el proveedor de IA (solo muestra "conectado" o "error", nunca las claves).
• Auditoría (opcional): quién generó qué reporte y cuándo.
6. Funciones del backend (API)
Endpoint
Método
Función
Acceso
/api/lecturas
POST
Recibe datos del ESP32 (header x-device-key)
Dispositivo
/api/lecturas/ultima
GET
Última lectura
Usuario
/api/lecturas
GET
Historial con filtros y paginación
Usuario
/api/resumen
GET
Agregados del rango
Usuario
/api/energia
GET
Cm, Ca, ahorro %, estadísticos
Usuario
/api/alertas
GET/POST/PATCH
Reglas y alertas
Usuario/Admin
/api/dispositivo/estado
GET
Estado del ESP32 y sensores
Usuario
/api/powerbi/embed-token
GET
Token de incrustación
Usuario
/api/reportes/generar
POST
Genera reporte con IA
Docente/Admin
/api/reportes
GET
Historial de reportes
Usuario
/api/auth/*
POST
Login, refresh, recuperación
Público
/api/usuarios
GET/POST/PATCH
Gestión de usuarios
Admin
7. Modelo de datos (ampliación)
Tabla existente lecturas: id_lectura, fecha_hora, temperatura_c, humedad, presencia, sonido, estado_luminarias, modo.
Campos recomendados para agregar a lecturas: nivel_sonido (FLOAT, dB), corriente_a (FLOAT), id_dispositivo (INT), rssi_wifi (INT).
Tablas nuevas
Tabla
Campos principales
usuarios
id, nombre, correo, hash_password, rol, activo, creado_en
dispositivos
id, nombre, aula, clave_hash, ultima_conexion
alertas_reglas
id, tipo, umbral, severidad, activa
alertas
id, regla_id, fecha_hora, mensaje, estado
reportes_ia
id, usuario_id, desde, hasta, enfoque, contenido_md, creado_en
configuracion
clave, valor (potencia_w, tarifa_kwh, etc.)
Agreguen un índice en lecturas(fecha_hora) y una vista vw_resumen_diario para que Power BI y la web consulten rápido.
8. Seguridad
• Secretos solo en variables de entorno de Vercel y Azure, y en Key Vault. Entregar un .env.example sin valores reales.
• Contraseñas con hash (bcrypt o argon2); mejor aún, solo Microsoft Entra ID.
• Tokens JWT de corta duración, CORS limitado al dominio de Vercel, HTTPS en todo.
• Consultas SQL parametrizadas siempre.
• Clave del dispositivo distinta a las claves de usuario, y rotable.
• Limitar solicitudes (rate limiting) en login y en generación de reportes.
• Firewall de Azure SQL con solo los orígenes necesarios.
• Privacidad: el informe aclara que no se recolectan datos personales ni imágenes de estudiantes. Mantener esa promesa: los sensores solo registran presencia y sonido, no identidad ni grabaciones. Dejarlo escrito en la página "Acerca del proyecto".
9. Recomendaciones de hardware y datos
• Doble sensor y validación: la lógica del informe usa pares de sensores; en la web muestren ambos valores y su promedio, para detectar un sensor defectuoso.
• DHT11 es poco preciso (±2 °C, ±5 % HR). Si pueden, usen DHT22 o BME280 y mencionen la limitación en el informe.
• KY-037 entrega nivel analógico relativo, no dB calibrados. Si presentan dB, indiquen que son aproximados o calibren con un sonómetro.
• Reintentos en el ESP32: guardar la lectura localmente si no hay WiFi y reenviarla al reconectar, para no perder datos.
• Hora: usar NTP en el ESP32 y guardar en UTC; la web convierte a hora de Perú (UTC−5).
• Control manual desde la web: requiere un canal de comandos hacia el ESP32 (cola de comandos que el ESP32 consulta). Es opcional y recomendable dejarlo para una segunda fase.
• Modo demo: botón que cambia la fuente de datos a un generador simulado.
10. Orden sugerido de desarrollo
Fase
Entregable
1
Azure SQL + endpoint POST de lecturas + prueba con el ESP32
2
Endpoints GET y dashboard en vivo
3
Landing pública con misión y visión + login
4
Tendencias, Historial y Energía
5
Power BI (DirectQuery + incrustación)
6
Reportes con IA
7
Alertas, Dispositivo, Ajustes y usuarios
8
Pruebas, modo demo, despliegue final y documentación
11. Lista de verificación final
[ ] El ESP32 envía datos cada 30 s y llegan a Azure SQL.
[ ] El dashboard se actualiza solo y marca "Sin señal" cuando corresponde.
[ ] La landing muestra misión, visión, objetivos y equipo.
[ ] El login funciona y redirige según el rol.
[ ] Las rutas privadas no son accesibles sin sesión.
[ ] Power BI carga sin exponer datos públicos.
[ ] Los reportes IA se generan y la clave no aparece en el navegador.
[ ] El cálculo de ahorro coincide con los cálculos manuales del informe.
[ ] Todo se ve bien en móvil, tablet y escritorio, en modo claro y oscuro.
[ ] Existe modo demo y un .env.example.