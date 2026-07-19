// Single source of truth for tag display. Replaces the inline
// `t === 'dairy' ? '🧀' : …` maps that only covered 5 of the 25 built-ins
// and no custom tags.

import { BUILT_IN_TAGS } from './types'
import { getCustomTags } from './customTags'
import type { TagDef } from './types'

export function getAllTagDefs(): TagDef[] {
  return [...BUILT_IN_TAGS, ...getCustomTags()]
}

export function getTagDef(id: string): TagDef {
  return getAllTagDefs().find((t) => t.id === id) ?? { id, label: id, emoji: '🏷️' }
}

export function getTagEmoji(id: string): string {
  return getTagDef(id).emoji
}
