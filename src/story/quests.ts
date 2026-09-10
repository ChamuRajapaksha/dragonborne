export interface Quest {
  id: string
  title: string
  description: string
  availableToClasses: string[]
  requiresStats?: Partial<Record<string, number>>
}

const questData = [
  {
    id: 'guard-the-bridge',
    title: 'Guard the Eastern Bridge',
    description:
      'A thief has been preying on wagons at the eastern bridge. Garrison the post and keep trade moving until dawn.',
    availableToClasses: ['warrior'],
    requiresStats: { strength: 4 },
  },
  {
    id: 'smugglers-basin',
    title: 'Murky Waters of the Basin',
    description:
      'Smugglers unload under cover of fog at the harbor basin. Slip past the watch and learn where they are bound.',
    availableToClasses: ['rogue'],
    requiresStats: { agility: 4 },
  },
  {
    id: 'archivists-trove',
    title: 'The Archivist\u2019s Trove',
    description:
      'A sealed grimoire waits in a locked wing of the library. Unravel the ward and retrieve it before the dust settles.',
    availableToClasses: ['mage'],
    requiresStats: { intellect: 4 },
  },
  {
    id: 'silent-bell',
    title: 'Sanctum of the Silent Bell',
    description:
      'The temple bell has not rung in a week, and pilgrims grow restless. Bless the sanctum and restore its toll.',
    availableToClasses: ['cleric'],
    requiresStats: { intellect: 4 },
  },
  {
    id: 'thornwood-briars',
    title: 'Briars of the Thornwood',
    description:
      'The thornwood has crept onto the northern road. Carve a safe route through the briars for the travelling merchants.',
    availableToClasses: ['ranger'],
    requiresStats: { agility: 4 },
  },
  {
    id: 'bards-contest',
    title: 'The Song Contest',
    description:
      'The alehouse hosts a contest of verse, and the prize is a favour from the guildmaster. Out- rhyme every rival in the square.',
    availableToClasses: ['bard'],
    requiresStats: { intellect: 3 },
  },
  {
    id: 'the-midnight-fair',
    title: 'The Midnight Fair',
    description:
      'The kingdom gathers for the Midnight Fair. Pitch in where you are needed and keep the celebration from unraveling.',
    availableToClasses: [
      'warrior',
      'rogue',
      'mage',
      'cleric',
      'ranger',
      'bard',
    ],
  },
] as const satisfies readonly Quest[]

export const QUESTS: readonly Quest[] = questData

export function getQuestsForClass(classId: string): Quest[] {
  return QUESTS.filter((q) => q.availableToClasses.includes(classId))
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