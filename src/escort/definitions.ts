import { QUESTS } from '../story/quests'
import type { EscortDefinition } from './types'

export const ESCORTS: Readonly<Record<string, EscortDefinition>> = {
  'archivists-escort': {
    id: 'archivists-escort',
    questId: 'escort-the-archivist',
    npcId: 'village-archivist',
    followRadius: 72,
    stopRadius: 40,
    leashRadius: 480,
    npcSpeed: 165,
    stops: [
      {
        areaId: 'village',
        x: 48,
        y: 4,
        label: 'The Archive',
        arrivalLine:
          'Maerwyn checks the folio against the lamp. "These margins are finer than the copy I remember. The plains light agrees with me."',
      },
      {
        areaId: 'forest',
        x: 16,
        y: 22,
        label: 'The Crossing',
        arrivalLine:
          'Maerwyn turns a page without looking down. "The old road ran this way. I had hoped it was only a story."',
      },
      {
        areaId: 'plains',
        x: 48,
        y: 12,
        label: 'The Ridge',
        arrivalLine:
          'Maerwyn opens the folio to the blank page. "Here. Now write down what you saw on the way."',
      },
    ],
  },
  'plains-road-escort': {
    id: 'plains-road-escort',
    questId: 'road-to-the-plains',
    npcId: 'village-host',
    followRadius: 72,
    stopRadius: 40,
    leashRadius: 480,
    npcSpeed: 165,
    stops: [
      {
        areaId: 'village',
        x: 27,
        y: 42,
        label: 'The Gate',
        arrivalLine:
          'Odile tips her hat to the watch. "Do not wait up," she says, and means it kindly.',
      },
      {
        areaId: 'plains',
        x: 40,
        y: 18,
        label: 'The Waystone',
        arrivalLine:
          'Odile sets one hand on the stone. "Tell Sella the road was kind. She will know I mean it."',
      },
    ],
  },
}

export function getEscortDefinition(id: string): EscortDefinition | null {
  return ESCORTS[id] ?? null
}

export function getEscortForQuest(questId: string): EscortDefinition | null {
  const quest = QUESTS.find((entry) => entry.id === questId)
  return quest?.escortId ? (getEscortDefinition(quest.escortId) ?? null) : null
}

export function getEscortForNpc(npcId: string): EscortDefinition | null {
  return Object.values(ESCORTS).find((def) => def.npcId === npcId) ?? null
}
