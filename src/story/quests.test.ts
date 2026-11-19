import { describe, expect, it } from 'vitest'
import { getFactionById, isFactionId, REPUTATION_MAX } from '../factions'
import { getItemById } from '../inventory/catalog'
import { getQuestsForClass, QUESTS } from './quests'

describe('quest reputation data', () => {
  it('references factions that exist in the catalog', () => {
    for (const quest of QUESTS) {
      for (const reward of quest.reputation ?? []) {
        expect(isFactionId(reward.factionId)).toBe(true)
        expect(getFactionById(reward.factionId)).toBeDefined()
      }
      for (const requirement of quest.requiresReputation ?? []) {
        expect(isFactionId(requirement.factionId)).toBe(true)
      }
    }
  })

  it('gives every reputation reward a non-zero delta in range', () => {
    for (const quest of QUESTS) {
      for (const reward of quest.reputation ?? []) {
        expect(reward.delta).not.toBe(0)
        expect(reward.delta).toBeGreaterThanOrEqual(-100)
        expect(reward.delta).toBeLessThanOrEqual(100)
      }
    }
  })

  it('sets every requirement above neutral', () => {
    for (const quest of QUESTS) {
      for (const requirement of quest.requiresReputation ?? []) {
        expect(requirement.min).toBeGreaterThan(0)
        expect(requirement.min).toBeLessThanOrEqual(100)
      }
    }
  })

  it('rewards items that exist in the catalog', () => {
    for (const quest of QUESTS) {
      for (const reward of quest.rewards ?? []) {
        expect(getItemById(reward.itemId)).toBeDefined()
      }
    }
  })
})

const GATED_QUESTS = [
  {
    id: 'forge-oath',
    factionId: 'forge',
    npcId: 'village-smith',
    itemId: 'steel-ingot',
    quantity: 2,
  },
  {
    id: 'wardens-patrol',
    factionId: 'wardens',
    npcId: 'forest-guide',
    itemId: 'coil-rope',
    quantity: 1,
  },
  {
    id: 'archive-request',
    factionId: 'archive',
    npcId: 'village-archivist',
    itemId: 'emberglass',
    quantity: 1,
  },
] as const

describe('faction-gated quest lines', () => {
  it.each(GATED_QUESTS)('$id gates and rewards $factionId standing', (expected) => {
    const quest = QUESTS.find((entry) => entry.id === expected.id)

    expect(quest).toBeDefined()
    expect(quest?.npcId).toBe(expected.npcId)
    expect(quest?.requiresReputation).toEqual([
      { factionId: expected.factionId, min: 20 },
    ])
    expect(quest?.rewards).toEqual([
      { itemId: expected.itemId, quantity: expected.quantity },
    ])
    expect(quest?.reputation).toEqual([
      { factionId: expected.factionId, delta: 5 },
    ])
  })

  it('keeps every gate within the reputation range', () => {
    for (const expected of GATED_QUESTS) {
      const quest = QUESTS.find((entry) => entry.id === expected.id)!
      for (const requirement of quest.requiresReputation ?? []) {
        expect(requirement.min).toBeGreaterThan(0)
        expect(requirement.min).toBeLessThanOrEqual(REPUTATION_MAX)
      }
    }
  })

  it('offers every gated line to each class', () => {
    const classIds = ['warrior', 'rogue', 'mage', 'cleric', 'ranger', 'bard']
    for (const expected of GATED_QUESTS) {
      for (const classId of classIds) {
        expect(
          getQuestsForClass(classId).some((quest) => quest.id === expected.id),
        ).toBe(true)
      }
    }
  })
})
