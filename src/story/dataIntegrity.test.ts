import { describe, expect, it } from 'vitest'
import { CLASSES } from '../character/classes'
import { FACTION_IDS, isFactionId } from '../factions'
import { TIERS } from '../factions/tiers'
import { getItemById } from '../inventory/catalog'
import { NPCS } from './npcs'
import { QUESTS } from './quests'

describe('cross-data integrity', () => {
  it('keeps quest and NPC ids unique', () => {
    expect(new Set(QUESTS.map((quest) => quest.id)).size).toBe(QUESTS.length)
    expect(new Set(NPCS.map((npc) => npc.id)).size).toBe(NPCS.length)
  })

  it('gives every quest a known NPC and class list', () => {
    const npcIds = new Set(NPCS.map((npc) => npc.id))
    const classIds = new Set(CLASSES.map((characterClass) => characterClass.id))

    for (const quest of QUESTS) {
      expect(npcIds.has(quest.npcId), `${quest.id} has an unknown NPC`).toBe(true)
      expect(quest.availableToClasses.length).toBeGreaterThan(0)
      for (const classId of quest.availableToClasses) {
        expect(classIds.has(classId), `${quest.id} has an unknown class`).toBe(true)
      }
    }
  })

  it('gives every quest a positive xp reward', () => {
    for (const quest of QUESTS) {
      expect(Number.isInteger(quest.xp), `${quest.id} has no integer xp`).toBe(true)
      expect(quest.xp ?? 0).toBeGreaterThan(0)
    }
  })

  it('lets every class reach level 2 from its own quests', () => {
    for (const characterClass of CLASSES) {
      const total = QUESTS.filter((quest) =>
        quest.availableToClasses.includes(characterClass.id),
      ).reduce((sum, quest) => sum + (quest.xp ?? 0), 0)
      expect(total, `${characterClass.id} cannot reach level 2`).toBeGreaterThanOrEqual(100)
    }
  })

  it('resolves every faction and item reference', () => {
    for (const quest of QUESTS) {
      for (const reward of quest.reputation ?? []) {
        expect(isFactionId(reward.factionId)).toBe(true)
      }
      for (const requirement of quest.requiresReputation ?? []) {
        expect(isFactionId(requirement.factionId)).toBe(true)
      }
      for (const reward of quest.rewards ?? []) {
        expect(getItemById(reward.itemId)).toBeDefined()
      }
    }
    for (const npc of NPCS) {
      if (npc.factionId) expect(isFactionId(npc.factionId)).toBe(true)
    }
  })

  it('uses real tiers for every NPC greeting override', () => {
    const tierIds = new Set<string>(TIERS.map((tier) => tier.id))
    for (const npc of NPCS) {
      for (const tier of Object.keys(npc.greetings ?? {})) {
        expect(tierIds.has(tier), `${npc.id} has an unknown greeting tier`).toBe(true)
      }
    }
  })

  it('ties every faction to quest data or an NPC', () => {
    const referenced = new Set<string>()
    for (const quest of QUESTS) {
      for (const reward of quest.reputation ?? []) referenced.add(reward.factionId)
      for (const requirement of quest.requiresReputation ?? []) {
        referenced.add(requirement.factionId)
      }
    }
    for (const npc of NPCS) {
      if (npc.factionId) referenced.add(npc.factionId)
    }
    for (const factionId of FACTION_IDS) {
      expect(referenced.has(factionId), `${factionId} is never referenced`).toBe(true)
    }
  })

  it('pays a gated quest with the faction it requires', () => {
    for (const quest of QUESTS) {
      const required = new Set(
        (quest.requiresReputation ?? []).map((requirement) => requirement.factionId),
      )
      if (required.size === 0) continue
      const positive = (quest.reputation ?? []).filter((reward) => reward.delta > 0)
      expect(positive.length).toBeGreaterThan(0)
      for (const reward of positive) {
        expect(required.has(reward.factionId), `${quest.id} rewards an ungated faction`).toBe(
          true,
        )
      }
    }
  })
})
