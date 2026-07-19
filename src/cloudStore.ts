import { supabase } from './supabase'
import type { BowelRating, CheckinPeriod, DailyCheckin, FoodEntry } from './types'

// All functions in this module THROW on Supabase errors. Callers (dataStore)
// are responsible for falling back to the local cache / queueing retries.

type FoodRow = {
  id: string
  date: string
  meal: FoodEntry['meal']
  description: string
  tags: string[] | null
  created_at: string
}

type CheckinRow = {
  id: string
  date: string
  period: CheckinPeriod | null
  sleep_quality: number
  energy: number
  mood: number
  pain: number
  bowel: number
  notes: string | null
  custom_labels: DailyCheckin['customLabels'] | null
  custom_directions: DailyCheckin['customDirections'] | null
  extra_metrics: DailyCheckin['extraMetrics'] | null
  created_at: string
}

function mapFood(r: FoodRow): FoodEntry {
  return {
    id: r.id,
    date: r.date,
    meal: r.meal,
    description: r.description,
    tags: r.tags ?? [],
    createdAt: r.created_at,
  }
}

function mapCheckin(r: CheckinRow): DailyCheckin {
  return {
    id: r.id,
    date: r.date,
    period: r.period ?? 'morning',
    sleepQuality: r.sleep_quality,
    energy: r.energy,
    mood: r.mood,
    pain: r.pain,
    // 0 = unanswered (partial check-ins, migration 002) — wider than BowelRating
    bowel: r.bowel as BowelRating,
    notes: r.notes ?? '',
    customLabels: r.custom_labels ?? {},
    customDirections: r.custom_directions ?? {},
    extraMetrics: r.extra_metrics ?? [],
    createdAt: r.created_at,
  }
}

export async function cloudGetFoodEntries(sinceDate?: string): Promise<FoodEntry[]> {
  let query = supabase.from('food_entries').select('*').order('created_at', { ascending: false })
  if (sinceDate) query = query.gte('date', sinceDate)
  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as FoodRow[]).map(mapFood)
}

export async function cloudGetFoodEntriesForDate(date: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as FoodRow[]).map(mapFood)
}

export async function cloudGetFoodEntry(id: string): Promise<FoodEntry | null> {
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? mapFood(data as FoodRow) : null
}

export async function cloudSaveFoodEntry(entry: FoodEntry): Promise<void> {
  const { error } = await supabase.from('food_entries').upsert({
    id: entry.id,
    date: entry.date,
    meal: entry.meal,
    description: entry.description,
    tags: entry.tags,
    created_at: entry.createdAt,
  })
  if (error) throw error
}

export async function cloudDeleteFoodEntry(id: string): Promise<void> {
  const { error } = await supabase.from('food_entries').delete().eq('id', id)
  if (error) throw error
}

export async function cloudGetCheckins(sinceDate?: string): Promise<DailyCheckin[]> {
  let query = supabase.from('daily_checkins').select('*').order('date', { ascending: false })
  if (sinceDate) query = query.gte('date', sinceDate)
  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as CheckinRow[]).map(mapCheckin)
}

export async function cloudGetCheckinsForDate(date: string): Promise<DailyCheckin[]> {
  const { data, error } = await supabase.from('daily_checkins').select('*').eq('date', date)
  if (error) throw error
  return ((data ?? []) as CheckinRow[]).map(mapCheckin)
}

export async function cloudSaveCheckin(checkin: DailyCheckin): Promise<void> {
  const { error } = await supabase.from('daily_checkins').upsert({
    id: checkin.id,
    date: checkin.date,
    period: checkin.period,
    sleep_quality: checkin.sleepQuality,
    energy: checkin.energy,
    mood: checkin.mood,
    pain: checkin.pain,
    bowel: checkin.bowel,
    notes: checkin.notes,
    custom_labels: checkin.customLabels ?? {},
    custom_directions: checkin.customDirections ?? {},
    extra_metrics: checkin.extraMetrics ?? [],
    created_at: checkin.createdAt,
  })
  if (error) throw error
}

// ---- user_prefs (custom tags, learned meals, templates, reminder settings) ----

export type CloudPrefs = { prefs: Record<string, unknown>; updatedAt: string }

export async function cloudGetPrefs(): Promise<CloudPrefs | null> {
  const { data, error } = await supabase.from('user_prefs').select('*').maybeSingle()
  if (error) throw error
  if (!data) return null
  return { prefs: (data.prefs ?? {}) as Record<string, unknown>, updatedAt: data.updated_at }
}

export async function cloudSavePrefs(prefs: Record<string, unknown>, updatedAt: string): Promise<void> {
  const { error } = await supabase.from('user_prefs').upsert({ prefs, updated_at: updatedAt })
  if (error) throw error
}

/** True when the error means a table hasn't been created yet (migration not run). */
export function isMissingTableError(e: unknown): boolean {
  const code = (e as { code?: string })?.code
  const msg = String((e as { message?: string })?.message ?? '')
  return code === '42P01' || code === 'PGRST205' || /does not exist|could not find the table/i.test(msg)
}

export async function cloudResetAllData(): Promise<void> {
  const results = await Promise.all([
    supabase.from('food_entries').delete().not('id', 'is', null),
    supabase.from('daily_checkins').delete().not('id', 'is', null),
  ])
  for (const { error } of results) if (error) throw error
  // user_prefs may not exist yet (pre-004 databases) — tolerate that.
  const { error: prefsError } = await supabase.from('user_prefs').delete().not('user_id', 'is', null)
  if (prefsError && !isMissingTableError(prefsError)) throw prefsError
}
