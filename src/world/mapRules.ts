import type { AreaItemPlacement, AreaNpcPlacement, Portal } from './maps'
import { TILE_BY_CHAR } from './tileset'

export interface MapPoint {
  x: number
  y: number
}

export interface MapPlacements {
  spawn: MapPoint
  npcs: readonly AreaNpcPlacement[]
  portals: readonly Portal[]
  items: readonly AreaItemPlacement[]
}

export interface MapRules {
  /** areaId → that area's map rows, so each portal's `toSpawn` can be checked on its destination map. */
  areaMaps?: Readonly<Record<string, readonly string[]>>
}

/**
 * Pure, engine-free rules every area map must satisfy. Returns human-readable
 * violations; an empty array means the map passes. Phaser stays out of this
 * module so the rules run under plain node via vitest.
 */
export function findMapViolations(
  map: readonly string[],
  placements?: MapPlacements,
  rules: MapRules = {},
): string[] {
  const violations: string[] = []

  if (map.length === 0) {
    violations.push('map has no rows')
    return violations
  }

  const width = map[0]?.length ?? 0
  if (width === 0) {
    violations.push('map has an empty first row')
    return violations
  }

  map.forEach((row, y) => {
    if (row.length !== width) {
      violations.push(`row ${y} is ${row.length} chars, expected ${width}`)
    }
    for (let x = 0; x < row.length; x += 1) {
      const char = row[x] ?? ''
      if (!TILE_BY_CHAR.has(char)) {
        violations.push(`unknown tile char '${char}' at ${x},${y}`)
      }
    }
  })

  if (placements) {
    violations.push(...findPlacementViolations(map, placements, rules))
  }

  return violations
}

function findPlacementViolations(
  map: readonly string[],
  placements: MapPlacements,
  rules: MapRules,
): string[] {
  const violations: string[] = []

  const requireWalkable = (
    label: string,
    rows: readonly string[],
    point: MapPoint,
  ): void => {
    const char = rows[point.y]?.[point.x]
    if (char === undefined) {
      violations.push(`${label} at ${point.x},${point.y} is outside the map`)
      return
    }
    const tile = TILE_BY_CHAR.get(char)
    if (!tile) {
      violations.push(`${label} at ${point.x},${point.y} sits on unknown char '${char}'`)
    } else if (tile.collides) {
      violations.push(`${label} at ${point.x},${point.y} sits on colliding '${char}'`)
    }
  }

  requireWalkable('spawn', map, placements.spawn)
  for (const npc of placements.npcs) {
    requireWalkable(`npc '${npc.npcId}'`, map, npc)
  }
  for (const item of placements.items) {
    requireWalkable(`item '${item.itemId}'`, map, item)
  }
  for (const portal of placements.portals) {
    requireWalkable(`portal to '${portal.toAreaId}'`, map, portal)
    const destination = rules.areaMaps?.[portal.toAreaId]
    if (destination) {
      requireWalkable(`portal to '${portal.toAreaId}' (toSpawn)`, destination, portal.toSpawn)
    }
  }

  return violations
}
