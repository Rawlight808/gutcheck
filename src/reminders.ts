import { format } from 'date-fns'
import { getReminderSettings } from './store'
import { cloudGetCheckinForDate } from './cloudStore'

const LAST_EVENING_KEY = 'chewclue_last_evening_reminder'
const LAST_MORNING_KEY = 'chewclue_last_morning_reminder'

function migrateLegacyReminderKeys() {
  const pairs: [string, string][] = [
    ['gutcheck_last_evening_reminder', LAST_EVENING_KEY],
    ['gutcheck_last_morning_reminder', LAST_MORNING_KEY],
  ]
  for (const [oldKey, newKey] of pairs) {
    if (localStorage.getItem(newKey) === null) {
      const v = localStorage.getItem(oldKey)
      if (v !== null) localStorage.setItem(newKey, v)
    }
  }
}
migrateLegacyReminderKeys()
const CHECK_INTERVAL_MS = 60_000 // check every minute

function alreadySentToday(key: string): boolean {
  return localStorage.getItem(key) === format(new Date(), 'yyyy-MM-dd')
}

function markSent(key: string) {
  localStorage.setItem(key, format(new Date(), 'yyyy-MM-dd'))
}

function currentTimeHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function notify(title: string, body: string) {
  // Safari / some WebKit builds don't expose Notification — avoid ReferenceError
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
    })
  } else {
    new Notification(title, { body, icon: '/icon-192.png' })
  }
}

function checkReminders() {
  runReminderCheck().catch((e) => {
    console.warn('ChewClue: reminder check skipped', e)
  })
}

async function runReminderCheck() {
  const settings = getReminderSettings()
  const now = currentTimeHHMM()
  const today = format(new Date(), 'yyyy-MM-dd')

  if (
    settings.eveningReminderEnabled &&
    now >= settings.eveningReminderTime &&
    !alreadySentToday(LAST_EVENING_KEY)
  ) {
    const checkin = await cloudGetCheckinForDate(today, 'evening')
    if (!checkin) {
      notify('ChewClue', 'How are you feeling tonight? Tap to do your evening check-in.')
    }
    markSent(LAST_EVENING_KEY)
  }

  if (
    settings.morningReminderEnabled &&
    now >= settings.morningReminderTime &&
    now < '12:00' &&
    !alreadySentToday(LAST_MORNING_KEY)
  ) {
    const checkin = await cloudGetCheckinForDate(today, 'morning')
    if (!checkin) {
      notify('ChewClue', 'Good morning! How are you feeling? Tap to do your check-in.')
    }
    markSent(LAST_MORNING_KEY)
  }
}

let intervalId: number | null = null

export function startReminderScheduler() {
  if (intervalId !== null) return
  checkReminders()
  intervalId = window.setInterval(checkReminders, CHECK_INTERVAL_MS)
}

export function stopReminderScheduler() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}
