# Serging Gym

PWA móvil de entrenamiento de fuerza, reatletización de rodilla (post-LCA) y carrera de fondo (5K / 10K / 15K / Media Maratón), construida con **React 19 + Vite 8 + Tailwind CSS v4**, funciones serverless en **Vercel (`/api/*`)** y base de datos SQLite distribuida en **Turso**.

## Características principales

- **Diseño limpio estilo Harbiz**: interfaz clara y cálida (`#F5F5F7`) con 4 pestañas principales (`Home | Agenda | Vídeos | Evolución`), pastillas semanales `L–D` con indicadores por sesión y vista mensual desplegable.
- **Inicio voluntario del entrenamiento**: al abrir una sesión se muestra primero la vista previa completa por bloques y superseries (con sustitución inteligente de ejercicios y previsualización de vídeo); el cronómetro solo arranca cuando pulsas voluntariamente **`Iniciar entrenamiento`** (`3, 2, 1, GO`).
- **Reproductor dual durante el entreno**: modo **Teatro** (panel superior fijo adaptado a clips verticales `9:16` y tutoriales `16:9` manteniendo las series desplazables debajo) y modo **Flotante (PiP)** en esquina intercambiable mientras registras kilos, repeticiones o segundos.
- **Catálogo de 100+ ejercicios con vídeo y póster**:
  - **30 vídeos propios de rodilla, pliometría, agilidad y fuerza** recortados en 720p H.264 con fotograma póster nítido (`public/videos/rodilla/` y `public/videos/posters/`).
  - **71 tutoriales de YouTube validados (`oEmbed`)** con prioridad en **isométricos y core** (Copenhague, Spanish Squat, Wall Sit unipodal, Pallof, RKC, Bird-Dog, Dead Bug, sóleo isométrico), **ejercicios funcionales/carries** y **técnica/series de carrera**.
  - Alta de nuevos ejercicios personalizados directamente desde la app (**`+ Añadir`** en `Vídeos`).
- **Seguridad sin credenciales en el navegador**: autenticación mediante `scrypt` + cookie firmada `HttpOnly` (`HMAC-SHA256`); Turso se consulta exclusivamente desde el servidor (`/api/*`).

## Variables de entorno (Vercel / Local `.env.local`)

Configura únicamente en el servidor (nunca con prefijo `VITE_`):

- `TURSO_DATABASE_URL`: URL HTTPS de la base de datos Turso
- `TURSO_AUTH_TOKEN`: token JWT de Turso
- `SESSION_SECRET`: *(opcional)* clave secreta para firmar cookies de sesión

## Comandos locales

```bash
npm install
npm run dev      # Servidor local con middleware /api integrado
npm test         # Suite de tests unitarios, API y seguridad (node:test)
npm run lint     # Verificación estática con Oxlint
npm run build    # Build de producción PWA + code-splitting
```
