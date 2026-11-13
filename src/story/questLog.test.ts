import { describe, expect, it } from 'vitest'
import {
  buildQuestLog,
  formatUnmetStats,
  groupQuestLog,
  questLogSummary,
  unmetQuestStats,
} from './questLog'
import { QUESTS } from './quests'
import type { Quest } from './quests'

function questById(id: string): Quest {
  const quest = QUESTS.find((entry) => entry.id === id)
  if (!quest) throw new Error(`missing quest fixture: ${id}`)
  return quest
}

describe('unmetQuestStats', () => {
  it('returns nothing for a quest without requirements', () => {
    expect(unmetQuestStats(questById('road-to-emberhold'), {})).toEqual([])
  })

  it('reports each missing stat with the character\u2019s current value', () => {
    expect(unmetQuestStats(questById('guard-the-bridge'), { strength: 2 })).toEqual([
      { stat: 'strength', required: 4, current: 2 },
    ])
  })

  it('returns nothing once every requirement is met', () => {
    expect(unmetQuestStats(questById('guard-the-bridge'), { strength: 4 })).toEqual([])
  })
})

describe('buildQuestLog', () => {
  it('only lists quests available to the class', () => {
    const warrior = buildQuestLog('warrior', {}, [])
    const mage = buildQuestLog('mage', {}, [])

    expect(warrior.some((entry) => entry.quest.id === 'guard-the-bridge')).toBe(true)
    expect(warrior.some((entry) => entry.quest.id === 'archivists-trove')).toBe(false)
    expect(mage.some((entry) => entry.quest.id === 'archivists-trove')).toBe(true)
    expect(mage.some((entry) => entry.quest.id === 'guard-the-bridge')).toBe(false)
  })

  it('returns an empty log for an unknown class', () => {
    expect(buildQuestLog('nobody', {}, [])).toEqual([])
  })

  it('tags ready, locked and completed quests', () => {
    const log = buildQuestLog('warrior', {}, ['road-to-emberhold'])
    const byId = (id: string) => log.find((entry) => entry.quest.id === id)

    expect(byId('the-midnight-fair')?.status).toBe('available')
    expect(byId('guard-the-bridge')?.status).toBe('locked')
    expect(byId('road-to-emberhold')?.status).toBe('completed')
  })

  it('lets completion win over unmet stats', () => {
    const log = buildQuestLog('warrior', {}, ['guard-the-bridge'])
    const guard = log.find((entry) => entry.quest.id === 'guard-the-bridge')

    expect(guard?.status).toBe('completed')
    expect(guard?.unmetStats).toHaveLength(1)
  })

  it('resolves the offering NPC and carries unmet stats through', () => {
    const log = buildQuestLog('warrior', {}, [])
    const guard = log.find((entry) => entry.quest.id === 'guard-the-bridge')

    expect(guard?.npcName).toBe('Brennan the Smith')
    expect(guard?.unmetStats).toEqual([
      { stat: 'strength', required: 4, current: 0 },
    ])
  })
})

describe('groupQuestLog', () => {
  it('keeps the fixed section order and includes empty sections', () => {
    const sections = groupQuestLog([])

    expect(sections.map((section) => section.status)).toEqual([
      'available',
      'locked',
      'completed',
    ])
    expect(sections.map((section) => section.title)).toEqual([
      'Available',
      'Locked',
      'Completed',
    ])
    expect(sections.every((section) => section.entries.length === 0)).toBe(true)
  })

  it('puts every entry in the section matching its status', () => {
    const log = buildQuestLog('warrior', {}, ['road-to-emberhold'])
    const sections = groupQuestLog(log)

    for (const section of sections) {
      for (const entry of section.entries) {
        expect(entry.status).toBe(section.status)
      }
    }

    const completed = sections.find((section) => section.status === 'completed')
    expect(completed?.entries.map((entry) => entry.quest.id)).toEqual([
      'road-to-emberhold',
    ])
  })
})

describe('questLogSummary', () => {
  it('counts entries by status', () => {
    const log = buildQuestLog('warrior', {}, ['road-to-emberhold'])

    expect(questLogSummary(log)).toEqual({
      available: 1,
      locked: 1,
      completed: 1,
    })
  })
})

describe('formatUnmetStats', () => {
  it('shows the requirement and the current value', () => {
    expect(
      formatUnmetStats([{ stat: 'strength', required: 4, current: 2 }]),
    ).toBe('strength 4+ (2)')
  })

  it('returns an empty string for no missing stats', () => {
    expect(formatUnmetStats([])).toBe('')
  })
})
