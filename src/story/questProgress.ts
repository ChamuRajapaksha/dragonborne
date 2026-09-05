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

export function completeQuest(questId: string): void {
  const completed = getCompletedQuestIds()
  if (!completed.includes(questId)) {
    completed.push(questId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed))
  }
}