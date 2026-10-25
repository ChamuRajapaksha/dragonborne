/**
 * Pure, engine-free crystal cave generation. The cave grows outwards from a
 * fixed west entry hall — the one part of the layout that never moves, since
 * the spawn, the cave portal and the forest arrival all sit inside it — into
 * seeded random-walk tunnels, elliptical chambers and loop tunnels, then gets
 * dressed with ore veins along the wall faces and water and crystal decor on
 * the open floor. No Phaser, no localStorage — plain node can load this
 * module, which keeps the generator unit-testable.
 */
import type { TilePoint } from './maps'
import {
  CAVE_ITEMS,
  CAVE_NPCS,
  CAVE_PORTALS,
  CAVE_SPAWN,
  FOREST_PORTALS,
} from './maps'
import { findMapViolations, unreachedTiles } from './mapRules'
import type { Rng } from './rng'
import { mulberry32, randomInt, randomPick, shuffle } from './rng'
import { TILE_BY_CHAR } from './tileset'

export const CAVE_WIDTH = 64
export const CAVE_HEIGHT = 40

const WALL_CHAR = '#'
const FLOOR_CHAR = '-'
const IRON_CHAR = 'o'
const STEEL_CHAR = 'v'
const WATER_CHAR = '~'
const CRYSTAL_CHAR = 'c'

/** West entry hall, in tiles: spawn, portal and forest arrival sit inside it. */
const HALL_LEFT = 3
const HALL_TOP = 14
const HALL_RIGHT = 9
const HALL_BOTTOM = 19

/**
 * Points that must stay open floor for the cave to be enterable: its own
 * spawn and portal, plus where the forest portal drops the player (the
 * arrival point is data on `FOREST_PORTALS`, so decor keeps clear of it
 * automatically).
 */
const ENTRY_POINTS: readonly TilePoint[] = [
  CAVE_SPAWN,
  ...CAVE_PORTALS.map(({ x, y }) => ({ x, y })),
  ...FOREST_PORTALS.filter((portal) => portal.toAreaId === 'cave').map(
    (portal) => portal.toSpawn,
  ),
]

const ORTHOGONAL: readonly TilePoint[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
]

const tileKey = (tile: TilePoint): string => `${tile.x},${tile.y}`

/**
 * Solid rock with the entry hall already cut into it — the shape every
 * generated cave starts from, and what `AreaDefinition.map` holds so map
 * sizing never depends on the save's cave seed.
 */
function buildSkeleton(): string[] {
  const rows = Array.from({ length: CAVE_HEIGHT }, () =>
    Array<string>(CAVE_WIDTH).fill(WALL_CHAR),
  )
  for (let y = HALL_TOP; y <= HALL_BOTTOM; y += 1) {
    for (let x = HALL_LEFT; x <= HALL_RIGHT; x += 1) rows[y][x] = FLOOR_CHAR
  }
  return rows.map((row) => row.join(''))
}

export const CAVE_SKELETON: readonly string[] = buildSkeleton()

/** True when a tile sits inside the solid shell the generator never opens up. */
function isInsideShell(x: number, y: number): boolean {
  return x >= 1 && y >= 1 && x <= CAVE_WIDTH - 2 && y <= CAVE_HEIGHT - 2
}

/** True when a size-by-size block whose top-left is `x,y` fits inside the shell. */
function canCarve(x: number, y: number, size: number): boolean {
  return (
    x >= 1 &&
    y >= 1 &&
    x + size - 1 <= CAVE_WIDTH - 2 &&
    y + size - 1 <= CAVE_HEIGHT - 2
  )
}

function carveSquare(rows: string[][], x: number, y: number, size: number): void {
  for (let dy = 0; dy < size; dy += 1) {
    for (let dx = 0; dx < size; dx += 1) {
      const tileX = x + dx
      const tileY = y + dy
      if (isInsideShell(tileX, tileY)) rows[tileY][tileX] = FLOOR_CHAR
    }
  }
}

