import { useLocation, useNavigate } from 'react-router-dom'

function IconToday({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      {active && <rect x="7" y="14" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" />}
    </svg>
  )
}

function IconLogFood({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.1 : 0} />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function IconCheckin({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" fill="none" />
      {active && <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />}
    </svg>
  )
}

function IconInsights({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      {active && (
        <>
          <circle cx="18" cy="10" r="2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
          <circle cx="6" cy="14" r="2" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  )
}

function IconSettings({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const tabs = [
  { path: '/', label: 'Today', Icon: IconToday },
  { path: '/log', label: 'Log Food', Icon: IconLogFood },
  { path: '/checkin', label: 'Check-In', Icon: IconCheckin },
  { path: '/insights', label: 'Insights', Icon: IconInsights },
  { path: '/settings', label: 'Settings', Icon: IconSettings },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      {tabs.map((t) => {
        const active = location.pathname === t.path
        return (
          <button
            key={t.path}
            className={`bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}`}
            onClick={() => navigate(t.path)}
          >
            <span className="bottom-nav__icon">
              <t.Icon active={active} />
            </span>
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
