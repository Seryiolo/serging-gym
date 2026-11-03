function HomeIcon({ active }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  )
}

function Agenda31Icon({ active }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M8 2.8v3.4M16 2.8v3.4M3.5 9h17" />
      <text
        x="12"
        y="17.2"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="8.2"
        fontWeight={active ? '700' : '600'}
        fontFamily="Inter, system-ui, sans-serif"
      >
        31
      </text>
    </svg>
  )
}

function VideosIcon({ active }) {
  return (
    <svg
      width="24"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="6" width="13.5" height="12" rx="2" />
      <path d="M16 10.2l5-3v9.6l-5-3z" />
    </svg>
  )
}

function EvolucionIcon({ active }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4v16h16" />
      <path d="M7.5 15.5l4-4 3 2.5 5-5.5" />
      <path d="M16 8.5h3.5V12" />
    </svg>
  )
}

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'agenda', label: 'Agenda', Icon: Agenda31Icon },
  { id: 'videos', label: 'Vídeos', Icon: VideosIcon },
  { id: 'evolucion', label: 'Evolución', Icon: EvolucionIcon },
]

export default function BottomNav({ activeTab, onSelectTab }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/98 backdrop-blur-md border-t border-[#E6E8EE] pb-safe"
    >
      <div className="max-w-[440px] mx-auto flex items-center justify-around h-[58px] px-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
                active ? 'text-[#1E2433]' : 'text-[#6B7280] hover:text-[#1E2433]'
              }`}
            >
              <Icon active={active} />
              <span
                className={`text-[10.5px] mt-1 tracking-tight leading-none ${
                  active ? 'font-semibold text-[#1E2433]' : 'font-normal text-[#6B7280]'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
