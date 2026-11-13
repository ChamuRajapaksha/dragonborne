import { getNpcById } from './npcs'
import { getQuestsForClass } from './quests'
import type { Quest } from './quests'

export type QuestLogStatus = 'available' | 'locked' | 'completed'

/** A stat the character does not yet meet, with what they currently have. */
export interface UnmetStat {
  stat: string
  required: number
  current: number
}

export interface QuestLogEntry {
  quest: Quest
  status: QuestLogStatus
  npcName: string
  unmetStats: readonly UnmetStat[]
}

export interface QuestLogSection {
  status: QuestLogStatus
  title: string
  entries: readonly QuestLogEntry[]
}

export const QUEST_LOG_STATUS_ORDER: readonly QuestLogStatus[] = [
  'available',
  'locked',
  'completed',
]

const STATUS_TITLES: Record<QuestLogStatus, string> = {
  available: 'Available',
  locked: 'Locked',
  completed: 'Completed',
}

/**
 * The stats a quest still needs. Completed quests keep their requirements on the
 * data, so callers that only care about status should check completion first.
 */
export function unmetQuestStats(
  quest: Quest,
  stats: Record<string, number>,
): UnmetStat[] {
  if (!quest.requiresStats) return []

  return Object.entries(quest.requiresStats)
    .map(([stat, required]) => ({
      stat,
      required: required ?? 0,
      current: stats[stat] ?? 0,
    }))
    .filter((entry) => entry.current < entry.required)
}

/**
 * Every quest the character's class can ever see, tagged with its state.
 * Completion wins over unmet stats so a finished quest never reads as locked.
 */
export function buildQuestLog(
  classId: string,
  stats: Record<string, number>,
  completedIds: readonly string[],
): QuestLogEntry[] {
  const completed = new Set(completedIds)

  return getQuestsForClass(classId).map((quest) => {
    const unmetStats = unmetQuestStats(quest, stats)
    const status: QuestLogStatus = completed.has(quest.id)
      ? 'completed'
      : unmetStats.length > 0
        ? 'locked'
        : 'available'

    return {
      quest,
      status,
      npcName: getNpcById(quest.npcId)?.name ?? 'Unknown',
      unmetStats,
    }
  })
}

/** Groups entries into the journal's fixed section order, empty sections included. */
export function groupQuestLog(entries: readonly QuestLogEntry[]): QuestLogSection[] {
  return QUEST_LOG_STATUS_ORDER.map((status) => ({
    status,
    title: STATUS_TITLES[status],
    entries: entries.filter((entry) => entry.status === status),
  }))
}

export function questLogSummary(
  entries: readonly QuestLogEntry[],
): Record<QuestLogStatus, number> {
  const summary: Record<QuestLogStatus, number> = {
    available: 0,
    locked: 0,
    completed: 0,
  }
  for (const entry of entries) summary[entry.status] += 1
  return summary
}

export function formatUnmetStats(unmetStats: readonly UnmetStat[]): string {
  return unmetStats
    .map((entry) => `${entry.stat} ${entry.required}+ (${entry.current})`)
    .join(', ')
}
