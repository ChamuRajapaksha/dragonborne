import { TILE_SIZE } from '../world/tileset'
import type { CompassPoint } from './types'

const COMPASS_POINTS = [
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
] as const
const COMPASS_SEGMENTS = COMPASS_POINTS.length

/** Eight-way label for a vector; non-finite or zero vectors read as east. */
export function compassDirection(dx: number, dy: number): string {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return 'east'
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / (COMPASS_SEGMENTS / 2)))
  const index = ((octant % COMPASS_SEGMENTS) + COMPASS_SEGMENTS) % COMPASS_SEGMENTS
  return COMPASS_POINTS[index] ?? 'east'
}

export function distanceInTiles(
  from: { x: number; y: number },
  to: { x: number; y: number },
  tileSize: number = TILE_SIZE,
): number {
  if (
    !Number.isFinite(from.x) ||
    !Number.isFinite(from.y) ||
    !Number.isFinite(to.x) ||
    !Number.isFinite(to.y) ||
    !Number.isFinite(tileSize) ||
    tileSize <= 0
  ) {
    return 0
  }
  return Math.max(0, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / tileSize))
}

/** Shared HUD line, e.g. `Emberhold: east, 42 tiles` or `Sella is right here`. */
export function formatCompassReading(
  point: CompassPoint,
  from: { x: number; y: number },
): string {
  const tiles = distanceInTiles(from, point)
  return tiles <= 1
    ? `${point.label} is right here`
    : `${point.label}: ${compassDirection(point.x - from.x, point.y - from.y)}, ${tiles} tiles`
}
