import { describe, expect, it } from 'vitest'
import { ITEMS, STARTING_ITEMS, getItemById, getItemsByKind } from './catalog'
import { EQUIP_SLOTS } from './types'

describe('item catalog completeness', () => {
  it('gives every item a unique id', () => {
    const ids = ITEMS.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every item a name, description and icon', () => {
    for (const item of ITEMS) {
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
      expect(item.icon.glyph.length).toBeGreaterThan(0)
      expect(typeof item.icon.color).toBe('number')
    }
  })

  it('gives every item a positive max stack', () => {
    for (const item of ITEMS) {
      expect(item.maxStack).toBeGreaterThanOrEqual(1)
    }
  })

  it('marks gear with an equip slot and non-gear without one', () => {
    for (const item of ITEMS) {
      if (item.kind === 'weapon' || item.kind === 'armour') {
        expect(item.equipSlot).toBeDefined()
        expect(EQUIP_SLOTS).toContain(item.equipSlot)
      } else {
        expect(item.equipSlot).toBeUndefined()
      }
    }
  })

  it('resolves items by id and by kind', () => {
    expect(getItemById('axe')?.name).toBe("Woodcutter's Axe")
    expect(getItemById('sapling')?.kind).toBe('resource')
    expect(getItemById('nope')).toBeUndefined()
    expect(getItemsByKind('resource').length).toBeGreaterThan(0)
    expect(getItemsByKind('resource').every((item) => item.kind === 'resource')).toBe(true)
  })
})

describe('starting kit', () => {
  it('only references items that exist in the catalog', () => {
    for (const stack of STARTING_ITEMS) {
      expect(getItemById(stack.itemId)).toBeDefined()
      expect(stack.quantity).toBeGreaterThan(0)
    }
  })
})
