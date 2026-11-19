export interface Quest {
  id: string
  title: string
  description: string
  availableToClasses: string[]
  npcId: string
  requiresStats?: Partial<Record<string, number>>
  /** Granted once, on first completion. Pure data - ids resolve via the item catalog. */
  rewards?: readonly ItemReward[]
  /** Standing changes, applied once on first completion. */
  reputation?: readonly { factionId: string; delta: number }[]
  /** Standing gates, checked alongside `requiresStats`. */
  requiresReputation?: readonly { factionId: string; min: number }[]
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
    reputation: [{ factionId: 'emberhold', delta: 5 }],
  },
  {
    id: 'guard-the-bridge',
    title: 'Guard the Eastern Bridge',
    description:
      'A thief has been preying on wagons at the eastern bridge. Garrison the post and keep trade moving until dawn.',
    availableToClasses: ['warrior'],
    npcId: 'village-smith',
    requiresStats: { strength: 4 },
    rewards: [
      { itemId: 'leather-cap' },
      { itemId: 'steel-ingot', quantity: 2 },
    ],
    reputation: [
      { factionId: 'emberhold', delta: 8 },
      { factionId: 'forge', delta: 4 },
    ],
  },
  {
    id: 'smugglers-basin',
    title: 'Murky Waters of the Basin',
    description:
      'Smugglers unload under cover of fog at the harbor basin. Slip past the watch and learn where they are bound.',
    availableToClasses: ['rogue'],
    npcId: 'village-smith',
    requiresStats: { agility: 4 },
    rewards: [
      { itemId: 'bog-reed', quantity: 5 },
      { itemId: 'steel-ingot', quantity: 2 },
    ],
    reputation: [
      { factionId: 'traders', delta: 8 },
      { factionId: 'emberhold', delta: -5 },
    ],
  },
  {
    id: 'thornwood-briars',
    title: 'Briars of the Thornwood',
    description:
      'The thornwood has crept onto the northern road. Carve a safe route through the briars for the travelling merchants.',
    availableToClasses: ['ranger'],
    npcId: 'village-smith',
    requiresStats: { agility: 4 },
    rewards: [
      { itemId: 'oak-kindling', quantity: 5 },
      { itemId: 'steel-ingot', quantity: 2 },
    ],
    reputation: [
      { factionId: 'wardens', delta: 8 },
      { factionId: 'traders', delta: 3 },
    ],
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
    reputation: [{ factionId: 'archive', delta: 8 }],
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
    reputation: [
      { factionId: 'archive', delta: 6 },
      { factionId: 'emberhold', delta: 4 },
    ],
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
    reputation: [{ factionId: 'traders', delta: 5 }],
  },
  {
    id: 'the-midnight-fair',
    title: 'The Midnight Fair',
    description:
      'The kingdom gathers for the Midnight Fair. Pitch in where you are needed and keep the celebration from unraveling.',
    availableToClasses: ALL_CLASSES,
    npcId: 'village-host',
    rewards: [{ itemId: 'emberglass', quantity: 2 }],
    reputation: [
      { factionId: 'emberhold', delta: 4 },
      { factionId: 'traders', delta: 4 },
    ],
  },
  {
    id: 'watch-at-the-gate',
    title: 'Watch at the Gate',
    description:
      'The night watch is one pair of eyes short. Take the gate until dawn, keep a torch lit, and log every shape that moves on the dark road.',
    availableToClasses: ALL_CLASSES,
    npcId: 'night-watch',
    rewards: [{ itemId: 'torch' }],
    reputation: [
      { factionId: 'emberhold', delta: 6 },
      { factionId: 'wardens', delta: 3 },
    ],
  },
  {
    id: 'forge-oath',
    title: 'The Forge Oath',
    description:
      'The Deep Forge keeps its best steel for hands that have already proved steady. Swear the oath and Brennan will weigh you out the good ingots.',
    availableToClasses: ALL_CLASSES,
    npcId: 'village-smith',
    requiresReputation: [{ factionId: 'forge', min: 20 }],
    rewards: [{ itemId: 'steel-ingot', quantity: 2 }],
    reputation: [{ factionId: 'forge', delta: 5 }],
  },
  {
    id: 'wardens-patrol',
    title: 'Wardens’ Patrol',
    description:
      'The Thornwood Wardens trust you with the north road now. Walk their patrol and bring back a coil of their best rope.',
    availableToClasses: ALL_CLASSES,
    npcId: 'forest-guide',
    requiresReputation: [{ factionId: 'wardens', min: 20 }],
    rewards: [{ itemId: 'coil-rope', quantity: 1 }],
    reputation: [{ factionId: 'wardens', delta: 5 }],
  },
  {
    id: 'archive-request',
    title: 'The Archivist’s Request',
    description:
      'Maerwyn has finally trusted you with a sealed request from the lower stacks. Bring back the emberglass and the Archive will remember it.',
    availableToClasses: ALL_CLASSES,
    npcId: 'village-archivist',
    requiresReputation: [{ factionId: 'archive', min: 20 }],
    rewards: [{ itemId: 'emberglass', quantity: 1 }],
    reputation: [{ factionId: 'archive', delta: 5 }],
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
