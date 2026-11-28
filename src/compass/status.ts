import type { Quest } from '../story/quests'
import { formatCompassReading } from './logic'
import { findQuestTarget, nextPortalToward, portalCompassPoint } from './targets'
import type { CompassPoint } from './types'

/**
 * Same-area targets follow the live NPC marker when one is supplied (so an
 * escorted NPC stays accurate); other areas point at the next portal.
 */
export function questCompassPoint(
  quest: Quest,
  areaId: string,
  npcName: string,
  liveNpc?: { x: number; y: number } | null,
): CompassPoint | null {
  const target = findQuestTarget(quest)
  if (!target) return null

  if (target.areaId === areaId) {
    const live =
      liveNpc && Number.isFinite(liveNpc.x) && Number.isFinite(liveNpc.y) ? liveNpc : null
    return {
      label: npcName,
      x: live?.x ?? target.x,
      y: live?.y ?? target.y,
    }
  }

  const portal = nextPortalToward(areaId, target.areaId)
  if (!portal) return null
  const routePoint = portalCompassPoint(portal)
  return { ...routePoint, label: `${npcName} \u2192 ${routePoint.label}` }
}

export function questCompassLine(
  point: CompassPoint | null,
  from: { x: number; y: number },
): string {
  return point ? formatCompassReading(point, from) : ''
}
