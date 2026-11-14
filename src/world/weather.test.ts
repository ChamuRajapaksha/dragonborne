import { describe, expect, it } from 'vitest'
import { mulberry32 } from './rng'
import {
  WEATHER,
  WEATHER_KINDS,
  WEATHER_TRANSITIONS,
  rollNextWeather,
} from './weather'

describe('weather metadata', () => {
  it('describes every kind', () => {
    for (const kind of WEATHER_KINDS) {
      const info = WEATHER[kind]
      expect(info.kind).toBe(kind)
      expect(info.label.length).toBeGreaterThan(0)
      expect(info.tint.color).toBeGreaterThanOrEqual(0)
      expect(info.tint.alpha).toBeGreaterThanOrEqual(0)
      expect(info.tint.alpha).toBeLessThanOrEqual(1)
      expect(['none', 'light', 'heavy']).toContain(info.drops)
    }
  })

  it('has metadata for exactly the declared kinds', () => {
    expect(Object.keys(WEATHER).sort()).toEqual([...WEATHER_KINDS].sort())
  })

  it('keeps the known visual flags', () => {
    expect(WEATHER.clear.drops).toBe('none')
    expect(WEATHER.rain.drops).toBe('light')
    expect(WEATHER.storm.drops).toBe('heavy')
    expect(WEATHER.storm.flashes).toBe(true)
    expect(WEATHER.fog.fog).toBe(true)
    expect(WEATHER.clear.fog).toBe(false)
  })
})

describe('weather transition table', () => {
  it('only names real kinds with non-negative weights', () => {
    for (const from of WEATHER_KINDS) {
      const row = WEATHER_TRANSITIONS[from]
      expect(row).toBeDefined()
      for (const [to, weight] of Object.entries(row)) {
        expect(WEATHER_KINDS).toContain(to)
        expect(weight).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('gives every kind some chance of a change', () => {
    for (const from of WEATHER_KINDS) {
      const total = Object.values(WEATHER_TRANSITIONS[from]).reduce(
        (sum, weight) => sum + (weight ?? 0),
        0,
      )
      expect(total).toBeGreaterThan(0)
    }
  })
})

describe('rollNextWeather', () => {
  it('always returns a valid kind across many rolls', () => {
    const rng = mulberry32(1234)
    let current = WEATHER_KINDS[0]!
    for (let i = 0; i < 2_000; i += 1) {
      current = rollNextWeather(current, rng)
      expect(WEATHER_KINDS).toContain(current)
    }
  })

  it('is deterministic for the same RNG sequence', () => {
    const roll = (seed: number): string => {
      const rng = mulberry32(seed)
      let current = WEATHER_KINDS[0]!
      for (let i = 0; i < 50; i += 1) current = rollNextWeather(current, rng)
      return current
    }
    expect(roll(99)).toBe(roll(99))
    expect(roll(99)).not.toBe(roll(100))
  })

  it('falls back to the current kind for empty or zero-weight rows', () => {
    const empty = { ...WEATHER_TRANSITIONS, clear: {} }
    expect(rollNextWeather('clear', mulberry32(1), empty)).toBe('clear')

    const zero = { ...WEATHER_TRANSITIONS, rain: { clear: 0, storm: 0 } }
    expect(rollNextWeather('rain', mulberry32(1), zero)).toBe('rain')
  })

  it('ignores unknown kinds in a row', () => {
    const table = {
      ...WEATHER_TRANSITIONS,
      clear: { rain: 1, bogus: 100 },
    } as unknown as typeof WEATHER_TRANSITIONS
    for (let i = 0; i < 100; i += 1) {
      expect(rollNextWeather('clear', mulberry32(i), table)).toBe('rain')
    }
  })
})
