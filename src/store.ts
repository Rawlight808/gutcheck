import type { DailyCheckin, FoodEntry, ReminderSettings } from './types'

const FOOD_KEY = 'gutcheck_foods'
const CHECKIN_KEY = 'gutcheck_checkins'
const REMINDER_KEY = 'gutcheck_reminders'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function getFoodEntries(): FoodEntry[] {
  return read<FoodEntry[]>(FOOD_KEY, [])
}

export function saveFoodEntry(entry: FoodEntry) {
  const entries = getFoodEntries()
  const idx = entries.findIndex((e) => e.id === entry.id)
  if (idx >= 0) entries[idx] = entry
  else entries.push(entry)
  write(FOOD_KEY, entries)
}

export function deleteFoodEntry(id: string) {
  write(FOOD_KEY, getFoodEntries().filter((e) => e.id !== id))
}

export function getCheckins(): DailyCheckin[] {
  return read<DailyCheckin[]>(CHECKIN_KEY, [])
}

export function saveCheckin(checkin: DailyCheckin) {
  const list = getCheckins()
  const idx = list.findIndex((c) => c.id === checkin.id)
  if (idx >= 0) list[idx] = checkin
  else list.push(checkin)
  write(CHECKIN_KEY, list)
}

export function getCheckinForDate(date: string): DailyCheckin | undefined {
  return getCheckins().find((c) => c.date === date)
}

export function getFoodEntriesForDate(date: string): FoodEntry[] {
  return getFoodEntries().filter((e) => e.date === date)
}

const defaultReminders: ReminderSettings = {
  eveningReminderEnabled: true,
  eveningReminderTime: '20:00',
  morningReminderEnabled: true,
  morningReminderTime: '08:00',
}

export function getReminderSettings(): ReminderSettings {
  return read<ReminderSettings>(REMINDER_KEY, defaultReminders)
}

export function saveReminderSettings(settings: ReminderSettings) {
  write(REMINDER_KEY, settings)
}
