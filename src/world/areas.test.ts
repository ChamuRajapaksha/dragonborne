import { describe, expect, it } from 'vitest'
import { generateForestMap } from './forestGen'
import { findMapViolations } from './mapRules'
import {
  FOREST_ITEMS,
  FOREST_NPCS,
  FOREST_PORTALS,
  FOREST_SPAWN,
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

const FOREST_PLACEMENTS = {
  spawn: FOREST_SPAWN,
  npcs: FOREST_NPCS,
  portals: FOREST_PORTALS,
  items: FOREST_ITEMS,
}

const VILLAGE_PLACEMENTS = {
  spawn: VILLAGE_SPAWN,
  npcs: VILLAGE_NPCS,
  portals: VILLAGE_PORTALS,
  items: VILLAGE_ITEMS,
}

function areaMapsFor(forest: readonly string[]): Record<string, readonly string[]> {
  return { forest, village: VILLAGE_MAP }
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
