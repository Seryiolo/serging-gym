/**
 * Generador de Plan Semanal - Serging Gym
 * Se conecta a Turso mediante la API HTTP v2 pipeline.
 */

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Faltan variables TURSO_DATABASE_URL y/o TURSO_AUTH_TOKEN");
  process.exit(1);
}

function getColVal(col) {
  if (!col || col.type === "null" || col.value === undefined || col.value === null) return null;
  return col.value;
}

async function queryTurso(sql, args = []) {
  const body = {
    requests: [
      {
        type: "execute",
        stmt: {
          sql,
          args: args.map(a => {
            if (a === null || a === undefined || (typeof a === "number" && isNaN(a))) {
              return { type: "null" };
            }
            if (typeof a === "number") {
              return Number.isInteger(a) 
                ? { type: "integer", value: String(a) } 
                : { type: "float", value: a };
            }
            return { type: "text", value: String(a) };
          })
        }
      },
      { type: "close" }
    ]
  };

  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TURSO_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.results || !data.results[0]) {
    throw new Error(`Turso respuesta inesperada: ${JSON.stringify(data)}`);
  }
  const first = data.results[0];
  if (first.type === "error") {
    throw new Error(`Turso SQL Error: ${first.error.message} en [${sql}]`);
  }
  return first.response.result;
}

