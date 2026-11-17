import { describe, expect, it } from 'vitest'
import { getFactionById, isFactionId } from '../factions'
import { getItemById } from '../inventory/catalog'
import { QUESTS } from './quests'

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
