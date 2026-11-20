import {
  grantXp as applyGrantXp,
  levelForXp,
  levelProgress,
  MAX_LEVEL,
  xpForLevel,
} from './logic'
import { clearXp, loadXp, saveXp } from './storage'
import type { LevelProgress, ProgressionState } from './types'

type Listener = (state: ProgressionState) => void

let xp = 0
const listeners = new Set<Listener>()

function snapshot(): ProgressionState {
  return { xp }
}

function notify(): void {
  const state = snapshot()
  for (const listener of listeners) listener(state)
}

export function getXp(): number {
  return xp
}

export function getLevel(): number {
  return levelForXp(xp)
}

export function getLevelProgress(): LevelProgress {
  return levelProgress(xp)
}

/** Applies an XP grant, persists it, and returns how many levels were gained. */
export function grantXp(amount: number): number {
  const result = applyGrantXp(xp, amount)
  if (result.xp === xp) return 0

  xp = result.xp
  saveXp(xp)
  notify()
  return result.levelsGained
}

/** Reads the save without writing back, like the other stores. */
export function hydrateProgression(): number {
  const loaded = loadXp()
  xp = loaded === null ? 0 : Math.min(loaded, xpForLevel(MAX_LEVEL))
  notify()
  return xp
}

export function resetProgression(): void {
  clearXp()
  xp = 0
  notify()
}

export function subscribeProgression(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
