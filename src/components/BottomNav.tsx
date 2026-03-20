import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', icon: '📋', label: 'Today' },
  { path: '/log', icon: '🍽️', label: 'Log Food' },
  { path: '/checkin', icon: '🌅', label: 'Check-In' },
  { path: '/insights', icon: '🔍', label: 'Insights' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <button
          key={t.path}
          className={`bottom-nav__item ${location.pathname === t.path ? 'bottom-nav__item--active' : ''}`}
          onClick={() => navigate(t.path)}
        >
          <span className="bottom-nav__icon">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
