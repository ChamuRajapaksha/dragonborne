/**
 * Deterministic PRNG helpers for world generation. Pure TypeScript — no Phaser,
 * no globals — so a seeded layout reproduces byte-for-byte on any platform.
 */

/** A deterministic random source producing floats in `[0, 1)`. */
export type Rng = () => number

/**
 * mulberry32: a small, fast 32-bit generator. The same seed always yields the
 * same sequence, which is what keeps a save's forest layout stable.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform integer in `[min, maxExclusive)` drawn from `rng`. */
export function randomInt(rng: Rng, min: number, maxExclusive: number): number {
  return min + Math.floor(rng() * (maxExclusive - min))
}

/** Pick a uniformly random element from a non-empty array. */
export function randomPick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[randomInt(rng, 0, items.length)]
  if (item === undefined) throw new Error('randomPick called with an empty array')
  return item
}

/** In-place Fisher–Yates shuffle driven by `rng`; returns the same array. */
export function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i + 1)
    const current = items[i]
    items[i] = items[j]
    items[j] = current
  }
  return items
}
