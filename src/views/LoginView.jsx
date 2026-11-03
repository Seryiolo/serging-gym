import { useState } from 'react'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { authLogin } from '../lib/api'

export default function LoginView({ onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const emailLimpio = email.trim().toLowerCase()
    if (!emailLimpio || password.length < 4) {
      setError('Introduce tu email y una contraseña o PIN de al menos 4 caracteres.')
      return
    }

    setCargando(true)
    try {
      const res = await authLogin({ email: emailLimpio, password })
      if (res?.authenticated && res?.user) {
        onAuthenticated(res.user)
      }
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex justify-center">
      <div className="w-full max-w-[440px] min-h-dvh harbiz-aura px-5 py-10 flex flex-col justify-center">
        <div className="mb-7 text-center">
          <h1 className="text-[34px] font-light tracking-tight text-[#1E2433] leading-tight">
            Serging Gym
          </h1>
          <p className="text-sm text-[#6B7280] mt-1.5">
            Inicia sesión para ver tu plan de entrenamiento
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ECEEF2]">
          <h2 className="text-[18px] font-semibold text-[#1E2433] mb-5">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Email
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
                Contraseña o PIN
              </label>
              <div className="relative">
                <input
                  type={verPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  autoComplete="current-password"
                  placeholder="Mínimo 4 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl bg-[#F5F5F7] border border-[#E5E7EB] pl-10 pr-10 text-sm text-[#1E2433] focus:outline-none focus:border-[#242938]"
                />
                <Lock
                  size={16}
                  className="absolute left-3.5 top-4 text-[#6B7280]"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-3 p-1 text-[#6B7280] hover:text-[#1E2433]"
                >
                  {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Si entras por primera vez, el PIN o contraseña que escribas quedará guardado para tus próximos accesos.
            </p>

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
              {cargando ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
