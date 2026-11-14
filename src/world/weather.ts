/**
 * Weather kinds, their visual metadata, and the weighted transition table that
 * drives changes. Pure data + a seeded roll — no Phaser, no `Math.random`.
 */
import type { Rng } from './rng'

export type WeatherKind = 'clear' | 'overcast' | 'rain' | 'fog' | 'storm'

export interface WeatherInfo {
  kind: WeatherKind
  label: string
  /** Full-screen tint applied under the rain layer. */
  tint: { color: number; alpha: number }
  drops: 'none' | 'light' | 'heavy'
  fog: boolean
  flashes: boolean
}

export const WEATHER_KINDS: readonly WeatherKind[] = [
  'clear',
  'overcast',
  'rain',
  'fog',
  'storm',
]

export const WEATHER: Readonly<Record<WeatherKind, WeatherInfo>> = {
  clear: {
    kind: 'clear',
    label: 'Clear',
    tint: { color: 0xffffff, alpha: 0 },
    drops: 'none',
    fog: false,
    flashes: false,
  },
  overcast: {
    kind: 'overcast',
    label: 'Overcast',
    tint: { color: 0x2b3340, alpha: 0.12 },
    drops: 'none',
    fog: false,
    flashes: false,
  },
  rain: {
    kind: 'rain',
    label: 'Rain',
    tint: { color: 0x1a2433, alpha: 0.2 },
    drops: 'light',
    fog: false,
    flashes: false,
  },
  fog: {
    kind: 'fog',
    label: 'Fog',
    tint: { color: 0xb8c2cc, alpha: 0.18 },
    drops: 'none',
    fog: true,
    flashes: false,
  },
  storm: {
    kind: 'storm',
    label: 'Storm',
    tint: { color: 0x101722, alpha: 0.28 },
    drops: 'heavy',
    fog: false,
    flashes: true,
  },
}

export type WeatherTransitionTable = Readonly<
  Record<WeatherKind, Readonly<Partial<Record<WeatherKind, number>>>>
>

export const WEATHER_TRANSITIONS: WeatherTransitionTable = {
  clear: { clear: 35, overcast: 35, fog: 15, rain: 12, storm: 3 },
  overcast: { clear: 25, overcast: 30, rain: 25, fog: 15, storm: 5 },
  rain: { clear: 15, overcast: 35, rain: 30, fog: 10, storm: 10 },
  fog: { clear: 30, overcast: 35, rain: 10, fog: 20, storm: 5 },
  storm: { clear: 20, overcast: 40, rain: 25, fog: 5, storm: 10 },
}

/**
 * Rolls the next weather kind from the current one. An empty row, an unknown
 * current kind, or a row whose weights are all non-positive keeps the weather
 * unchanged rather than guessing.
 */
export function rollNextWeather(
  current: WeatherKind,
  rng: Rng,
  table: WeatherTransitionTable = WEATHER_TRANSITIONS,
): WeatherKind {
  const row = table[current]
  if (!row) return current

  let total = 0
  for (const kind of WEATHER_KINDS) {
    const weight = row[kind]
    if (typeof weight === 'number' && Number.isFinite(weight) && weight > 0) {
      total += weight
    }
  }
  if (total <= 0) return current

  const roll = rng() * total
  let accumulated = 0
  for (const kind of WEATHER_KINDS) {
    const weight = row[kind]
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) continue
    accumulated += weight
    if (roll < accumulated) return kind
  }

  // `rng()` is documented as `< 1`, so this is only a guard against a broken
  // source; fall back to the last weighted kind that was seen.
  return current
}
