import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { format } from 'date-fns'
import { cloudGetCheckinForDate } from './cloudStore'
import { getReminderSettings } from './store'

const LAST_EVENING_KEY = 'chewclue_last_evening_reminder'
const LAST_MORNING_KEY = 'chewclue_last_morning_reminder'
const MORNING_NOTIFICATION_ID = 1001
const EVENING_NOTIFICATION_ID = 1002

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

export type ReminderPermission = NotificationPermission | 'unsupported'

function isNativeReminderPlatform() {
  return Capacitor.isNativePlatform()
}

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

function parseHHMM(value: string): { hour: number; minute: number } {
  const [hourPart, minutePart] = value.split(':')
  const hour = Number(hourPart)
  const minute = Number(minutePart)
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  }
}

function nextNotificationDate(time: string, skipToday: boolean): Date {
  const { hour, minute } = parseHHMM(time)
  const now = new Date()
  const next = new Date(now)
  next.setHours(hour, minute, 0, 0)

  if (skipToday || next <= now) {
    next.setDate(next.getDate() + 1)
  }

  return next
}

function mapCapacitorPermission(value: string): ReminderPermission {
  if (value === 'granted') return 'granted'
  if (value === 'denied') return 'denied'
  return 'default'
}

async function cancelNativeReminderNotifications() {
  await LocalNotifications.cancel({
    notifications: [{ id: MORNING_NOTIFICATION_ID }, { id: EVENING_NOTIFICATION_ID }],
  })
}

async function syncNativeReminderNotifications() {
  const settings = getReminderSettings()
  const today = format(new Date(), 'yyyy-MM-dd')

  await cancelNativeReminderNotifications()

  let hasMorningCheckinToday = false
  let hasEveningCheckinToday = false
  try {
    const [morning, evening] = await Promise.all([
      cloudGetCheckinForDate(today, 'morning'),
      cloudGetCheckinForDate(today, 'evening'),
    ])
    hasMorningCheckinToday = Boolean(morning)
    hasEveningCheckinToday = Boolean(evening)
  } catch {
    // If cloud check-in lookup fails, keep reminders active.
  }

  const notifications: Array<{
    id: number
    title: string
    body: string
    schedule: { at: Date; every: 'day' }
  }> = []

  if (settings.morningReminderEnabled) {
    notifications.push({
      id: MORNING_NOTIFICATION_ID,
      title: 'ChewClue',
      body: 'Good morning! How are you feeling? Tap to do your check-in.',
      schedule: {
        at: nextNotificationDate(settings.morningReminderTime, hasMorningCheckinToday),
        every: 'day',
      },
    })
  }

  if (settings.eveningReminderEnabled) {
    notifications.push({
      id: EVENING_NOTIFICATION_ID,
      title: 'ChewClue',
      body: 'How are you feeling tonight? Tap to do your evening check-in.',
      schedule: {
        at: nextNotificationDate(settings.eveningReminderTime, hasEveningCheckinToday),
        every: 'day',
      },
    })
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications })
  }
}

export async function getReminderPermissionStatus(): Promise<ReminderPermission> {
  if (isNativeReminderPlatform()) {
    const permissions = await LocalNotifications.checkPermissions()
    return mapCapacitorPermission(permissions.display)
  }

  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (isNativeReminderPlatform()) {
    const permissions = await LocalNotifications.requestPermissions()
    return mapCapacitorPermission(permissions.display)
  }

  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}

export async function refreshReminderScheduling() {
  if (!isNativeReminderPlatform()) return

  const status = await getReminderPermissionStatus()
  if (status !== 'granted') {
    await cancelNativeReminderNotifications()
    return
  }

  await syncNativeReminderNotifications()
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
  if (isNativeReminderPlatform()) {
    refreshReminderScheduling().catch((e) => {
      console.warn('ChewClue: native reminder sync skipped', e)
    })
    return
  }

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
