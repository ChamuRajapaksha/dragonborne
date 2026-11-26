import { describe, expect, it } from 'vitest'
import { QUESTS } from '../story/quests'
import { ESCORTS } from './definitions'
import {
  canAskEscortToFollow,
  canCompleteEscortQuest,
  escortAlreadyLeadingLine,
  escortArrivalLine,
  escortHudLine,
  escortPortalWaitLine,
  escortStatusLine,
} from './status'
import type { EscortDefinition } from './types'

const def: EscortDefinition = {
  id: 'archivists-escort',
  questId: 'escort-the-archivist',
  npcId: 'village-archivist',
  followRadius: 72,
  stopRadius: 40,
  leashRadius: 480,
  npcSpeed: 165,
  stops: [
    { areaId: 'village', x: 10, y: 10, label: 'Village archive', arrivalLine: 'Archive reached' },
    { areaId: 'forest', x: 20, y: 20, label: 'Thornwood crossing', arrivalLine: 'Crossing reached' },
    { areaId: 'plains', x: 30, y: 30, label: 'Amber Plains ridge', arrivalLine: 'Ridge reached' },
  ],
}

function progress(stopIndex: number) {
  return {
    escortId: def.id,
    npcId: def.npcId,
    stopIndex,
    areaId: 'village',
    x: 160,
    y: 160,
  }
}

describe('escortHudLine', () => {
  it('names the escort with the current stop and counter', () => {
    expect(escortHudLine(progress(0), def, 'Maerwyn')).toBe('Escorting Maerwyn → Village archive (1/3)')
    expect(escortHudLine(progress(1), def, 'Maerwyn')).toBe('Escorting Maerwyn → Thornwood crossing (2/3)')
  })

  it('falls back to the npc id when no display name is supplied', () => {
    expect(escortHudLine(progress(0), def)).toBe('Escorting village-archivist → Village archive (1/3)')
  })

  it('shows the final stop when every stop has been reached', () => {
    expect(escortHudLine(progress(3), def, 'Maerwyn')).toBe('Escorting Maerwyn → Amber Plains ridge (3/3)')
  })

  it('reports no escort for missing data', () => {
    expect(escortHudLine(null, def)).toBe('No escort')
    expect(escortHudLine(progress(0), null)).toBe('No escort')
    expect(escortHudLine(progress(0), { ...def, stops: [] })).toBe('No escort')
  })
})

describe('escortStatusLine', () => {
  it('names the next stop with a step counter', () => {
    expect(escortStatusLine(progress(0), def)).toBe('Next stop: Village archive (1/3)')
    expect(escortStatusLine(progress(1), def)).toBe('Next stop: Thornwood crossing (2/3)')
  })

  it('reports readiness after the final stop', () => {
    expect(escortStatusLine(progress(3), def)).toBe('All stops reached — ready to complete')
  })

  it('is empty without an escort', () => {
    expect(escortStatusLine(null, def)).toBe('')
    expect(escortStatusLine(progress(0), null)).toBe('')
    expect(escortStatusLine(progress(0), { ...def, stops: [] })).toBe('')
  })
})

describe('escort toast lines', () => {
  it('forwards arrival lines and formats refusals', () => {
    expect(escortArrivalLine(def.stops[0])).toBe('Archive reached')
    expect(escortPortalWaitLine('Maerwyn')).toBe('Wait for Maerwyn before using the portal')
    expect(escortAlreadyLeadingLine('Odile')).toBe('You are already leading Odile')
  })
})

describe('escort popup gating', () => {
  it('asks only for unlocked, incomplete quests with no other escort', () => {
    expect(canAskEscortToFollow(def.questId, def.id, null, [], true)).toBe(true)
    expect(canAskEscortToFollow(def.questId, def.id, null, [], false)).toBe(false)
    expect(canAskEscortToFollow(def.questId, def.id, null, [def.questId], true)).toBe(false)
    expect(canAskEscortToFollow(def.questId, def.id, progress(0), [], true)).toBe(false)
    expect(canAskEscortToFollow('other-quest', def.id, null, [], true)).toBe(false)
    expect(canAskEscortToFollow(def.questId, 'missing-escort', null, [], true)).toBe(false)
    expect(canAskEscortToFollow('plain-quest', undefined, null, [], true)).toBe(false)
  })

  it('completes non-escort quests exactly as before', () => {
    expect(canCompleteEscortQuest('plain-quest', undefined, null, [])).toBe(true)
    expect(canCompleteEscortQuest('plain-quest', undefined, null, ['plain-quest'])).toBe(false)
  })

  it('completes an escort quest only with its own follower at the final stop', () => {
    expect(canCompleteEscortQuest(def.questId, def.id, null, [])).toBe(false)
    expect(canCompleteEscortQuest(def.questId, def.id, progress(0), [])).toBe(false)
    expect(canCompleteEscortQuest(def.questId, def.id, progress(def.stops.length), [])).toBe(true)
    expect(canCompleteEscortQuest(def.questId, def.id, progress(def.stops.length), [def.questId])).toBe(false)
    expect(canCompleteEscortQuest('other-quest', def.id, progress(def.stops.length), [])).toBe(false)
    expect(canCompleteEscortQuest(def.questId, 'missing-escort', progress(3), [])).toBe(false)
  })

  it('gates every real escort definition against its quest data', () => {
    for (const definition of Object.values(ESCORTS)) {
      const quest = QUESTS.find((entry) => entry.id === definition.questId)
      expect(quest?.escortId).toBe(definition.id)
      expect(canAskEscortToFollow(definition.questId, quest?.escortId, null, [], true)).toBe(true)

      const atStart = { ...progress(0), escortId: definition.id, npcId: definition.npcId }
      const atEnd = {
        ...progress(definition.stops.length),
        escortId: definition.id,
        npcId: definition.npcId,
      }
      expect(canCompleteEscortQuest(definition.questId, definition.id, atStart, [])).toBe(false)
      expect(canCompleteEscortQuest(definition.questId, definition.id, atEnd, [])).toBe(true)
    }
  })
})
