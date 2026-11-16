import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  has(key: string): boolean {
    return this.store.has(key)
  }
}

const STORAGE_KEY = 'dragonborne.reputation'
let memory: MemoryStorage

async function loadStore() {
  vi.resetModules()
  return import('./store')
}

beforeEach(() => {
  memory = new MemoryStorage()
  vi.stubGlobal('localStorage', memory)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('reputation store', () => {
  it('hydrates 0-filled standings and never writes back', async () => {
    const store = await loadStore()
    const values = store.hydrateReputation()
    expect(values.emberhold).toBe(0)
    expect(values.traders).toBe(0)
    expect(memory.has(STORAGE_KEY)).toBe(false)
  })

  it('hydrates from storage and clamps values', async () => {
    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 1, values: { emberhold: 200 } }))
    const store = await loadStore()
    expect(store.hydrateReputation().emberhold).toBe(100)
  })

  it('updates, applies, persists and notifies', async () => {
    const store = await loadStore()
    store.hydrateReputation()
    const seen: number[] = []
    const unsub = store.subscribeReputation((v) => seen.push(v.emberhold))
    store.updateReputation('emberhold', 8)
    store.applyReputation([
      { factionId: 'emberhold', delta: 2 },
      { factionId: 'unknown', delta: 99 },
    ])
    unsub()
    expect(store.getReputation('emberhold')).toBe(10)
    expect(seen).toEqual([8, 10])
    const saved = JSON.parse(memory.getItem(STORAGE_KEY) ?? '{}') as { values: Record<string, number> }
    expect(saved.values.emberhold).toBe(10)
  })

  it('ignores unknown ids and resets to zero', async () => {
    const store = await loadStore()
    store.hydrateReputation()
    expect(store.updateReputation('bandits', 5)).toBe(0)
    store.updateReputation('forge', 7)
    store.resetReputation()
    expect(store.getReputation('forge')).toBe(0)
    expect(memory.has(STORAGE_KEY)).toBe(false)
  })
})
