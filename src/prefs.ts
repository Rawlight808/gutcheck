// Cloud sync for preferences that used to be localStorage-only: custom tags,
// learned meals, the check-in metric template, and reminder settings.
// Stored as one jsonb blob per user in `user_prefs`; last write wins by
// timestamp. Pushes are queued through dataStore so they survive offline.

import { cloudGetPrefs, cloudSavePrefs, isMissingTableError } from './cloudStore'
import { getCustomTags, saveCustomTags } from './customTags'
import { exportLearnedMealMap, importLearnedMealMap, type LearnedMeal } from './learnedMeals'
import { applyCheckinMetricTemplate, getCheckinMetricTemplate } from './checkinCategories'
import { applyReminderSettings, getReminderSettings } from './store'
import type { CheckinMetricTemplate, ReminderSettings, TagDef } from './types'

const UPDATED_AT_KEY = 'chewclue_prefs_updated_at'

export type PrefsBlob = {
  customTags: TagDef[]
  learnedMeals: Record<string, LearnedMeal>
  checkinTemplate: CheckinMetricTemplate[]
  reminderSettings: ReminderSettings
}

export function getLocalPrefsUpdatedAt(): string {
  try {
    return localStorage.getItem(UPDATED_AT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function touchLocalPrefsUpdatedAt(): string {
  const now = new Date().toISOString()
  try {
    localStorage.setItem(UPDATED_AT_KEY, now)
  } catch {
    /* storage unavailable */
  }
  return now
}

export function buildPrefsBlob(): PrefsBlob {
  return {
    customTags: getCustomTags(),
    learnedMeals: exportLearnedMealMap(),
    checkinTemplate: getCheckinMetricTemplate(),
    reminderSettings: getReminderSettings(),
  }
}

function applyPrefsBlob(blob: Partial<PrefsBlob>) {
  if (Array.isArray(blob.customTags)) saveCustomTags(blob.customTags)
  if (blob.learnedMeals && typeof blob.learnedMeals === 'object') importLearnedMealMap(blob.learnedMeals)
  if (Array.isArray(blob.checkinTemplate)) applyCheckinMetricTemplate(blob.checkinTemplate)
  if (blob.reminderSettings && typeof blob.reminderSettings === 'object') {
    applyReminderSettings(blob.reminderSettings)
  }
}

/** Push the current local prefs to the cloud. Throws on failure (caller queues a retry). */
export async function pushPrefs(): Promise<void> {
  const updatedAt = getLocalPrefsUpdatedAt() || touchLocalPrefsUpdatedAt()
  await cloudSavePrefs(buildPrefsBlob() as unknown as Record<string, unknown>, updatedAt)
}

/**
 * Reconcile local and cloud prefs: newer side wins wholesale.
 * Returns true when local prefs should be pushed (cloud missing or older).
 * Missing user_prefs table (migration not run yet) is treated as "nothing to do".
 */
export async function pullPrefs(): Promise<boolean> {
  let cloud
  try {
    cloud = await cloudGetPrefs()
  } catch (e) {
    if (isMissingTableError(e)) return false
    throw e
  }
  const localUpdatedAt = getLocalPrefsUpdatedAt()
  if (!cloud) return true
  if (cloud.updatedAt > localUpdatedAt) {
    applyPrefsBlob(cloud.prefs as Partial<PrefsBlob>)
    try {
      localStorage.setItem(UPDATED_AT_KEY, cloud.updatedAt)
    } catch {
      /* storage unavailable */
    }
    return false
  }
  return cloud.updatedAt < localUpdatedAt
}
