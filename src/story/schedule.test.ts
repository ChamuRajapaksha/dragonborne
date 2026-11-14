import { describe, expect, it } from 'vitest'
import { getNpcById, isNpcActive } from './npcs'
import type { NpcDefinition } from './npcs'

function npc(hours?: { start: number; end: number }): NpcDefinition {
  return {
    id: 'test',
    name: 'Test',
    role: 'Tester',
    greeting: '',
    activeHours: hours,
  }
}

const always = npc()
const alwaysWindow = npc({ start: 8 * 60, end: 8 * 60 })
const dayShift = npc({ start: 6 * 60, end: 20 * 60 })
const nightShift = npc({ start: 20 * 60, end: 5 * 60 })

describe('NPC schedules', () => {
  it('treats a missing window as always active', () => {
    for (const minute of [0, 3 * 60, 12 * 60, 23 * 60]) {
      expect(isNpcActive(always, minute)).toBe(true)
    }
  })

  it('treats an empty window as always active', () => {
    for (const minute of [0, 3 * 60, 12 * 60, 23 * 60]) {
      expect(isNpcActive(alwaysWindow, minute)).toBe(true)
    }
  })

  it('includes the start and excludes the end of a plain window', () => {
    expect(isNpcActive(dayShift, 5 * 60 + 59)).toBe(false)
    expect(isNpcActive(dayShift, 6 * 60)).toBe(true)
    expect(isNpcActive(dayShift, 12 * 60)).toBe(true)
    expect(isNpcActive(dayShift, 19 * 60 + 59)).toBe(true)
    expect(isNpcActive(dayShift, 20 * 60)).toBe(false)
  })

  it('wraps a window that crosses midnight', () => {
    expect(isNpcActive(nightShift, 19 * 60 + 59)).toBe(false)
    expect(isNpcActive(nightShift, 20 * 60)).toBe(true)
    expect(isNpcActive(nightShift, 23 * 60)).toBe(true)
    expect(isNpcActive(nightShift, 0)).toBe(true)
    expect(isNpcActive(nightShift, 4 * 60 + 59)).toBe(true)
    expect(isNpcActive(nightShift, 5 * 60)).toBe(false)
    expect(isNpcActive(nightShift, 12 * 60)).toBe(false)
  })

  it('honours boundaries across day rollovers', () => {
    expect(isNpcActive(dayShift, 1440 + 6 * 60)).toBe(true)
    expect(isNpcActive(dayShift, 2 * 1440 + 20 * 60)).toBe(false)
    expect(isNpcActive(nightShift, 1440 + 2 * 60)).toBe(true)
    expect(isNpcActive(nightShift, 1440 + 12 * 60)).toBe(false)
  })
})

describe('NPC schedule data', () => {
  it('never blocks the forest guide', () => {
    const guide = getNpcById('forest-guide')!
    expect(guide.activeHours).toBeUndefined()
    for (const minute of [0, 8 * 60, 23 * 60]) {
      expect(isNpcActive(guide, minute)).toBe(true)
    }
  })

  it('keeps the smith, archivist, host and trader on their posted hours', () => {
    expect(isNpcActive(getNpcById('village-smith')!, 6 * 60)).toBe(true)
    expect(isNpcActive(getNpcById('village-smith')!, 20 * 60)).toBe(false)

    expect(isNpcActive(getNpcById('village-archivist')!, 9 * 60)).toBe(true)
    expect(isNpcActive(getNpcById('village-archivist')!, 17 * 60)).toBe(false)

    expect(isNpcActive(getNpcById('village-host')!, 16 * 60)).toBe(true)
    expect(isNpcActive(getNpcById('village-host')!, 60 + 59)).toBe(true)
    expect(isNpcActive(getNpcById('village-host')!, 2 * 60)).toBe(false)
    expect(isNpcActive(getNpcById('village-host')!, 8 * 60)).toBe(false)

    expect(isNpcActive(getNpcById('village-trader')!, 7 * 60)).toBe(true)
    expect(isNpcActive(getNpcById('village-trader')!, 19 * 60)).toBe(false)
  })
})
