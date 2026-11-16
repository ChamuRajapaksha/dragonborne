import { FACTION_IDS, isFactionId } from './data'
import { applyReputationDelta, type ReputationReward } from './model'
import { clearReputation, loadReputation, saveReputation } from './storage'

type Listener = (values: Record<string, number>) => void

let values: Record<string, number> = zeroed()

const listeners = new Set<Listener>()

function zeroed(): Record<string, number> {
  return Object.fromEntries(FACTION_IDS.map((id) => [id, 0]))
}

export function getAllReputation(): Record<string, number> {
  return { ...values }
}

export function getReputation(factionId: string): number {
  return values[factionId] ?? 0
}

export function updateReputation(factionId: string, delta: number): number {
  if (!isFactionId(factionId)) return getReputation(factionId)
  values = { ...values, [factionId]: applyReputationDelta(values[factionId] ?? 0, delta) }
  saveReputation(values)
  notify()
  return values[factionId]
}

export function applyReputation(rewards: readonly ReputationReward[]): void {
  if (rewards.length === 0) return
  let changed = false
  const next = { ...values }
  for (const reward of rewards) {
    if (!isFactionId(reward.factionId)) continue
    next[reward.factionId] = applyReputationDelta(next[reward.factionId] ?? 0, reward.delta)
    changed = true
  }
  if (!changed) return
  values = next
  saveReputation(values)
  notify()
}

export function hydrateReputation(): Record<string, number> {
  const loaded = loadReputation() ?? {}
  const next = zeroed()
  for (const id of FACTION_IDS) {
    if (typeof loaded[id] === 'number') next[id] = applyReputationDelta(0, loaded[id])
  }
  values = next
  notify()
  return getAllReputation()
}

export function resetReputation(): void {
  clearReputation()
  values = zeroed()
  notify()
}

export function subscribeReputation(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  const snapshot = getAllReputation()
  for (const listener of listeners) listener(snapshot)
}
