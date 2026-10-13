import { clearGold, loadGold, saveGold } from './storage'
import { applyGold } from './wallet'

/**
 * Single source of truth for the live gold balance.
 *
 * Like the inventory store, this is a module singleton so it survives `scene.restart`;
 * it is hydrated once at boot. Every change runs through `updateGold`, which persists
 * and then notifies, so the HUD and any future shop can never drift from the save.
 */

type Listener = (gold: number) => void

let gold = 0

const listeners = new Set<Listener>()

export function getGold(): number {
  return gold
}

/** Applies `delta` to the balance (clamped at zero), persists, and notifies. */
export function updateGold(delta: number): number {
  gold = applyGold(gold, delta)
  saveGold(gold)
  notify()
  return gold
}

/**
 * Replaces the balance with whatever is on disk, defaulting to `0`. Never writes back,
 * so booting must not create a save as a side effect of reading one.
 */
export function hydrateGold(): number {
  gold = loadGold()
  notify()
  return gold
}

/** Drops the save and returns to `0`. Used when a new character is made. */
export function resetGold(): void {
  clearGold()
  gold = 0
  notify()
}

export function subscribeGold(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  for (const listener of listeners) listener(gold)
}
