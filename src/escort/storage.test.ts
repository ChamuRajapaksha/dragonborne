import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearEscort, loadEscort, saveEscort } from './storage'
import type { EscortProgress } from './types'

const STORAGE_KEY = 'dragonborne.escort'

const active: EscortProgress = {
  escortId: 'archivists-escort',
  npcId: 'village-archivist',
  stopIndex: 1,
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

  setRaw(key: string, value: string): void {
    this.store.set(key, value)
  }
}

let memory: MemoryStorage

function setSave(value: unknown): void {
  memory.setRaw(STORAGE_KEY, JSON.stringify(value))
}

beforeEach(() => {
  memory = new MemoryStorage()
  vi.stubGlobal('localStorage', memory)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('escort storage', () => {
  it('reads a missing save as null', () => {
    expect(loadEscort()).toBeNull()
  })

  it('round-trips a versioned active escort', () => {
    saveEscort(active)

    expect(loadEscort()).toEqual(active)
    expect(JSON.parse(memory.getItem(STORAGE_KEY) ?? '{}')).toEqual({ version: 1, active })
  })

  it('reads a save with no active escort as null', () => {
    setSave({ version: 1, active: null })
    expect(loadEscort()).toBeNull()
  })

  it('rejects malformed saves', () => {
    memory.setRaw(STORAGE_KEY, '{not json')
    expect(loadEscort()).toBeNull()

    memory.setRaw(STORAGE_KEY, '[]')
    expect(loadEscort()).toBeNull()

    setSave({ version: 2, active })
    expect(loadEscort()).toBeNull()

    setSave({ version: 1, active: 'escort' })
    expect(loadEscort()).toBeNull()
  })

  it('rejects invalid escort ids, stop indices, areas, and coordinates', () => {
    setSave({ version: 1, active: { ...active, escortId: '' } })
    expect(loadEscort()).toBeNull()

    setSave({ version: 1, active: { ...active, npcId: 7 } })
    expect(loadEscort()).toBeNull()

    setSave({ version: 1, active: { ...active, stopIndex: -1 } })
    expect(loadEscort()).toBeNull()

    setSave({ version: 1, active: { ...active, stopIndex: 1.5 } })
    expect(loadEscort()).toBeNull()

    setSave({ version: 1, active: { ...active, areaId: 'nowhere' } })
    expect(loadEscort()).toBeNull()

    setSave({ version: 1, active: { ...active, x: Number.NaN } })
    expect(loadEscort()).toBeNull()

    setSave({ version: 1, active: { ...active, y: Number.POSITIVE_INFINITY } })
    expect(loadEscort()).toBeNull()
  })

  it('clears the key', () => {
    saveEscort(active)
    clearEscort()

    expect(memory.getItem(STORAGE_KEY)).toBeNull()
    expect(loadEscort()).toBeNull()
  })
})
