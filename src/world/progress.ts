const STORAGE_KEY = 'dragonborne.progress'

export interface WorldProgress {
  areaId: string
  x: number
  y: number
  flags: Record<string, boolean>
}

function emptyProgress(): WorldProgress {
  return { areaId: '', x: 0, y: 0, flags: {} }
}

function isFlagRecord(value: unknown): value is Record<string, boolean> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value).every((entry) => typeof entry === 'boolean')
}

export function loadProgress(): WorldProgress | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<WorldProgress>
    if (typeof parsed.areaId !== 'string') return null
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null
    return {
      areaId: parsed.areaId,
      x: parsed.x as number,
      y: parsed.y as number,
      flags: isFlagRecord(parsed.flags) ? parsed.flags : {},
    }
  } catch {
    return null
  }
}

export function saveProgress(progress: WorldProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function setProgressFlag(flag: string, value = true): void {
  const progress = loadProgress() ?? emptyProgress()
  progress.flags = { ...progress.flags, [flag]: value }
  saveProgress(progress)
}

/** True only when the flag exists and is `true`; missing or corrupt saves read as false. */
export function getProgressFlag(flag: string): boolean {
  return loadProgress()?.flags[flag] === true
}

/**
 * Flag key for a one-time pickup, keyed by area, item and tile so two placements
 * of the same item never share a flag. Mirrors `introFlagKey` in `WorldScene`.
 */
export function pickupFlagKey(areaId: string, itemId: string, x: number, y: number): string {
  return `pickup:${areaId}:${itemId}:${x},${y}`
}

export function clearProgress(): void {
  localStorage.removeItem(STORAGE_KEY)
}
