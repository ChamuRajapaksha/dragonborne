import { describe, expect, it } from 'vitest'
import { findMapViolations, unreachedTiles } from './mapRules'

describe('unreachedTiles box flood fill', () => {
  it('returns nothing when the 2x2 body covers every open tile', () => {
    const rows = ['......', '......', '......', '......']
    expect(unreachedTiles(rows, { x: 1, y: 1 })).toEqual([])
  })

  it('flags open tiles behind a one-tile-wide crack', () => {
    const rows = ['......', '......', '#####.', '#####.', '#####.']
    expect(unreachedTiles(rows, { x: 0, y: 0 })).toEqual([
      { x: 5, y: 2 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
    ])
  })

  it('returns every open tile when the spawn sits on solid ground', () => {
    const rows = ['T.', '..']
    expect(unreachedTiles(rows, { x: 0, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ])
  })

  it('still covers the whole map when the spawn hugs the edge', () => {
    const rows = ['....', '....']
    expect(unreachedTiles(rows, { x: 3, y: 1 })).toEqual([])
  })

  it('returns nothing for an empty map', () => {
    expect(unreachedTiles([], { x: 0, y: 0 })).toEqual([])
  })

  it('flags an open tile the body could only cover by overlapping a wall', () => {
    const rows = [
      '..T',
      '..T',
      '...',
    ]
    expect(unreachedTiles(rows, { x: 0, y: 0 })).toEqual([{ x: 2, y: 2 }])
  })
})

describe('findMapViolations chest rules', () => {
  const base = { spawn: { x: 0, y: 0 }, npcs: [], portals: [], items: [] }

  it('accepts a walkable chest the spawn can reach', () => {
    expect(
      findMapViolations(['.....', '.....', '.....'], {
        ...base,
        chests: [{ chestId: 'camp', x: 2, y: 2, loot: [] }],
      }),
    ).toEqual([])
  })

  it('flags a chest sitting on a colliding tile', () => {
    expect(
      findMapViolations(['T....', '.....', '.....'], {
        ...base,
        chests: [{ chestId: 'camp', x: 0, y: 0, loot: [] }],
      }),
    ).toContain("chest 'camp' at 0,0 sits on colliding 'T'")
  })

  it('flags a chest the spawn cannot reach', () => {
    expect(
      findMapViolations(['T.T', 'T.T', 'T.T'], {
        ...base,
        chests: [{ chestId: 'camp', x: 2, y: 0, loot: [] }],
      }),
    ).toContain("chest 'camp' at 2,0 is not reachable from the spawn")
  })
})
