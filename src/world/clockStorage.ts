/**
 * Versioned localStorage save for the world clock and weather schedule. It
 * lives under its own key, so a malformed clock save can never break the
 * world-progress save — it simply falls back to a fresh Day 1, 08:00, clear.
 */
import type { WeatherKind } from './weather'
import { WEATHER_KINDS } from './weather'

const STORAGE_KEY = 'dragonborne.clock'
const STORAGE_VERSION = 1

export interface ClockSave {
  totalMinutes: number
  seed: number
  weather: WeatherKind
  weatherUntilMinutes: number
  weatherRollIndex: number
}

interface StoredClock extends ClockSave {
  version: number
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isValidWeather(value: unknown): value is WeatherKind {
  return typeof value === 'string' && WEATHER_KINDS.includes(value as WeatherKind)
}

export function loadClockSave(): ClockSave | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredClock>
    if (parsed.version !== STORAGE_VERSION) return null
    if (!isFiniteNonNegative(parsed.totalMinutes)) return null
    if (!isFiniteNonNegative(parsed.seed)) return null
    if (!isValidWeather(parsed.weather)) return null
    if (!isFiniteNonNegative(parsed.weatherUntilMinutes)) return null
    if (!isFiniteNonNegative(parsed.weatherRollIndex)) return null
    if (!Number.isInteger(parsed.weatherRollIndex)) return null

    return {
      totalMinutes: parsed.totalMinutes,
      seed: parsed.seed,
      weather: parsed.weather,
      weatherUntilMinutes: parsed.weatherUntilMinutes,
      weatherRollIndex: parsed.weatherRollIndex,
    }
  } catch {
    return null
  }
}

export function saveClockSave(save: ClockSave): void {
  const stored: StoredClock = { version: STORAGE_VERSION, ...save }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function clearClockSave(): void {
  localStorage.removeItem(STORAGE_KEY)
}
