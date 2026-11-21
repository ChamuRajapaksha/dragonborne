import { TILE_SIZE } from '../world/tileset'
import type { EscortDefinition, EscortProgress, EscortStop } from './types'

function finite(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function canStartEscort(
  def: EscortDefinition,
  active: EscortProgress | null,
  completedQuestIds: readonly string[],
): boolean {
  if (!def?.id || !def.questId || !def.npcId) return false
  if (active !== null && active !== undefined) return false
  if (!Array.isArray(def.stops) || def.stops.length === 0) return false
  return !completedQuestIds?.includes(def.questId)
}

export function startEscort(
  def: EscortDefinition,
  at: { areaId: string; x: number; y: number },
): EscortProgress {
  return {
    escortId: def.id,
    npcId: def.npcId,
    stopIndex: 0,
    areaId: at?.areaId ?? '',
    x: finite(at?.x),
    y: finite(at?.y),
  }
}

export function isEscortComplete(progress: EscortProgress, def: EscortDefinition): boolean {
  if (!def || !Array.isArray(def.stops) || def.stops.length === 0 || !progress) return false
  const index = finite(progress.stopIndex)
  return Number.isInteger(index) && index >= def.stops.length
}

export function currentStop(progress: EscortProgress, def: EscortDefinition): EscortStop | null {
  if (!def || !Array.isArray(def.stops) || !progress) return null
  const index = finite(progress.stopIndex)
  if (!Number.isInteger(index) || index < 0 || index >= def.stops.length) return null
  return def.stops[index] ?? null
}

export function isStopReached(
  progress: EscortProgress,
  def: EscortDefinition,
  player: { x: number; y: number },
): boolean {
  const stop = currentStop(progress, def)
  if (!stop || !player || stop.areaId !== progress.areaId) return false
  if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) return false

  const point = { x: finite(stop.x) * TILE_SIZE, y: finite(stop.y) * TILE_SIZE }
  const radius = Math.max(0, finite(def.stopRadius))
  return Math.hypot(player.x - point.x, player.y - point.y) <= radius
}

export function advanceEscort(
  progress: EscortProgress,
  def: EscortDefinition,
  player: { x: number; y: number },
): { progress: EscortProgress; arrived: EscortStop | null; complete: boolean } {
  const stop = currentStop(progress, def)
  if (stop && isStopReached(progress, def, player)) {
    const next = { ...progress, stopIndex: progress.stopIndex + 1 }
    return { progress: next, arrived: stop, complete: isEscortComplete(next, def) }
  }
  return { progress, arrived: null, complete: isEscortComplete(progress, def) }
}
