/** What pressing E on this NPC opens. Defaults to the quest popup. */
export type NpcService = 'quest' | 'trade'

export interface NpcDefinition {
  id: string
  name: string
  role: string
  greeting: string
  service?: NpcService
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
    greeting:
      'Emberhold keeps itself armed and it keeps itself fed. Pick the work that suits your hands, not the work that sounds grandest.',
  },
  {
    id: 'village-archivist',
    name: 'Maerwyn',
    role: 'Archivist',
    greeting:
      'Every name that ever passed through this village is written down somewhere below. Some of those pages would rather stay shut.',
  },
  {
    id: 'village-host',
    name: 'Odile',
    role: 'Host',
    greeting:
      'A village this size survives on gossip and song. Whatever you can carry through the gates, I will find you a place for it.',
  },
  {
    id: 'village-trader',
    name: 'Hollis',
    role: 'Trader',
    service: 'trade',
    greeting:
      'Timber is timber and gold is gold, and Emberhold always needs more of the first to make the second.',
  },
]

export function getNpcById(npcId: string): NpcDefinition | undefined {
  return NPCS.find((npc) => npc.id === npcId)
}
