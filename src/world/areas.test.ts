import { describe, expect, it } from 'vitest'
import { findMapViolations } from './mapRules'
import {
  FOREST_ITEMS,
  FOREST_MAP,
  FOREST_NPCS,
  FOREST_PORTALS,
  FOREST_SPAWN,
  VILLAGE_ITEMS,
  VILLAGE_MAP,
  VILLAGE_NPCS,
  VILLAGE_PORTALS,
  VILLAGE_SPAWN,
} from './maps'

const AREA_MAPS = {
  forest: FOREST_MAP,
  village: VILLAGE_MAP,
}

const AREA_FIXTURES = [
  {
    name: 'forest',
    map: FOREST_MAP,
    placements: {
      spawn: FOREST_SPAWN,
      npcs: FOREST_NPCS,
      portals: FOREST_PORTALS,
      items: FOREST_ITEMS,
    },
  },
  {
    name: 'village',
    map: VILLAGE_MAP,
    placements: {
      spawn: VILLAGE_SPAWN,
      npcs: VILLAGE_NPCS,
      portals: VILLAGE_PORTALS,
      items: VILLAGE_ITEMS,
    },
  },
]

describe('area maps', () => {
  it('keeps the forest a uniform shape of known characters', () => {
    expect(findMapViolations(FOREST_MAP)).toEqual([])
  })

  it('keeps the village a uniform shape of known characters', () => {
    expect(findMapViolations(VILLAGE_MAP)).toEqual([])
  })
})

describe.each(AREA_FIXTURES)('$name placements', ({ map, placements }) => {
  it('sit on walkable tiles', () => {
    expect(findMapViolations(map, placements, { areaMaps: AREA_MAPS })).toEqual([])
  })
})

describe.each(AREA_FIXTURES)('$name reachability', ({ map, placements }) => {
  it('lets the spawn reach every placement and every trunk neighbour', () => {
    expect(findMapViolations(map, placements, { areaMaps: AREA_MAPS })).toEqual([])
  })
})

const FOREST_MAIN_CORRIDOR = {
  label: 'main path',
  fromRow: 23,
  toRow: 25,
  fromCol: 2,
  toCol: 61,
}

describe('forest main corridor', () => {
  it('stays free of colliding tiles across the whole run', () => {
    expect(
      findMapViolations(FOREST_MAP, undefined, { corridors: [FOREST_MAIN_CORRIDOR] }),
    ).toEqual([])
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
    expect(findMapViolations(['Tx'])).toEqual(["unknown tile char 'x' at 1,0"])
  })
})

describe('findMapViolations placement rules', () => {
  it('flags a placement sitting on a colliding tile', () => {
    const violations = findMapViolations(FOREST_MAP, {
      spawn: FOREST_SPAWN,
      npcs: [],
      portals: [],
      items: [{ itemId: 'test-item', x: 0, y: 0 }],
    })
    expect(violations).toContain("item 'test-item' at 0,0 sits on colliding 'T'")
  })

  it('flags a placement outside the map', () => {
    const violations = findMapViolations(FOREST_MAP, {
      spawn: { x: 999, y: 999 },
      npcs: [],
      portals: [],
      items: [],
    })
    expect(violations).toContain('spawn at 999,999 is outside the map')
  })

  it('flags a portal toSpawn sitting on a colliding tile of its destination', () => {
    const violations = findMapViolations(FOREST_MAP, {
      spawn: FOREST_SPAWN,
      npcs: [],
      portals: [{ x: 62, y: 24, toAreaId: 'village', toSpawn: { x: 0, y: 0 }, label: 'test' }],
      items: [],
    }, { areaMaps: AREA_MAPS })
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
