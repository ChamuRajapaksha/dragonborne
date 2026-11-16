export interface Faction {
  id: string
  name: string
  description: string
}

export const FACTIONS: readonly Faction[] = [
  {
    id: 'emberhold',
    name: 'Emberhold',
    description: 'The watch, the gates, and the law of the village.',
  },
  {
    id: 'wardens',
    name: 'Thornwood Wardens',
    description: 'Rangers who keep the forest road and its creatures in balance.',
  },
  {
    id: 'forge',
    name: 'The Deep Forge',
    description: 'Smiths and miners who measure worth in iron and steel.',
  },
  {
    id: 'archive',
    name: 'The Archive',
    description: 'Scholars who keep every name, map, and secret in the kingdom.',
  },
  {
    id: 'traders',
    name: 'Free Traders',
    description: 'Merchants and caravan masters who keep goods moving.',
  },
]

export const FACTION_IDS = FACTIONS.map((faction) => faction.id)

const FACTIONS_BY_ID = new Map(FACTIONS.map((faction) => [faction.id, faction]))

export function getFactionById(id: string): Faction | undefined {
  return FACTIONS_BY_ID.get(id)
}

export function isFactionId(id: string): boolean {
  return FACTIONS_BY_ID.has(id)
}
