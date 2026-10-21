import { describe, expect, it } from 'vitest'
import { SMITH_MATERIAL_IDS, SMITH_OFFERS, getSmithOffer, smithShortfall } from './smith'
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

describe('smithShortfall', () => {
  const sword = getSmithOffer('iron-sword')!
  const dagger = getSmithOffer('worn-dagger')!

  it('returns null when coin and materials cover the cost', () => {
    expect(smithShortfall(50, { 'steel-ingot': 2 }, sword)).toBeNull()
    expect(smithShortfall(99, { 'steel-ingot': 5 }, sword)).toBeNull()
    expect(smithShortfall(15, { 'iron-ore': 2 }, dagger)).toBeNull()
  })

  it('reports the coin that is missing when the materials are held', () => {
    expect(smithShortfall(40, { 'steel-ingot': 2 }, sword)).toEqual({
      gold: 10,
      items: [],
    })
  })

  it('reports the materials that are missing when the coin is held', () => {
    expect(smithShortfall(50, { 'steel-ingot': 1 }, sword)).toEqual({
      gold: 0,
      items: [{ itemId: 'steel-ingot', quantity: 1 }],
    })
  })

  it('reports coin and materials together when short on both', () => {
    expect(smithShortfall(10, {}, dagger)).toEqual({
      gold: 5,
      items: [{ itemId: 'iron-ore', quantity: 2 }],
    })
  })

  it('treats a held count it has never seen as none', () => {
    expect(smithShortfall(15, { 'worn-dagger': 4 }, dagger)).toEqual({
      gold: 0,
      items: [{ itemId: 'iron-ore', quantity: 2 }],
    })
  })

  it('treats negative or absent coin as nothing to spend', () => {
    expect(smithShortfall(-5, { 'iron-ore': 2 }, dagger)?.gold).toBe(20)
    expect(smithShortfall(0, { 'iron-ore': 2 }, dagger)?.gold).toBe(15)
  })

  it('never shortens a material line below what the offer asks', () => {
    expect(smithShortfall(50, { 'steel-ingot': 1 }, sword)?.items).toEqual([
      { itemId: 'steel-ingot', quantity: 1 },
    ])
  })
})
