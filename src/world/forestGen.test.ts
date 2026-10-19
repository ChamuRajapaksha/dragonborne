import { describe, expect, it } from 'vitest'
import {
  FOREST_CORRIDOR_ROWS,
  FOREST_HEIGHT,
  FOREST_SKELETON,
  FOREST_WIDTH,
  isReservedForestTile,
} from './forestGen'
import { findMapViolations } from './mapRules'
import {
  FOREST_ITEMS,
  FOREST_NPCS,
  FOREST_PORTALS,
  FOREST_SPAWN,
  VILLAGE_MAP,
} from './maps'

const FOREST_PLACEMENTS = {
  spawn: FOREST_SPAWN,
  npcs: FOREST_NPCS,
  portals: FOREST_PORTALS,
  items: FOREST_ITEMS,
}

const AREA_MAPS = {
  forest: FOREST_SKELETON,
  village: VILLAGE_MAP,
}

describe('forest skeleton', () => {
  it('is a uniform 64x48 grid of known characters', () => {
    expect(FOREST_SKELETON).toHaveLength(FOREST_HEIGHT)
    expect(findMapViolations(FOREST_SKELETON)).toEqual([])
    for (const row of FOREST_SKELETON) expect(row).toHaveLength(FOREST_WIDTH)
  })

  it('keeps every fixed placement walkable and reachable', () => {
    expect(findMapViolations(FOREST_SKELETON, FOREST_PLACEMENTS, { areaMaps: AREA_MAPS })).toEqual(
      [],
    )
  })

  it('keeps the main corridor free of colliding tiles', () => {
    expect(
      findMapViolations(FOREST_SKELETON, undefined, {
        corridors: [{ label: 'main path', fromRow: 23, toRow: 25, fromCol: 2, toCol: 61 }],
      }),
    ).toEqual([])
  })

  it('reaches the spawn with the 2x2 player body', () => {
    expect(FOREST_SKELETON[24]?.[11]).toBe('-')
    expect(FOREST_SKELETON[23]?.[11]).toBe('-')
    expect(FOREST_SKELETON[24]?.[10]).toBe('-')
    expect(FOREST_SKELETON[23]?.[10]).toBe('-')
  })
})

describe('forest reserved tiles', () => {
  it('reserves the corridor rows across the whole run', () => {
    expect(FOREST_CORRIDOR_ROWS).toEqual([23, 24, 25])
    for (const row of FOREST_CORRIDOR_ROWS) {
      expect(isReservedForestTile(2, row)).toBe(true)
      expect(isReservedForestTile(45, row)).toBe(true)
    }
  })

  it('reserves a one-tile margin around the fixed placements', () => {
    expect(isReservedForestTile(11, 24)).toBe(true) // spawn
    expect(isReservedForestTile(12, 23)).toBe(true) // spawn, diagonal margin
    expect(isReservedForestTile(17, 21)).toBe(true) // guide, diagonal margin
    expect(isReservedForestTile(5, 15)).toBe(true) // emberglass item
    expect(isReservedForestTile(63, 24)).toBe(true) // portal column
  })

  it('leaves open grass free for groves', () => {
    expect(isReservedForestTile(18, 22)).toBe(false)
    expect(isReservedForestTile(45, 10)).toBe(false)
    expect(isReservedForestTile(30, 40)).toBe(false)
  })
})