export async function generarSemana(userId, fechaLunes, diasObjetivo = 5, hayCarrera = 0) {
  console.log(`\n--- Generando semana del lunes ${fechaLunes} para usuario ${userId} (${diasObjetivo} días, carrera: ${hayCarrera ? 'SÍ' : 'NO'}) ---`);

  // 1. Obtener fase de rodilla actual
  const estadoRes = await queryTurso(
    `SELECT e.fase_id, f.impacto_max 
     FROM estado_rodilla e 
     JOIN fases_rodilla f ON f.id = e.fase_id 
     WHERE e.user_id = ?`, [userId]
  );
  const faseId = estadoRes.rows.length ? Number(estadoRes.rows[0][0].value) : 1;
  const impactoMax = estadoRes.rows.length ? Number(estadoRes.rows[0][1].value) : 2;
  console.log(`Fase rodilla actual: ${faseId} (Impacto máximo permitido: ${impactoMax})`);

  // 2. Crear o reemplazar semana
  await queryTurso(
    `INSERT INTO semanas (user_id, lunes, dias_objetivo, hay_carrera, origen) 
     VALUES (?, ?, ?, ?, 'auto')
     ON CONFLICT(user_id, lunes) DO UPDATE SET 
       dias_objetivo = excluded.dias_objetivo,
       hay_carrera = excluded.hay_carrera`,
    [userId, fechaLunes, diasObjetivo, hayCarrera]
  );

  const semanaRes = await queryTurso(`SELECT id FROM semanas WHERE user_id = ? AND lunes = ?`, [userId, fechaLunes]);
  const semanaId = Number(semanaRes.rows[0][0].value);

  // Borrar sesiones previas de esa semana si se regenera
  await queryTurso(`DELETE FROM sesiones_plan WHERE semana_id = ?`, [semanaId]);

  // 3. Distribución de plantillas por días
  // 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo
  let distribucion = [];
  if (diasObjetivo === 4) {
    distribucion = [
      { offset: 0, plantillaId: 1, tipo: 'superior', titulo: 'Día 1: Torso A (Empuje)' },
      { offset: 1, plantillaId: 2, tipo: 'inferior', titulo: 'Día 2: Pierna ACL & Pliometría' },
      { offset: 3, plantillaId: 3, tipo: 'carrera',  titulo: 'Día 3: Carrera Pista (Series/Tempo)' },
      { offset: 4, plantillaId: 4, tipo: 'superior', titulo: 'Día 4: Torso B (Tracción)' }
    ];
  } else if (diasObjetivo === 5) {
    distribucion = [
      { offset: 0, plantillaId: 1, tipo: 'superior', titulo: 'Día 1: Torso A (Empuje)' },
      { offset: 1, plantillaId: 2, tipo: 'inferior', titulo: 'Día 2: Pierna ACL & Pliometría' },
      { offset: 2, plantillaId: 3, tipo: 'carrera',  titulo: 'Día 3: Carrera Pista (Intervalos)' },
      { offset: 4, plantillaId: 4, tipo: 'superior', titulo: 'Día 4: Torso B (Tracción)' },
      { offset: 5, plantillaId: 5, tipo: 'pliometria_agilidad', titulo: 'Día 5: Agilidad & Cadena Posterior' }
    ];
  } else { // 6 días
    distribucion = [
      { offset: 0, plantillaId: 1, tipo: 'superior', titulo: 'Día 1: Torso A (Empuje)' },
      { offset: 1, plantillaId: 2, tipo: 'inferior', titulo: 'Día 2: Pierna ACL & Pliometría' },
      { offset: 2, plantillaId: 3, tipo: 'carrera',  titulo: 'Día 3: Carrera Pista (Series)' },
      { offset: 3, plantillaId: 6, tipo: 'carrera',  titulo: 'Día 4: Rodaje Continuo Suave' },
      { offset: 4, plantillaId: 4, tipo: 'superior', titulo: 'Día 5: Torso B (Tracción)' },
      { offset: 5, plantillaId: 5, tipo: 'pliometria_agilidad', titulo: 'Día 6: Agilidad & Cadena Posterior' }
    ];
  }

  // 4. Crear cada sesión y poblar sus ejercicios
  for (const item of distribucion) {
    const fechaObj = new Date(fechaLunes);
    fechaObj.setDate(fechaObj.getDate() + item.offset);
    const fechaIso = fechaObj.toISOString().split('T')[0];

    await queryTurso(
      `INSERT INTO sesiones_plan (semana_id, user_id, fecha, plantilla_id, tipo, titulo, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`,
      [semanaId, userId, fechaIso, item.plantillaId, item.tipo, item.titulo]
    );

    const sesionRes = await queryTurso(
      `SELECT id FROM sesiones_plan WHERE semana_id = ? AND fecha = ?`, [semanaId, fechaIso]
    );
    const sesionPlanId = Number(sesionRes.rows[0][0].value);

    // Leer bloques y huecos de la plantilla
    const huecosRes = await queryTurso(
      `SELECT 
         b.orden as bloque_orden, b.nombre as bloque_nombre, b.tipo as bloque_tipo,
         h.orden, h.rol, h.ejercicio_id, h.superserie, h.series, h.reps, h.rpe_objetivo, h.descanso_s, h.nota,
         e.impacto, e.fase_rodilla_min
       FROM plantilla_bloques b
       JOIN plantilla_huecos h ON h.bloque_id = b.id
       LEFT JOIN ejercicios e ON e.id = h.ejercicio_id
       WHERE b.plantilla_id = ?
       ORDER BY b.orden, h.orden`,
      [item.plantillaId]
    );

    for (const row of huecosRes.rows) {
      const bOrden = Number(getColVal(row[0]));
      const bNombre = getColVal(row[1]);
      const bTipo = getColVal(row[2]);
      const orden = Number(getColVal(row[3]));
      const rol = getColVal(row[4]);
      const ejId = Number(getColVal(row[5]));
      const superserie = getColVal(row[6]) !== null ? Number(getColVal(row[6])) : null;
      const series = Number(getColVal(row[7]));
      const reps = getColVal(row[8]);
      const rpe = getColVal(row[9]) !== null ? parseFloat(getColVal(row[9])) : null;
      const descanso = Number(getColVal(row[10]));
      const nota = getColVal(row[11]);
      const impacto = Number(getColVal(row[12]));

      // Si el ejercicio supera el impacto de la fase, se avisa o busca alternativa
      if (impacto > impactoMax) {
        console.warn(`[Aviso rodilla] Ejercicio ${ejId} en ${bNombre} tiene impacto ${impacto} > ${impactoMax}.`);
      }

      await queryTurso(
        `INSERT INTO sesion_ejercicios 
         (sesion_plan_id, bloque_orden, bloque_nombre, bloque_tipo, orden, ejercicio_id, rol, superserie, series_obj, reps_obj, rpe_obj, descanso_s, nota)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sesionPlanId, bOrden, bNombre, bTipo, orden, ejId, rol, superserie, series, reps, rpe, descanso, nota]
      );
    }
    console.log(`Sesión creada: [${fechaIso}] ${item.titulo} (${huecosRes.rows.length} ejercicios/bloques)`);
  }

  console.log(`\nSemana generada con éxito con ID: ${semanaId}`);
  return semanaId;
}

// Ejecución directa de prueba si se llama por CLI
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('generar-semana.mjs')) {
  const lunes = process.argv[2] || "2026-11-09";
  generarSemana(10000, lunes, 5, 0).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
