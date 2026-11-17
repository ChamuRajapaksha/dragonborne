/** What pressing E on this NPC opens. Defaults to the quest popup. */
import { tierFor } from '../factions/tiers'
import type { ReputationTier } from '../factions/tiers'
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
  /** Faction whose standing colours this NPC's greeting. */
  factionId?: string
  /** Greeting override per tier; falls back to `greeting`. */
  greetings?: Partial<Record<ReputationTier, string>>
}

export const NPCS: readonly NpcDefinition[] = [
  {
    id: 'forest-guide',
    name: 'The Stranger',
    role: 'Guide',
    greeting:
      'You woke by the fire ring, so the woods brought you here. Follow the track east and you will reach Emberhold before dark.',
    factionId: 'wardens',
  },
  {
    id: 'village-smith',
    name: 'Brennan the Smith',
    role: 'Smith',
    service: 'smith',
    activeHours: { start: 6 * 60, end: 20 * 60 },
    greeting:
      'Emberhold keeps itself armed and it keeps itself fed. Pick the work that suits your hands, not the work that sounds grandest.',
    factionId: 'forge',
    greetings: {
      hated:
        'The smith does not look up. "Coin buys the same steel to anyone. Do not ask me to remember your name."',
      hostile:
        'Brennan scales the counter. "Emberhold pays for steady hands. Come back when you have both."',
      friendly:
        'Brennan nods at the pack. "You have an eye for good iron. The forge keeps a few better wares back for folk like you."',
      honored:
        '"Weigh it twice," Brennan tells the apprentice, already reaching for the good ingots. "This one pays fair."',
      revered:
        '"The Deep Forge remembers who stood by it," Brennan says, setting his best work on the counter before you ask.',
    },
  },
  {
    id: 'village-archivist',
    name: 'Maerwyn',
    role: 'Archivist',
    activeHours: { start: 9 * 60, end: 17 * 60 },
    greeting:
      'Every name that ever passed through this village is written down somewhere below. Some of those pages would rather stay shut.',
    factionId: 'archive',
    greetings: {
      hostile:
        '"The Archive is open to all," Maerwyn says, closing a folio. "But not every question gets an answer."',
      friendly:
        'Maerwyn looks up from the ledger. "There is a page with your name waiting. I will fetch it when the hall is quiet."',
      honored:
        '"You have earned a key to the lower stacks," Maerwyn says. "Mind the pages that would rather stay shut."',
      revered:
        'Maerwyn sets a fresh folio aside. "Every name in this kingdom is written down. Yours is in the first volume now."',
    },
  },
  {
    id: 'village-host',
    name: 'Odile',
    role: 'Host',
    activeHours: { start: 16 * 60, end: 2 * 60 },
    greeting:
      'A village this size survives on gossip and song. Whatever you can carry through the gates, I will find you a place for it.',
    factionId: 'traders',
  },
  {
    id: 'village-trader',
    name: 'Hollis',
    role: 'Trader',
    service: 'trade',
    activeHours: { start: 7 * 60, end: 19 * 60 },
    greeting:
      'Timber is timber and gold is gold, and Emberhold always needs more of the first to make the second.',
    factionId: 'traders',
    greetings: {
      hated: 'Hollis names the price before you ask. "Cash up front. No credit, no favours."',
      hostile:
        'Hollis eyes the coins in your hand. "The caravans are running late. Prices are what they are today."',
      friendly:
        'Hollis waves you over. "The caravans talk, and they say you pay fair. There is a little room on the price."',
      honored:
        '"For a friend of the road," Hollis says, sliding a better coin across the counter, "the best of the batch."',
      revered:
        '"Free Traders look after their own," Hollis says, already wrapping the goods.',
    },
  },
  {
    id: 'night-watch',
    name: 'The Night Watch',
    role: 'Watch',
    activeHours: { start: 20 * 60, end: 5 * 60 },
    greeting:
      'The gate is watched only after dark. Come back when the sun is down and I will find you work that suits the hour.',
    factionId: 'emberhold',
    greetings: {
      hostile: '"Gate business," the watch says. "Keep your papers close and your hands closer."',
      friendly: '"Quiet night at the gate," the watch says. "Mind the bell if you are out late."',
      honored:
        '"The watch knows your step," the watch says, lifting the lantern a little higher.',
      revered:
        '"The gate is yours to pass," the watch says, stepping aside before you reach for your papers.',
    },
  },
]

export function getNpcById(npcId: string): NpcDefinition | undefined {
  return NPCS.find((npc) => npc.id === npcId)
}

/** The tier's line when one exists, otherwise the NPC's base greeting. */
export function npcGreeting(
  npc: NpcDefinition,
  values: Readonly<Record<string, number>>,
): string {
  if (!npc.factionId || !npc.greetings) return npc.greeting
  const tier = tierFor(values[npc.factionId] ?? 0)
  return npc.greetings[tier] ?? npc.greeting
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
