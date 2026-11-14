import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearClockSave, loadClockSave, saveClockSave } from './clockStorage'
import type { ClockSave } from './clockStorage'

const STORAGE_KEY = 'dragonborne.clock'

/** Minimal in-memory stand-in so the storage layer can be tested under node. */
class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setRaw(key: string, value: string): void {
    this.store.set(key, value)
  }

  has(key: string): boolean {
    return this.store.has(key)
  }
}

let memory: MemoryStorage

const validSave: ClockSave = {
  totalMinutes: 1_234,
  seed: 987_654,
  weather: 'rain',
  weatherUntilMinutes: 1_500,
  weatherRollIndex: 3,
}

beforeEach(() => {
  memory = new MemoryStorage()
  vi.stubGlobal('localStorage', memory)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('clock storage', () => {
  it('reads a missing save as a fresh clock', () => {
    expect(loadClockSave()).toBeNull()
  })

  it('round-trips a valid save', () => {
    saveClockSave(validSave)
    expect(loadClockSave()).toEqual(validSave)
  })

  it('writes a versioned record', () => {
    saveClockSave(validSave)
    expect(JSON.parse(memory.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      ...validSave,
    })
  })

  it('reads malformed JSON as a fresh clock', () => {
    memory.setRaw(STORAGE_KEY, '{not json')
    expect(loadClockSave()).toBeNull()
  })

  it('ignores an older save version', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 0, ...validSave }))
    expect(loadClockSave()).toBeNull()
  })

  it('rejects an unknown weather kind', () => {
    memory.setRaw(
      STORAGE_KEY,
      JSON.stringify({ version: 1, ...validSave, weather: 'snow' }),
    )
    expect(loadClockSave()).toBeNull()
  })

  it('rejects non-finite and negative numbers', () => {
    const cases: Partial<Record<keyof ClockSave, unknown>>[] = [
      { totalMinutes: Number.NaN },
      { totalMinutes: -1 },
      { seed: Number.POSITIVE_INFINITY },
      { seed: -5 },
      { weatherUntilMinutes: Number.NaN },
      { weatherUntilMinutes: -100 },
      { weatherRollIndex: -1 },
      { weatherRollIndex: 1.5 },
      { weatherRollIndex: 'many' },
    ]

    for (const overrides of cases) {
      memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, ...validSave, ...overrides }))
      expect(loadClockSave()).toBeNull()
    }
  })

  it('clears the stored clock', () => {
    saveClockSave(validSave)
    clearClockSave()
    expect(memory.has(STORAGE_KEY)).toBe(false)
    expect(loadClockSave()).toBeNull()
  })
})
