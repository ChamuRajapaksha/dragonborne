import { createEmptyInventory } from './logic'
import { clearInventory, loadInventory, saveInventory } from './storage'
import type { InventoryState } from './types'

/**
 * Single source of truth for live inventory state.
 *
 * The module is a singleton on purpose, so it must survive `scene.restart` — Phase E
 * hydrates it once at boot rather than per scene. Every mutation goes through
 * `updateInventory`, which persists and then notifies subscribers, so the panel,
 * hotbar, HUD and pickups can never drift apart.
 */

type Listener = (state: InventoryState) => void

let state: InventoryState = createEmptyInventory()

const listeners = new Set<Listener>()

export function getInventory(): InventoryState {
  return state
}

/** Replaces the whole state, persisting and notifying. */
export function setInventory(next: InventoryState): void {
  state = next
  saveInventory(next)
  notify()
}

/**
 * Applies `mutate` to the current state and commits the result. The callback returns
 * a new state — the pure functions in `logic.ts` all work this way — so it must not
 * return the state it was given to skip a write.
 */
export function updateInventory(
  mutate: (current: InventoryState) => InventoryState,
): InventoryState {
  setInventory(mutate(state))
  return state
}

/**
 * Replaces the state with whatever is on disk, or an empty inventory when there is
 * no save. Never writes back to storage — booting must not create a save as a side
 * effect of reading one.
 */
export function hydrateInventory(): InventoryState {
  state = loadInventory() ?? createEmptyInventory()
  notify()
  return state
}

/** Drops the save and returns to an empty inventory. Used when a new character is made. */
export function resetInventory(): void {
  clearInventory()
  state = createEmptyInventory()
  notify()
}

export function subscribeInventory(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  for (const listener of listeners) listener(state)
}