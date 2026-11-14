/** What pressing E on this NPC opens. Defaults to the quest popup. */
import { minuteOfDay } from '../world/time'

export type NpcService = 'quest' | 'trade' | 'smith'

/** A daily on-duty window, in minutes of the day. */
export interface NpcHours {
  /** Minute of day, inclusive. */
  start: number
  /** Minute of day, exclusive. May be smaller than start (wraps midnight). */
  end: number
}

export interface NpcDefinition {
  id: string
  name: string
  role: string
  greeting: string
  service?: NpcService
  /** When absent (or `start === end`) the NPC is always at their post. */
  activeHours?: NpcHours
}

export const NPCS: readonly NpcDefinition[] = [
  {
    id: 'forest-guide',
    name: 'The Stranger',
    role: 'Guide',
    greeting:
      'You woke by the fire ring, so the woods brought you here. Follow the track east and you will reach Emberhold before dark.',
  },
  {
    id: 'village-smith',
    name: 'Brennan the Smith',
    role: 'Smith',
    service: 'smith',
    activeHours: { start: 6 * 60, end: 20 * 60 },
    greeting:
      'Emberhold keeps itself armed and it keeps itself fed. Pick the work that suits your hands, not the work that sounds grandest.',
  },
  {
    id: 'village-archivist',
    name: 'Maerwyn',
    role: 'Archivist',
    activeHours: { start: 9 * 60, end: 17 * 60 },
    greeting:
      'Every name that ever passed through this village is written down somewhere below. Some of those pages would rather stay shut.',
  },
  {
    id: 'village-host',
    name: 'Odile',
    role: 'Host',
    activeHours: { start: 16 * 60, end: 2 * 60 },
    greeting:
      'A village this size survives on gossip and song. Whatever you can carry through the gates, I will find you a place for it.',
  },
  {
    id: 'village-trader',
    name: 'Hollis',
    role: 'Trader',
    service: 'trade',
    activeHours: { start: 7 * 60, end: 19 * 60 },
    greeting:
      'Timber is timber and gold is gold, and Emberhold always needs more of the first to make the second.',
  },
  {
    id: 'night-watch',
    name: 'The Night Watch',
    role: 'Watch',
    activeHours: { start: 20 * 60, end: 5 * 60 },
    greeting:
      'The gate is watched only after dark. Come back when the sun is down and I will find you work that suits the hour.',
  },
]

export function getNpcById(npcId: string): NpcDefinition | undefined {
  return NPCS.find((npc) => npc.id === npcId)
}

/**
 * Whether an NPC is on duty at an absolute game minute. No hours — or a window
 * whose start and end match — means always active. Windows that cross midnight
 * (`start > end`) match the late evening and the early morning.
 */
export function isNpcActive(npc: NpcDefinition, totalMinutes: number): boolean {
  const hours = npc.activeHours
  if (!hours || hours.start === hours.end) return true

  const minute = minuteOfDay(totalMinutes)
  if (hours.start < hours.end) {
    return minute >= hours.start && minute < hours.end
  }
  return minute >= hours.start || minute < hours.end
}
