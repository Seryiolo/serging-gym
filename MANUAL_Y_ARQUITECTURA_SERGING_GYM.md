# Serging Gym · Manual de Arquitectura y Guía Integral del Proyecto

> **Documento Oficial de Referencia Técnica y Funcional**  
> **Ubicación:** `c:\Users\sergi\OneDrive\Sergio Caution\Apps del movil\Aplicacion de entrenamiento\serging-gym\MANUAL_Y_ARQUITECTURA_SERGING_GYM.docx`  
> **Producción:** [https://serging-gym.vercel.app](https://serging-gym.vercel.app)  
> **Repositorio:** [https://github.com/Seryiolo/serging-gym](https://github.com/Seryiolo/serging-gym)  
> **Base de Datos:** Turso Cloud (`aws-eu-central-1`) · Organización `sergiolo28`  
> **Usuario Principal:** Sergio (`sergiolopezalmansa@gmail.com`, Admin)

---

## 1. La Base de Datos (Turso / LibSQL): Dónde está y cómo gestionarla

### 1.1 Infraestructura y Ubicación
La base de datos de Serging Gym opera sobre **Turso Cloud**, una base de datos distribuida en el borde (*edge database*) sobre tecnología LibSQL (SQLite optimizado para la nube):
* **Host:** `https://serging-gym-sergiolo28.aws-eu-central-1.turso.io`
* **Región:** `aws-eu-central-1` (Frankfurt, Alemania), ofreciendo una latencia inferior a 30 ms con España.
* **Protocolo de conexión:** HTTP v2 Pipeline (`/v2/pipeline`), ejecutando transacciones ACID con claves foráneas activas (`PRAGMA foreign_keys = ON; BEGIN ... COMMIT;`).
* **Seguridad:** Los tokens de acceso jamás se envían al navegador ni se suben al repositorio. Residen en las variables de entorno seguras de Vercel y en las variables de usuario locales de Windows (`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`).

### 1.2 ¿Cómo puedes revisar y editar la Base de Datos tú mismo?

Tienes **3 vías directas** para inspeccionar o modificar cualquier dato:

1. **Vía Web Visual (Turso Studio / Dashboard - La más cómoda):**
   * Entra en [https://turso.tech](https://turso.tech) e inicia sesión con tu cuenta de GitHub (`Seryiolo`).
   * Verás la base de datos `serging-gym`. Haz clic sobre ella.
   * En el menú lateral pulsa en **"Shell"** o **"Studio"**. Tendrás un entorno visual interactivo donde ver todas las tablas (`users`, `sesiones_plan`, `entrenos`, `series_registradas`, `carreras`, etc.), examinar registros o ejecutar sentencias SQL.
2. **Vía Terminal en Local (PowerShell):**
   * Puedes consultar cualquier dato al instante usando el script preparado en el proyecto:
     ```powershell
     node scratch/dbq.mjs "SELECT * FROM entrenos"
     ```
   * O con la herramienta oficial de línea de comandos de Turso:
     ```powershell
     turso db shell serging-gym
     ```
3. **Vía Scripts de Migración Versionados:**
   * En la carpeta `db/` tienes los archivos fuente SQL:
     * `db/schema.sql`: Definición de tablas, índices y restricciones.
     * `db/seed_ejercicios.sql`: Catálogo completo de 101 ejercicios (30 propios + 71 YouTube).
     * `db/seed_plantillas.sql`: Las 7 plantillas de entrenamiento semanal con sus descansos y superseries.
   * Para aplicar cualquier cambio a la base de datos de Turso ejecutas:
     ```powershell
     .\scripts\aplicar-sql.ps1 db/schema.sql
     ```

---

## 2. El Código Fuente: Dónde está, cómo se gestiona y cómo editarlo

### 2.1 Ubicación física y en la nube
* **En tu ordenador:**  
  `C:\Users\sergi\OneDrive\Sergio Caution\Apps del movil\Aplicacion de entrenamiento\serging-gym`
* **En GitHub (Repositorio remoto):**  
  [https://github.com/Seryiolo/serging-gym](https://github.com/Seryiolo/serging-gym) (rama `main`)
* **En Vercel (Producción web en vivo):**  
  [https://serging-gym.vercel.app](https://serging-gym.vercel.app)

### 2.2 Ciclo de Despliegue Continuo (CI/CD)
El sistema está 100% automatizado:
1. Haces un cambio en local en tu editor.
2. Realizas `git commit` y `git push origin main`.
3. Vercel detecta automáticamente el push en GitHub, ejecuta la compilación de Vite (`npm run build`), empaqueta el Service Worker de la PWA y levanta las Serverless Functions en `/api/*`.
4. En unos 30 segundos, tu aplicación móvil en la web queda actualizada sin tocar servidores ni reiniciar procesos.

### 2.3 ¿Cómo editarlo y probarlo tú en local?
1. Abre la carpeta `serging-gym` en **Visual Studio Code**.
2. En la terminal de VS Code ejecuta:
   ```powershell
   npm run dev
   ```
   Se abrirá en `http://localhost:5173`. Cualquier cambio que guardes se refleja en pantalla en tiempo real.
3. Para publicar:
   ```powershell
   git add .
   git commit -m "Mi cambio"
   git push origin main
   ```

---

## 3. Funciones Principales de la Aplicación

La aplicación está diseñada específicamente para los dos objetivos deportivos y de salud de Sergio:
1. **Reatletización de rodilla derecha (post-LCA)** con control de inflamación y dosificación estricta del impacto.
2. **Preparación de carrera:** 15 km (abril 2027) y media maratón 21 km (mayo 2027).

### Módulos funcionales destacados:
* **Fases de Rodilla y Progresión Automática:**
  * 4 fases progresivas (Fase 1: Control sin impacto hasta Fase 4: Retorno completo).
  * Evaluación en cada sesión: molestia durante/después (0-10) y control de derrame/hinchazón a las 24 horas.
  * 6 sesiones seguidas con molestia ≤2 y sin hinchazón sugieren subir de fase. Si hay hinchazón o dolor ≥5, la app sugiere bajar y descargar.
* **Planificador Semanal Inteligente (Motor Ancla / Variable):**
  * Ubicado en `shared/planner.js` y `api/_lib/planner-db.js`.
  * Genera planes de 4, 5 o 6 días asegurando que **nunca se junten dos días de pierna exigente seguidos**.
  * Los ejercicios ancla (básicos de fuerza para medir progresión histórica) se mantienen; los variables rotan entre candidatos seguros sin repetir lo de la semana anterior.
* **Flujo Voluntario y Reproductor Dual (Teatro / PiP):**
  * La navegación jamás auto-inicia un entrenamiento. La vista previa (`SesionPreviewView`) permite revisar bloques, sustituir ejercicios compatibles y pulsar *"Iniciar entrenamiento"*, activando la cuenta atrás *"¡Prepárate! 3, 2, 1, GO"*.
  * Reproductor de vídeo conmutativo: **Modo Teatro** (fijo superior, ideal para clips verticales 9:16 sin recortes) y **Modo Flotante PiP** para consultar la técnica mientras registras series.
* **Pausa (Guardar y Salir) vs Descartar vs Completar:**
  * Puedes pausar la sesión para continuarla más tarde; un banner flotante permanece activo.
  * Si descartas un entrenamiento, se purga de la base de datos y **no cuenta para la racha de 6 sesiones de rodilla**.
* **Reorganización Dinámica de la Semana:**
  * Modal visual (`ReorganizarSemanaModal.jsx`) que permite intercambiar días (ej. mover la carrera del viernes al martes de torso) con verificación de seguridad articular.
* **Carrera, Ritmos Z1–Z5 y Récords Personales (PRs):**
  * Cálculo dinámico de zonas de ritmo según marcas vigentes.
  * Registro de descansos exactos entre series (ej. 120s entre repeticiones de 1.000m).
  * Sección de Logros con 26 insignias y tabla de PRs con 1RM estimado (fórmula de Epley).

---

## 4. Seguridad Actual y Preparación para Multiusuario Futuro

### 4.1 Seguridad en la versión actual
* **Cero exposición en frontend:** El token de Turso y los secretos del servidor nunca se envían al navegador.
* **Cookies de sesión seguras:** La autenticación utiliza cookies HttpOnly, Secure y SameSite=Lax con tokens firmados mediante HMAC SHA-256 (`sg_session`).
* **Cifrado de contraseñas:** Las claves se procesan con algoritmos de derivación `scrypt` con sal única aleatoria.
* **Consultas parametrizadas:** Prevención total contra inyección SQL en el pipeline de Turso.

### 4.2 Arquitectura Multiusuario Nativa
Aunque actualmente la app está ajustada para Sergio (ID 10000, rol admin), **toda la base de datos es nativamente multiusuario:**
* Todas las tablas de datos (`perfil`, `estado_rodilla`, `semanas`, `sesiones_plan`, `entrenos`, `series_registradas`, `carreras`, `peso_corporal`) contienen la columna `user_id` con clave foránea `ON DELETE CASCADE`.
* En la tabla `ejercicios`, si `user_id` es `NULL`, el ejercicio pertenece al catálogo general público (101 ejercicios actuales). Si un usuario crea un ejercicio personal, llevará su `user_id` y solo él tendrá acceso.
* La tabla `users` dispone de campos `rol` (`admin` | `usuario`) y `estado` (`aprobado` | `pendiente` | `rechazado`). Para abrir la app a más usuarios, solo hace falta reactivar el formulario de solicitud y el panel de aprobación de cuentas para el administrador.

---

## 5. Diseño y Apariencia (Estética Harbiz)

La interfaz se inspira en el diseño de **Harbiz**:
* **Lienzo base:** Fondo gris suave `#F5F5F7` con tarjetas blancas `#FFFFFF` y bordes limpios `#ECEEF2`.
* **Aura y calidez:** Gradientes sutiles radiales en tonos melocotón y ámbar cálido (`#F8B07E`, `#EE8641`) en las cabeceras de sesión.
* **Botones de acción:** Color carbón oscuro (`#1E2433` / `#242938`) con bordes completamente redondeados (`rounded-full`).
* **Navegación inferior fija (4 pestañas):** Home, Agenda, Vídeos y Evolución.

---

## 6. Agentes Creados y Activos: Funciones y Estado

En la ingeniería de Serging Gym se emplean roles y subagentes especializados:

1. **`DeepCoder` (Subagente Full-Stack):**
   * **Función:** Modificación, integración y refactorización profunda de componentes JSX en React, lógica de servidor en `/api/*` y optimización de consultas LibSQL.
2. **`DeepInvestigator` (Subagente de Diagnóstico):**
   * **Función:** Análisis de causas raíz, auditoría de esquemas, detección de fallos silenciosos y pruebas de regresión.
3. **Agentes de soporte arquitectónico (Modelados en la fase de construcción):**
   * *Video & Biomechanics Curator:* Procesamiento de clips con FFmpeg y extracción de pósters nítidos.
   * *Backend & API Architect:* Arquitectura de endpoints serverless y transacciones Turso.
   * *Frontend Harbiz UI Engineer:* Maquetación fiel a Harbiz y diseño responsive.
   * *QA & Security Auditor:* Pruebas unitarias, linters con oxlint y auditorías contra fugas de credenciales.

**Estado actual:** Tras el reinicio del servidor, todos los subagentes se encuentran en estado de **reposo**, sin tareas en segundo plano ni consumo de recursos, listos para activarse cuando solicitemos una nueva tarea.
