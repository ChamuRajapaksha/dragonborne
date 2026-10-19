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

export interface MapCorridor {
  /** Human-readable name used in violation messages, e.g. 'main path'. */
  label: string
  fromRow: number
  toRow: number
  fromCol: number
  toCol: number
}

export interface MapRules {
  /** areaId → that area's map rows, so each portal's `toSpawn` can be checked on its destination map. */
  areaMaps?: Readonly<Record<string, readonly string[]>>
  /** Rectangles (inclusive bounds) that must stay free of colliding tiles. */
  corridors?: readonly MapCorridor[]
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
    violations.push(...findReachabilityViolations(map, placements))
  }

  if (rules.corridors) {
    violations.push(...findCorridorViolations(map, rules.corridors))
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

/**
 * Rule 5: every corridor rectangle must stay free of colliding tiles so a
 * two-tile-wide player can always pass through.
 */
function findCorridorViolations(
  map: readonly string[],
  corridors: readonly MapCorridor[],
): string[] {
  const violations: string[] = []

  for (const corridor of corridors) {
    for (let y = corridor.fromRow; y <= corridor.toRow; y += 1) {
      for (let x = corridor.fromCol; x <= corridor.toCol; x += 1) {
        const char = map[y]?.[x]
        if (char === undefined) {
          violations.push(`corridor '${corridor.label}' at ${x},${y} is outside the map`)
          continue
        }
        const tile = TILE_BY_CHAR.get(char)
        if (tile?.collides) {
          violations.push(`corridor '${corridor.label}' at ${x},${y} is blocked by '${char}'`)
        }
      }
    }
  }

  return violations
}

/** The legend char for a choppable tree trunk. */
const TRUNK_CHAR = 't'

const ORTHOGONAL: readonly MapPoint[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
]

function spawnReachable(map: readonly string[], spawn: MapPoint): Set<string> {
  const width = map[0]?.length ?? 0
  const height = map.length
  const reachable = new Set<string>()

  const startChar = map[spawn.y]?.[spawn.x]
  const startTile = startChar === undefined ? undefined : TILE_BY_CHAR.get(startChar)
  if (!startTile || startTile.collides) return reachable

  reachable.add(`${spawn.x},${spawn.y}`)
  const queue: MapPoint[] = [spawn]
  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) break
    for (const step of ORTHOGONAL) {
      const x = current.x + step.x
      const y = current.y + step.y
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      const key = `${x},${y}`
      if (reachable.has(key)) continue
      const char = map[y]?.[x] ?? ''
      const tile = TILE_BY_CHAR.get(char)
      if (!tile || tile.collides) continue
      reachable.add(key)
      queue.push({ x, y })
    }
  }

  return reachable
}

/**
 * Rules 3–4: a flood fill from the spawn over walkable tiles must reach every
 * placement, and every trunk must have at least one 4-neighbour that is both
 * walkable and inside that reachable set.
 */
function findReachabilityViolations(
  map: readonly string[],
  placements: MapPlacements,
): string[] {
  const violations: string[] = []
  const reachable = spawnReachable(map, placements.spawn)

  const requireReached = (label: string, point: MapPoint): void => {
    if (!reachable.has(`${point.x},${point.y}`)) {
      violations.push(`${label} at ${point.x},${point.y} is not reachable from the spawn`)
    }
  }

  for (const npc of placements.npcs) {
    requireReached(`npc '${npc.npcId}'`, npc)
  }
  for (const item of placements.items) {
    requireReached(`item '${item.itemId}'`, item)
  }
  for (const portal of placements.portals) {
    requireReached(`portal to '${portal.toAreaId}'`, portal)
  }

  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== TRUNK_CHAR) continue
      const hasOpenNeighbour = ORTHOGONAL.some((step) =>
        reachable.has(`${x + step.x},${y + step.y}`),
      )
      if (!hasOpenNeighbour) {
        violations.push(`trunk at ${x},${y} has no reachable walkable neighbour`)
      }
    }
  })

  return violations
}

const BOX_STEPS: readonly MapPoint[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

function isWalkableTile(rows: readonly string[], x: number, y: number): boolean {
  const char = rows[y]?.[x]
  if (char === undefined) return false
  const tile = TILE_BY_CHAR.get(char)
  return tile !== undefined && !tile.collides
}

/** True when the 2x2 player body standing on this top-left anchor is on open tiles. */
function isValidBox(rows: readonly string[], boxX: number, boxY: number): boolean {
  return (
    isWalkableTile(rows, boxX, boxY) &&
    isWalkableTile(rows, boxX + 1, boxY) &&
    isWalkableTile(rows, boxX, boxY + 1) &&
    isWalkableTile(rows, boxX + 1, boxY + 1)
  )
}

/**
 * Rule 6: the player body is 2x2 tiles, so a one-tile gap is a wall. Returns
 * every walkable tile the body cannot cover when box-stepping from any 2x2
 * box that contains the spawn — an empty array means the whole open map is
 * traversable. Shared by the forest generator and the area tests.
 */
export function unreachedTiles(rows: readonly string[], spawn: MapPoint): MapPoint[] {
  const width = rows[0]?.length ?? 0
  const height = rows.length
  if (width === 0 || height === 0) return []

  const anchors: readonly MapPoint[] = [
    { x: spawn.x, y: spawn.y },
    { x: spawn.x - 1, y: spawn.y },
    { x: spawn.x, y: spawn.y - 1 },
    { x: spawn.x - 1, y: spawn.y - 1 },
  ]

  const visitedBoxes = new Set<string>()
  const covered = new Set<string>()
  const queue: MapPoint[] = []

  const enterBox = (boxX: number, boxY: number): void => {
    const key = `${boxX},${boxY}`
    if (visitedBoxes.has(key)) return
    visitedBoxes.add(key)
    queue.push({ x: boxX, y: boxY })
    for (let dx = 0; dx < 2; dx += 1) {
      for (let dy = 0; dy < 2; dy += 1) {
        covered.add(`${boxX + dx},${boxY + dy}`)
      }
    }
  }

  for (const anchor of anchors) {
    if (isValidBox(rows, anchor.x, anchor.y)) enterBox(anchor.x, anchor.y)
  }

  while (queue.length > 0) {
    const box = queue.pop()
    if (!box) break
    for (const step of BOX_STEPS) {
      const boxX = box.x + step.x
      const boxY = box.y + step.y
      if (boxX < 0 || boxY < 0 || boxX + 1 >= width || boxY + 1 >= height) continue
      if (visitedBoxes.has(`${boxX},${boxY}`)) continue
      if (!isValidBox(rows, boxX, boxY)) continue
      enterBox(boxX, boxY)
    }
  }

  const unreached: MapPoint[] = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isWalkableTile(rows, x, y)) continue
      if (!covered.has(`${x},${y}`)) unreached.push({ x, y })
    }
  }
  return unreached
}
