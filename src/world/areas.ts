import Phaser from 'phaser'
import type {
  AreaChestPlacement,
  AreaItemPlacement,
  AreaNpcPlacement,
  Portal,
  TilePoint,
} from './maps'
import {
  CAVE_ITEMS,
  CAVE_NPCS,
  CAVE_PORTALS,
  CAVE_SPAWN,
  FOREST_ITEMS,
  FOREST_NPCS,
  FOREST_PORTALS,
  FOREST_SPAWN,
  VILLAGE_CHESTS,
  VILLAGE_ITEMS,
  VILLAGE_MAP,
  VILLAGE_NPCS,
  VILLAGE_PORTALS,
  VILLAGE_SPAWN,
} from './maps'
import { CAVE_SKELETON, generateCaveMap } from './caveGen'
import { FOREST_SKELETON, generateForestMap } from './forestGen'
import { getCaveSeed, getForestSeed } from './progress'
import type { TileLegendEntry } from './tileset'
import { TILE_BY_CHAR, TILE_SIZE } from './tileset'

export type { AreaChestPlacement, AreaItemPlacement, AreaNpcPlacement, Portal, TilePoint } from './maps'

export function parseAreaMap(
  rows: readonly string[],
  legend: ReadonlyMap<string, TileLegendEntry> = TILE_BY_CHAR,
): number[][] {
  if (rows.length === 0) throw new Error('Area map has no rows')

  const width = rows[0]?.length ?? 0
  if (width === 0) throw new Error('Area map has an empty first row')

  const data: number[][] = []

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Area map row ${y} is ${row.length} chars, expected ${width}`)
    }

    const tiles: number[] = []
    for (let x = 0; x < row.length; x += 1) {
      const char = row[x] ?? ''
      const tile = legend.get(char)
      if (!tile) {
        throw new Error(
          `Area map has unknown tile char '${char}' at ${x},${y} (no entry in the legend)`,
        )
      }
      tiles.push(tile.index)
    }
    data.push(tiles)
  })

  return data
}

export function tileToWorld(point: TilePoint, size = TILE_SIZE): TilePoint {
  return { x: point.x * size, y: point.y * size }
}

export function worldToTile(x: number, y: number, size = TILE_SIZE): TilePoint {
  return { x: Math.floor(x / size), y: Math.floor(y / size) }
}

export interface AreaIntro {
  title: string
  body: readonly string[]
}

export interface AreaRoomDoor {
  x: number
  y: number
  outside: { x: number; y: number }
}

export interface AreaRoom {
  id: string
  name: string
  bounds: { x: number; y: number; width: number; height: number }
  spawn: { x: number; y: number }
  doors: readonly AreaRoomDoor[]
}

export interface AreaDefinition {
  id: string
  name: string
  backgroundColor: number
  map: readonly string[]
  defaultSpawn: { x: number; y: number }
  npcs: readonly AreaNpcPlacement[]
  portals: readonly Portal[]
  /** Items lying on the ground; respawn on re-entry unless `onceFlag` is set. */
  items?: readonly AreaItemPlacement[]
  /** Chests placed in the area. */
  chests?: readonly AreaChestPlacement[]
  intro?: AreaIntro
  /** Area the HUD waypoint hint points at; must be the destination of one of `portals`. */
  waypointAreaId?: string
  rooms?: readonly AreaRoom[]
}

export const VILLAGE: AreaDefinition = {
  id: 'village',
  name: 'Emberhold',
  backgroundColor: 0x2c3e2c,
  map: VILLAGE_MAP,
  defaultSpawn: VILLAGE_SPAWN,
  npcs: VILLAGE_NPCS,
  portals: VILLAGE_PORTALS,
  items: VILLAGE_ITEMS,
  chests: VILLAGE_CHESTS,
  rooms: [
    {
      id: 'forge',
      name: 'The Forge',
      bounds: { x: 4, y: 9, width: 11, height: 8 },
      spawn: { x: 9, y: 13 },
      doors: [{ x: 9, y: 16, outside: { x: 9, y: 18 } }],
    },
    {
      id: 'store',
      name: 'The Store',
      bounds: { x: 51, y: 18, width: 11, height: 8 },
      spawn: { x: 56, y: 22 },
      doors: [{ x: 56, y: 25, outside: { x: 56, y: 27 } }],
    },
    {
      id: 'inn',
      name: 'The Inn',
      bounds: { x: 22, y: 38, width: 11, height: 8 },
      spawn: { x: 27, y: 42 },
      doors: [{ x: 27, y: 45, outside: { x: 27, y: 47 } }],
    },
    {
      id: 'archive',
      name: 'The Archive',
      bounds: { x: 43, y: 0, width: 11, height: 8 },
      spawn: { x: 48, y: 4 },
      doors: [{ x: 48, y: 7, outside: { x: 48, y: 9 } }],
    },
    {
      id: 'longhouse',
      name: 'The Longhouse',
      bounds: { x: 4, y: 27, width: 11, height: 8 },
      spawn: { x: 9, y: 31 },
      doors: [{ x: 9, y: 34, outside: { x: 9, y: 36 } }],
    },
  ],
}

export const FOREST: AreaDefinition = {
  id: 'forest',
  name: 'The Thornwood',
  backgroundColor: 0x1d2b1d,
  map: FOREST_SKELETON,
  defaultSpawn: FOREST_SPAWN,
  npcs: FOREST_NPCS,
  waypointAreaId: 'village',
  portals: FOREST_PORTALS,
  items: FOREST_ITEMS,
  intro: {
    title: 'The Thornwood',
    body: [
      'You wake on a cold stone ring at the edge of the woods, the fire long burned down to ash.',
      'Somewhere east, past the trees and the long dirt track, smoke rises from a village.',
      'A stranger waits by the ring, watching to see what kind of traveller you are.',
    ],
  },
}

export const CAVE: AreaDefinition = {
  id: 'cave',
  name: 'The Crystal Cave',
  backgroundColor: 0x12161c,
  map: CAVE_SKELETON,
  defaultSpawn: CAVE_SPAWN,
  npcs: CAVE_NPCS,
  portals: CAVE_PORTALS,
  items: CAVE_ITEMS,
  waypointAreaId: 'forest',
  intro: {
    title: 'The Crystal Cave',
    body: [
      'The Thornwood track ends at a split in the rock, cold air breathing out of the dark.',
      'Iron and steel glitter in the walls, but only a pickaxe will shift them.',
      'Deeper in, the tunnel winds on into the dark — the forest waypoint still points home.',
    ],
  },
}

export const AREAS: Readonly<Record<string, AreaDefinition>> = {
  forest: FOREST,
  village: VILLAGE,
  cave: CAVE,
}

export function getAreaById(areaId: string): AreaDefinition {
  const area = AREAS[areaId]
  if (!area) throw new Error(`Unknown area '${areaId}'`)
  return area
}

/** Generated forest rows per seed, so re-entering the area never re-rolls it. */
const FOREST_ROWS_BY_SEED = new Map<number, readonly string[]>()
const CAVE_ROWS_BY_SEED = new Map<number, readonly string[]>()

/**
 * The rows terrain is built from: the seeded forest and cave layouts for
 * those two areas (cached per seed for the session), the hand-authored map
 * everywhere else. `AreaDefinition.map` holds the skeleton each generator
 * starts from — same shape as its output — so map sizing never depends on the
 * save's seed. Chop and mine flags stay coordinate-keyed, and a stable seed
 * per save keeps them valid across reloads.
 */
export function resolveAreaRows(area: AreaDefinition): readonly string[] {
  if (area.id === 'forest') {
    return memoizedRows(FOREST_ROWS_BY_SEED, getForestSeed(), generateForestMap)
  }
  if (area.id === 'cave') {
    return memoizedRows(CAVE_ROWS_BY_SEED, getCaveSeed(), generateCaveMap)
  }
  return area.map
}

function memoizedRows(
  cache: Map<number, readonly string[]>,
  seed: number,
  generate: (seed: number) => readonly string[],
): readonly string[] {
  let rows = cache.get(seed)
  if (!rows) {
    rows = generate(seed)
    cache.set(seed, rows)
  }
  return rows
}

export function getAreaSize(area: AreaDefinition): Phaser.Geom.Rectangle {
  const width = (area.map[0]?.length ?? 0) * TILE_SIZE
  const height = area.map.length * TILE_SIZE
  return new Phaser.Geom.Rectangle(0, 0, width, height)
}

export function getAreaSpawn(area: AreaDefinition): { x: number; y: number } {
  return tileToWorld(area.defaultSpawn)
}