import { describe, expect, it } from 'vitest'
import { CAVE_HEIGHT, CAVE_SKELETON, CAVE_WIDTH, generateCaveMap } from './caveGen'
import { generateForestMap } from './forestGen'
import { findMapViolations, unreachedTiles } from './mapRules'
import {
  CAVE_CHESTS,
  CAVE_PORTALS,
  CAVE_SPAWN,
  FOREST_CHESTS,
  FOREST_ITEMS,
  FOREST_NPCS,
  FOREST_PORTALS,
  FOREST_SPAWN,
  VILLAGE_CHESTS,
  VILLAGE_ITEMS,
  VILLAGE_MAP,
  VILLAGE_NPCS,
  VILLAGE_PORTALS,
  VILLAGE_SPAWN,
} from './maps'

const FOREST_SEEDS = Array.from({ length: 20 }, (_, index) => index * 104729 + 17)

const FOREST_ROWS_CACHE = new Map<number, readonly string[]>()

/** One generated forest per seed, memoized so twenty rules runs stay cheap. */
function forestRows(seed: number): readonly string[] {
  let rows = FOREST_ROWS_CACHE.get(seed)
  if (!rows) {
    rows = generateForestMap(seed)
    FOREST_ROWS_CACHE.set(seed, rows)
  }
  return rows
}

/** One cave per save, generated once: the same shape every rules run sees. */
const CAVE_ROWS = generateCaveMap(4242)

const FOREST_PLACEMENTS = {
  spawn: FOREST_SPAWN,
  npcs: FOREST_NPCS,
  portals: FOREST_PORTALS,
  items: FOREST_ITEMS,
  chests: FOREST_CHESTS,
}

const VILLAGE_PLACEMENTS = {
  spawn: VILLAGE_SPAWN,
  npcs: VILLAGE_NPCS,
  portals: VILLAGE_PORTALS,
  items: VILLAGE_ITEMS,
  chests: VILLAGE_CHESTS,
}

const CAVE_PLACEMENTS = {
  spawn: CAVE_SPAWN,
  npcs: [],
  portals: CAVE_PORTALS,
  items: [],
  chests: CAVE_CHESTS,
}

function areaMapsFor(forest: readonly string[]): Record<string, readonly string[]> {
  return { forest, village: VILLAGE_MAP, cave: CAVE_ROWS }
}

const FOREST_MAIN_CORRIDOR = {
  label: 'main path',
  fromRow: 23,
  toRow: 25,
  fromCol: 2,
  toCol: 61,
}

describe('area map shapes', () => {
  it('keeps every generated forest a uniform shape of known characters', () => {
    for (const seed of FOREST_SEEDS) {
      expect(findMapViolations(forestRows(seed)), `forest seed ${seed}`).toEqual([])
    }
  })

  it('keeps the village a uniform shape of known characters', () => {
    expect(findMapViolations(VILLAGE_MAP)).toEqual([])
  })

  it('keeps the cave a uniform shape of known characters', () => {
    expect(findMapViolations(CAVE_ROWS)).toEqual([])
    expect(CAVE_ROWS).toHaveLength(CAVE_HEIGHT)
    for (const row of CAVE_ROWS) expect(row).toHaveLength(CAVE_WIDTH)
  })

  it('keeps the cave skeleton the same shape as its generated output', () => {
    expect(CAVE_SKELETON).toHaveLength(CAVE_HEIGHT)
    for (const row of CAVE_SKELETON) expect(row).toHaveLength(CAVE_WIDTH)
  })
})

describe('cave spawn', () => {
  it('sits on a walkable tile the 2x2 player body can fully reach from', () => {
    const violations = findMapViolations(CAVE_ROWS, {
      spawn: CAVE_SPAWN,
      npcs: [],
      portals: [],
      items: [],
    })
    expect(violations).toEqual([])
    expect(CAVE_ROWS[CAVE_SPAWN.y]?.[CAVE_SPAWN.x]).toBe('-')
    expect(unreachedTiles(CAVE_ROWS, CAVE_SPAWN)).toEqual([])
  })
})

