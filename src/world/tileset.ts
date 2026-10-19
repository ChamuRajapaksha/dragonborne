import type Phaser from 'phaser'

export const TILE_SIZE = 16

export const TILESET_KEY = 'world-terrain'

export interface TileLegendEntry {
  index: number
  char: string
  name: string
  base: number
  detail: number
  collides: boolean
}

export const TILE_LEGEND: readonly TileLegendEntry[] = [
  { index: 0, char: '.', name: 'grass', base: 0x4e7f43, detail: 0x5e934f, collides: false },
  { index: 1, char: ',', name: 'tall grass', base: 0x3d6b33, detail: 0x54903f, collides: false },
  { index: 2, char: 'T', name: 'tree canopy', base: 0x27562b, detail: 0x2f6b32, collides: true },
  { index: 3, char: 't', name: 'tree trunk', base: 0x5a4128, detail: 0x6b4d2f, collides: true },
  { index: 4, char: '#', name: 'rock', base: 0x7a7268, detail: 0x8d8478, collides: true },
  { index: 5, char: '~', name: 'water', base: 0x2f6a8f, detail: 0x3f83ad, collides: true },
  { index: 6, char: '-', name: 'dirt path', base: 0x9a8256, detail: 0xab9163, collides: false },
  { index: 7, char: 'b', name: 'bush', base: 0x35632c, detail: 0x43773a, collides: true },
  { index: 8, char: 'r', name: 'roof', base: 0x8f4a3c, detail: 0xa2594a, collides: true },
  { index: 9, char: 'w', name: 'wall', base: 0x7d6a52, detail: 0x92806a, collides: true },
  { index: 10, char: 'f', name: 'floor', base: 0xa89880, detail: 0xbcaa92, collides: false },
  { index: 11, char: 'k', name: 'keep', base: 0x5f6470, detail: 0x717683, collides: true },
  { index: 12, char: 's', name: 'stump', base: 0x453022, detail: 0x574029, collides: false },
]

export const TILE_BY_CHAR: ReadonlyMap<string, TileLegendEntry> = new Map(
  TILE_LEGEND.map((tile) => [tile.char, tile]),
)

export const COLLIDING_TILE_INDEXES: readonly number[] = TILE_LEGEND.filter(
  (tile) => tile.collides,
).map((tile) => tile.index)

function indexOfChar(char: string): number {
  const tile = TILE_LEGEND.find((entry) => entry.char === char)
  if (!tile) throw new Error(`Tile '${char}' is missing from the legend`)
  return tile.index
}

/** The tree trunk (`t`) tile index — felling retiles this to the stump. */
export const TREE_TRUNK_INDEX = indexOfChar('t')

/** The stump (`s`) tile index left behind by a felled tree; walkable. */
export const STUMP_TILE_INDEX = indexOfChar('s')

/** Swings needed to fell a tree; mid-chop progress is transient and never persisted. */
export const TREE_CHOP_HITS = 3

/**
 * Hits remaining after one swing. A tree with no recorded progress starts at
 * `TREE_CHOP_HITS`; `0` means the felling swing.
 */
export function chopHitsRemaining(previous: number | undefined): number {
  return (previous ?? TREE_CHOP_HITS) - 1
}

/** True when a terrain tile is a choppable tree trunk. */
export function isTreeTrunkTile(tileIndex: number | undefined): boolean {
  return tileIndex === TREE_TRUNK_INDEX
}

/** True when a terrain tile is a felled stump, left for a sapling to replant. */
export function isStumpTile(tileIndex: number | undefined): boolean {
  return tileIndex === STUMP_TILE_INDEX
}

const SHEET_COLUMNS = 4

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

export function ensureTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists(TILESET_KEY)) return

  const rows = Math.ceil(TILE_LEGEND.length / SHEET_COLUMNS)
  const sheet = scene.textures.createCanvas(
    TILESET_KEY,
    SHEET_COLUMNS * TILE_SIZE,
    rows * TILE_SIZE,
  )
  if (!sheet) return

  const ctx = sheet.context

  for (const tile of TILE_LEGEND) {
    const originX = (tile.index % SHEET_COLUMNS) * TILE_SIZE
    const originY = Math.floor(tile.index / SHEET_COLUMNS) * TILE_SIZE

    ctx.fillStyle = toCssColor(tile.base)
    ctx.fillRect(originX, originY, TILE_SIZE, TILE_SIZE)

    ctx.fillStyle = toCssColor(tile.detail)
    ctx.fillRect(originX + 2, originY + 2, TILE_SIZE - 4, TILE_SIZE - 8)
    ctx.fillRect(originX + 5, originY + TILE_SIZE - 5, TILE_SIZE - 10, 3)
  }

  sheet.refresh()
}