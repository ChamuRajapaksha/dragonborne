/**
 * Pure ore-node data: which tile char drops what, how many swings it takes,
 * and the remaining-hits countdown. No Phaser, no localStorage — plain node
 * can load this module so the definitions stay unit-testable.
 */
import { TILE_BY_CHAR } from './tileset'

export interface OreDefinition {
  /** Legend char of the node tile, e.g. `o` for iron ore. */
  char: string
  /** Item granted when the node finally breaks. */
  itemId: string
  /** Swings needed to clear the node. */
  hits: number
  /** Quantity of `itemId` dropped on the final swing. */
  yield: number
}

/** Yield/hit balance lives here as data; tune without touching systems code. */
export const ORE_DEFINITIONS: readonly OreDefinition[] = [
  { char: 'o', itemId: 'iron-ore', hits: 3, yield: 2 },
  { char: 'v', itemId: 'steel-ingot', hits: 4, yield: 1 },
]

const ORE_BY_TILE: ReadonlyMap<number, OreDefinition> = new Map(
  ORE_DEFINITIONS.flatMap((definition) => {
    const tile = TILE_BY_CHAR.get(definition.char)
    return tile ? [[tile.index, definition] as const] : []
  }),
)

/** The ore definition for a terrain tile index, or `undefined` if not ore. */
export function oreForTile(tileIndex: number | undefined): OreDefinition | undefined {
  if (tileIndex === undefined) return undefined
  return ORE_BY_TILE.get(tileIndex)
}

/**
 * Hits remaining after one swing. A node with no recorded progress starts at
 * `definition.hits`; `0` means the clearing swing. Mirrors `chopHitsRemaining`.
 */
export function mineHitsRemaining(
  previous: number | undefined,
  definition: OreDefinition,
): number {
  return (previous ?? definition.hits) - 1
}
