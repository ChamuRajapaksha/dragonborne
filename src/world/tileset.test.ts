import { describe, expect, it } from 'vitest'
import {
  COLLIDING_TILE_INDEXES,
  STUMP_TILE_INDEX,
  TILE_BY_CHAR,
  TREE_CHOP_HITS,
  TREE_TRUNK_INDEX,
  chopHitsRemaining,
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
