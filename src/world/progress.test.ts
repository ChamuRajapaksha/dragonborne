import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getForestSeed,
  getProgressFlag,
  loadProgress,
  saveProgress,
  setProgressFlag,
} from './progress'

const STORAGE_KEY = 'dragonborne.progress'

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
  vi.restoreAllMocks()
})

const LEGACY_SAVE = {
  areaId: 'forest',
  x: 120,
  y: 300,
  flags: { 'chop:forest:4,4': true },
}

describe('loadProgress seed parsing', () => {
  it('reads a save that carries a forest seed', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify({ ...LEGACY_SAVE, seed: 4242 }))
    expect(loadProgress()).toEqual({ ...LEGACY_SAVE, seed: 4242 })
  })

  it('reads a legacy save that predates seeds', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify(LEGACY_SAVE))
    expect(loadProgress()).toEqual(LEGACY_SAVE)
    expect(loadProgress()?.seed).toBeUndefined()
  })

  it('drops a malformed seed but keeps the rest of the save', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify({ ...LEGACY_SAVE, seed: 'lots' }))
    expect(loadProgress()).toEqual(LEGACY_SAVE)
    memory.setRaw(STORAGE_KEY, JSON.stringify({ ...LEGACY_SAVE, seed: null }))
    expect(loadProgress()).toEqual(LEGACY_SAVE)
  })

  it('reads a missing save as null', () => {
    expect(loadProgress()).toBeNull()
  })
})

describe('getForestSeed', () => {
  it('generates a seed and persists it on first use', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25)
    const seed = getForestSeed()
    expect(seed).toBe(Math.floor(0.25 * 0x100000000))
    expect(loadProgress()?.seed).toBe(seed)
  })

  it('returns the stored seed without rolling a new one', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify({ ...LEGACY_SAVE, seed: 99 }))
    const random = vi.spyOn(Math, 'random')
    expect(getForestSeed()).toBe(99)
    expect(random).not.toHaveBeenCalled()
  })

  it('keeps the rest of a legacy save intact when adding a seed', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify(LEGACY_SAVE))
    getForestSeed()
    expect(loadProgress()).toEqual({ ...LEGACY_SAVE, seed: expect.any(Number) })
  })

  it('hands out the same seed on every later call', () => {
    const first = getForestSeed()
    expect(getForestSeed()).toBe(first)
    expect(getForestSeed()).toBe(first)
  })

  it('stays stable across a position save the way the world scene writes them', () => {
    const seed = getForestSeed()
    saveProgress({
      areaId: 'village',
      x: 640,
      y: 320,
      flags: {},
      seed: loadProgress()?.seed,
    })
    expect(getForestSeed()).toBe(seed)
  })
})

describe('seed survival under flag writes', () => {
  it('setProgressFlag keeps the stored seed', () => {
    const seed = getForestSeed()
    setProgressFlag('intro:village')
    expect(getProgressFlag('intro:village')).toBe(true)
    expect(getForestSeed()).toBe(seed)
  })
})
