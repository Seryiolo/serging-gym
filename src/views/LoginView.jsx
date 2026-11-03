import { useState } from 'react'
import { ShieldCheck, Lock, Mail, User as UserIcon, CheckCircle2 } from 'lucide-react'
import { authLogin, authRegister } from '../lib/api'

export default function LoginView({ onAuthenticated }) {
  const [modo, setModo] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensajePendiente, setMensajePendiente] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensajePendiente('')

    const emailLimpio = email.trim().toLowerCase()
    if (!emailLimpio || password.length < 4) {
      setError('Introduce tu email y una contraseña o PIN de al menos 4 caracteres.')
      return
    }

    setCargando(true)
    try {
      if (modo === 'login') {
        const res = await authLogin({ email: emailLimpio, password })
        if (res?.authenticated && res?.user) {
          onAuthenticated(res.user)
        }
      } else {
        const res = await authRegister({
          email: emailLimpio,
          password,
          nombre: nombre.trim() || undefined,
        })
        if (res?.authenticated && res?.user) {
          onAuthenticated(res.user)
        } else if (res?.pending) {
          setMensajePendiente(
            res.message ||
              'Solicitud enviada correctamente. Tu cuenta quedará activa cuando el administrador la apruebe.'
          )
        }
      }
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex justify-center">
      <div className="w-full max-w-[440px] min-h-dvh harbiz-aura px-5 py-10 flex flex-col justify-between">
        <div className="pt-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#1E2433]/10 px-3 py-1 text-[11px] font-medium text-[#1E2433] shadow-2xs mb-5">
            <ShieldCheck size={14} className="text-[#EE8641]" />
            <span>Reatletización Rodilla & Rendimiento Carrera</span>
          </div>

          <h1 className="text-[36px] font-light tracking-tight text-[#1E2433] leading-[1.12]">
            Serging Gym
          </h1>
          <p className="text-sm text-[#4B5563] mt-2 leading-relaxed">
            Planificación de fuerza, control de impacto por fases y ritmos de carrera sincronizados en la nube.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ECEEF2] my-8">
          {/* Pestañas estilo Harbiz */}
          <div className="flex border-b border-[#E5E7EB] mb-5">
            <button
              type="button"
              onClick={() => {
                setModo('login')
                setError('')
                setMensajePendiente('')
              }}
              className={`flex-1 pb-2.5 text-sm transition border-b-2 ${
                modo === 'login'
                  ? 'border-[#1E2433] text-[#1E2433] font-semibold'
                  : 'border-transparent text-[#6B7280] font-normal'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('register')
                setError('')
                setMensajePendiente('')
              }}
              className={`flex-1 pb-2.5 text-sm transition border-b-2 ${
                modo === 'register'
                  ? 'border-[#1E2433] text-[#1E2433] font-semibold'
                  : 'border-transparent text-[#6B7280] font-normal'
              }`}
            >
              Solicitar acceso
            </button>
          </div>

          {mensajePendiente ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
              <CheckCircle2 size={26} className="mx-auto text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900">
                Solicitud registrada
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {mensajePendiente}
              </p>
              <button
                type="button"
                onClick={() => {
                  setModo('login')
                  setMensajePendiente('')
                }}
                className="mt-2 px-4 py-2 rounded-full bg-[#242938] text-white text-xs font-semibold"
              >
                Volver a Entrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {modo === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                    Nombre
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] pl-10 pr-3.5 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
                    />
                    <UserIcon
                      size={16}
                      className="absolute left-3.5 top-4 text-[#6B7280]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] pl-10 pr-3.5 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
                  />
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-4 text-[#6B7280]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                  Contraseña o PIN (mín. 4 caracteres)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={4}
                    autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] pl-10 pr-3.5 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
                  />
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-4 text-[#6B7280]"
                  />
                </div>
              </div>

              {modo === 'login' && (
                <p className="text-[11px] text-[#6B7280] bg-[#F5F5F7] rounded-xl px-3 py-2 leading-relaxed">
                  <strong className="text-[#1E2433]">Primer acceso:</strong> si tu cuenta ya está autorizada y entras por primera vez, la contraseña o PIN que escribas quedará guardada como tu clave personal.
                </p>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 text-xs text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full h-12 rounded-full bg-[#242938] text-white text-sm font-semibold shadow-md hover:opacity-95 transition disabled:opacity-50"
              >
                {cargando
                  ? 'Verificando...'
                  : modo === 'login'
                  ? 'Entrar en Serging Gym'
                  : 'Enviar solicitud'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-[#9CA3AF]">
          Serging Gym · Entrenamiento seguro y progresivo
        </p>
      </div>
    </div>
  )
}
