import { FACTIONS, getFactionById } from './data'
import { REPUTATION_MAX, REPUTATION_MIN, clampReputation, tierFor, tierLabel } from './tiers'
import type { ReputationTier } from './tiers'

export interface ReputationReward {
  factionId: string
  delta: number
}

export interface ReputationRequirement {
  factionId: string
  min: number
}

export interface UnmetReputation {
  factionId: string
  required: number
  current: number
}

/** One faction's standing after a reward, ready to toast. */
export interface ReputationAwardChange {
  factionId: string
  name: string
  delta: number
  previous: number
  value: number
  tier: ReputationTier
}

export function applyReputationDelta(current: number, delta: number): number {
  return clampReputation(current + delta)
}

/**
 * The visible changes a reward list would make, computed in order so repeated
 * factions accumulate exactly like the store will apply them.
 */
export function reputationAwardChanges(
  rewards: readonly ReputationReward[],
  values: Readonly<Record<string, number>>,
): ReputationAwardChange[] {
  const running: Record<string, number> = { ...values }
  const changes: ReputationAwardChange[] = []

  for (const reward of rewards) {
    const faction = getFactionById(reward.factionId)
    if (!faction || reward.delta === 0) continue

    const previous = running[reward.factionId] ?? 0
    const value = applyReputationDelta(previous, reward.delta)
    running[reward.factionId] = value
    changes.push({
      factionId: faction.id,
      name: faction.name,
      delta: reward.delta,
      previous,
      value,
      tier: tierFor(value),
    })
  }

  return changes
}

export function formatReputationAward(change: ReputationAwardChange): string {
  const sign = change.delta >= 0 ? '+' : ''
  return `${change.name} ${sign}${change.delta} (${tierLabel(change.tier)})`
}

export function isReputationMet(
  requirements: readonly ReputationRequirement[],
  values: Readonly<Record<string, number>>,
): boolean {
  return unmetReputation(requirements, values).length === 0
}

export function unmetReputation(
  requirements: readonly ReputationRequirement[],
  values: Readonly<Record<string, number>>,
): UnmetReputation[] {
  return requirements
    .map((req) => ({
      factionId: req.factionId,
      required: req.min,
      current: values[req.factionId] ?? 0,
    }))
    .filter((entry) => entry.current < entry.required)
}

export function formatReputationRewards(rewards: readonly ReputationReward[]): string {
  return rewards
    .map((reward) => {
      const name = getFactionById(reward.factionId)?.name ?? reward.factionId
      const sign = reward.delta >= 0 ? '+' : ''
      return `${name} ${sign}${reward.delta}`
    })
    .join(', ')
}

export function formatUnmetReputation(unmet: readonly UnmetReputation[]): string {
  return unmet
    .map((entry) => {
      const name = getFactionById(entry.factionId)?.name ?? entry.factionId
      return `${name} ${entry.required}+ (${entry.current})`
    })
    .join(', ')
}

export function topStanding(
  values: Readonly<Record<string, number>>,
): { factionId: string; value: number; tier: ReputationTier } | null {
  const rows = FACTIONS.map((faction) => ({
    factionId: faction.id,
    value: values[faction.id] ?? 0,
  })).filter((row) => row.value !== 0)
  if (rows.length === 0) return null
  rows.sort((a, b) => b.value - a.value || a.factionId.localeCompare(b.factionId))
  const top = rows[0]
  return { ...top, tier: tierFor(top.value) }
}

export function formatStanding(factionId: string, value: number): string {
  const name = getFactionById(factionId)?.name ?? factionId
  return `${name} · ${tierLabel(tierFor(value))} (${value})`
}

export { REPUTATION_MAX, REPUTATION_MIN }
