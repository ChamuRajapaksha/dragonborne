import { describe, expect, it } from 'vitest'
import { getItemById } from '../inventory/catalog'
import { generateCaveMap } from './caveGen'
import { generateForestMap } from './forestGen'
import { findMapViolations } from './mapRules'
import {
  CAVE_CHESTS,
  CAVE_ITEMS,
  CAVE_NPCS,
  CAVE_PORTALS,
  CAVE_SPAWN,
  FOREST_CHESTS,
  FOREST_ITEMS,
  FOREST_NPCS,
  FOREST_PORTALS,
  FOREST_SPAWN,
  VILLAGE_CHESTS,
  VILLAGE_ITEMS,
} from './maps'
import type { AreaChestPlacement } from './maps'

const CHESTS_BY_AREA: Readonly<Record<string, readonly AreaChestPlacement[]>> = {
  village: VILLAGE_CHESTS,
  forest: FOREST_CHESTS,
  cave: CAVE_CHESTS,
}

const ALL_CHESTS: readonly AreaChestPlacement[] = [
  ...VILLAGE_CHESTS,
  ...FOREST_CHESTS,
  ...CAVE_CHESTS,
]

const FOREST_SEEDS = Array.from({ length: 20 }, (_, index) => index * 104729 + 17)
const CAVE_SEEDS = Array.from({ length: 25 }, (_, index) => index * 104729 + 17)

const FOREST_PLACEMENTS = {
  spawn: FOREST_SPAWN,
  npcs: FOREST_NPCS,
  portals: FOREST_PORTALS,
  items: FOREST_ITEMS,
  chests: FOREST_CHESTS,
}

const CAVE_PLACEMENTS = {
  spawn: CAVE_SPAWN,
  npcs: CAVE_NPCS,
  portals: CAVE_PORTALS,
  items: CAVE_ITEMS,
  chests: CAVE_CHESTS,
}

function chestItemIds(chests: readonly AreaChestPlacement[]): Set<string> {
  return new Set(chests.flatMap((chest) => chest.loot.map((loot) => loot.itemId)))
}

describe('chest-only loot', () => {
  it('leaves no items lying on the ground in any area', () => {
    expect(VILLAGE_ITEMS).toEqual([])
    expect(FOREST_ITEMS).toEqual([])
    expect(CAVE_ITEMS).toEqual([])
  })

  it('only contains known items with a positive quantity', () => {
    for (const [areaId, chests] of Object.entries(CHESTS_BY_AREA)) {
      for (const chest of chests) {
        for (const loot of chest.loot) {
          expect(
            getItemById(loot.itemId),
            `${areaId}/${chest.chestId} places unknown item '${loot.itemId}'`,
          ).toBeDefined()
          expect(
            loot.quantity ?? 1,
            `${areaId}/${chest.chestId} gives '${loot.itemId}' a non-positive quantity`,
          ).toBeGreaterThan(0)
        }
      }
    }
  })

  it('makes the axe and at least one torch available from chests', () => {
    const ids = chestItemIds(ALL_CHESTS)
    expect(ids.has('axe')).toBe(true)
    expect(ids.has('torch')).toBe(true)
  })

  it('keeps iron ore out of every chest outside the village', () => {
    for (const chest of [...FOREST_CHESTS, ...CAVE_CHESTS]) {
      expect(
        chest.loot.map((loot) => loot.itemId),
        `chest '${chest.chestId}' contains iron ore`,
      ).not.toContain('iron-ore')
    }
  })

  it('still hands out iron ore from a village chest', () => {
    expect(chestItemIds(VILLAGE_CHESTS).has('iron-ore')).toBe(true)
  })
})

describe('chest placements', () => {
  it('keeps every forest chest walkable and reachable on every seed', () => {
    for (const seed of FOREST_SEEDS) {
      expect(
        findMapViolations(generateForestMap(seed), FOREST_PLACEMENTS),
        `forest seed ${seed}`,
      ).toEqual([])
    }
  })

  it('keeps every cave chest walkable and reachable on every seed', () => {
    for (const seed of CAVE_SEEDS) {
      expect(
        findMapViolations(generateCaveMap(seed), CAVE_PLACEMENTS),
        `cave seed ${seed}`,
      ).toEqual([])
    }
  })
})
