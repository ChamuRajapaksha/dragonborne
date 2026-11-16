export const REPUTATION_MIN = -100
export const REPUTATION_MAX = 100

export type ReputationTier = 'hated' | 'hostile' | 'neutral' | 'friendly' | 'honored' | 'revered'

export interface TierDefinition {
  id: ReputationTier
  label: string
  min: number
}

export const TIERS: readonly TierDefinition[] = [
  { id: 'hated', label: 'Hated', min: -100 },
  { id: 'hostile', label: 'Hostile', min: -49 },
  { id: 'neutral', label: 'Neutral', min: -19 },
  { id: 'friendly', label: 'Friendly', min: 20 },
  { id: 'honored', label: 'Honored', min: 50 },
  { id: 'revered', label: 'Revered', min: 80 },
]

export function clampReputation(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < REPUTATION_MIN) return REPUTATION_MIN
  if (value > REPUTATION_MAX) return REPUTATION_MAX
  return Math.trunc(value)
}

export function tierFor(value: number): ReputationTier {
  if (!Number.isFinite(value)) return 'neutral'
  const v = Math.trunc(value)
  let tier: ReputationTier = 'hated'
  for (const def of TIERS) {
    if (v >= def.min) tier = def.id
  }
  return tier
}

export function tierLabel(tier: ReputationTier): string {
  return TIERS.find((def) => def.id === tier)?.label ?? 'Neutral'
}
