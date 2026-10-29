import type { AreaRoom } from './rooms'
import { TILE_BY_CHAR } from './tileset'

const FLOOR_CHAR = 'f'
const DOOR_CHAR = 'd'

const ORTHOGONAL: readonly { x: number; y: number }[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
]

const tileKey = (x: number, y: number): string => `${x},${y}`

/** Doors are solid tiles the player opens with E, but walkable for map rules. */
function isWalkable(char: string | undefined): boolean {
  if (char === DOOR_CHAR) return true
  const tile = TILE_BY_CHAR.get(char ?? '')
  return tile !== undefined && !tile.collides
}

function insideBounds(
  bounds: AreaRoom['bounds'],
  x: number,
  y: number,
): boolean {
  return (
    x >= bounds.x &&
    y >= bounds.y &&
    x < bounds.x + bounds.width &&
    y < bounds.y + bounds.height
  )
}

function boundsOverlap(a: AreaRoom['bounds'], b: AreaRoom['bounds']): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  )
}

/**
 * Pure room rules shared by the village data and its tests. A room is valid
 * when its bounds cover only `f` floor, its spawn sits inside those bounds, and
 * every door is a `d` tile with a walkable outside neighbour. Map-wide, every
 * `f` and `d` tile must be claimed by a room, so orphan floors or doors cannot
 * slip back in. Returns human-readable violations; empty means the rooms pass.
 */
export function findRoomViolations(
  map: readonly string[],
  rooms: readonly AreaRoom[],
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

  const seenIds = new Set<string>()
  const coveredFloor = new Set<string>()
  const coveredDoors = new Set<string>()

  rooms.forEach((room) => {
    const label = `room '${room.id}'`
    const bounds = room.bounds

    if (seenIds.has(room.id)) violations.push(`${label} has a duplicate id`)
    seenIds.add(room.id)

    if (bounds.width <= 0 || bounds.height <= 0) {
      violations.push(`${label} has empty bounds`)
      return
    }

    if (
      bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.width > width ||
      bounds.y + bounds.height > map.length
    ) {
      violations.push(
        `${label} bounds ${bounds.x},${bounds.y},${bounds.width},${bounds.height} leave the map`,
      )
    }

    for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
        const char = map[y]?.[x]
        if (char === undefined) continue
        if (char !== FLOOR_CHAR) {
          violations.push(`${label} tile ${x},${y} is '${char}', expected floor 'f'`)
        } else {
          coveredFloor.add(tileKey(x, y))
        }
      }
    }

    if (!insideBounds(bounds, room.spawn.x, room.spawn.y)) {
      violations.push(`${label} spawn ${room.spawn.x},${room.spawn.y} is outside its bounds`)
    } else if (map[room.spawn.y]?.[room.spawn.x] !== FLOOR_CHAR) {
      violations.push(`${label} spawn ${room.spawn.x},${room.spawn.y} is not floor`)
    }

    for (const door of room.doors) {
      if (map[door.y]?.[door.x] === DOOR_CHAR) {
        coveredDoors.add(tileKey(door.x, door.y))
      } else {
        violations.push(`${label} door ${door.x},${door.y} is not a 'd' tile`)
      }

      const adjacent = ORTHOGONAL.some(
        (step) =>
          door.x + step.x === door.outside.x && door.y + step.y === door.outside.y,
      )
      if (!adjacent) {
        violations.push(
          `${label} outside tile ${door.outside.x},${door.outside.y} is not adjacent to door ${door.x},${door.y}`,
        )
      }
      if (!isWalkable(map[door.outside.y]?.[door.outside.x])) {
        violations.push(
          `${label} outside tile ${door.outside.x},${door.outside.y} is not walkable`,
        )
      }
    }
  })

  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      const first = rooms[i]
      const second = rooms[j]
      if (!first || !second) continue
      if (boundsOverlap(first.bounds, second.bounds)) {
        violations.push(`rooms '${first.id}' and '${second.id}' overlap`)
      }
    }
  }

  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const char = row[x] ?? ''
      const key = tileKey(x, y)
      if (char === FLOOR_CHAR && !coveredFloor.has(key)) {
        violations.push(`floor tile ${x},${y} is not inside any room`)
      }
      if (char === DOOR_CHAR && !coveredDoors.has(key)) {
        violations.push(`door tile ${x},${y} does not belong to any room`)
      }
    }
  })

  return violations
}
