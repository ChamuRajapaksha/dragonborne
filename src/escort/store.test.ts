import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EscortProgress } from './types'

const STORAGE_KEY = 'dragonborne.escort'

const active: EscortProgress = {
  escortId: 'archivists-escort',
  npcId: 'village-archivist',
  stopIndex: 0,
  areaId: 'village',
  x: 160,
  y: 240,
}

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

describe('escort store', () => {
  it('hydrates from an empty save without writing back', async () => {
    const store = await loadStore()

    expect(store.hydrateEscorts()).toBeNull()
    expect(store.getActiveEscort()).toBeNull()
    expect(memory.has(STORAGE_KEY)).toBe(false)
  })

  it('hydrates a saved escort without writing back', async () => {
    memory.setItem(STORAGE_KEY, JSON.stringify({ version: 1, active }))
    const store = await loadStore()

    expect(store.hydrateEscorts()).toEqual(active)
    expect(store.getActiveEscort()).toEqual(active)
    expect(JSON.parse(memory.getItem(STORAGE_KEY) ?? '{}')).toEqual({ version: 1, active })
  })

  it('persists changes and notifies subscribers with snapshots', async () => {
    const store = await loadStore()
    const seen: (EscortProgress | null)[] = []
    const unsubscribe = store.subscribeEscorts((value) => seen.push(value))

    store.setActiveEscort(active)
    expect(store.getActiveEscort()).toEqual(active)
    expect(JSON.parse(memory.getItem(STORAGE_KEY) ?? '{}')).toEqual({ version: 1, active })

    const next = { ...active, stopIndex: 1 }
    store.setActiveEscort(next)
    expect(seen).toEqual([active, next])
    expect(seen[0]).not.toBe(next)

    unsubscribe()
    store.setActiveEscort(null)
    expect(seen).toEqual([active, next])
  })

  it('clears the save when the escort ends', async () => {
    const store = await loadStore()
    store.setActiveEscort(active)

    store.setActiveEscort(null)

    expect(store.getActiveEscort()).toBeNull()
    expect(memory.has(STORAGE_KEY)).toBe(false)
  })

  it('resets the escort and clears the save', async () => {
    const store = await loadStore()
    store.setActiveEscort(active)
    let notifications = 0
    store.subscribeEscorts(() => {
      notifications += 1
    })

    store.resetEscorts()

    expect(store.getActiveEscort()).toBeNull()
    expect(memory.has(STORAGE_KEY)).toBe(false)
    expect(notifications).toBe(1)
  })
})
