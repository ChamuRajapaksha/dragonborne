import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TORCH_BURN_MS } from './torch'
import { clearTorchFuel, clampTorchFuel, loadTorchFuel, saveTorchFuel } from './torchFuel'

const STORAGE_KEY = 'dragonborne.torch'

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

beforeEach(() => {
  memory = new MemoryStorage()
  vi.stubGlobal('localStorage', memory)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('clampTorchFuel', () => {
  it('keeps fuel inside one torch window', () => {
    expect(clampTorchFuel(TORCH_BURN_MS)).toBe(TORCH_BURN_MS)
    expect(clampTorchFuel(TORCH_BURN_MS + 1)).toBe(TORCH_BURN_MS)
    expect(clampTorchFuel(-1)).toBe(0)
    expect(clampTorchFuel(Number.NaN)).toBe(0)
  })
})

describe('torch fuel persistence', () => {
  it('reads a missing save as an empty torch', () => {
    expect(loadTorchFuel()).toBe(0)
  })

  it('round-trips remaining fuel', () => {
    saveTorchFuel(42_500)
    expect(loadTorchFuel()).toBe(42_500)
  })

  it('writes a versioned record', () => {
    saveTorchFuel(1_000)
    expect(JSON.parse(memory.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      fuelMs: 1_000,
    })
  })

  it('clamps on the way in and on the way out', () => {
    saveTorchFuel(TORCH_BURN_MS + 5_000)
    expect(loadTorchFuel()).toBe(TORCH_BURN_MS)

    saveTorchFuel(-100)
    expect(loadTorchFuel()).toBe(0)

    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, fuelMs: 500_000 }))
    expect(loadTorchFuel()).toBe(TORCH_BURN_MS)
  })

  it('reads malformed storage as an empty torch', () => {
    memory.setRaw(STORAGE_KEY, '{not json')
    expect(loadTorchFuel()).toBe(0)
  })

  it('ignores an older save version', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 0, fuelMs: 42_000 }))
    expect(loadTorchFuel()).toBe(0)
  })

  it('ignores a non-numeric fuel value', () => {
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, fuelMs: 'lots' }))
    expect(loadTorchFuel()).toBe(0)
  })

  it('clears the stored fuel', () => {
    saveTorchFuel(42_000)
    clearTorchFuel()
    expect(memory.has(STORAGE_KEY)).toBe(false)
    expect(loadTorchFuel()).toBe(0)
  })
})