/** Every top-left corner whose 2x2 box is fully floor — a valid body position. */
function boxOrigins(rows: readonly (readonly string[])[]): TilePoint[] {
  const origins: TilePoint[] = []
  for (let y = 1; y < CAVE_HEIGHT - 2; y += 1) {
    for (let x = 1; x < CAVE_WIDTH - 2; x += 1) {
      if (
        rows[y]?.[x] === FLOOR_CHAR &&
        rows[y]?.[x + 1] === FLOOR_CHAR &&
        rows[y + 1]?.[x] === FLOOR_CHAR &&
        rows[y + 1]?.[x + 1] === FLOOR_CHAR
      ) {
        origins.push({ x, y })
      }
    }
  }
  return origins
}

const TUNNEL_COUNT = 6
const TUNNEL_STEPS_MIN = 90
const TUNNEL_STEPS_MAX = 170
const BLOCK_MIN = 2
const BLOCK_MAX = 3
const PASSAGE_BIAS = 0.7
const RESIZE_CHANCE = 0.12

/**
 * One target per region of the cave — six regions in a 3x2 grid, visited in a
 * seeded shuffle. A plain random walk only gets about as far as the square
 * root of its step count, so every tunnel is aimed at its own part of the map
 * instead of wandering out of the hall and back.
 */
function pickTunnelTargets(rng: Rng): TilePoint[] {
  const regions: TilePoint[] = []
  for (let column = 0; column < 3; column += 1) {
    for (let row = 0; row < 2; row += 1) {
      regions.push({
        x: Math.round(((column + 0.5) * CAVE_WIDTH) / 3),
        y: Math.round(((row + 0.5) * CAVE_HEIGHT) / 2),
      })
    }
  }
  const targets = shuffle(rng, regions)
  return targets.slice(0, TUNNEL_COUNT).map((target) => ({
    x: target.x + randomInt(rng, -6, 7),
    y: target.y + randomInt(rng, -5, 6),
  }))
}

/** True when a block at `x,y` already swallows `target` tile whole. */
function covers(x: number, y: number, size: number, target: TilePoint): boolean {
  return (
    x <= target.x &&
    target.x <= x + size - 1 &&
    y <= target.y &&
    target.y <= y + size - 1
  )
}

/**
 * A variable-width passage that mostly heads for `to`, jittering sideways so
 * it snakes like a cave tunnel rather than a straight corridor. Every block
 * covers its own 2x2 top-left corner and consecutive stops are one tile
 * apart, so the boxes chain together: whatever this carves stays reachable
 * from where it started. Once it swallows its target it keeps wandering on
 * the remaining steps, which is what fills its region out. Given a `stopSet`,
 * swallowing `to` — or stepping onto one of its box origins — means the
 * passage has run back into the cave that already exists, closing a loop.
 */
function carvePassage(
  rows: string[][],
  rng: Rng,
  from: TilePoint,
  to: TilePoint,
  maxSteps: number,
  stopSet?: ReadonlySet<string>,
): void {
  let { x, y } = from
  let size = randomInt(rng, BLOCK_MIN, BLOCK_MAX + 1)
  carveSquare(rows, x, y, size)

  for (let step = 1; step <= maxSteps; step += 1) {
    const arrived = covers(x, y, size, to)
    if (stopSet && arrived) return

    const order = shuffle(rng, [...ORTHOGONAL])
    if (!arrived && rng() < PASSAGE_BIAS) {
      const wanted = stepToward(x, y, to)
      if (wanted) order.unshift(wanted)
    }

    let next: TilePoint | null = null
    for (const candidate of order) {
      const tile = { x: x + candidate.x, y: y + candidate.y }
      if (canCarve(tile.x, tile.y, size)) {
        next = tile
        break
      }
    }
    if (!next) return
    x = next.x
    y = next.y

    if (rng() < RESIZE_CHANCE) {
      const resized = randomInt(rng, BLOCK_MIN, BLOCK_MAX + 1)
      if (canCarve(x, y, resized)) size = resized
    }
    carveSquare(rows, x, y, size)

    if (stopSet && step >= 2 && stopSet.has(tileKey({ x, y }))) return
  }
}

const CHAMBER_MIN = 7
const CHAMBER_MAX = 10
const CHAMBER_WIDTH_MIN = 3
const CHAMBER_WIDTH_MAX = 8
const CHAMBER_HEIGHT_MIN = 3
const CHAMBER_HEIGHT_MAX = 6

