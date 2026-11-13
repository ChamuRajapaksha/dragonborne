import type { QuestLogEntry } from './questLog'

/** Completed quests cannot be tracked; available and locked ones can. */
export function canTrackQuest(entry: QuestLogEntry): boolean {
  return entry.status !== 'completed'
}

/** Clicking the pinned quest again unpins it. */
export function toggleTrackedQuest(
  current: string | null,
  questId: string,
): string | null {
  return current === questId ? null : questId
}

/** The pinned entry, or `null` when it is missing or already completed. */
export function resolveTrackedQuest(
  entries: readonly QuestLogEntry[],
  trackedId: string | null,
): QuestLogEntry | null {
  if (!trackedId) return null

  const entry = entries.find((candidate) => candidate.quest.id === trackedId)
  if (!entry || !canTrackQuest(entry)) return null
  return entry
}

/** The id worth persisting: drops completed, unknown or untrackable quests. */
export function reconcileTrackedQuestId(
  entries: readonly QuestLogEntry[],
  trackedId: string | null,
): string | null {
  return resolveTrackedQuest(entries, trackedId)?.quest.id ?? null
}

/** One short HUD line for the pinned quest, or an empty string when there is none. */
export function trackedQuestHudLine(entry: QuestLogEntry | null): string {
  if (!entry) return ''
  if (entry.status === 'locked') {
    return `Tracked: ${entry.quest.title} (locked)`
  }
  return `Tracked: ${entry.quest.title} \u2014 ${entry.npcName}`
}
