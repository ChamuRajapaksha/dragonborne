import { TILE_BY_CHAR } from './tileset'

/**
 * Pure, engine-free rules every area map must satisfy. Returns human-readable
 * violations; an empty array means the map passes. Phaser stays out of this
 * module so the rules run under plain node via vitest.
 */
export function findMapViolations(map: readonly string[]): string[] {
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

  map.forEach((row, y) => {
    if (row.length !== width) {
      violations.push(`row ${y} is ${row.length} chars, expected ${width}`)
    }
    for (let x = 0; x < row.length; x += 1) {
      const char = row[x] ?? ''
      if (!TILE_BY_CHAR.has(char)) {
        violations.push(`unknown tile char '${char}' at ${x},${y}`)
      }
    }
  })

  return violations
}
