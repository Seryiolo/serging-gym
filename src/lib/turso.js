/**
 * Cliente de conexión a Turso para Serging Gym
 * Utiliza la API HTTP v2 pipeline de Turso para lecturas y escrituras seguras en la nube.
 */

const TURSO_URL = import.meta.env.VITE_TURSO_DATABASE_URL || "https://serging-gym-sergiolo28.aws-eu-central-1.turso.io";
const TURSO_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN || "";

export async function executeSql(sql, args = []) {
  const token = TURSO_TOKEN;
  if (!token) {
    console.warn("VITE_TURSO_AUTH_TOKEN no configurado en cliente. Usando fallback de consulta local o mock.");
  }

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

  try {
    const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Turso Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const first = data.results[0];
    if (first.type === "error") {
      throw new Error(`SQL Error: ${first.error.message}`);
    }

    const result = first.response.result;
    const cols = result.cols.map(c => c.name);
    const rows = result.rows.map(r => {
      const obj = {};
      cols.forEach((colName, idx) => {
        obj[colName] = r[idx].value;
      });
      return obj;
    });

    return rows;
  } catch (error) {
    console.error("Error ejecutando SQL en Turso:", error);
    throw error;
  }
}
