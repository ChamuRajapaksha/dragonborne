import type { Quest } from '../story/quests'
import {
  AREA_IDS,
  AREA_NAMES,
  CAVE_NPCS,
  CAVE_PORTALS,
  FOREST_NPCS,
  FOREST_PORTALS,
  PLAINS_NPCS,
  PLAINS_PORTALS,
  VILLAGE_NPCS,
  VILLAGE_PORTALS,
} from '../world/maps'
import type { AreaNpcPlacement, Portal } from '../world/maps'
import { TILE_SIZE } from '../world/tileset'
import type { CompassPoint, QuestTarget } from './types'

const NPC_PLACEMENTS: Readonly<Record<string, readonly AreaNpcPlacement[]>> = {
  forest: FOREST_NPCS,
  village: VILLAGE_NPCS,
  plains: PLAINS_NPCS,
  cave: CAVE_NPCS,
}

const AREA_PORTALS: Readonly<Record<string, readonly Portal[]>> = {
  forest: FOREST_PORTALS,
  village: VILLAGE_PORTALS,
  plains: PLAINS_PORTALS,
  cave: CAVE_PORTALS,
}

export function areaName(areaId: string): string {
  return AREA_NAMES[areaId] ?? areaId
}

/** Static pixel position of the NPC who offers a quest. */
export function findQuestTarget(quest: Quest): QuestTarget | null {
  for (const areaId of AREA_IDS) {
    const placement = NPC_PLACEMENTS[areaId]?.find((npc) => npc.npcId === quest.npcId)
    if (!placement) continue
    return {
      label: areaName(areaId),
      x: placement.x * TILE_SIZE,
      y: placement.y * TILE_SIZE,
      areaId,
      npcId: quest.npcId,
    }
  }
  return null
}

interface PortalSearchNode {
  areaId: string
  firstPortal: Portal | null
}

/** First portal on a shortest path between two areas, or null when disconnected. */
export function nextPortalToward(fromAreaId: string, toAreaId: string): Portal | null {
  if (fromAreaId === toAreaId) return null
  if (!AREA_IDS.includes(fromAreaId) || !AREA_IDS.includes(toAreaId)) return null

  const visited = new Set<string>([fromAreaId])
  const queue: PortalSearchNode[] = [{ areaId: fromAreaId, firstPortal: null }]

  while (queue.length > 0) {
    const node = queue.shift()!
    for (const portal of AREA_PORTALS[node.areaId] ?? []) {
      if (portal.toAreaId === toAreaId) return node.firstPortal ?? portal
      if (!visited.has(portal.toAreaId) && AREA_IDS.includes(portal.toAreaId)) {
        visited.add(portal.toAreaId)
        queue.push({ areaId: portal.toAreaId, firstPortal: node.firstPortal ?? portal })
      }
    }
  }

  return null
}

export function portalCompassPoint(portal: Portal): CompassPoint {
  return {
    label: areaName(portal.toAreaId),
    x: portal.x * TILE_SIZE,
    y: portal.y * TILE_SIZE,
  }
}
