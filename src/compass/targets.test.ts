import { describe, expect, it } from 'vitest'
import { QUESTS } from '../story/quests'
import {
  AREA_IDS,
  AREA_NAMES,
  CAVE_PORTALS,
  FOREST_NPCS,
  FOREST_PORTALS,
  VILLAGE_PORTALS,
} from '../world/maps'
import { TILE_SIZE } from '../world/tileset'
import { findQuestTarget, nextPortalToward, portalCompassPoint } from './targets'

describe('findQuestTarget', () => {
  it('resolves a quest giver to its area and pixel position', () => {
    const quest = QUESTS.find((candidate) => candidate.id === 'road-to-emberhold')!
    const expected = FOREST_NPCS[0]!

    expect(findQuestTarget(quest)).toEqual({
      label: 'The Thornwood',
      x: expected.x * TILE_SIZE,
      y: expected.y * TILE_SIZE,
      areaId: 'forest',
      npcId: 'forest-guide',
    })
  })

  it('returns null for an NPC with no area placement', () => {
    expect(findQuestTarget({ ...QUESTS[0]!, npcId: 'missing-npc' })).toBeNull()
  })
})

describe('nextPortalToward', () => {
  it('uses a direct portal when one exists', () => {
    expect(nextPortalToward('forest', 'village')).toBe(FOREST_PORTALS[0])
    expect(nextPortalToward('village', 'plains')).toBe(VILLAGE_PORTALS[1])
  })

  it('returns the first hop of a multi-area route', () => {
    expect(nextPortalToward('cave', 'plains')).toBe(CAVE_PORTALS[0])
  })

  it('returns null for same, unknown, or disconnected areas', () => {
    expect(nextPortalToward('forest', 'forest')).toBeNull()
    expect(nextPortalToward('nowhere', 'village')).toBeNull()
    expect(nextPortalToward('forest', 'nowhere')).toBeNull()
  })
})

describe('portalCompassPoint', () => {
  it('labels the destination area and scales tile coordinates', () => {
    expect(portalCompassPoint(FOREST_PORTALS[0]!)).toEqual({
      label: AREA_NAMES.village,
      x: FOREST_PORTALS[0]!.x * TILE_SIZE,
      y: FOREST_PORTALS[0]!.y * TILE_SIZE,
    })
  })
})

describe('compass data integrity', () => {
  it('gives every quest a placed NPC in a reachable area', () => {
    for (const quest of QUESTS) {
      const target = findQuestTarget(quest)
      expect(target, `${quest.id} has no compass target`).not.toBeNull()
      if (!target) continue
      expect(target.npcId).toBe(quest.npcId)
      expect(AREA_IDS).toContain(target.areaId)
      for (const areaId of AREA_IDS) {
        if (areaId === target.areaId) continue
        expect(
          nextPortalToward(areaId, target.areaId),
          `${areaId} cannot route to ${quest.id}`,
        ).not.toBeNull()
      }
    }
  })
})
