/**
 * Progresion de rodilla por fases. Funcion pura: recibe la fase actual y las
 * ultimas sesiones con impacto y devuelve una SUGERENCIA. La decision final
 * es siempre del usuario (la app nunca cambia de fase sola).
 *
 * No es consejo medico: solo aplica los umbrales editables de fases_rodilla.
 */

/**
 * @param {{id:number, sesiones_para_subir:number, molestia_max_subir:number, molestia_min_bajar:number}} fase
 * @param {Array<{molestia_durante:?number, molestia_despues:?number, hinchazon:?number}>} sesiones  mas reciente primero
 * @param {number} faseMax  ultima fase existente
 */
export function evaluarProgresion(fase, sesiones, faseMax = 4) {
  const validas = sesiones.filter((s) => s.molestia_durante != null || s.molestia_despues != null)
  if (validas.length === 0) {
    return { accion: 'mantener', progreso: 0, objetivo: fase.sesiones_para_subir, motivo: 'Aun no hay sesiones con impacto registradas.' }
  }

  const pico = (s) => Math.max(s.molestia_durante ?? 0, s.molestia_despues ?? 0)
  const ultima = validas[0]

  if (ultima.hinchazon === 1) {
    return { accion: 'bajar', progreso: 0, objetivo: fase.sesiones_para_subir, motivo: 'Hinchazon al dia siguiente de la ultima sesion. Reduce carga/impacto y, si se repite, consulta con un profesional.' }
  }
  if (pico(ultima) >= fase.molestia_min_bajar) {
    return { accion: 'bajar', progreso: 0, objetivo: fase.sesiones_para_subir, motivo: `Molestia ${pico(ultima)}/10 en la ultima sesion (umbral ${fase.molestia_min_bajar}). Baja un nivel y vigila la evolucion.` }
  }

  const ventana = validas.slice(0, 3)
  if (ventana.length === 3 && pico(ventana[0]) > pico(ventana[1]) && pico(ventana[1]) > pico(ventana[2]) && pico(ventana[0]) >= 3) {
    return { accion: 'vigilar', progreso: 0, objetivo: fase.sesiones_para_subir, motivo: 'La molestia ha ido subiendo en las tres ultimas sesiones. No subas de fase y repite una sesion mas suave.' }
  }

  // Racha de sesiones consecutivas "buenas" (molestia baja y sin hinchazon)
  let racha = 0
  for (const s of validas) {
    if (pico(s) <= fase.molestia_max_subir && s.hinchazon !== 1) racha += 1
    else break
  }

  if (racha >= fase.sesiones_para_subir) {
    if (fase.id >= faseMax) {
      return { accion: 'mantener', progreso: racha, objetivo: fase.sesiones_para_subir, motivo: 'Ya estas en la ultima fase.' }
    }
    return { accion: 'subir', progreso: racha, objetivo: fase.sesiones_para_subir, motivo: `${racha} sesiones seguidas con molestia <= ${fase.molestia_max_subir}/10 y sin hinchazon.` }
  }
  return { accion: 'mantener', progreso: racha, objetivo: fase.sesiones_para_subir, motivo: `Progreso ${racha}/${fase.sesiones_para_subir} sesiones buenas seguidas.` }
}
