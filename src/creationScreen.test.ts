import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EscortProgress } from './escort'

const STORAGE_KEY = 'dragonborne.escort'

const active: EscortProgress = {
  escortId: 'archivists-escort',
  npcId: 'village-archivist',
  stopIndex: 1,
  areaId: 'forest',
  x: 320,
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

type SubmitListener = (event: { preventDefault(): void }) => void

let memory: MemoryStorage
let onSubmit: SubmitListener | null = null

function stubDocument(): void {
  const nameInput = { value: 'Tester' }
  const classInput = { value: 'warrior' }
  const form = {
    addEventListener(type: string, listener: SubmitListener): void {
      if (type === 'submit') onSubmit = listener
    },
  }
  const overlay = {
    id: '',
    innerHTML: '',
    querySelector(selector: string): unknown {
      if (selector === '#creation-form') return form
      if (selector === '#name-input') return nameInput
      return classInput
    },
    remove(): void {},
  }
  vi.stubGlobal('document', {
    createElement: () => overlay,
    body: { appendChild: () => undefined },
  })
}

beforeEach(() => {
  memory = new MemoryStorage()
  vi.stubGlobal('localStorage', memory)
  stubDocument()
})

afterEach(() => {
  vi.unstubAllGlobals()
  onSubmit = null
})

describe('new character creation', () => {
  it('clears an active escort and its save', async () => {
    vi.resetModules()
    const escorts = await import('./escort/store')
    const creation = await import('./creationScreen')

    escorts.setActiveEscort(active)
    expect(memory.has(STORAGE_KEY)).toBe(true)

    let created = false
    creation.showCreationScreen(() => {
      created = true
    })
    expect(onSubmit).not.toBeNull()
    onSubmit!({ preventDefault: () => undefined })

    expect(created).toBe(true)
    expect(escorts.getActiveEscort()).toBeNull()
    expect(memory.has(STORAGE_KEY)).toBe(false)
  })
})
