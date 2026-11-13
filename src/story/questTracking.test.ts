import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTrackedQuest,
  getTrackedQuestId,
  setTrackedQuestId,
} from './questTracking'
import {
  canTrackQuest,
  reconcileTrackedQuestId,
  resolveTrackedQuest,
  toggleTrackedQuest,
  trackedQuestHudLine,
} from './questTrackingModel'
import { buildQuestLog } from './questLog'
import type { QuestLogEntry } from './questLog'

const STORAGE_KEY = 'dragonborne.quests.tracked'

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

function entryFor(
  entries: readonly QuestLogEntry[],
  questId: string,
): QuestLogEntry {
  const entry = entries.find((candidate) => candidate.quest.id === questId)
  if (!entry) throw new Error(`missing quest log entry: ${questId}`)
  return entry
}

describe('quest tracking storage', () => {
  it('starts with nothing tracked', () => {
    expect(getTrackedQuestId()).toBeNull()
  })

  it('round-trips a quest id', () => {
    setTrackedQuestId('guard-the-bridge')
    expect(getTrackedQuestId()).toBe('guard-the-bridge')
    expect(memory.getItem(STORAGE_KEY)).toBe('guard-the-bridge')
  })

  it('trims whitespace and treats a blank value as untracked', () => {
    memory.setRaw(STORAGE_KEY, '  guard-the-bridge  ')
    expect(getTrackedQuestId()).toBe('guard-the-bridge')

    memory.setRaw(STORAGE_KEY, '   ')
    expect(getTrackedQuestId()).toBeNull()
  })

  it('removes the key when tracking is cleared', () => {
    setTrackedQuestId('guard-the-bridge')
    setTrackedQuestId(null)
    expect(getTrackedQuestId()).toBeNull()
    expect(memory.getItem(STORAGE_KEY)).toBeNull()

    setTrackedQuestId('guard-the-bridge')
    clearTrackedQuest()
    expect(getTrackedQuestId()).toBeNull()
  })
})

describe('quest tracking selectors', () => {
  const entries = buildQuestLog('warrior', {}, ['road-to-emberhold'])
  const available = entryFor(entries, 'the-midnight-fair')
  const locked = entryFor(entries, 'guard-the-bridge')
  const completed = entryFor(entries, 'road-to-emberhold')

  it('only blocks completed quests from being tracked', () => {
    expect(canTrackQuest(available)).toBe(true)
    expect(canTrackQuest(locked)).toBe(true)
    expect(canTrackQuest(completed)).toBe(false)
  })

  it('toggles between pinning and unpinning the same quest', () => {
    expect(toggleTrackedQuest(null, 'guard-the-bridge')).toBe('guard-the-bridge')
    expect(toggleTrackedQuest('guard-the-bridge', 'guard-the-bridge')).toBeNull()
    expect(toggleTrackedQuest('guard-the-bridge', 'the-midnight-fair')).toBe(
      'the-midnight-fair',
    )
  })

  it('resolves available and locked quests but not completed ones', () => {
    expect(resolveTrackedQuest(entries, null)).toBeNull()
    expect(resolveTrackedQuest(entries, 'missing-quest')).toBeNull()
    expect(resolveTrackedQuest(entries, completed.quest.id)).toBeNull()
    expect(resolveTrackedQuest(entries, available.quest.id)).toBe(available)
    expect(resolveTrackedQuest(entries, locked.quest.id)).toBe(locked)
  })

  it('reconciles the persisted id against the current quest log', () => {
    expect(reconcileTrackedQuestId(entries, null)).toBeNull()
    expect(reconcileTrackedQuestId(entries, 'missing-quest')).toBeNull()
    expect(reconcileTrackedQuestId(entries, completed.quest.id)).toBeNull()
    expect(reconcileTrackedQuestId(entries, available.quest.id)).toBe(
      available.quest.id,
    )
  })

  it('formats one HUD line for the tracked quest', () => {
    expect(trackedQuestHudLine(null)).toBe('')
    expect(trackedQuestHudLine(available)).toBe(
      'Tracked: The Midnight Fair \u2014 Odile',
    )
    expect(trackedQuestHudLine(locked)).toBe(
      'Tracked: Guard the Eastern Bridge (locked)',
    )
  })
})
