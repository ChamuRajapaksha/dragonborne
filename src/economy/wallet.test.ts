import { describe, expect, it } from 'vitest'
import { applyGold, formatGold } from './wallet'

describe('applyGold', () => {
  it('adds a positive delta', () => {
    expect(applyGold(10, 5)).toBe(15)
  })

  it('subtracts a negative delta', () => {
    expect(applyGold(10, -4)).toBe(6)
  })

  it('clamps at zero rather than going negative', () => {
    expect(applyGold(3, -10)).toBe(0)
    expect(applyGold(0, -1)).toBe(0)
  })

  it('leaves the balance alone for a zero delta', () => {
    expect(applyGold(7, 0)).toBe(7)
  })
})

describe('formatGold', () => {
  it('renders a plain amount', () => {
    expect(formatGold(0)).toBe('0 gold')
    expect(formatGold(24)).toBe('24 gold')
  })

  it('groups thousands with commas', () => {
    expect(formatGold(1240)).toBe('1,240 gold')
    expect(formatGold(1000000)).toBe('1,000,000 gold')
  })
})
