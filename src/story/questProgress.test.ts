import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearCompletedQuests,
  completeQuest,
  getCompletedQuestIds,
  isQuestCompleted,
} from './questProgress'

const STORAGE_KEY = 'dragonborne.quests.completed'

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

describe('quest progress', () => {
  it('marks a quest complete only once', () => {
    expect(completeQuest('road-to-emberhold')).toBe(true)
    expect(completeQuest('road-to-emberhold')).toBe(false)
    expect(getCompletedQuestIds()).toEqual(['road-to-emberhold'])
    expect(isQuestCompleted('road-to-emberhold')).toBe(true)
  })

  it('reads malformed completion saves as empty', () => {
    memory.setRaw(STORAGE_KEY, '{not json')
    expect(getCompletedQuestIds()).toEqual([])
  })

  it('clears completion flags for a new character', () => {
    completeQuest('road-to-emberhold')
    clearCompletedQuests()
    expect(memory.getItem(STORAGE_KEY)).toBeNull()
    expect(getCompletedQuestIds()).toEqual([])
    expect(completeQuest('road-to-emberhold')).toBe(true)
  })
})