describe('cave ore nodes', () => {
  function countChar(rows: readonly string[], char: string): number {
    let count = 0
    for (const row of rows) {
      for (const cell of row) {
        if (cell === char) count += 1
      }
    }
    return count
  }

  it('keeps at least 32 iron ore nodes and 10 steel veins', () => {
    expect(countChar(CAVE_ROWS, 'o')).toBeGreaterThanOrEqual(32)
    expect(countChar(CAVE_ROWS, 'v')).toBeGreaterThanOrEqual(10)
  })
})

describe('area placements', () => {
  it('sit on walkable, reachable tiles on every generated forest seed', () => {
    for (const seed of FOREST_SEEDS) {
      const forest = forestRows(seed)
      const areaMaps = areaMapsFor(forest)
      expect(
        findMapViolations(forest, FOREST_PLACEMENTS, { areaMaps }),
        `forest seed ${seed}`,
      ).toEqual([])
      expect(
        findMapViolations(VILLAGE_MAP, VILLAGE_PLACEMENTS, { areaMaps }),
        `village with forest seed ${seed}`,
      ).toEqual([])
      expect(
        findMapViolations(CAVE_ROWS, CAVE_PLACEMENTS, { areaMaps }),
        `cave with forest seed ${seed}`,
      ).toEqual([])
    }
  })
})

describe('forest main corridor', () => {
  it('stays free of colliding tiles across the whole run on every seed', () => {
    for (const seed of FOREST_SEEDS) {
      expect(
        findMapViolations(forestRows(seed), undefined, { corridors: [FOREST_MAIN_CORRIDOR] }),
        `forest seed ${seed}`,
      ).toEqual([])
    }
  })
})

describe('cave portal position', () => {
  const cavePortal = FOREST_PORTALS.find((portal) => portal.toAreaId === 'cave')

  it('sits west of the forest spawn', () => {
    expect(cavePortal).toBeDefined()
    expect(cavePortal?.x).toBeLessThan(FOREST_SPAWN.x)
    expect(cavePortal?.y).toBe(FOREST_SPAWN.y)
  })

  it('lands on a walkable, reachable tile on every generated forest seed', () => {
    expect(cavePortal).toBeDefined()
    if (!cavePortal) return
    const placements = { ...FOREST_PLACEMENTS, portals: [cavePortal] }
    for (const seed of FOREST_SEEDS) {
      const forest = forestRows(seed)
      expect(
        findMapViolations(forest, placements, { areaMaps: areaMapsFor(forest) }),
        `forest seed ${seed}`,
      ).toEqual([])
    }
  })
})

describe('forest choppable trunks', () => {
  it('keeps at least 30 reachable trunks in the woods on every seed', () => {
    for (const seed of FOREST_SEEDS) {
      let trunks = 0
      for (const row of forestRows(seed)) {
        for (const char of row) {
          if (char === 't') trunks += 1
        }
      }
      expect(trunks, `forest seed ${seed}`).toBeGreaterThanOrEqual(30)
    }
  })
})

describe('findMapViolations shape rules', () => {
  it('flags an empty map', () => {
    expect(findMapViolations([])).toEqual(['map has no rows'])
  })

  it('flags ragged rows', () => {
    expect(findMapViolations(['TT', 'T'])).toEqual(['row 1 is 1 chars, expected 2'])
  })

  it('flags tile characters missing from the legend', () => {
    expect(findMapViolations(['Tz'])).toEqual(["unknown tile char 'z' at 1,0"])
  })
})

