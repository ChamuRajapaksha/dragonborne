/**
 * Seeded weather scheduling. Weather changes every 2–6 game hours, and the
 * schedule can be caught up deterministically after a reload or a long pause.
 */
import { mulberry32, randomInt } from './rng'
import type { WeatherKind } from './weather'
import { rollNextWeather } from './weather'

export interface WeatherState {
  kind: WeatherKind
  /** Absolute game minute at which the next roll happens. */
  untilMinutes: number
  /** Monotonic counter mixed into the seed for reproducible rolls. */
  rollIndex: number
}

export const WEATHER_MIN_DURATION = 120
export const WEATHER_MAX_DURATION = 360

/** Guards against a giant `totalMinutes` jump looping forever. */
export const WEATHER_MAX_ROLLS_PER_CALL = 16

const ROLL_MIX = 0x9e3779b9

function rngFor(seed: number, rollIndex: number): () => number {
  return mulberry32((seed + rollIndex * ROLL_MIX) >>> 0)
}

function rollDuration(seed: number, rollIndex: number): number {
  const rng = rngFor(seed, rollIndex)
  return randomInt(rng, WEATHER_MIN_DURATION, WEATHER_MAX_DURATION + 1)
}

/** A fresh schedule always starts clear, with its first roll 2–6 hours out. */
export function createWeatherState(seed: number, totalMinutes: number): WeatherState {
  return {
    kind: 'clear',
    untilMinutes: totalMinutes + rollDuration(seed, 0),
    rollIndex: 0,
  }
}

/**
 * Rolls the next kind and schedules it. The duration is drawn from the same
 * seeded stream as the kind, so the same seed + index always reproduces both.
 */
export function rollWeatherChange(
  seed: number,
  current: WeatherState,
  totalMinutes: number,
): WeatherState {
  const rollIndex = current.rollIndex + 1
  const rng = rngFor(seed, rollIndex)
  const kind = rollNextWeather(current.kind, rng)
  const duration = randomInt(rng, WEATHER_MIN_DURATION, WEATHER_MAX_DURATION + 1)
  return { kind, untilMinutes: totalMinutes + duration, rollIndex }
}

/**
 * Rolls forward while the clock is past the scheduled change. `changed` is true
 * only when the resulting kind differs from the one passed in, so callers can
 * skip a redundant visual update. The catch-up is capped, and a still-due state
 * is snapped past the current minute so the next call makes progress.
 */
export function advanceWeather(
  seed: number,
  state: WeatherState,
  totalMinutes: number,
): { state: WeatherState; changed: boolean } {
  let next = state
  let changed = false
  let rolls = 0

  while (Number.isFinite(next.untilMinutes) && totalMinutes >= next.untilMinutes && rolls < WEATHER_MAX_ROLLS_PER_CALL) {
    next = rollWeatherChange(seed, next, next.untilMinutes)
    if (next.kind !== state.kind) changed = true
    rolls += 1
  }

  if (!Number.isFinite(next.untilMinutes) || totalMinutes >= next.untilMinutes) {
    next = {
      ...next,
      untilMinutes: totalMinutes + WEATHER_MIN_DURATION,
    }
  }

  return { state: next, changed }
}
