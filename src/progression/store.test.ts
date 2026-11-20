import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

  has(key: string): boolean {
    return this.store.has(key)
  }
}

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

describe('progression store', () => {
  it('hydrates from an empty save without writing back', async () => {
    const store = await loadStore()
    expect(store.hydrateProgression()).toBe(0)
    expect(store.getLevel()).toBe(1)
    expect(memory.has(STORAGE_KEY)).toBe(false)
  })

  it('hydrates from storage and caps oversized saves', async () => {
    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 1, xp: 150 }))
    const store = await loadStore()
    expect(store.hydrateProgression()).toBe(150)
    expect(store.getLevel()).toBe(2)
    expect(store.getLevelProgress()).toMatchObject({ current: 50, needed: 200 })

    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 1, xp: 999999 }))
    const capped = await loadStore()
    expect(capped.hydrateProgression()).toBe(4500)
    expect(capped.getLevel()).toBe(10)
  })

  it('grants xp, persists, and notifies subscribers with snapshots', async () => {
    const store = await loadStore()
    store.hydrateProgression()
    const seen: number[] = []
    const unsubscribe = store.subscribeProgression((state) => seen.push(state.xp))

    expect(store.grantXp(90)).toBe(0)
    expect(store.grantXp(20)).toBe(1)
    expect(store.getXp()).toBe(110)
    expect(seen).toEqual([90, 110])

    const snapshot = { xp: seen[1] }
    store.grantXp(10)
    expect(snapshot.xp).toBe(110)
    unsubscribe()
    store.grantXp(10)
    expect(seen).toEqual([90, 110, 120])
  })

  it('skips writes and notifications for invalid grants', async () => {
    const store = await loadStore()
    store.hydrateProgression()
    let calls = 0
    store.subscribeProgression(() => {
      calls += 1
    })

    expect(store.grantXp(0)).toBe(0)
    expect(store.grantXp(-10)).toBe(0)
    expect(calls).toBe(0)
    expect(memory.has(STORAGE_KEY)).toBe(false)
  })

  it('resets xp and clears the save', async () => {
    const store = await loadStore()
    store.hydrateProgression()
    store.grantXp(350)
    let notifications = 0
    store.subscribeProgression(() => {
      notifications += 1
    })

    store.resetProgression()
    expect(store.getXp()).toBe(0)
    expect(store.getLevel()).toBe(1)
    expect(memory.has(STORAGE_KEY)).toBe(false)
    expect(notifications).toBe(1)
  })
})