/**
 * An elliptical chamber cut around an existing floor tile, so it always opens
 * off the tunnels instead of floating in the rock. Returns the tiles it cut.
 */
function carveChamber(rows: string[][], rng: Rng, center: TilePoint): TilePoint[] {
  const halfWidth = randomInt(rng, CHAMBER_WIDTH_MIN, CHAMBER_WIDTH_MAX + 1)
  const halfHeight = randomInt(rng, CHAMBER_HEIGHT_MIN, CHAMBER_HEIGHT_MAX + 1)
  const carved: TilePoint[] = []

  for (let dy = -halfHeight; dy <= halfHeight; dy += 1) {
    for (let dx = -halfWidth; dx <= halfWidth; dx += 1) {
      const inside =
        (dx * dx) / (halfWidth * halfWidth) + (dy * dy) / (halfHeight * halfHeight) > 1
      if (inside) continue

      const tile = { x: center.x + dx, y: center.y + dy }
      if (!isInsideShell(tile.x, tile.y)) continue
      if (rows[tile.y][tile.x] !== FLOOR_CHAR) rows[tile.y][tile.x] = FLOOR_CHAR
      carved.push(tile)
    }
  }

  return carved
}

const LOOP_MIN = 2
const LOOP_MAX = 3
const LOOP_STEPS = 200
const LOOP_MIN_DISTANCE = 24
const LOOP_PAIR_ATTEMPTS = 12

/** The step that closes the distance to `to` along the longer axis, if any. */
function stepToward(x: number, y: number, to: TilePoint): TilePoint | null {
  const deltaX = to.x - x
  const deltaY = to.y - y
  if (deltaX === 0 && deltaY === 0) return null
  if (deltaX !== 0 && Math.abs(deltaX) >= Math.abs(deltaY)) {
    return { x: Math.sign(deltaX), y: 0 }
  }
  return { x: 0, y: Math.sign(deltaY) }
}

function pickLoopPair(
  rng: Rng,
  origins: readonly TilePoint[],
): { from: TilePoint; to: TilePoint } | null {
  for (let attempt = 0; attempt < LOOP_PAIR_ATTEMPTS; attempt += 1) {
    const from = randomPick(rng, origins)
    const to = randomPick(rng, origins)
    if (Math.abs(to.x - from.x) + Math.abs(to.y - from.y) >= LOOP_MIN_DISTANCE) {
      return { from, to }
    }
  }
  return null
}

/**
 * Box flood fill from the spawn: every walkable tile some 2x2 body could
 * stand on. Used to decide what to seal and where ore may grow.
 */
function floodFill(rows: readonly string[]): Set<string> {
  const reachable = new Set<string>()
  const startChar = rows[CAVE_SPAWN.y]?.[CAVE_SPAWN.x] ?? ''
  const startTile = TILE_BY_CHAR.get(startChar)
  if (!startTile || startTile.collides) return reachable

  reachable.add(tileKey(CAVE_SPAWN))
  const queue: TilePoint[] = [{ ...CAVE_SPAWN }]
  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) break
    for (const step of ORTHOGONAL) {
      const tile = { x: current.x + step.x, y: current.y + step.y }
      if (!isInsideShell(tile.x, tile.y)) continue
      const key = tileKey(tile)
      if (reachable.has(key)) continue
      const neighbour = TILE_BY_CHAR.get(rows[tile.y]?.[tile.x] ?? '')
      if (!neighbour || neighbour.collides) continue
      reachable.add(key)
      queue.push(tile)
    }
  }

  return reachable
}

/** True when a straight-line flood fill from the spawn reaches every open tile. */
function allFloorReachable(rows: readonly string[]): boolean {
  const reachable = floodFill(rows)
  for (let y = 1; y < CAVE_HEIGHT - 1; y += 1) {
    for (let x = 1; x < CAVE_WIDTH - 1; x += 1) {
      const tile = TILE_BY_CHAR.get(rows[y]?.[x] ?? '')
      if (!tile || tile.collides) continue
      if (!reachable.has(`${x},${y}`)) return false
    }
  }
  return true
}

