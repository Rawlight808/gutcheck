import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { TodayPage } from './pages/TodayPage'
import { LogFoodPage } from './pages/LogFoodPage'
import { CheckinPage } from './pages/CheckinPage'
import { InsightsPage } from './pages/InsightsPage'
import { SettingsPage } from './pages/SettingsPage'
import { startReminderScheduler } from './reminders'
import './App.css'

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    startReminderScheduler()
  }, [])

  return (
    <BrowserRouter>
      <div className="app">
        <div className="app__content">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/log" element={<LogFoodPage />} />
            <Route path="/checkin" element={<CheckinPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
