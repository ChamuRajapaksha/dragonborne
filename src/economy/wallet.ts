/**
 * Pure gold-amount helpers. No storage, no DOM — the wallet store and any future
 * shop both fold through these so the "never below zero" rule lives in one place.
 */

/** Adds `delta` to `current`, clamping the result at zero. */
export function applyGold(current: number, delta: number): number {
  return Math.max(0, current + delta)
}

/** Renders a gold amount for display, e.g. `1240` -> `"1,240 gold"`. */
export function formatGold(gold: number): string {
  return `${gold.toLocaleString('en-US')} gold`
}
