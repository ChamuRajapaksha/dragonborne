import { describe, expect, it } from 'vitest'
import { PRICE_MODIFIERS, buyPrice, priceModifierNote, sellPrice } from './prices'
import type { ReputationTier } from './tiers'

const tiers: ReputationTier[] = ['hated', 'hostile', 'neutral', 'friendly', 'honored', 'revered']

describe('faction price modifiers', () => {
  it('defines buy and sell multipliers for each tier', () => {
    for (const tier of tiers) {
      expect(PRICE_MODIFIERS[tier].buy).toBeGreaterThan(0)
      expect(PRICE_MODIFIERS[tier].sell).toBeGreaterThan(0)
    }
  })

  it('applies tier multipliers with rounding', () => {
    expect(buyPrice(100, 'friendly')).toBe(90)
    expect(sellPrice(100, 'friendly')).toBe(110)
    expect(buyPrice(100, 'hated')).toBe(125)
    expect(sellPrice(100, 'hated')).toBe(75)
  })

  it('never prices a buy below 1 or a sell below 0', () => {
    expect(buyPrice(0, 'revered')).toBe(1)
    expect(sellPrice(0, 'revered')).toBe(0)
  })

  it('formats the modifier note and leaves neutral unchanged', () => {
    expect(priceModifierNote('neutral')).toBe('no change')
    expect(priceModifierNote('friendly')).toBe('−10% buy, +10% sell')
    expect(priceModifierNote('hated')).toContain('buy')
  })
})
