import { AREA_IDS } from '../world/maps'
import type { EscortProgress } from './types'

const STORAGE_KEY = 'dragonborne.escort'
const CURRENT_VERSION = 1

interface EscortSave {
  version: number
  active: EscortProgress | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readProgress(value: unknown): EscortProgress | null {
  if (!isRecord(value)) return null
  if (typeof value.escortId !== 'string' || value.escortId.length === 0) return null
  if (typeof value.npcId !== 'string' || value.npcId.length === 0) return null

  const stopIndex = value.stopIndex
  if (typeof stopIndex !== 'number' || !Number.isInteger(stopIndex) || stopIndex < 0) return null

  const areaId = value.areaId
  if (typeof areaId !== 'string' || !AREA_IDS.includes(areaId)) return null

  const x = value.x
  const y = value.y
  if (typeof x !== 'number' || !Number.isFinite(x)) return null
  if (typeof y !== 'number' || !Number.isFinite(y)) return null

  return { escortId: value.escortId, npcId: value.npcId, stopIndex, areaId, x, y }
}

export function loadEscort(): EscortProgress | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== CURRENT_VERSION) return null
    if (parsed.active === null || parsed.active === undefined) return null
    return readProgress(parsed.active)
  } catch {
    return null
  }
}

export function saveEscort(progress: EscortProgress): void {
  const save: EscortSave = { version: CURRENT_VERSION, active: { ...progress } }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
}

export function clearEscort(): void {
  localStorage.removeItem(STORAGE_KEY)
}
