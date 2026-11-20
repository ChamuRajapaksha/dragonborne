import { getClassById } from '../character'
import type { Character } from '../character'
import { effectiveStats } from '../inventory'
import type { InventoryState } from '../inventory'

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

/** Base class stats, level gains, and equipped gear in one fresh snapshot. */
export function characterStats(
  character: Character,
  inventory: InventoryState,
  level: number,
): Record<string, number> {
  const merged = effectiveStats(character.stats, inventory)
  for (const [stat, bonus] of Object.entries(levelStatBonuses(character.classId, level))) {
    merged[stat] = (merged[stat] ?? 0) + bonus
  }
  return merged
}
