import { describe, expect, it } from 'vitest'
import { CAVE_HEIGHT, CAVE_SKELETON, CAVE_WIDTH, generateCaveMap } from './caveGen'
import { findMapViolations, unreachedTiles } from './mapRules'
import { CAVE_PORTALS, CAVE_SPAWN, FOREST_PORTALS } from './maps'

const ENTRY_POINTS = [
  CAVE_SPAWN,
  ...CAVE_PORTALS.map(({ x, y }) => ({ x, y })),
  ...FOREST_PORTALS.filter((portal) => portal.toAreaId === 'cave').map(
    (portal) => portal.toSpawn,
  ),
]

const CAVE_PLACEMENTS = {
  spawn: CAVE_SPAWN,
  npcs: [],
  portals: CAVE_PORTALS,
  items: [],
}

const CAVE_SEEDS = [1, 7, 42, 1337, 20260]

function countChar(rows: readonly string[], char: string): number {
  let count = 0
  for (const row of rows) {
    for (const cell of row) {
      if (cell === char) count += 1
    }
  }
  return count
}

describe('cave skeleton', () => {
  it('is a uniform 64x40 grid of known characters', () => {
    expect(CAVE_SKELETON).toHaveLength(CAVE_HEIGHT)
    for (const row of CAVE_SKELETON) expect(row).toHaveLength(CAVE_WIDTH)
    expect(findMapViolations(CAVE_SKELETON)).toEqual([])
  })

  it('keeps the entry hall open for the spawn, portal and forest arrival', () => {
    for (const point of ENTRY_POINTS) {
      expect(CAVE_SKELETON[point.y]?.[point.x]).toBe('-')
    }
    expect(findMapViolations(CAVE_SKELETON, CAVE_PLACEMENTS)).toEqual([])
    expect(unreachedTiles(CAVE_SKELETON, CAVE_SPAWN)).toEqual([])
  })

  it('is solid rock everywhere outside the hall', () => {
    let open = 0
    for (const row of CAVE_SKELETON) {
      for (const cell of row) {
        if (cell === '-') open += 1
      }
    }
    expect(open).toBe(7 * 6)
  })
})

describe('generateCaveMap', () => {
  it('returns a uniform 64x40 grid of known characters', () => {
    for (const seed of CAVE_SEEDS) {
      const rows = generateCaveMap(seed)
      expect(rows, `seed ${seed}`).toHaveLength(CAVE_HEIGHT)
      for (const row of rows) expect(row).toHaveLength(CAVE_WIDTH)
      expect(findMapViolations(rows, CAVE_PLACEMENTS), `seed ${seed}`).toEqual([])
    }
  })

  it('produces the identical layout for the same seed', () => {
    expect(generateCaveMap(1234)).toEqual(generateCaveMap(1234))
  })

  it('produces a different layout for every seed', () => {
    expect(generateCaveMap(1)).not.toEqual(generateCaveMap(2))
    expect(generateCaveMap(1)).not.toEqual([...CAVE_SKELETON])
  })

  it('keeps the entry hall open on every seed', () => {
    for (const seed of CAVE_SEEDS) {
      const rows = generateCaveMap(seed)
      for (const point of ENTRY_POINTS) {
        expect(rows[point.y]?.[point.x], `seed ${seed} at ${point.x},${point.y}`).toBe('-')
      }
    }
  })

  it('never opens the world border', () => {
    for (const seed of CAVE_SEEDS) {
      const rows = generateCaveMap(seed)
      expect(rows[0], `seed ${seed}`).not.toContain('-')
      expect(rows[CAVE_HEIGHT - 1], `seed ${seed}`).not.toContain('-')
      for (const row of rows) {
        expect(row[0], `seed ${seed}`).toBe('#')
        expect(row[CAVE_WIDTH - 1], `seed ${seed}`).toBe('#')
      }
    }
  })

  it('leaves every open tile reachable by the 2x2 body', () => {
    for (const seed of CAVE_SEEDS) {
      expect(unreachedTiles(generateCaveMap(seed), CAVE_SPAWN), `seed ${seed}`).toEqual([])
    }
  })

  it('grows iron and steel veins into the walls', () => {
    for (const seed of CAVE_SEEDS) {
      const rows = generateCaveMap(seed)
      expect(countChar(rows, 'o'), `seed ${seed}`).toBeGreaterThan(0)
      expect(countChar(rows, 'v'), `seed ${seed}`).toBeGreaterThan(0)
    }
  })
})
