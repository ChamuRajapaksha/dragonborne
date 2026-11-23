import { clearEscort, loadEscort, saveEscort } from './storage'
import type { EscortProgress } from './types'

type Listener = (active: EscortProgress | null) => void

let active: EscortProgress | null = null
const listeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) listener(active)
}

export function getActiveEscort(): EscortProgress | null {
  return active
}

export function setActiveEscort(progress: EscortProgress | null): void {
  if (progress) saveEscort(progress)
  else clearEscort()
  active = progress
  notify()
}

export function hydrateEscorts(): EscortProgress | null {
  active = loadEscort()
  notify()
  return active
}

export function resetEscorts(): void {
  clearEscort()
  active = null
  notify()
}

export function subscribeEscorts(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
