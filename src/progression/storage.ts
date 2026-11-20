const STORAGE_KEY = 'dragonborne.progression'
const CURRENT_VERSION = 1

interface ProgressionSave {
  version: number
  xp: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function loadXp(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== CURRENT_VERSION) return null
    const xp = parsed.xp
    if (typeof xp !== 'number' || !Number.isFinite(xp) || xp < 0) return null
    return Math.floor(xp)
  } catch {
    return null
  }
}

export function saveXp(xp: number): void {
  const save: ProgressionSave = { version: CURRENT_VERSION, xp: Math.floor(xp) }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
}

export function clearXp(): void {
  localStorage.removeItem(STORAGE_KEY)
}
