/**
 * Pure, engine-free forest generation: a hand-shaped skeleton (border,
 * corridors, stone ring, logging pad) overlaid with seeded grove clusters.
 * No Phaser, no localStorage — plain node can load this module, which keeps
 * the generator unit-testable.
 */
import type { TilePoint } from './maps'
import { FOREST_ITEMS, FOREST_NPCS, FOREST_PORTALS, FOREST_SPAWN } from './maps'
import type { Rng } from './rng'
import { mulberry32, randomInt, randomPick } from './rng'

export const FOREST_WIDTH = 64
export const FOREST_HEIGHT = 48

/**
 * The base layout before any groves: tree world-border, the main corridor on
 * rows 23–25, the stone ring around the spawn clearing, the logging dirt pad,
 * and open grass everywhere else. Generated maps are this skeleton plus
 * seeded groves.
 */
export const FOREST_SKELETON: readonly string[] = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T........#####.................................................T',
  'T......###...###...............................................T',
  'T.....##.......##..............................................T',
  'T....##.........##.............................................T',
  'T....#...........#.............................................T',
  'T...##...........##............................................T',
  'T--------------------------------------------------------------T',
  'T--------------------------------------------------------------T',
  'T--------------------------------------------------------------T',
  'T...##...........##............................................T',
  'T....#...........#.............................................T',
  'T....##.........##.............................................T',
  'T.....##.......##..............................................T',
  'T......###...###...............................................T',
  'T........#####.................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T..............................................................T',
  'T.......................-----------------......................T',
  'T.......................-----------------......................T',
  'T.......................-----------------......................T',
  'T.......................-----------------......................T',
  'T.......................-----------------......................T',
  'T.......................-----------------......................T',
  'T..............................................................T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
]

/** Rows of the main path; groves and trunks never touch them. */
export const FOREST_CORRIDOR_ROWS: readonly number[] = [23, 24, 25]

/** Clear margin kept around every fixed placement, in tiles. */
const RESERVED_MARGIN = 1

/** Fixed points the generator must leave open: spawn, npc, portal, items. */
const RESERVED_POINTS: readonly TilePoint[] = [
  FOREST_SPAWN,
  ...FOREST_NPCS,
  ...FOREST_PORTALS,
  ...FOREST_ITEMS,
]

/** True when a grove may not grow on this tile (corridor or near a placement). */
export function isReservedForestTile(x: number, y: number): boolean {
  if (FOREST_CORRIDOR_ROWS.includes(y)) return true
  return RESERVED_POINTS.some(
    (point) =>
      Math.abs(point.x - x) <= RESERVED_MARGIN &&
      Math.abs(point.y - y) <= RESERVED_MARGIN,
  )
}

const CANOPY_CHAR = 'T'

/** Number of grove seed points attempted per forest. */
const GROVE_COUNT = 30

/** Cluster size bounds, in tiles. */
const GROVE_MIN_TILES = 6
const GROVE_MAX_TILES = 22

/** Random points probed before a grove seed is given up on. */
const SEED_POINT_ATTEMPTS = 12

/** Growth tries per target tile before a cluster stalls. */
const PLACEMENT_ATTEMPTS_PER_TILE = 8

const GROWTH_DIRECTIONS: readonly TilePoint[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
]

function isGrassChar(char: string): boolean {
  return char === '.' || char === ','
}

function canGrowInto(rows: string[][], x: number, y: number): boolean {
  if (x < 1 || y < 1 || x >= FOREST_WIDTH - 1 || y >= FOREST_HEIGHT - 1) return false
  const char = rows[y]?.[x]
  if (char === undefined || !isGrassChar(char)) return false
  return !isReservedForestTile(x, y)
}

function pickGroveSeed(rows: string[][], rng: Rng): TilePoint | null {
  for (let attempt = 0; attempt < SEED_POINT_ATTEMPTS; attempt += 1) {
    const x = randomInt(rng, 1, FOREST_WIDTH - 1)
    const y = randomInt(rng, 1, FOREST_HEIGHT - 1)
    if (canGrowInto(rows, x, y)) return { x, y }
  }
  return null
}

function placeGroveTile(
  rows: string[][],
  tile: TilePoint,
  cluster: TilePoint[],
  scattered: TilePoint[],
): void {
  rows[tile.y][tile.x] = CANOPY_CHAR
  cluster.push(tile)
  scattered.push(tile)
}

function growCluster(
  rows: string[][],
  rng: Rng,
  seed: TilePoint,
  scattered: TilePoint[],
): void {
  const target = randomInt(rng, GROVE_MIN_TILES, GROVE_MAX_TILES + 1)
  const cluster: TilePoint[] = []
  placeGroveTile(rows, seed, cluster, scattered)

  let attempts = 0
  const maxAttempts = target * PLACEMENT_ATTEMPTS_PER_TILE
  while (cluster.length < target && attempts < maxAttempts) {
    attempts += 1
    const base = randomPick(rng, cluster)
    const direction = randomPick(rng, GROWTH_DIRECTIONS)
    const x = base.x + direction.x
    const y = base.y + direction.y
    if (!canGrowInto(rows, x, y)) continue
    placeGroveTile(rows, { x, y }, cluster, scattered)
  }
}

/** Scatter random grove clusters across the skeleton's open grass. */
function growGroveClusters(rows: string[][], rng: Rng): TilePoint[] {
  const scattered: TilePoint[] = []
  for (let grove = 0; grove < GROVE_COUNT; grove += 1) {
    const seed = pickGroveSeed(rows, rng)
    if (!seed) continue
    growCluster(rows, rng, seed, scattered)
  }
  return scattered
}

/**
 * Build the forest layout for a seed: skeleton + scattered groves. The same
 * seed always produces the same rows, so `chop:forest:x,y` flags and saved
 * positions stay valid for the life of a save.
 */
export function generateForestMap(seed: number): readonly string[] {
  const rng = mulberry32(seed)
  const rows = FOREST_SKELETON.map((row) => row.split(''))
  growGroveClusters(rows, rng)
  return rows.map((row) => row.join(''))
}
