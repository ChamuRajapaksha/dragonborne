import { describe, expect, it } from 'vitest'
import {
  COLLIDING_TILE_INDEXES,
  DOOR_TILE_INDEX,
  IRON_ORE_INDEX,
  MINED_OUT_INDEX,
  STUMP_TILE_INDEX,
  STEEL_VEIN_INDEX,
  TILE_BY_CHAR,
  TREE_CHOP_HITS,
  TREE_TRUNK_INDEX,
  chopHitsRemaining,
  isDoorTile,
  isMinedOutTile,
  isOreNodeTile,
  isStumpTile,
  isTreeTrunkTile,
} from './tileset'

describe('tree tile indexes', () => {
  it('gives the trunk and stump distinct indexes from the legend', () => {
    expect(TREE_TRUNK_INDEX).toBe(TILE_BY_CHAR.get('t')?.index)
    expect(STUMP_TILE_INDEX).toBe(TILE_BY_CHAR.get('s')?.index)
    expect(STUMP_TILE_INDEX).not.toBe(TREE_TRUNK_INDEX)
  })

  it('keeps the trunk colliding and the stump walkable', () => {
    expect(COLLIDING_TILE_INDEXES).toContain(TREE_TRUNK_INDEX)
    expect(COLLIDING_TILE_INDEXES).not.toContain(STUMP_TILE_INDEX)
  })
})

describe('isTreeTrunkTile', () => {
  it('accepts only the trunk index', () => {
    expect(isTreeTrunkTile(TREE_TRUNK_INDEX)).toBe(true)
    expect(isTreeTrunkTile(STUMP_TILE_INDEX)).toBe(false)
    expect(isTreeTrunkTile(0)).toBe(false)
    expect(isTreeTrunkTile(undefined)).toBe(false)
  })
})

describe('isStumpTile', () => {
  it('accepts only the stump index', () => {
    expect(isStumpTile(STUMP_TILE_INDEX)).toBe(true)
    expect(isStumpTile(TREE_TRUNK_INDEX)).toBe(false)
    expect(isStumpTile(0)).toBe(false)
    expect(isStumpTile(undefined)).toBe(false)
  })
})

describe('chopHitsRemaining', () => {
  it('starts a fresh tree at the full hit count', () => {
    expect(chopHitsRemaining(undefined)).toBe(TREE_CHOP_HITS - 1)
  })

  it('counts down with each swing', () => {
    expect(chopHitsRemaining(2)).toBe(1)
    expect(chopHitsRemaining(1)).toBe(0)
  })

  it('reaches zero, the felling swing, and can go negative if asked', () => {
    expect(chopHitsRemaining(0)).toBe(-1)
  })
})

describe('ore tile indexes', () => {
  it('gives iron, steel and the mined-out pocket distinct indexes from the legend', () => {
    expect(IRON_ORE_INDEX).toBe(TILE_BY_CHAR.get('o')?.index)
    expect(STEEL_VEIN_INDEX).toBe(TILE_BY_CHAR.get('v')?.index)
    expect(MINED_OUT_INDEX).toBe(TILE_BY_CHAR.get('x')?.index)
    expect(IRON_ORE_INDEX).not.toBe(STEEL_VEIN_INDEX)
    expect(IRON_ORE_INDEX).not.toBe(MINED_OUT_INDEX)
    expect(STEEL_VEIN_INDEX).not.toBe(MINED_OUT_INDEX)
  })

  it('keeps both ore nodes colliding and the mined-out pocket walkable', () => {
    expect(COLLIDING_TILE_INDEXES).toContain(IRON_ORE_INDEX)
    expect(COLLIDING_TILE_INDEXES).toContain(STEEL_VEIN_INDEX)
    expect(COLLIDING_TILE_INDEXES).not.toContain(MINED_OUT_INDEX)
  })
})

describe('isOreNodeTile', () => {
  it('accepts iron and steel but not the pocket or other tiles', () => {
    expect(isOreNodeTile(IRON_ORE_INDEX)).toBe(true)
    expect(isOreNodeTile(STEEL_VEIN_INDEX)).toBe(true)
    expect(isOreNodeTile(MINED_OUT_INDEX)).toBe(false)
    expect(isOreNodeTile(TREE_TRUNK_INDEX)).toBe(false)
    expect(isOreNodeTile(0)).toBe(false)
    expect(isOreNodeTile(undefined)).toBe(false)
  })
})

describe('isMinedOutTile', () => {
  it('accepts only the mined-out pocket index', () => {
    expect(isMinedOutTile(MINED_OUT_INDEX)).toBe(true)
    expect(isMinedOutTile(IRON_ORE_INDEX)).toBe(false)
    expect(isMinedOutTile(STEEL_VEIN_INDEX)).toBe(false)
    expect(isMinedOutTile(0)).toBe(false)
    expect(isMinedOutTile(undefined)).toBe(false)
  })
})

describe('door tile', () => {
  it('sits in the legend as a colliding tile with its own index', () => {
    const door = TILE_BY_CHAR.get('d')
    expect(door).toBeDefined()
    expect(door?.name).toBe('door')
    expect(door?.collides).toBe(true)
    expect(DOOR_TILE_INDEX).toBe(door?.index)
    expect(COLLIDING_TILE_INDEXES).toContain(DOOR_TILE_INDEX)
  })

  it('accepts only the door index', () => {
    expect(isDoorTile(DOOR_TILE_INDEX)).toBe(true)
    expect(isDoorTile(TREE_TRUNK_INDEX)).toBe(false)
    expect(isDoorTile(0)).toBe(false)
    expect(isDoorTile(undefined)).toBe(false)
  })
})

describe('crystal decor tile', () => {
  it('sits in the legend as walkable decor with its own index', () => {
    const crystal = TILE_BY_CHAR.get('c')
    expect(crystal).toBeDefined()
    expect(crystal?.name).toBe('crystal cluster')
    expect(crystal?.collides).toBe(false)
    expect(crystal?.index).not.toBe(MINED_OUT_INDEX)
    expect(COLLIDING_TILE_INDEXES).not.toContain(crystal?.index)
  })

  it('keeps every legend index unique and dense', () => {
    const unique = new Set([...TILE_BY_CHAR.values()].map((entry) => entry.index))
    expect(unique.size).toBe(TILE_BY_CHAR.size)
    expect(Math.max(...unique)).toBe(TILE_BY_CHAR.size - 1)
  })
})
