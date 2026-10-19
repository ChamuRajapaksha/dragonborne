import { describe, expect, it } from 'vitest'
import { SHOP_OFFERS, getShopPrice, maxAffordable } from './trade'

describe('shop pricing', () => {
  it('lists the sapling at twelve gold', () => {
    expect(getShopPrice('sapling')).toBe(12)
  })

  it('returns undefined for goods the trader does not stock', () => {
    expect(getShopPrice('wood')).toBeUndefined()
    expect(getShopPrice('axe')).toBeUndefined()
    expect(getShopPrice('')).toBeUndefined()
  })

  it('keeps the shop table unique by item id', () => {
    const ids = SHOP_OFFERS.map((offer) => offer.itemId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every shop offer a positive price', () => {
    for (const offer of SHOP_OFFERS) {
      expect(offer.price).toBeGreaterThan(0)
    }
  })
})

describe('maxAffordable', () => {
  it('buys nothing with no gold', () => {
    expect(maxAffordable(0, 12)).toBe(0)
  })

  it('buys nothing with a non-positive price', () => {
    expect(maxAffordable(100, 0)).toBe(0)
    expect(maxAffordable(100, -1)).toBe(0)
  })

  it('treats negative gold as nothing to spend', () => {
    expect(maxAffordable(-5, 12)).toBe(0)
  })

  it('floors to whole units the gold can cover', () => {
    expect(maxAffordable(11, 12)).toBe(0)
    expect(maxAffordable(12, 12)).toBe(1)
    expect(maxAffordable(25, 12)).toBe(2)
    expect(maxAffordable(120, 12)).toBe(10)
  })
})