/**
 * Turn any floor tile the 2x2 body still cannot stand on — a leftover pocket
 * or a one-tile crack — back into solid rock, so every open tile left on the
 * map is traversable.
 */
function sealUnreachable(rows: string[][]): void {
  const snapshot = rows.map((row) => row.join(''))
  for (const tile of unreachedTiles(snapshot, CAVE_SPAWN)) {
    rows[tile.y][tile.x] = WALL_CHAR
  }
}

interface OreField {
  /** Wall faces next to reachable floor — the only tiles ore may claim. */
  tiles: readonly TilePoint[]
  keys: ReadonlySet<string>
  claimed: Set<string>
}

function oreCandidates(
  rows: readonly (readonly string[])[],
  reachable: ReadonlySet<string>,
): OreField {
  const tiles: TilePoint[] = []
  for (let y = 1; y < CAVE_HEIGHT - 1; y += 1) {
    for (let x = 1; x < CAVE_WIDTH - 1; x += 1) {
      if (rows[y]?.[x] !== WALL_CHAR) continue
      const touchesFloor = ORTHOGONAL.some((step) =>
        reachable.has(`${x + step.x},${y + step.y}`),
      )
      if (touchesFloor) tiles.push({ x, y })
    }
  }
  return { tiles, keys: new Set(tiles.map(tileKey)), claimed: new Set() }
}

const ORE_CLUSTER_MIN = 2
const ORE_CLUSTER_MAX = 4

/**
 * Grow one vein of `char` out of an unused candidate, spreading along the
 * wall face while it still has candidates to grow into. Returns the tiles the
 * cluster took, or `0` when the field has nothing left to claim.
 */
function growOreCluster(
  rows: string[][],
  rng: Rng,
  field: OreField,
  char: string,
  targetSize: number,
): number {
  const seeds = field.tiles.filter((tile) => !field.claimed.has(tileKey(tile)))
  if (seeds.length === 0) return 0

  const seed = randomPick(rng, seeds)
  field.claimed.add(tileKey(seed))
  rows[seed.y][seed.x] = char
  const cluster = [seed]

  while (cluster.length < targetSize) {
    const options: TilePoint[] = []
    for (const tile of cluster) {
      for (const step of ORTHOGONAL) {
        const next = { x: tile.x + step.x, y: tile.y + step.y }
        if (!field.keys.has(tileKey(next))) continue
        if (field.claimed.has(tileKey(next))) continue
        options.push(next)
      }
    }
    if (options.length === 0) break

    const next = randomPick(rng, options)
    field.claimed.add(tileKey(next))
    rows[next.y][next.x] = char
    cluster.push(next)
  }

  return cluster.length
}

const IRON_TARGET_TILES = 16
const IRON_MIN_CLUSTERS = 4
const IRON_MAX_CLUSTERS = 10
const STEEL_TARGET_TILES = 5
const STEEL_MIN_CLUSTERS = 1
const STEEL_MAX_CLUSTERS = 4

/** Grow veins of `char` until the tile target and the cluster floor are met. */
function placeOreVeins(
  rows: string[][],
  rng: Rng,
  field: OreField,
  char: string,
  targetTiles: number,
  minClusters: number,
  maxClusters: number,
): void {
  let tiles = 0
  let clusters = 0
  while ((tiles < targetTiles || clusters < minClusters) && clusters < maxClusters) {
    const size = randomInt(rng, ORE_CLUSTER_MIN, ORE_CLUSTER_MAX + 1)
    const grown = growOreCluster(rows, rng, field, char, size)
    if (grown === 0) break
    tiles += grown
    clusters += 1
  }
}

const POOL_MIN = 2
const POOL_MAX = 4
const POOL_ATTEMPTS = 40
const POOL_EXTRA_TILES = 3

/**
 * The structure a decor tile has to leave behind: the whole open map still
 * 4-connected from the spawn, still 2x2-traversable, and still satisfying the
 * shared map rules (which is what keeps every ore vein minable).
 */
