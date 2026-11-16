import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearReputation, loadReputation, saveReputation } from './storage'

const STORAGE_KEY = 'dragonborne.reputation'

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

beforeEach(() => {
  memory = new MemoryStorage()
  vi.stubGlobal('localStorage', memory)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('reputation storage', () => {
  it('reads a missing save as null', () => {
    expect(loadReputation()).toBeNull()
  })

  it('round-trips a versioned save', () => {
    saveReputation({ emberhold: 12, traders: -3 })
    expect(loadReputation()).toEqual({ emberhold: 12, traders: -3 })
    expect(JSON.parse(memory.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      values: { emberhold: 12, traders: -3 },
    })
  })

  it('reads malformed or future-version saves as null', () => {
    memory.setRaw(STORAGE_KEY, '{not json')
    expect(loadReputation()).toBeNull()
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 2, values: { emberhold: 5 } }))
    expect(loadReputation()).toBeNull()
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, values: [] }))
    expect(loadReputation()).toBeNull()
  })

  it('keeps only finite numeric values', () => {
    memory.setRaw(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        values: { emberhold: 5.8, traders: 'x', forge: Number.NaN, archive: -2 },
      }),
    )
    expect(loadReputation()).toEqual({ emberhold: 5, archive: -2 })
  })

  it('clears the save', () => {
    saveReputation({ emberhold: 1 })
    clearReputation()
    expect(memory.has(STORAGE_KEY)).toBe(false)
    expect(loadReputation()).toBeNull()
  })
})
