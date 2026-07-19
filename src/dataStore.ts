// Local-first data layer. All pages read and write through this module.
//
// Reads: try the cloud, reconcile the result into the localStorage cache,
// and always answer from the cache — so the app works offline and never
// shows an empty day just because a fetch failed.
//
// Writes: land in the cache immediately, then go onto a durable queue that
// is flushed to Supabase. If the flush fails (offline, server error) the ops
// stay queued and are retried on reconnect / next app focus.

import * as local from './store'
import * as cloud from './cloudStore'
import { isMissingTableError } from './cloudStore'
import { clearCustomTags } from './customTags'
import { importLearnedMealMap } from './learnedMeals'
import { resetCheckinMetricTemplate } from './checkinCategories'
import { setPrefsChangedHandler } from './prefsEvents'
import { pullPrefs, pushPrefs, touchLocalPrefsUpdatedAt } from './prefs'
import type { CheckinPeriod, DailyCheckin, FoodEntry } from './types'

const QUEUE_KEY = 'chewclue_sync_queue'
const CACHE_USER_KEY = 'chewclue_cache_user'

type SyncOp =
  | { kind: 'food_upsert'; entry: FoodEntry }
  | { kind: 'food_delete'; id: string }
  | { kind: 'checkin_upsert'; checkin: DailyCheckin }
  | { kind: 'prefs_push' }

export type SyncStatus = { pending: number; offline: boolean }
export type SaveResult = 'synced' | 'queued'

// ---------------- queue ----------------

function readQueue(): SyncOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SyncOp[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: SyncOp[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    /* storage unavailable */
  }
  notifyStatus()
}

/** Coalesce: a new upsert replaces earlier ops for the same record; a delete drops earlier upserts. */
function enqueue(op: SyncOp) {
  let queue = readQueue()
  if (op.kind === 'food_upsert') {
    queue = queue.filter((q) => !(q.kind === 'food_upsert' && q.entry.id === op.entry.id))
  } else if (op.kind === 'food_delete') {
    queue = queue.filter(
      (q) =>
        !(q.kind === 'food_upsert' && q.entry.id === op.id) &&
        !(q.kind === 'food_delete' && q.id === op.id),
    )
  } else if (op.kind === 'checkin_upsert') {
    queue = queue.filter((q) => !(q.kind === 'checkin_upsert' && q.checkin.id === op.checkin.id))
  } else if (op.kind === 'prefs_push') {
    queue = queue.filter((q) => q.kind !== 'prefs_push')
  }
  queue.push(op)
  writeQueue(queue)
}

function pendingFoodUpsertIds(): Set<string> {
  return new Set(readQueue().flatMap((q) => (q.kind === 'food_upsert' ? [q.entry.id] : [])))
}

function pendingFoodDeleteIds(): Set<string> {
  return new Set(readQueue().flatMap((q) => (q.kind === 'food_delete' ? [q.id] : [])))
}

function pendingCheckinIds(): Set<string> {
  return new Set(readQueue().flatMap((q) => (q.kind === 'checkin_upsert' ? [q.checkin.id] : [])))
}

// ---------------- status ----------------

let offline = false
const listeners = new Set<(s: SyncStatus) => void>()

export function getSyncStatus(): SyncStatus {
  return { pending: readQueue().length, offline }
}

export function subscribeSyncStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb)
  cb(getSyncStatus())
  return () => listeners.delete(cb)
}

function notifyStatus() {
  const s = getSyncStatus()
  for (const cb of listeners) cb(s)
}

function setOffline(value: boolean) {
  if (offline !== value) {
    offline = value
    notifyStatus()
  }
}

// ---------------- flush ----------------

async function runOp(op: SyncOp): Promise<void> {
  switch (op.kind) {
    case 'food_upsert':
      return cloud.cloudSaveFoodEntry(op.entry)
    case 'food_delete':
      return cloud.cloudDeleteFoodEntry(op.id)
    case 'checkin_upsert':
      return cloud.cloudSaveCheckin(op.checkin)
    case 'prefs_push':
      return pushPrefs()
  }
}

let flushing: Promise<boolean> | null = null

/** Attempt to drain the queue in order. Resolves true when fully drained. */
export function flushQueue(): Promise<boolean> {
  if (!flushing) {
    flushing = doFlush().finally(() => {
      flushing = null
    })
  }
  return flushing
}

async function doFlush(): Promise<boolean> {
  for (;;) {
    const queue = readQueue()
    if (queue.length === 0) {
      setOffline(false)
      return true
    }
    const op = queue[0]
    try {
      await runOp(op)
      setOffline(false)
    } catch (e) {
      // A prefs push against a database without the user_prefs table would
      // wedge the queue forever — drop it; everything else waits for a retry.
      if (op.kind === 'prefs_push' && isMissingTableError(e)) {
        writeQueue(readQueue().slice(1))
        continue
      }
      setOffline(true)
      return false
    }
    writeQueue(readQueue().slice(1))
  }
}

// ---------------- reads (refresh cache, answer from cache) ----------------

function byCreatedAt(a: { createdAt: string }, b: { createdAt: string }) {
  return a.createdAt.localeCompare(b.createdAt)
}

function reconcileFoods(cloudRows: FoodEntry[], replacing: (e: FoodEntry) => boolean) {
  const upserts = pendingFoodUpsertIds()
  const deletes = pendingFoodDeleteIds()
  const kept = local
    .getFoodEntries()
    .filter((e) => !replacing(e) || upserts.has(e.id))
  const keptIds = new Set(kept.map((e) => e.id))
  for (const row of cloudRows) {
    if (!deletes.has(row.id) && !keptIds.has(row.id)) kept.push(row)
  }
  local.replaceFoodEntries(kept)
}

