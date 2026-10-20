/**
 * Pure, engine-free forest generation: a hand-shaped skeleton (border,
 * corridors, stone ring, logging pad) overlaid with seeded grove clusters.
 * No Phaser, no localStorage — plain node can load this module, which keeps
 * the generator unit-testable.
 */
import type { TilePoint } from './maps'
import { FOREST_ITEMS, FOREST_NPCS, FOREST_PORTALS, FOREST_SPAWN } from './maps'
import { unreachedGridTiles, unreachedTiles, walkableGrid } from './mapRules'
import type { Rng } from './rng'
import { mulberry32, randomInt, randomPick, shuffle } from './rng'
import { TILE_BY_CHAR } from './tileset'

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
const GRASS_CHAR = '.'
const TALL_GRASS_CHAR = ','

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
  return char === GRASS_CHAR || char === TALL_GRASS_CHAR
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
  grid: Uint8Array,
  tile: TilePoint,
  cluster: TilePoint[],
  scattered: TilePoint[],
): boolean {
  const index = tile.y * FOREST_WIDTH + tile.x
  const previous = rows[tile.y][tile.x]
  rows[tile.y][tile.x] = CANOPY_CHAR
  grid[index] = 0
  // A grove tile that would strand any open tile behind a 1-tile gap is
  // rejected outright — pockets of unreachable grass would otherwise need
  // sealing into solid canopy, which is exactly what groves replace.
  if (unreachedGridTiles(grid, FOREST_WIDTH, FOREST_HEIGHT, FOREST_SPAWN).length === 0) {
    cluster.push(tile)
    scattered.push(tile)
    return true
  }
  rows[tile.y][tile.x] = previous
  grid[index] = 1
  return false
}

function growCluster(
  rows: string[][],
  grid: Uint8Array,
  rng: Rng,
  seed: TilePoint,
  scattered: TilePoint[],
): void {
  const target = randomInt(rng, GROVE_MIN_TILES, GROVE_MAX_TILES + 1)
  const cluster: TilePoint[] = []
  if (!placeGroveTile(rows, grid, seed, cluster, scattered)) return

  let attempts = 0
  const maxAttempts = target * PLACEMENT_ATTEMPTS_PER_TILE
  while (cluster.length < target && attempts < maxAttempts) {
    attempts += 1
    const base = randomPick(rng, cluster)
    const direction = randomPick(rng, GROWTH_DIRECTIONS)
    const x = base.x + direction.x
    const y = base.y + direction.y
    if (!canGrowInto(rows, x, y)) continue
    placeGroveTile(rows, grid, { x, y }, cluster, scattered)
  }
}

/** Scatter random grove clusters across the skeleton's open grass. */
function growGroveClusters(rows: string[][], rng: Rng): TilePoint[] {
  const grid = walkableGrid(rows.map((row) => row.join('')))
  const scattered: TilePoint[] = []
  for (let grove = 0; grove < GROVE_COUNT; grove += 1) {
    const seed = pickGroveSeed(rows, rng)
    if (!seed) continue
    growCluster(rows, grid, rng, seed, scattered)
  }
  return scattered
}

const TRUNK_CHAR = 't'

/** Choppable trunk targets per generated forest. */
const TRUNK_MIN = 35
const TRUNK_MAX = 45

function hasWalkableNeighbour(rows: string[][], tile: TilePoint): boolean {
  return GROWTH_DIRECTIONS.some((direction) => {
    const char = rows[tile.y + direction.y]?.[tile.x + direction.x]
    if (char === undefined) return false
    const neighbour = TILE_BY_CHAR.get(char)
    return neighbour !== undefined && !neighbour.collides
  })
}

/**
 * Turn grove-edge tiles with an open neighbour into choppable trunks. Only
 * grove tiles qualify, so the world border stays solid canopy.
 */
function placeTrunks(rows: string[][], rng: Rng, scattered: TilePoint[]): void {
  const edgeTiles = scattered.filter((tile) => hasWalkableNeighbour(rows, tile))
  const candidates = shuffle(rng, edgeTiles)
  const target = Math.min(randomInt(rng, TRUNK_MIN, TRUNK_MAX + 1), candidates.length)
  for (let index = 0; index < target; index += 1) {
    const tile = candidates[index]
    rows[tile.y][tile.x] = TRUNK_CHAR
  }
}

/**
 * Convert any walkable tile the 2x2 body still cannot reach (a leftover
 * pocket or 1-tile crack) into solid canopy, so every open tile on the final
 * map is traversable.
 */
function sealUnreachable(rows: string[][]): void {
  const snapshot = rows.map((row) => row.join(''))
  for (const tile of unreachedTiles(snapshot, FOREST_SPAWN)) {
    rows[tile.y][tile.x] = CANOPY_CHAR
  }
}

/** Odds an eligible grove-edge tile turns into tall grass; a light fringe. */
const FRINGE_CHANCE = 0.5

/**
 * Sprinkle tall grass over the open tiles hugging grove edges. Only tiles that
 * touch a canopy or a trunk qualify, and reserved clearings stay plain, so the
 * fringe reads as a soft border — never salt-and-pepper singles in the open
 * field. Runs last: it only swaps walkable `.` for walkable `,`, so the
 * connectivity pass above still holds and existing seeds keep their groves,
 * trunks and chop flags byte-for-byte.
 */
function fringeGroveEdges(rows: string[][], rng: Rng): void {
  for (let y = 1; y < FOREST_HEIGHT - 1; y += 1) {
    for (let x = 1; x < FOREST_WIDTH - 1; x += 1) {
      if (rows[y][x] !== GRASS_CHAR) continue
      if (isReservedForestTile(x, y)) continue
      const atGroveEdge = GROWTH_DIRECTIONS.some((direction) => {
        const neighbour = rows[y + direction.y]?.[x + direction.x]
        return neighbour === CANOPY_CHAR || neighbour === TRUNK_CHAR
      })
      if (atGroveEdge && rng() < FRINGE_CHANCE) rows[y][x] = TALL_GRASS_CHAR
    }
  }
}

/**
 * Build the forest layout for a seed: skeleton + scattered groves + choppable
 * trunks along their edges, with unreachable pockets sealed and a tall-grass
 * fringe on the grove edges. The same seed always produces the same rows, so
 * `chop:forest:x,y` flags and saved positions stay valid for a save's life.
 */
export function generateForestMap(seed: number): readonly string[] {
  const rng = mulberry32(seed)
  const rows = FOREST_SKELETON.map((row) => row.split(''))
  const scattered = growGroveClusters(rows, rng)
  placeTrunks(rows, rng, scattered)
  sealUnreachable(rows)
  fringeGroveEdges(rows, rng)
  return rows.map((row) => row.join(''))
}
