import { describe, expect, it } from 'vitest'
import { TIERS, clampReputation, tierFor, tierLabel } from './tiers'

describe('reputation tiers', () => {
  it('resolves boundary values', () => {
    expect(tierFor(-100)).toBe('hated')
    expect(tierFor(-50)).toBe('hated')
    expect(tierFor(-49)).toBe('hostile')
    expect(tierFor(-20)).toBe('hostile')
    expect(tierFor(-19)).toBe('neutral')
    expect(tierFor(19)).toBe('neutral')
    expect(tierFor(20)).toBe('friendly')
    expect(tierFor(49)).toBe('friendly')
    expect(tierFor(50)).toBe('honored')
    expect(tierFor(79)).toBe('honored')
    expect(tierFor(80)).toBe('revered')
    expect(tierFor(100)).toBe('revered')
  })

  it('clamps values to the allowed range', () => {
    expect(clampReputation(-150)).toBe(-100)
    expect(clampReputation(150)).toBe(100)
    expect(clampReputation(12.9)).toBe(12)
    expect(clampReputation(Number.NaN)).toBe(0)
    expect(clampReputation(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('treats non-finite values as neutral', () => {
    expect(tierFor(Number.NaN)).toBe('neutral')
    expect(tierFor(Number.POSITIVE_INFINITY)).toBe('neutral')
  })

  it('keeps tiers in ascending min order', () => {
    const mins = TIERS.map((tier) => tier.min)
    expect([...mins].sort((a, b) => a - b)).toEqual([...mins])
  })

  it('maps tier ids to labels', () => {
    expect(tierLabel('neutral')).toBe('Neutral')
    expect(tierLabel('revered')).toBe('Revered')
  })
})
