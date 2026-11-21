import type { EscortDefinition, EscortProgress } from './types'

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
