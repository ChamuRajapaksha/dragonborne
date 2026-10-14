import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearGold, loadGold, saveGold } from './storage'

const STORAGE_KEY = 'dragonborne.wallet'

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
}

let memory: MemoryStorage

beforeEach(() => {
  memory = new MemoryStorage()
  vi.stubGlobal('localStorage', memory)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadGold', () => {
  it('reads a missing save as zero', () => {
    expect(loadGold()).toBe(0)
  })

  it('round-trips a saved balance', () => {
    saveGold(42)
    expect(loadGold()).toBe(42)
  })

  it('reads unparseable JSON as zero rather than throwing', () => {
    memory.setRaw(STORAGE_KEY, '{not json')
    expect(loadGold()).toBe(0)
  })

  it('rejects a save from a future schema version', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 2, gold: 99 }))
    expect(loadGold()).toBe(0)
  })

  it('rejects a malformed balance', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, gold: -5 }))
    expect(loadGold()).toBe(0)
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, gold: 1.5 }))
    expect(loadGold()).toBe(0)
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, gold: 'lots' }))
    expect(loadGold()).toBe(0)
  })

  it('rejects anything that is not a record', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify([1, 2, 3]))
    expect(loadGold()).toBe(0)
  })
})

describe('saveGold / clearGold', () => {
  it('writes a versioned save', () => {
    saveGold(7)
    expect(memory.getItem(STORAGE_KEY)).toBe(JSON.stringify({ version: 1, gold: 7 }))
  })

  it('clearGold removes the save so loadGold falls back to zero', () => {
    saveGold(7)
    clearGold()
    expect(loadGold()).toBe(0)
  })
})