describe('findMapViolations placement rules', () => {
  it('flags a placement sitting on a colliding tile', () => {
    const violations = findMapViolations(VILLAGE_MAP, {
      spawn: VILLAGE_SPAWN,
      npcs: [],
      portals: [],
      items: [{ itemId: 'test-item', x: 0, y: 0 }],
    })
    expect(violations).toContain("item 'test-item' at 0,0 sits on colliding 'T'")
  })

  it('flags a placement outside the map', () => {
    const violations = findMapViolations(VILLAGE_MAP, {
      spawn: { x: 999, y: 999 },
      npcs: [],
      portals: [],
      items: [],
    })
    expect(violations).toContain('spawn at 999,999 is outside the map')
  })

  it('flags a portal toSpawn sitting on a colliding tile of its destination', () => {
    const violations = findMapViolations(VILLAGE_MAP, {
      spawn: VILLAGE_SPAWN,
      npcs: [],
      portals: [
        {
          x: VILLAGE_SPAWN.x,
          y: VILLAGE_SPAWN.y,
          toAreaId: 'village',
          toSpawn: { x: 0, y: 0 },
          label: 'test',
        },
      ],
      items: [],
    }, { areaMaps: { village: VILLAGE_MAP } })
    expect(violations).toContain(
      "portal to 'village' (toSpawn) at 0,0 sits on colliding 'T'",
    )
  })
})

describe('findMapViolations reachability rules', () => {
  it('flags a placement the spawn cannot reach', () => {
    const violations = findMapViolations(['T.T', 'T.T', 'T.T'], {
      spawn: { x: 0, y: 0 },
      npcs: [],
      portals: [],
      items: [{ itemId: 'cut-off', x: 2, y: 0 }],
    })
    expect(violations).toContain("item 'cut-off' at 2,0 is not reachable from the spawn")
  })

  it('flags a trunk with no reachable walkable neighbour', () => {
    const violations = findMapViolations(['TtT', 'TTT', 'T.T'], {
      spawn: { x: 1, y: 2 },
      npcs: [],
      portals: [],
      items: [],
    })
    expect(violations).toContain('trunk at 1,0 has no reachable walkable neighbour')
  })

  it('flags an ore node with no reachable walkable neighbour', () => {
    const violations = findMapViolations(['ToT', 'TTT', 'T.T'], {
      spawn: { x: 1, y: 2 },
      npcs: [],
      portals: [],
      items: [],
    })
    expect(violations).toContain('ore at 1,0 has no reachable walkable neighbour')
  })

  it('flags a steel vein with no reachable walkable neighbour', () => {
    const violations = findMapViolations(['TvT', 'TTT', 'T.T'], {
      spawn: { x: 1, y: 2 },
      npcs: [],
      portals: [],
      items: [],
    })
    expect(violations).toContain('ore at 1,0 has no reachable walkable neighbour')
  })

  it('allows an ore node beside a reachable walkable tile', () => {
    const violations = findMapViolations(['T.T', 'ToT', 'TTT'], {
      spawn: { x: 1, y: 0 },
      npcs: [],
      portals: [],
      items: [],
    })
    expect(violations).toEqual([])
  })
})

describe('findMapViolations corridor rules', () => {
  const mainPath = {
    label: 'main path',
    fromRow: 1,
    toRow: 1,
    fromCol: 1,
    toCol: 2,
  }

  it('flags a colliding tile inside a corridor', () => {
    const violations = findMapViolations(['....', '.TT.', '....'], undefined, {
      corridors: [mainPath],
    })
    expect(violations).toContain("corridor 'main path' at 1,1 is blocked by 'T'")
    expect(violations).toContain("corridor 'main path' at 2,1 is blocked by 'T'")
  })

  it('allows colliding tiles outside the corridor', () => {
    const violations = findMapViolations(['T..T', '....', 'T..T'], undefined, {
      corridors: [mainPath],
    })
    expect(violations).toEqual([])
  })

  it('flags a corridor reaching outside the map', () => {
    const violations = findMapViolations(['..'], undefined, {
      corridors: [{ label: 'main path', fromRow: 0, toRow: 1, fromCol: 0, toCol: 1 }],
    })
    expect(violations).toContain("corridor 'main path' at 0,1 is outside the map")
  })
})
