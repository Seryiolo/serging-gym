# Serging Gym

App de entrenamiento personal (PWA) con plan semanal variable, sesiones por bloques y superseries, registro de series y carrera, y progresión de rodilla por fases.

## Estado
- [x] **Fase 1:** base de datos en Turso (SQLite) con esquema y fases de rodilla.
- [ ] Fase 2: catálogo de ejercicios, plantillas y motor de plan semanal.
- [ ] Fase 3: API con login (funciones serverless) y frontend PWA.
- [ ] Fase 4: despliegue y prueba en el móvil.

## Base de datos
- `db/schema.sql`: esquema completo (se puede reaplicar, usa `IF NOT EXISTS`).
- `db/seed_fases_rodilla.sql`: fases de rodilla y sus umbrales (editables).
- `scripts/aplicar-sql.ps1`: aplica un `.sql` a Turso.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aplicar-sql.ps1 db/schema.sql
```

Las credenciales (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) viven en variables de entorno del usuario. **Nunca se suben al repo** y la app no se conectará a Turso directamente desde el navegador.

## Aviso
Las fases y umbrales de rodilla son parámetros de la app, no consejo médico. Ante molestia que empeora, hinchazón o inestabilidad, consultar con un profesional.
