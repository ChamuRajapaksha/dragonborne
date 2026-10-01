import type { TileLegendEntry } from './tileset'
import { TILE_BY_CHAR, TILE_SIZE } from './tileset'

export interface TilePoint {
  x: number
  y: number
}

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

export interface Portal {
  x: number
  y: number
  toAreaId: string
  toSpawn: { x: number; y: number }
  label: string
}

export interface AreaNpcPlacement {
  npcId: string
  x: number
  y: number
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
  intro?: AreaIntro
}