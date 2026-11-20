import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearXp, loadXp, saveXp } from './storage'

const STORAGE_KEY = 'dragonborne.progression'

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

describe('progression storage', () => {
  it('reads a missing save as null', () => {
    expect(loadXp()).toBeNull()
  })

  it('round-trips a versioned save', () => {
    saveXp(250)
    expect(loadXp()).toBe(250)
    expect(JSON.parse(memory.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      xp: 250,
    })
  })

  it('drops fractional xp when saving', () => {
    saveXp(10.9)
    expect(loadXp()).toBe(10)
  })

  it('rejects malformed saves', () => {
    memory.setRaw(STORAGE_KEY, '{not json')
    expect(loadXp()).toBeNull()
    memory.setRaw(STORAGE_KEY, '[]')
    expect(loadXp()).toBeNull()
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 2, xp: 100 }))
    expect(loadXp()).toBeNull()
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, xp: '100' }))
    expect(loadXp()).toBeNull()
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, xp: -1 }))
    expect(loadXp()).toBeNull()
    memory.setRaw(STORAGE_KEY, JSON.stringify({ version: 1, xp: Number.NaN }))
    expect(loadXp()).toBeNull()
  })

  it('clears the key', () => {
    saveXp(100)
    clearXp()
    expect(memory.getItem(STORAGE_KEY)).toBeNull()
    expect(loadXp()).toBeNull()
  })
})
