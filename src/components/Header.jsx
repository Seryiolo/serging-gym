import { useState } from 'react'
import { User, Bell, ShieldCheck, LogOut, X } from 'lucide-react'

const TAB_LABELS = {
  home: 'HOME',
  agenda: 'AGENDA',
  videos: 'VÍDEOS',
  evolucion: 'EVOLUCIÓN',
}

export default function Header({
  activeTab,
  user,
  rodilla,
  pendingSwellingCount = 0,
  onOpenRodilla,
  onLogout,
}) {
  const [modalAbierto, setModalAbierto] = useState(false)

  return (
    <>
      <header className="pt-safe px-4 pt-3 pb-2 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            aria-label="Perfil y cuenta"
            className="w-8 h-8 rounded-full border border-[#1E2433] flex items-center justify-center text-[#1E2433] bg-white/50 hover:bg-white transition"
          >
            <User size={16} strokeWidth={1.7} />
          </button>
          <span className="text-[11px] font-medium tracking-[0.06em] text-[#1E2433]/85 uppercase">
            {TAB_LABELS[activeTab] || 'HOME'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {rodilla?.nombre && (
            <button
              type="button"
              onClick={onOpenRodilla}
              className="flex items-center gap-1.5 rounded-full bg-white/75 backdrop-blur-xs border border-[#1E2433]/12 px-2.5 py-1 text-[11px] font-medium text-[#1E2433] shadow-2xs hover:bg-white transition"
              title="Ver estado de rodilla y progresión"
            >
              <ShieldCheck size={13} className="text-[#EE8641]" />
              <span className="max-w-[130px] truncate">
                F{rodilla.fase_id || 1} · {rodilla.nombre}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenRodilla}
            aria-label="Avisos de seguimiento"
            className="relative w-8 h-8 rounded-full flex items-center justify-center text-[#1E2433]/85 hover:bg-white/60 transition"
          >
            <Bell size={18} strokeWidth={1.6} />
            {pendingSwellingCount > 0 && (
              <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-[#EE6B2F] ring-2 ring-[#F5F5F7]" />
            )}
          </button>
        </div>
      </header>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-[#1E2433]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-[#1E2433] flex items-center justify-center text-[#1E2433] bg-[#F5F5F7]">
                  <User size={20} strokeWidth={1.6} />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1E2433]">
                    {user?.nombre || 'Sergio'}
                  </h3>
                  <p className="text-xs text-[#6B7280]">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#4B5563]"
              >
                <X size={18} />
              </button>
            </div>

            {rodilla && (
              <div className="bg-[#F5F5F7] rounded-2xl p-3.5 mb-5 border border-[#E5E7EB]">
                <span className="text-[11px] uppercase tracking-wider text-[#6B7280] font-medium block">
                  Parámetro actual de rodilla
                </span>
                <p className="text-sm font-semibold text-[#1E2433] mt-0.5">
                  Fase {rodilla.fase_id}: {rodilla.nombre}
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Impacto máx. permitido: nivel {rodilla.impacto_max}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setModalAbierto(false)
                onLogout()
              }}
              className="w-full h-11 rounded-full border border-[#D1D5DB] text-[#1E2433] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#F5F5F7] transition"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  )
}
