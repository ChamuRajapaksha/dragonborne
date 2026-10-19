import { describe, expect, it } from 'vitest'
import {
  FOREST_CORRIDOR_ROWS,
  FOREST_HEIGHT,
  FOREST_SKELETON,
  FOREST_WIDTH,
  generateForestMap,
  isReservedForestTile,
} from './forestGen'
import { findMapViolations, unreachedTiles } from './mapRules'
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

describe('generateForestMap', () => {
  it('returns a uniform 64x48 grid of known characters', () => {
    const rows = generateForestMap(42)
    expect(rows).toHaveLength(FOREST_HEIGHT)
    for (const row of rows) expect(row).toHaveLength(FOREST_WIDTH)
    expect(findMapViolations(rows)).toEqual([])
  })

  it('produces the identical layout for the same seed', () => {
    expect(generateForestMap(1234)).toEqual(generateForestMap(1234))
  })

  it('scatters a different layout for every seed', () => {
    const first = generateForestMap(1)
    const second = generateForestMap(2)
    expect(first).not.toEqual(second)
    expect(first).not.toEqual([...FOREST_SKELETON])
  })

  it('never grows groves over the corridor or reserved placements', () => {
    const rows = generateForestMap(7)
    for (const row of FOREST_CORRIDOR_ROWS) {
      for (let x = 2; x <= 61; x += 1) {
        expect('-,.').toContain(rows[row]?.[x])
      }
    }
    expect(rows[24]?.[11]).toBe('-') // spawn
    expect(rows[22]?.[16]).toBe('.') // guide
  })
})

const TRUNK_SEEDS = [1, 2, 7, 42, 1337, 20260, 999983]

function countChar(rows: readonly string[], char: string): number {
  let count = 0
  for (const row of rows) {
    for (const cell of row) {
      if (cell === char) count += 1
    }
  }
  return count
}

describe('generated choppable trunks', () => {
  it('keeps the trunk count in the 30-45 band on every tested seed', () => {
    for (const seed of TRUNK_SEEDS) {
      const trunks = countChar(generateForestMap(seed), 't')
      expect(trunks).toBeGreaterThanOrEqual(30)
      expect(trunks).toBeLessThanOrEqual(45)
    }
  })

  it('never places a trunk on the world border', () => {
    for (const seed of TRUNK_SEEDS) {
      const rows = generateForestMap(seed)
      expect(rows[0]).not.toContain('t')
      expect(rows[FOREST_HEIGHT - 1]).not.toContain('t')
      for (const row of rows) {
        expect(row[0]).not.toBe('t')
        expect(row[FOREST_WIDTH - 1]).not.toBe('t')
      }
    }
  })
})

const LOOP_SEEDS = [3, 11, 42, 101, 2718, 31415, 65535, 777777, 20260, 999983]

describe('full-loop connectivity', () => {
  it('starts from a skeleton the 2x2 player body can fully cross', () => {
    expect(unreachedTiles(FOREST_SKELETON, FOREST_SPAWN)).toEqual([])
  })

  it('leaves every open tile reachable by the 2x2 player body on every tested seed', () => {
    for (const seed of LOOP_SEEDS) {
      expect(unreachedTiles(generateForestMap(seed), FOREST_SPAWN)).toEqual([])
    }
  })
})


