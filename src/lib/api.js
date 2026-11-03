/**
 * Cliente HTTP hacia las funciones serverless `/api/*` de Serging Gym.
 * CERO credenciales o tokens de base de datos en el cliente.
 */

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  let data = null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    const text = await res.text()
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { error: text || `Error HTTP ${res.status}` }
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Error del servidor (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

// ------------------------------------------------------------------ 1. Auth
export function authCheck() {
  return request('/api/auth')
}

export function authLogin({ email, password }) {
  return request('/api/auth', {
    method: 'POST',
    body: { action: 'login', email, password },
  })
}

export function authRegister({ email, password, nombre }) {
  return request('/api/auth', {
    method: 'POST',
    body: { action: 'register', email, password, nombre },
  })
}

export function authLogout() {
  return request('/api/auth', {
    method: 'POST',
    body: { action: 'logout' },
  })
}

export function authAdminUsers() {
  return request('/api/auth', {
    method: 'POST',
    body: { action: 'admin_users' },
  })
}

export function authApproveUser({ targetUserId, estado }) {
  return request('/api/auth', {
    method: 'POST',
    body: { action: 'approve_user', targetUserId, estado },
  })
}

// ------------------------------------------------------------- 2. Bootstrap
export function getBootstrap({ mes, lunes } = {}) {
  const params = new URLSearchParams()
  if (mes) params.set('mes', mes)
  if (lunes) params.set('lunes', lunes)
  const qs = params.toString()
  return request(`/api/bootstrap${qs ? `?${qs}` : ''}`)
}

// ---------------------------------------------------------------- 3. Semana
export function getSemana(lunes) {
  return request(`/api/semana?lunes=${encodeURIComponent(lunes)}`)
}

export function generarSemana({ lunes, dias, hayCarrera, segundoSuperior, sobreescribir = true }) {
  return request('/api/semana', {
    method: 'POST',
    body: {
      action: 'generar',
      lunes,
      dias,
      hayCarrera: Boolean(hayCarrera),
      segundoSuperior: Boolean(segundoSuperior),
      sobreescribir: Boolean(sobreescribir),
    },
  })
}

export function moverSesion({ sesionId, nuevaFecha }) {
  return request('/api/semana', {
    method: 'POST',
    body: { action: 'mover_sesion', sesionId, nuevaFecha },
  })
}

export function cambiarEstadoSesion({ sesionId, estado }) {
  return request('/api/semana', {
    method: 'POST',
    body: { action: 'estado_sesion', sesionId, estado },
  })
}

// ---------------------------------------------------------------- 4. Sesion
export function getSesion(id) {
  return request(`/api/sesion?id=${encodeURIComponent(id)}`)
}

export function completarSesion(payload) {
  return request('/api/sesion', {
    method: 'POST',
    body: { action: 'completar', ...payload },
  })
}

export function obtenerCandidatosSustitucion(sesionEjercicioId) {
  return request('/api/sesion', {
    method: 'POST',
    body: { action: 'sustituir_ejercicio', sesionEjercicioId },
  })
}

export function sustituirEjercicio({ sesionEjercicioId, nuevoEjercicioId }) {
  return request('/api/sesion', {
    method: 'POST',
    body: { action: 'sustituir_ejercicio', sesionEjercicioId, nuevoEjercicioId },
  })
}

export function registrarHinchazonPendiente({ entrenoId, hinchazon }) {
  return request('/api/sesion', {
    method: 'POST',
    body: { action: 'hinchazon_pendiente', entrenoId, hinchazon },
  })
}

// ---------------------------------------------------- 5. Historico Ejercicio
export function getEjercicioHistorico(ejercicioId) {
  return request(`/api/ejercicio-historico?ejercicioId=${encodeURIComponent(ejercicioId)}`)
}

// ------------------------------------------------------------- 6. Ejercicios
export function getEjercicios() {
  return request('/api/ejercicios')
}

export function toggleFavoritoEjercicio(ejercicioId) {
  return request('/api/ejercicios', {
    method: 'POST',
    body: { action: 'toggle_favorito', ejercicioId },
  })
}

export function crearEjercicio(payload) {
  return request('/api/ejercicios', {
    method: 'POST',
    body: { action: 'crear', ...payload },
  })
}

// --------------------------------------------------------------- 7. Carreras
export function getCarreras() {
  return request('/api/carreras')
}

export function registrarCarrera(payload) {
  return request('/api/carreras', {
    method: 'POST',
    body: payload,
  })
}

export function actualizarObjetivoCarrera(payload) {
  return request('/api/carreras', {
    method: 'POST',
    body: { action: 'actualizar_objetivo', ...payload },
  })
}

export function eliminarObjetivoCarrera(id) {
  return request('/api/carreras', {
    method: 'POST',
    body: { action: 'eliminar_objetivo', id },
  })
}

export function actualizarRitmoReferencia({ distancia_m, ritmo_seg_km, fecha }) {
  return request('/api/carreras', {
    method: 'POST',
    body: { action: 'actualizar_ritmo', distancia_m, ritmo_seg_km, fecha },
  })
}

export function eliminarCarrera(carreraId) {
  return request('/api/carreras', {
    method: 'POST',
    body: { action: 'eliminar_carrera', carreraId },
  })
}

// -------------------------------------------------------------- 8. Evolucion
export function getEvolucion() {
  return request('/api/evolucion')
}

export function registrarPeso({ fecha, kg }) {
  return request('/api/evolucion', {
    method: 'POST',
    body: { action: 'registrar_peso', fecha, kg },
  })
}

export function eliminarPeso(id) {
  return request('/api/evolucion', {
    method: 'POST',
    body: { action: 'eliminar_peso', id },
  })
}

export function cambiarFaseRodilla({ fase_id, modo_auto, motivo }) {
  return request('/api/evolucion', {
    method: 'POST',
    body: { action: 'cambiar_fase_rodilla', fase_id, modo_auto, motivo },
  })
}
