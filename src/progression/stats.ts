import { getClassById } from '../character'

/** Class gains are declared per level, so level 1 adds nothing. */
export function levelStatBonuses(classId: string, level: number): Record<string, number> {
  const gains = getClassById(classId)?.statGains
  if (!gains || !Number.isFinite(level)) return {}

  const steps = Math.max(0, Math.floor(level) - 1)
  if (steps === 0) return {}

  const bonuses: Record<string, number> = {}
  for (const [stat, gain] of Object.entries(gains)) {
    bonuses[stat] = (gain ?? 0) * steps
  }
  return bonuses
}
