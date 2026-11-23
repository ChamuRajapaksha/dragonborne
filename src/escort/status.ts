import { currentStop, isEscortComplete } from './logic'
import type { EscortDefinition, EscortProgress } from './types'

function stopCount(def: EscortDefinition): number {
  return Array.isArray(def?.stops) ? def.stops.length : 0
}

function stopCounter(progress: EscortProgress, def: EscortDefinition): string {
  const total = stopCount(def)
  const raw = Number.isFinite(progress?.stopIndex) ? progress.stopIndex : 0
  const index = Math.min(Math.max(Math.floor(raw) + 1, 1), total)
  return `${index}/${total}`
}

export function escortHudLine(
  progress: EscortProgress | null,
  def: EscortDefinition | null,
  npcName?: string,
): string {
  const total = def ? stopCount(def) : 0
  if (!progress || !def || total === 0) return 'No escort'

  const stop = isEscortComplete(progress, def)
    ? def.stops[total - 1]
    : currentStop(progress, def)
  if (!stop) return 'No escort'

  return `Escorting ${npcName ?? def.npcId} → ${stop.label} (${stopCounter(progress, def)})`
}

export function escortStatusLine(
  progress: EscortProgress | null,
  def: EscortDefinition | null,
): string {
  const total = def ? stopCount(def) : 0
  if (!progress || !def || total === 0) return ''

  if (isEscortComplete(progress, def)) return 'All stops reached — ready to complete'

  const stop = currentStop(progress, def)
  if (!stop) return ''

  return `Next stop: ${stop.label} (${stopCounter(progress, def)})`
}