function structureHolds(rows: string[][]): boolean {
  const snapshot = rows.map((row) => row.join(''))
  if (unreachedTiles(snapshot, CAVE_SPAWN).length > 0) return false
  if (!allFloorReachable(snapshot)) return false
  return (
    findMapViolations(snapshot, CAVE_PLACEMENTS, { areaMaps: { cave: snapshot } })
      .length === 0
  )
}

/**
 * Blobs of water inside the chambers. Each candidate is laid down and
 * checked first, then reverted when it would strand a tile, break a corridor
 * or cover the last walkable side of a vein.
 */
function placeWater(rows: string[][], rng: Rng, chamberFloor: readonly TilePoint[]): void {
  if (chamberFloor.length === 0) return
  const reserved = new Set(ENTRY_POINTS.map(tileKey))
  const pools = randomInt(rng, POOL_MIN, POOL_MAX + 1)

  let placed = 0
  for (let attempt = 0; attempt < POOL_ATTEMPTS && placed < pools; attempt += 1) {
    const seed = randomPick(rng, chamberFloor)
    if (reserved.has(tileKey(seed))) continue
    if (rows[seed.y]?.[seed.x] !== FLOOR_CHAR) continue

    const blob = [seed]
    const extra = randomInt(rng, 0, POOL_EXTRA_TILES + 1)
    for (let index = 0; index < extra; index += 1) {
      const base = randomPick(rng, blob)
      const options = ORTHOGONAL.map((step) => ({
        x: base.x + step.x,
        y: base.y + step.y,
      })).filter(
        (tile) =>
          rows[tile.y]?.[tile.x] === FLOOR_CHAR && !reserved.has(tileKey(tile)),
      )
      if (options.length > 0) blob.push(randomPick(rng, options))
    }

    for (const tile of blob) rows[tile.y][tile.x] = WATER_CHAR
    if (structureHolds(rows)) {
      placed += 1
    } else {
      for (const tile of blob) rows[tile.y][tile.x] = FLOOR_CHAR
    }
  }
}

const CRYSTAL_CLUSTERS_MIN = 3
const CRYSTAL_CLUSTERS_MAX = 6
const CRYSTAL_TILES_MIN = 2
const CRYSTAL_TILES_MAX = 5

/**
 * Clusters of the walkable crystal decor (`c`) over the open floor. Being
 * non-colliding, crystals never disturb the structure, so they only skip the
 * entry points to keep the way in and out readable.
 */
function placeCrystals(rows: string[][], rng: Rng, floor: readonly TilePoint[]): void {
  if (floor.length === 0) return
  const reserved = new Set(ENTRY_POINTS.map(tileKey))
  const clusters = randomInt(rng, CRYSTAL_CLUSTERS_MIN, CRYSTAL_CLUSTERS_MAX + 1)

  for (let index = 0; index < clusters; index += 1) {
    const seed = randomPick(rng, floor)
    if (reserved.has(tileKey(seed))) continue
    if (rows[seed.y]?.[seed.x] !== FLOOR_CHAR) continue

    rows[seed.y][seed.x] = CRYSTAL_CHAR
    const cluster = [seed]
    const target = randomInt(rng, CRYSTAL_TILES_MIN, CRYSTAL_TILES_MAX + 1)
    while (cluster.length < target) {
      const base = randomPick(rng, cluster)
      const options = ORTHOGONAL.map((step) => ({
        x: base.x + step.x,
        y: base.y + step.y,
      })).filter(
        (tile) =>
          rows[tile.y]?.[tile.x] === FLOOR_CHAR && !reserved.has(tileKey(tile)),
      )
      if (options.length === 0) break
      const next = randomPick(rng, options)
      rows[next.y][next.x] = CRYSTAL_CHAR
      cluster.push(next)
    }
  }
}

function scanFloor(rows: readonly (readonly string[])[]): TilePoint[] {
  const tiles: TilePoint[] = []
  for (let y = 1; y < CAVE_HEIGHT - 1; y += 1) {
    for (let x = 1; x < CAVE_WIDTH - 1; x += 1) {
      if (rows[y]?.[x] === FLOOR_CHAR) tiles.push({ x, y })
    }
  }
  return tiles
}

