import { describe, expect, it } from 'vitest'
import { CAVE_HEIGHT, CAVE_SKELETON, CAVE_WIDTH, generateCaveMap } from './caveGen'
import { findMapViolations, unreachedTiles } from './mapRules'
import { CAVE_CHESTS, CAVE_PORTALS, CAVE_SPAWN, FOREST_PORTALS } from './maps'
import { TILE_BY_CHAR } from './tileset'

const ENTRY_POINTS = [
  CAVE_SPAWN,
  ...CAVE_PORTALS.map(({ x, y }) => ({ x, y })),
  ...CAVE_CHESTS,
  ...FOREST_PORTALS.filter((portal) => portal.toAreaId === 'cave').map(
    (portal) => portal.toSpawn,
  ),
]

const CAVE_PLACEMENTS = {
  spawn: CAVE_SPAWN,
  npcs: [],
  portals: CAVE_PORTALS,
  items: [],
  chests: CAVE_CHESTS,
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
  it('is a uniform 96x64 grid of known characters', () => {
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
  it('returns a uniform 96x64 grid of known characters', () => {
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

const RULE_SEEDS = Array.from({ length: 25 }, (_, index) => index * 104729 + 17)

const ORTHOGONAL = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
]

/** Every walkable tile a straight flood fill from the spawn can reach. */
function floodFill(rows: readonly string[]): Set<string> {
  const reachable = new Set<string>()
  const startChar = rows[CAVE_SPAWN.y]?.[CAVE_SPAWN.x] ?? ''
  if (TILE_BY_CHAR.get(startChar)?.collides !== false) return reachable

  reachable.add(`${CAVE_SPAWN.x},${CAVE_SPAWN.y}`)
  const queue = [{ x: CAVE_SPAWN.x, y: CAVE_SPAWN.y }]
  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) break
    for (const step of ORTHOGONAL) {
      const tile = { x: current.x + step.x, y: current.y + step.y }
      const key = `${tile.x},${tile.y}`
      if (reachable.has(key)) continue
      const char = rows[tile.y]?.[tile.x]
      if (char === undefined) continue
      if (TILE_BY_CHAR.get(char)?.collides !== false) continue
      reachable.add(key)
      queue.push(tile)
    }
  }

  return reachable
}

describe('generated caves across twenty-five seeds', () => {
  it('keeps every cave a uniform 96x64 grid of known characters', () => {
    for (const seed of RULE_SEEDS) {
      const rows = generateCaveMap(seed)
      expect(rows, `seed ${seed}`).toHaveLength(CAVE_HEIGHT)
      for (const row of rows) expect(row, `seed ${seed}`).toHaveLength(CAVE_WIDTH)
      expect(
        findMapViolations(rows, CAVE_PLACEMENTS, { areaMaps: { cave: rows } }),
        `seed ${seed}`,
      ).toEqual([])
    }
  })

  it('keeps the spawn and the portal on floor the 2x2 body can reach', () => {
    for (const seed of RULE_SEEDS) {
      const rows = generateCaveMap(seed)
      expect(rows[CAVE_SPAWN.y]?.[CAVE_SPAWN.x], `seed ${seed} spawn`).toBe('-')
      const portal = CAVE_PORTALS[0]
      expect(portal, `seed ${seed}`).toBeDefined()
      if (!portal) continue
      expect(rows[portal.y]?.[portal.x], `seed ${seed} portal`).toBe('-')
      expect(unreachedTiles(rows, CAVE_SPAWN), `seed ${seed}`).toEqual([])
    }
  })

  it('keeps at least 16 iron ore tiles and 5 steel vein tiles', () => {
    for (const seed of RULE_SEEDS) {
      const rows = generateCaveMap(seed)
      expect(countChar(rows, 'o'), `seed ${seed} iron`).toBeGreaterThanOrEqual(16)
      expect(countChar(rows, 'v'), `seed ${seed} steel`).toBeGreaterThanOrEqual(5)
    }
  })

  it('gives every ore node a reachable walkable neighbour', () => {
    for (const seed of RULE_SEEDS) {
      const rows = generateCaveMap(seed)
      const reachable = floodFill(rows)
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x += 1) {
          if (row[x] !== 'o' && row[x] !== 'v') continue
          const mineable = ORTHOGONAL.some((step) =>
            reachable.has(`${x + step.x},${y + step.y}`),
          )
          expect(mineable, `seed ${seed} ore at ${x},${y}`).toBe(true)
        }
      })
    }
  })

  it('connects every open tile to the spawn with a flood fill', () => {
    for (const seed of RULE_SEEDS) {
      const rows = generateCaveMap(seed)
      const reachable = floodFill(rows)
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x += 1) {
          const char = row[x]
          if (char === undefined) continue
          if (TILE_BY_CHAR.get(char)?.collides !== false) continue
          expect(reachable.has(`${x},${y}`), `seed ${seed} tile ${x},${y}`).toBe(true)
        }
      })
    }
  })
})
