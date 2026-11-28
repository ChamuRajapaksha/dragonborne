import { describe, expect, it } from 'vitest'
import { QUESTS } from '../story/quests'
import { CAVE_PORTALS, FOREST_PORTALS, PLAINS_NPCS } from '../world/maps'
import { TILE_SIZE } from '../world/tileset'
import { questCompassLine, questCompassPoint } from './status'

const plainsQuest = QUESTS.find((quest) => quest.id === 'plains-waystone')!

describe('questCompassPoint', () => {
  it('points at the static NPC when in the target area', () => {
    const expected = PLAINS_NPCS[0]!
    expect(questCompassPoint(plainsQuest, 'plains', 'Sella')).toEqual({
      label: 'Sella',
      x: expected.x * TILE_SIZE,
      y: expected.y * TILE_SIZE,
    })
  })

  it('uses the live NPC position for an escort in the same area', () => {
    expect(questCompassPoint(plainsQuest, 'plains', 'Sella', { x: 640, y: 288 })).toEqual({
      label: 'Sella',
      x: 640,
      y: 288,
    })
  })

  it('ignores a non-finite live position', () => {
    const expected = PLAINS_NPCS[0]!
    expect(
      questCompassPoint(plainsQuest, 'plains', 'Sella', {
        x: Number.NaN,
        y: expected.y * TILE_SIZE,
      }),
    ).toEqual({
      label: 'Sella',
      x: expected.x * TILE_SIZE,
      y: expected.y * TILE_SIZE,
    })
  })

  it('points at the next portal when the NPC is in another area', () => {
    const portal = FOREST_PORTALS[2]!
    expect(questCompassPoint(plainsQuest, 'forest', 'Sella')).toEqual({
      label: 'Sella \u2192 The Amber Plains',
      x: portal.x * TILE_SIZE,
      y: portal.y * TILE_SIZE,
    })
  })

  it('uses the first hop for a multi-area route', () => {
    const portal = CAVE_PORTALS[0]!
    expect(questCompassPoint(plainsQuest, 'cave', 'Sella')).toEqual({
      label: 'Sella \u2192 The Thornwood',
      x: portal.x * TILE_SIZE,
      y: portal.y * TILE_SIZE,
    })
  })

  it('returns null without a target or route', () => {
    expect(
      questCompassPoint({ ...plainsQuest, npcId: 'missing-npc' }, 'plains', 'Nobody'),
    ).toBeNull()
    expect(questCompassPoint(plainsQuest, 'nowhere', 'Sella')).toBeNull()
  })
})

describe('questCompassLine', () => {
  it('formats a point as a HUD line', () => {
    expect(
      questCompassLine({ label: 'Sella', x: 640, y: 272 }, { x: 0, y: 272 }),
    ).toBe('Sella: east, 40 tiles')
  })

  it('returns an empty line without a point', () => {
    expect(questCompassLine(null, { x: 0, y: 0 })).toBe('')
  })
})
