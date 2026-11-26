import { getEscortDefinition } from './definitions'
import { canStartEscort, currentStop, isEscortComplete } from './logic'
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

export function escortArrivalLine(stop: { arrivalLine: string }): string {
  return stop.arrivalLine
}

export function escortPortalWaitLine(npcName: string): string {
  return `Wait for ${npcName} before using the portal`
}

export function escortAlreadyLeadingLine(npcName: string): string {
  return `You are already leading ${npcName}`
}

export function canAskEscortToFollow(
  questId: string,
  escortId: string | undefined,
  active: EscortProgress | null,
  completedQuestIds: readonly string[],
  unlocked: boolean,
): boolean {
  if (!escortId || !unlocked) return false
  const def = getEscortDefinition(escortId)
  if (!def || def.questId !== questId) return false
  return canStartEscort(def, active, completedQuestIds)
}

export function canCompleteEscortQuest(
  questId: string,
  escortId: string | undefined,
  active: EscortProgress | null,
  completedQuestIds: readonly string[],
): boolean {
  if (!escortId) return !completedQuestIds.includes(questId)
  if (completedQuestIds.includes(questId)) return false
  const def = getEscortDefinition(escortId)
  if (!def || def.questId !== questId) return false
  return active?.escortId === def.id && isEscortComplete(active, def)
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
