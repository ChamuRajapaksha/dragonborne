const STORAGE_KEY = 'dragonborne.quests.tracked'

/** The quest the player pinned to the HUD, or `null` when nothing is tracked. */
export function getTrackedQuestId(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  const id = raw.trim()
  return id.length > 0 ? id : null
}

export function setTrackedQuestId(questId: string | null): void {
  const id = questId?.trim() ?? ''
  if (id.length > 0) {
    localStorage.setItem(STORAGE_KEY, id)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function clearTrackedQuest(): void {
  localStorage.removeItem(STORAGE_KEY)
}
