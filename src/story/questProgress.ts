const STORAGE_KEY = 'dragonborne.quests.completed'

export function getCompletedQuestIds(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export function isQuestCompleted(questId: string): boolean {
  return getCompletedQuestIds().includes(questId)
}

/**
 * Marks a quest complete. Returns `true` only on the first completion, so callers
 * that must fire exactly once (item rewards) can use the result as the gate.
 */
export function completeQuest(questId: string): boolean {
  const completed = getCompletedQuestIds()
  if (completed.includes(questId)) return false

  completed.push(questId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed))
  return true
}