const CAVE_PLACEMENTS = {
  spawn: CAVE_SPAWN,
  npcs: CAVE_NPCS,
  portals: CAVE_PORTALS,
  items: CAVE_ITEMS,
}

/** Everything the shared map rules plus the 2x2 body require of a cave. */
function caveViolations(rows: readonly string[]): string[] {
  const violations = findMapViolations(rows, CAVE_PLACEMENTS, {
    areaMaps: { cave: rows },
  })
  const unreached = unreachedTiles(rows, CAVE_SPAWN)
  if (unreached.length > 0) {
    violations.push(`${unreached.length} open tiles are outside the 2x2 body's reach`)
  }
  return violations
}

function generateCaveAttempt(seed: number): string[][] {
  const rng = mulberry32(seed)
  const rows = CAVE_SKELETON.map((row) => row.split(''))

  // Tunnels heading out of the entry hall to their own region of the cave,
  // then chambers opening off them.
  let origins = boxOrigins(rows)
  const targets = pickTunnelTargets(rng)
  for (let tunnel = 0; tunnel < TUNNEL_COUNT; tunnel += 1) {
    const target = targets[tunnel]
    if (!target) break
    const start = randomPick(rng, origins)
    const steps = randomInt(rng, TUNNEL_STEPS_MIN, TUNNEL_STEPS_MAX + 1)
    carvePassage(rows, rng, start, target, steps)
    origins = boxOrigins(rows)
  }

  const chamberTiles: TilePoint[] = []
  const chambers = randomInt(rng, CHAMBER_MIN, CHAMBER_MAX + 1)
  for (let chamber = 0; chamber < chambers; chamber += 1) {
    const center = randomPick(rng, origins)
    chamberTiles.push(...carveChamber(rows, rng, center))
    origins = boxOrigins(rows)
  }

  // Loop tunnels, so the cave reads as a web rather than a dead-end maze.
  const loopOrigins = boxOrigins(rows)
  const frozen = new Set(loopOrigins.map(tileKey))
  const loops = randomInt(rng, LOOP_MIN, LOOP_MAX + 1)
  for (let loop = 0; loop < loops; loop += 1) {
    const pair = pickLoopPair(rng, loopOrigins)
    if (pair) carvePassage(rows, rng, pair.from, pair.to, LOOP_STEPS, frozen)
  }

  sealUnreachable(rows)

  // Ore on the wall faces beside reachable floor, iron first so its target
  // gets first pick of the field.
  const sealed = rows.map((row) => row.join(''))
  const field = oreCandidates(rows, floodFill(sealed))
  placeOreVeins(rows, rng, field, IRON_CHAR, IRON_TARGET_TILES, IRON_MIN_CLUSTERS, IRON_MAX_CLUSTERS)
  placeOreVeins(rows, rng, field, STEEL_CHAR, STEEL_TARGET_TILES, STEEL_MIN_CLUSTERS, STEEL_MAX_CLUSTERS)

  // Decor last: water inside the chambers, crystals anywhere on the floor.
  const floor = scanFloor(rows)
  const chamberKeys = new Set(chamberTiles.map(tileKey))
  const chamberFloor = floor.filter((tile) => chamberKeys.has(tileKey(tile)))
  placeWater(rows, rng, chamberFloor)
  placeCrystals(rows, rng, scanFloor(rows))

  return rows
}

/** Bounded re-rolls before giving up on a seed; a failure here is a bug. */
const MAX_ATTEMPTS = 12

/**
 * Build the crystal cave for a seed. The layout is a pure function of the
 * seed, so `mine:cave:x,y` flags keep matching the same tiles for the life of
 * a save. A candidate that trips any rule is re-run on an attempt-salted
 * sub-seed until one passes (or the attempt budget runs out, which the tests
 * would catch long before a player could).
 */
export function generateCaveMap(seed: number): readonly string[] {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const subSeed = (seed + Math.imul(attempt, 0x9e3779b9)) >>> 0
    const map = generateCaveAttempt(subSeed).map((row) => row.join(''))
    if (caveViolations(map).length === 0) return map
  }
  throw new Error(
    `Could not generate a valid crystal cave for seed ${seed} in ${MAX_ATTEMPTS} attempts`,
  )
}
