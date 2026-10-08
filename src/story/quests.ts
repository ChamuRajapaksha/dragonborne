export interface Quest {
  id: string
  title: string
  description: string
  availableToClasses: string[]
  npcId: string
  requiresStats?: Partial<Record<string, number>>
  /** Granted once, on first completion. Pure data — ids resolve via the item catalog. */
  rewards?: readonly ItemReward[]
}

/** One entry of a quest's payout. `quantity` defaults to 1. */
export interface ItemReward {
  itemId: string
  quantity?: number
}

const ALL_CLASSES = ['warrior', 'rogue', 'mage', 'cleric', 'ranger', 'bard']

const questData = [
  {
    id: 'road-to-emberhold',
    title: 'The Road to Emberhold',
    description:
      'The stranger will not say who cast you into the woods, only that smoke rises east along the old track. Walk it before the light goes.',
    availableToClasses: ALL_CLASSES,
    npcId: 'forest-guide',
    rewards: [{ itemId: 'heath-herb', quantity: 3 }],
  },
  {
    id: 'guard-the-bridge',
    title: 'Guard the Eastern Bridge',
    description:
      'A thief has been preying on wagons at the eastern bridge. Garrison the post and keep trade moving until dawn.',
    availableToClasses: ['warrior'],
    npcId: 'village-smith',
    requiresStats: { strength: 4 },
    rewards: [{ itemId: 'leather-cap' }],
  },
  {
    id: 'smugglers-basin',
    title: 'Murky Waters of the Basin',
    description:
      'Smugglers unload under cover of fog at the harbor basin. Slip past the watch and learn where they are bound.',
    availableToClasses: ['rogue'],
    npcId: 'village-smith',
    requiresStats: { agility: 4 },
    rewards: [{ itemId: 'bog-reed', quantity: 5 }],
  },
  {
    id: 'thornwood-briars',
    title: 'Briars of the Thornwood',
    description:
      'The thornwood has crept onto the northern road. Carve a safe route through the briars for the travelling merchants.',
    availableToClasses: ['ranger'],
    npcId: 'village-smith',
    requiresStats: { agility: 4 },
    rewards: [{ itemId: 'oak-kindling', quantity: 5 }],
  },
  {
    id: 'archivists-trove',
    title: 'The Archivist\u2019s Trove',
    description:
      'A sealed grimoire waits in a locked wing of the library. Unravel the ward and retrieve it before the dust settles.',
    availableToClasses: ['mage'],
    npcId: 'village-archivist',
    requiresStats: { intellect: 4 },
    rewards: [{ itemId: 'emberglass' }],
  },
  {
    id: 'silent-bell',
    title: 'Sanctum of the Silent Bell',
    description:
      'The temple bell has not rung in a week, and pilgrims grow restless. Bless the sanctum and restore its toll.',
    availableToClasses: ['cleric'],
    npcId: 'village-archivist',
    requiresStats: { intellect: 4 },
    rewards: [{ itemId: 'flanged-mace' }],
  },
  {
    id: 'bards-contest',
    title: 'The Song Contest',
    description:
      'The alehouse hosts a contest of verse, and the prize is a favour from the guildmaster. Out- rhyme every rival in the square.',
    availableToClasses: ['bard'],
    npcId: 'village-host',
    requiresStats: { intellect: 3 },
    rewards: [{ itemId: 'heath-herb', quantity: 5 }],
  },
  {
    id: 'the-midnight-fair',
    title: 'The Midnight Fair',
    description:
      'The kingdom gathers for the Midnight Fair. Pitch in where you are needed and keep the celebration from unraveling.',
    availableToClasses: ALL_CLASSES,
    npcId: 'village-host',
    rewards: [{ itemId: 'emberglass', quantity: 2 }],
  },
] as const satisfies readonly Quest[]

export const QUESTS: readonly Quest[] = questData

export function getQuestsForClass(classId: string): Quest[] {
  return QUESTS.filter((q) => q.availableToClasses.includes(classId))
}

export function getQuestsForNpc(npcId: string, classId: string): Quest[] {
  return QUESTS.filter(
    (q) => q.npcId === npcId && q.availableToClasses.includes(classId),
  )
}

export function meetsQuestRequirements(
  quest: Quest,
  stats: Record<string, number>,
): boolean {
  if (!quest.requiresStats) return true
  return Object.entries(quest.requiresStats).every(
    ([stat, min]) => (stats[stat] ?? 0) >= (min ?? 0),
  )
}
