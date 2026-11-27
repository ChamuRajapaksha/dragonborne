import { describe, expect, it } from 'vitest'
import { CLASSES } from '../character/classes'
import { ESCORTS, getEscortDefinition, getEscortForQuest } from '../escort/definitions'
import { FACTION_IDS, isFactionId } from '../factions'
import { TIERS } from '../factions/tiers'
import { getItemById } from '../inventory/catalog'
import { generateCaveMap } from '../world/caveGen'
import { generateForestMap } from '../world/forestGen'
import { findMapViolations } from '../world/mapRules'
import {
  AREA_IDS,
  CAVE_PORTALS,
  CAVE_SPAWN,
  FOREST_PORTALS,
  FOREST_SPAWN,
  PLAINS_MAP,
  PLAINS_PORTALS,
  PLAINS_SPAWN,
  VILLAGE_MAP,
  VILLAGE_PORTALS,
  VILLAGE_SPAWN,
} from '../world/maps'
import { NPCS } from './npcs'
import { QUESTS } from './quests'

const TEST_SEED = 4242
const AREA_TEST_MAPS: Readonly<Record<string, readonly string[]>> = {
  forest: generateForestMap(TEST_SEED),
  village: VILLAGE_MAP,
  cave: generateCaveMap(TEST_SEED),
  plains: PLAINS_MAP,
}
const AREA_TEST_SPAWNS: Readonly<Record<string, { x: number; y: number }>> = {
  forest: FOREST_SPAWN,
  village: VILLAGE_SPAWN,
  cave: CAVE_SPAWN,
  plains: PLAINS_SPAWN,
}

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

describe('escort data integrity', () => {
  const definitions = Object.values(ESCORTS)

  it('gives every escort a unique id and usable rules', () => {
    expect(new Set(definitions.map((def) => def.id)).size).toBe(definitions.length)
    expect(definitions.length).toBeGreaterThan(0)

    for (const def of definitions) {
      expect(def.questId.length).toBeGreaterThan(0)
      expect(def.npcId.length).toBeGreaterThan(0)
      expect(def.followRadius).toBeGreaterThan(0)
      expect(def.stopRadius).toBeGreaterThan(0)
      expect(def.leashRadius).toBeGreaterThan(def.followRadius)
      expect(def.npcSpeed).toBeGreaterThan(0)
      expect(def.stops.length).toBeGreaterThanOrEqual(2)
      for (const stop of def.stops) {
        expect(stop.label.length, `${def.id} has an unlabeled stop`).toBeGreaterThan(0)
        expect(
          stop.arrivalLine.length,
          `${def.id} stop ${stop.label} has no arrival line`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('matches every escort to its quest and npc', () => {
    const questById = new Map(QUESTS.map((quest) => [quest.id, quest]))
    const npcIds = new Set(NPCS.map((npc) => npc.id))

    for (const def of definitions) {
      const quest = questById.get(def.questId)
      expect(quest, `${def.id} points at an unknown quest`).toBeDefined()
      expect(quest?.escortId, `${def.id} is not claimed by ${def.questId}`).toBe(def.id)
      expect(quest?.npcId, `${def.id} and ${def.questId} disagree on the NPC`).toBe(def.npcId)
      expect(npcIds.has(def.npcId), `${def.id} points at an unknown NPC`).toBe(true)
    }

    for (const quest of QUESTS) {
      if (!quest.escortId) continue
      expect(getEscortDefinition(quest.escortId), `${quest.id} has no escort`).toBeDefined()
      expect(getEscortForQuest(quest.id)?.id).toBe(quest.escortId)
    }
  })

  it('places every escort stop on a walkable, reachable tile', () => {
    for (const def of definitions) {
      for (const stop of def.stops) {
        expect(AREA_IDS.includes(stop.areaId), `${def.id} stop ${stop.label} has no area`).toBe(true)
        const rows = AREA_TEST_MAPS[stop.areaId]
        expect(rows, `${def.id} stop ${stop.label} has no map`).toBeDefined()
        if (!rows) continue

        const violations = findMapViolations(rows, {
          spawn: AREA_TEST_SPAWNS[stop.areaId] ?? { x: 1, y: 1 },
          npcs: [{ npcId: def.npcId, x: stop.x, y: stop.y }],
          portals: [],
          items: [],
        })
        expect(violations, `${def.id} stop ${stop.label}`).toEqual([])
      }
    }
  })

  it('connects every escort route by real portal links', () => {
    const portalsByArea: Readonly<Record<string, readonly { toAreaId: string }[]>> = {
      cave: CAVE_PORTALS,
      forest: FOREST_PORTALS,
      plains: PLAINS_PORTALS,
      village: VILLAGE_PORTALS,
    }

    for (const def of definitions) {
      const visited = new Set<string>([def.stops[0].areaId])
      const queue = [def.stops[0].areaId]

      while (queue.length > 0) {
        const areaId = queue.shift()!
        for (const portal of portalsByArea[areaId] ?? []) {
          if (AREA_IDS.includes(portal.toAreaId) && !visited.has(portal.toAreaId)) {
            visited.add(portal.toAreaId)
            queue.push(portal.toAreaId)
          }
        }
      }

      for (const stop of def.stops) {
        expect(visited.has(stop.areaId), `${def.id} cannot reach ${stop.areaId}`).toBe(true)
      }
    }
  })
})
