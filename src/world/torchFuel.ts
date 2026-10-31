import { TORCH_BURN_MS } from './torch'

const STORAGE_KEY = 'dragonborne.torch'
const STORAGE_VERSION = 1

interface StoredTorchFuel {
  version: number
  fuelMs: number
}

/** Keeps fuel inside one torch's burn window; malformed input reads as empty. */
export function clampTorchFuel(fuelMs: number): number {
  if (!Number.isFinite(fuelMs)) return 0
  return Math.min(Math.max(fuelMs, 0), TORCH_BURN_MS)
}

/**
 * Fuel persisted between sessions. A missing, malformed, or older-version save
 * reads as an empty torch, so a new torch lights from full instead of resuming
 * a stale burn.
 */
export function loadTorchFuel(): number {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return 0

  try {
    const parsed = JSON.parse(raw) as Partial<StoredTorchFuel>
    if (parsed.version !== STORAGE_VERSION) return 0
    if (typeof parsed.fuelMs !== 'number') return 0
    return clampTorchFuel(parsed.fuelMs)
  } catch {
    return 0
  }
}

export function saveTorchFuel(fuelMs: number): void {
  const stored: StoredTorchFuel = {
    version: STORAGE_VERSION,
    fuelMs: clampTorchFuel(fuelMs),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function clearTorchFuel(): void {
  localStorage.removeItem(STORAGE_KEY)
}
