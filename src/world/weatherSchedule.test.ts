import { describe, expect, it } from 'vitest'
import { WEATHER_KINDS } from './weather'
import {
  WEATHER_MAX_DURATION,
  WEATHER_MAX_ROLLS_PER_CALL,
  WEATHER_MIN_DURATION,
  advanceWeather,
  createWeatherState,
  rollWeatherChange,
} from './weatherSchedule'

const SEED = 424242

describe('weather schedule', () => {
  it('starts clear with the first change 2–6 hours out', () => {
    const state = createWeatherState(SEED, 480)
    expect(state.kind).toBe('clear')
    expect(state.rollIndex).toBe(0)
    const duration = state.untilMinutes - 480
    expect(duration).toBeGreaterThanOrEqual(WEATHER_MIN_DURATION)
    expect(duration).toBeLessThanOrEqual(WEATHER_MAX_DURATION)
  })

  it('keeps every scheduled duration inside the bounds', () => {
    let state = createWeatherState(SEED, 0)
    for (let i = 0; i < 200; i += 1) {
      const next = rollWeatherChange(SEED, state, state.untilMinutes)
      const duration = next.untilMinutes - state.untilMinutes
      expect(duration).toBeGreaterThanOrEqual(WEATHER_MIN_DURATION)
      expect(duration).toBeLessThanOrEqual(WEATHER_MAX_DURATION)
      expect(WEATHER_KINDS).toContain(next.kind)
      state = next
    }
  })

  it('is deterministic for the same seed and index', () => {
    const start = createWeatherState(SEED, 480)
    const a = rollWeatherChange(SEED, start, start.untilMinutes)
    const b = rollWeatherChange(SEED, start, start.untilMinutes)
    expect(a).toEqual(b)

    const other = rollWeatherChange(SEED + 1, start, start.untilMinutes)
    expect(other).not.toEqual(a)
  })

  it('increments the roll index and moves the next change forward', () => {
    const start = createWeatherState(SEED, 480)
    const next = rollWeatherChange(SEED, start, start.untilMinutes)
    expect(next.rollIndex).toBe(1)
    expect(next.untilMinutes).toBeGreaterThan(start.untilMinutes)
  })
})

describe('advanceWeather', () => {
  it('does nothing before the due minute', () => {
    const start = createWeatherState(SEED, 480)
    const result = advanceWeather(SEED, start, start.untilMinutes - 1)
    expect(result.changed).toBe(false)
    expect(result.state).toBe(start)
  })

  it('rolls once when the due minute is reached', () => {
    const start = createWeatherState(SEED, 480)
    const result = advanceWeather(SEED, start, start.untilMinutes)
    expect(result.state.rollIndex).toBe(1)
    expect(result.state.untilMinutes).toBeGreaterThan(start.untilMinutes)
  })

  it('terminates and stays valid after a huge jump', () => {
    const start = createWeatherState(SEED, 0)
    const result = advanceWeather(SEED, start, 10_000_000)
    expect(WEATHER_KINDS).toContain(result.state.kind)
    expect(Number.isFinite(result.state.untilMinutes)).toBe(true)
    expect(result.state.untilMinutes).toBeGreaterThan(10_000_000)
    expect(result.state.rollIndex).toBeLessThanOrEqual(WEATHER_MAX_ROLLS_PER_CALL)
  })

  it('caps catch-up at 16 rolls per call', () => {
    const start = createWeatherState(SEED, 0)
    const result = advanceWeather(SEED, start, 10_000_000)
    expect(result.state.rollIndex).toBe(WEATHER_MAX_ROLLS_PER_CALL)
  })

  it('reports changed only when the kind differs', () => {
    const start = createWeatherState(SEED, 0)
    // Loop over seeds until a roll keeps the same kind, then check the flag.
    let sawSameKind = false
    for (let seed = 1; seed < 200; seed += 1) {
      const result = advanceWeather(seed, start, start.untilMinutes)
      expect(result.changed).toBe(result.state.kind !== start.kind)
      if (!result.changed) sawSameKind = true
    }
    expect(sawSameKind).toBe(true)
  })
})
