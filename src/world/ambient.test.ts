import { describe, expect, it } from 'vitest'
import { ambientAt } from './ambient'

const NIGHT = { color: 0x0b1030, alpha: 0.45 }
const DAY = { color: 0xffffff, alpha: 0.0 }

describe('ambient palette', () => {
  it('is night at midnight and through the pre-dawn', () => {
    expect(ambientAt(0)).toEqual(NIGHT)
    expect(ambientAt(4 * 60 + 30)).toEqual(NIGHT)
    expect(ambientAt(2 * 60)).toEqual(NIGHT)
  })

  it('is clear at midday', () => {
    expect(ambientAt(12 * 60)).toEqual(DAY)
    expect(ambientAt(10 * 60)).toEqual(DAY)
    expect(ambientAt(16 * 60)).toEqual(DAY)
  })

  it('sits between day and night at dusk', () => {
    const dusk = ambientAt(19 * 60)
    expect(dusk.alpha).toBeGreaterThan(0)
    expect(dusk.alpha).toBeLessThan(NIGHT.alpha)
    expect(dusk.color).not.toBe(DAY.color)
  })

  it('interpolates monotonically between keyframes', () => {
    // 04:30 → 06:00, night fading toward dawn.
    const alphas = [270, 300, 330, 360].map((minute) => ambientAt(minute).alpha)
    for (let i = 1; i < alphas.length; i += 1) {
      expect(alphas[i]!).toBeLessThanOrEqual(alphas[i - 1]!)
    }

    // 17:30 → 19:00, the day tint darkening toward dusk.
    const evening = [1050, 1080, 1110, 1140].map((minute) => ambientAt(minute).alpha)
    for (let i = 1; i < evening.length; i += 1) {
      expect(evening[i]!).toBeGreaterThanOrEqual(evening[i - 1]!)
    }
  })

  it('wraps at 1440 to match midnight', () => {
    expect(ambientAt(1439)).toEqual(NIGHT)
    expect(ambientAt(1440)).toEqual(ambientAt(0))
    expect(ambientAt(1440 + 60)).toEqual(ambientAt(60))
  })

  it('does not produce NaN for malformed input', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -30]) {
      const tint = ambientAt(value)
      expect(Number.isFinite(tint.alpha)).toBe(true)
      expect(Number.isInteger(tint.color)).toBe(true)
      expect(tint.alpha).toBeGreaterThanOrEqual(0)
      expect(tint.alpha).toBeLessThanOrEqual(1)
    }
  })
})
