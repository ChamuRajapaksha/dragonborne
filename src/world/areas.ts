import Phaser from 'phaser'
import type {
  AreaItemPlacement,
  AreaNpcPlacement,
  Portal,
  TilePoint,
} from './maps'
import {
  CAVE_ITEMS,
  CAVE_MAP,
  CAVE_NPCS,
  CAVE_SPAWN,
  FOREST_ITEMS,
  FOREST_NPCS,
  FOREST_PORTALS,
  FOREST_SPAWN,
  VILLAGE_ITEMS,
  VILLAGE_MAP,
  VILLAGE_NPCS,
  VILLAGE_PORTALS,
  VILLAGE_SPAWN,
} from './maps'
import { FOREST_SKELETON, generateForestMap } from './forestGen'
import { getForestSeed } from './progress'
import type { TileLegendEntry } from './tileset'
import { TILE_BY_CHAR, TILE_SIZE } from './tileset'

export type { AreaItemPlacement, AreaNpcPlacement, Portal, TilePoint } from './maps'

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
  intro?: AreaIntro
  /** Area the HUD waypoint hint points at; must be the destination of one of `portals`. */
  waypointAreaId?: string
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
  map: CAVE_MAP,
  defaultSpawn: CAVE_SPAWN,
  npcs: CAVE_NPCS,
  portals: [],
  items: CAVE_ITEMS,
  waypointAreaId: 'forest',
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

/**
 * The rows terrain is built from: the seeded forest layout for the forest
 * (cached per seed for the session), the hand-authored map everywhere else.
 * `AreaDefinition.map` holds the forest skeleton — same 64x48 shape — so map
 * sizing never depends on the save's seed. Chop flags stay coordinate-keyed,
 * and a stable seed keeps them valid across reloads.
 */
export function resolveAreaRows(area: AreaDefinition): readonly string[] {
  if (area.id !== 'forest') return area.map

  const seed = getForestSeed()
  let rows = FOREST_ROWS_BY_SEED.get(seed)
  if (!rows) {
    rows = generateForestMap(seed)
    FOREST_ROWS_BY_SEED.set(seed, rows)
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