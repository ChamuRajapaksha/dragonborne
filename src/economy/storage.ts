const STORAGE_KEY = 'dragonborne.wallet'

const CURRENT_VERSION = 1

interface GoldSave {
  version: number
  gold: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * A save is only trusted if it declares the current (or an older) version and carries
 * a non-negative whole-number balance. Anything malformed or from the future reads as
 * `0` rather than being guessed at.
 */
function readGold(parsed: unknown): number {
  if (!isRecord(parsed)) return 0

  const version = parsed.version
  if (typeof version !== 'number' || version > CURRENT_VERSION) return 0

  const gold = parsed.gold
  if (typeof gold !== 'number' || !Number.isInteger(gold) || gold < 0) return 0

  return gold
}

/** Reads the persisted balance; a missing or corrupt save is `0`, never a throw. */
export function loadGold(): number {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return 0

  try {
    return readGold(JSON.parse(raw))
  } catch {
    return 0
  }
}

export function saveGold(gold: number): void {
  const save: GoldSave = { version: CURRENT_VERSION, gold }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
}

export function clearGold(): void {
  localStorage.removeItem(STORAGE_KEY)
}