function reconcileCheckins(cloudRows: DailyCheckin[], replacing: (c: DailyCheckin) => boolean) {
  const pending = pendingCheckinIds()
  const kept = local.getCheckins().filter((c) => !replacing(c) || pending.has(c.id))
  const keptIds = new Set(kept.map((c) => c.id))
  for (const row of cloudRows) {
    if (!keptIds.has(row.id)) kept.push(row)
  }
  local.replaceCheckins(kept)
}

export async function getFoodEntriesForDate(date: string): Promise<FoodEntry[]> {
  try {
    const rows = await cloud.cloudGetFoodEntriesForDate(date)
    reconcileFoods(rows, (e) => e.date === date)
    setOffline(false)
  } catch {
    setOffline(true)
  }
  return local.getFoodEntriesForDate(date).sort(byCreatedAt)
}

export async function getAllFoodEntries(sinceDate?: string): Promise<FoodEntry[]> {
  try {
    const rows = await cloud.cloudGetFoodEntries(sinceDate)
    reconcileFoods(rows, (e) => !sinceDate || e.date >= sinceDate)
    setOffline(false)
  } catch {
    setOffline(true)
  }
  const all = local.getFoodEntries()
  return (sinceDate ? all.filter((e) => e.date >= sinceDate) : all).sort(byCreatedAt)
}

export async function getFoodEntry(id: string): Promise<FoodEntry | null> {
  // A queued local edit is newer than anything in the cloud.
  if (pendingFoodUpsertIds().has(id)) {
    return local.getFoodEntries().find((e) => e.id === id) ?? null
  }
  try {
    const entry = await cloud.cloudGetFoodEntry(id)
    setOffline(false)
    if (entry) {
      local.saveFoodEntry(entry)
      return entry
    }
  } catch {
    setOffline(true)
  }
  return local.getFoodEntries().find((e) => e.id === id) ?? null
}

export async function getCheckinsForDate(date: string): Promise<DailyCheckin[]> {
  try {
    const rows = await cloud.cloudGetCheckinsForDate(date)
    reconcileCheckins(rows, (c) => c.date === date)
    setOffline(false)
  } catch {
    setOffline(true)
  }
  return local.getCheckinsForDate(date)
}

export async function getCheckinForDate(
  date: string,
  period: CheckinPeriod = 'morning',
): Promise<DailyCheckin | undefined> {
  const checkins = await getCheckinsForDate(date)
  return checkins.find((c) => c.period === period)
}

export async function getAllCheckins(sinceDate?: string): Promise<DailyCheckin[]> {
  try {
    const rows = await cloud.cloudGetCheckins(sinceDate)
    reconcileCheckins(rows, (c) => !sinceDate || c.date >= sinceDate)
    setOffline(false)
  } catch {
    setOffline(true)
  }
  const all = local.getCheckins()
  return sinceDate ? all.filter((c) => c.date >= sinceDate) : all
}

// ---------------- writes ----------------

export async function saveFoodEntry(entry: FoodEntry): Promise<SaveResult> {
  local.saveFoodEntry(entry)
  enqueue({ kind: 'food_upsert', entry })
  return (await flushQueue()) ? 'synced' : 'queued'
}

export async function deleteFoodEntry(id: string): Promise<SaveResult> {
  local.deleteFoodEntry(id)
  enqueue({ kind: 'food_delete', id })
  return (await flushQueue()) ? 'synced' : 'queued'
}

export async function saveCheckin(checkin: DailyCheckin): Promise<SaveResult> {
  local.saveCheckin(checkin)
  enqueue({ kind: 'checkin_upsert', checkin })
  return (await flushQueue()) ? 'synced' : 'queued'
}

// ---------------- lifecycle ----------------

function clearLocalPrefs() {
  clearCustomTags()
  importLearnedMealMap({})
  resetCheckinMetricTemplate()
  try {
    localStorage.removeItem('chewclue_prefs_updated_at')
  } catch {
    /* storage unavailable */
  }
}

/**
 * Call on sign-in. Clears the cache when the account changed (never show one
 * user's data to another), then drains the queue and reconciles prefs.
 */
export async function initDataStore(userId: string): Promise<void> {
  let previous: string | null = null
  try {
    previous = localStorage.getItem(CACHE_USER_KEY)
    localStorage.setItem(CACHE_USER_KEY, userId)
  } catch {
    /* storage unavailable */
  }
  if (previous && previous !== userId) {
    local.resetLocalAppData()
    clearLocalPrefs()
    writeQueue([])
  }

  setPrefsChangedHandler(() => {
    touchLocalPrefsUpdatedAt()
    enqueue({ kind: 'prefs_push' })
    flushQueue().catch(() => {})
  })

  try {
    await flushQueue()
    const shouldPush = await pullPrefs()
    if (shouldPush) {
      touchLocalPrefsUpdatedAt()
      enqueue({ kind: 'prefs_push' })
      await flushQueue()
    }
  } catch {
    setOffline(true)
  }
}

/** Danger zone: wipe cloud + local data. Requires a working connection. */
export async function resetAllData(): Promise<void> {
  writeQueue([])
  await cloud.cloudResetAllData()
  local.resetLocalAppData()
  clearLocalPrefs()
  notifyStatus()
}
