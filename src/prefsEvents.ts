// Tiny mediator so preference modules (customTags, learnedMeals,
// checkinCategories, reminder settings) can announce changes without
// importing the sync layer (which imports them — avoiding a cycle).

type Handler = () => void

let handler: Handler | null = null

export function setPrefsChangedHandler(h: Handler | null) {
  handler = h
}

/** Call after any user-initiated preference change so it gets synced to the cloud. */
export function notifyPrefsChanged() {
  try {
    handler?.()
  } catch {
    /* sync layer not ready */
  }
}
