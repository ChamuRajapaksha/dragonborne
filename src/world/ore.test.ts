import { describe, expect, it } from 'vitest'
import { ORE_DEFINITIONS, mineHitsRemaining, oreForTile } from './ore'
import { getItemById } from '../inventory/catalog'
import { IRON_ORE_INDEX, STEEL_VEIN_INDEX, TILE_BY_CHAR } from './tileset'

describe('ORE_DEFINITIONS', () => {
  it('keeps the table unique by tile char', () => {
    const chars = ORE_DEFINITIONS.map((definition) => definition.char)
    expect(new Set(chars).size).toBe(chars.length)
  })

  it('asks for positive swings and yields on every node', () => {
    for (const definition of ORE_DEFINITIONS) {
      expect(definition.hits).toBeGreaterThan(0)
      expect(definition.yield).toBeGreaterThan(0)
    }
  })

  it('drops items that exist in the catalog', () => {
    for (const definition of ORE_DEFINITIONS) {
      expect(getItemById(definition.itemId)).toBeDefined()
    }
  })

  it('resolves iron ore and steel veins to their real tiles', () => {
    expect(ORE_DEFINITIONS.find((definition) => definition.char === 'o')).toMatchObject({
      itemId: 'iron-ore',
      hits: 3,
      yield: 2,
    })
    expect(ORE_DEFINITIONS.find((definition) => definition.char === 'v')).toMatchObject({
      itemId: 'steel-ingot',
      hits: 4,
      yield: 1,
    })
  })
})

describe('oreForTile', () => {
  it('resolves the iron and steel tile indexes to their definitions', () => {
    expect(oreForTile(IRON_ORE_INDEX)?.itemId).toBe('iron-ore')
    expect(oreForTile(STEEL_VEIN_INDEX)?.itemId).toBe('steel-ingot')
  })

  it('rejects non-ore tiles and missing indexes', () => {
    const floor = TILE_BY_CHAR.get('-')?.index
    expect(oreForTile(floor)).toBeUndefined()
    expect(oreForTile(0)).toBeUndefined()
    expect(oreForTile(undefined)).toBeUndefined()
  })
})

describe('mineHitsRemaining', () => {
  const iron = ORE_DEFINITIONS.find((definition) => definition.char === 'o')!
  const steel = ORE_DEFINITIONS.find((definition) => definition.char === 'v')!

  it('starts a fresh node at the full hit count for its definition', () => {
    expect(mineHitsRemaining(undefined, iron)).toBe(iron.hits - 1)
    expect(mineHitsRemaining(undefined, steel)).toBe(steel.hits - 1)
  })

  it('counts down with each swing', () => {
    expect(mineHitsRemaining(2, iron)).toBe(1)
    expect(mineHitsRemaining(1, iron)).toBe(0)
  })

  it('reaches zero, the clearing swing, and can go negative if asked', () => {
    expect(mineHitsRemaining(0, iron)).toBe(-1)
  })
})
