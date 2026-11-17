import { FACTIONS } from '../factions/data'
import { priceModifierNote } from '../factions/prices'
import { clampReputation, tierFor, tierLabel } from '../factions/tiers'
import type { ReputationTier } from '../factions/tiers'

/** Only these two factions move prices, so only their cards need a price note. */
const PRICE_FACTIONS = new Set(['traders', 'forge'])

export interface FactionStandingRow {
  factionId: string
  name: string
  description: string
  value: number
  tier: ReputationTier
  tierLabel: string
  /** 0…100 for a bar; negative standings fill from the centre the other way. */
  barPercent: number
  priceNote: string | null
}

/** One card per faction, highest standing first, with ties broken by name. */
export function buildReputationRows(
  values: Readonly<Record<string, number>>,
): FactionStandingRow[] {
  return FACTIONS.map((faction) => {
    const value = clampReputation(values[faction.id] ?? 0)
    const tier = tierFor(value)
    return {
      factionId: faction.id,
      name: faction.name,
      description: faction.description,
      value,
      tier,
      tierLabel: tierLabel(tier),
      barPercent: Math.abs(value),
      priceNote: PRICE_FACTIONS.has(faction.id) ? priceModifierNote(tier) : null,
    }
  }).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

/** One-line header tally, e.g. `3 friendly · 2 neutral`, in row order. */
export function formatReputationSummary(rows: readonly FactionStandingRow[]): string {
  const counts = new Map<ReputationTier, number>()
  for (const row of rows) counts.set(row.tier, (counts.get(row.tier) ?? 0) + 1)
  return [...counts.entries()]
    .map(([tier, count]) => `${count} ${tierLabel(tier).toLowerCase()}`)
    .join(' · ')
}
