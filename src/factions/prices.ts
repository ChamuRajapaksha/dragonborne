import type { ReputationTier } from './tiers'

export interface PriceModifier {
  buy: number
  sell: number
}

export const PRICE_MODIFIERS: Readonly<Record<ReputationTier, PriceModifier>> = {
  hated: { buy: 1.25, sell: 0.75 },
  hostile: { buy: 1.15, sell: 0.85 },
  neutral: { buy: 1.0, sell: 1.0 },
  friendly: { buy: 0.9, sell: 1.1 },
  honored: { buy: 0.85, sell: 1.15 },
  revered: { buy: 0.8, sell: 1.2 },
}

export function buyPrice(basePrice: number, tier: ReputationTier): number {
  return Math.max(1, Math.round(basePrice * PRICE_MODIFIERS[tier].buy))
}

export function sellPrice(basePrice: number, tier: ReputationTier): number {
  return Math.max(0, Math.round(basePrice * PRICE_MODIFIERS[tier].sell))
}

export function priceModifierNote(tier: ReputationTier): string {
  const mod = PRICE_MODIFIERS[tier]
  if (mod.buy === 1 && mod.sell === 1) return 'no change'
  const buyPct = Math.round((1 - mod.buy) * 100)
  const sellPct = Math.round((mod.sell - 1) * 100)
  const fmt = (v: number) => `${v > 0 ? '−' : '+'}${Math.abs(v)}%`
  return `${fmt(buyPct)} buy, ${fmt(-sellPct)} sell`
}
