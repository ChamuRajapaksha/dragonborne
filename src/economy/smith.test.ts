import { describe, expect, it } from 'vitest'
import { SMITH_MATERIAL_IDS, SMITH_OFFERS, getSmithOffer } from './smith'
import { getItemById } from '../inventory/catalog'

describe('smith offers', () => {
  it('keeps the price table unique by item id', () => {
    const ids = SMITH_OFFERS.map((offer) => offer.itemId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('charges gold and at least one material on every ware', () => {
    for (const offer of SMITH_OFFERS) {
      expect(offer.cost.gold).toBeGreaterThan(0)
      expect(offer.cost.items.length).toBeGreaterThan(0)
      for (const line of offer.cost.items) {
        expect(line.quantity).toBeGreaterThan(0)
      }
    }
  })

  it('only accepts iron ore or steel ingots as payment', () => {
    for (const offer of SMITH_OFFERS) {
      for (const line of offer.cost.items) {
        expect(SMITH_MATERIAL_IDS).toContain(line.itemId)
      }
    }
  })

  it('stocks wares that exist in the item catalog', () => {
    for (const offer of SMITH_OFFERS) {
      expect(getItemById(offer.itemId)).toBeDefined()
    }
  })

  it('resolves offers by item id and rejects goods he does not stock', () => {
    expect(getSmithOffer('iron-sword')?.cost.gold).toBe(50)
    expect(getSmithOffer('sapling')).toBeUndefined()
    expect(getSmithOffer('')).toBeUndefined()
  })
})
