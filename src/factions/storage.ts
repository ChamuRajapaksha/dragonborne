const STORAGE_KEY = 'dragonborne.reputation'

const CURRENT_VERSION = 1

interface ReputationSave {
  version: number
  values: Record<string, number>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readValues(parsed: unknown): Record<string, number> | null {
  if (!isRecord(parsed)) return null

  const version = parsed.version
  if (typeof version !== 'number' || version > CURRENT_VERSION) return null

  if (!isRecord(parsed.values)) return null

  const values: Record<string, number> = {}
  for (const [id, value] of Object.entries(parsed.values)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      values[id] = Math.trunc(value)
    }
  }
  return values
}

export function loadReputation(): Record<string, number> | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return readValues(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveReputation(values: Readonly<Record<string, number>>): void {
  const save: ReputationSave = { version: CURRENT_VERSION, values: { ...values } }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
}

export function clearReputation(): void {
  localStorage.removeItem(STORAGE_KEY)
}
