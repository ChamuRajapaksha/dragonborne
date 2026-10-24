/**
 * Brennan the smith's price table. Pure data — every ware costs gold AND
 * materials: iron-tier goods ask for `iron-ore`, steel-tier goods for
 * `steel-ingot`. The panel and any future shop fold through these helpers;
 * affordability lives in `smithShortfall` so no charge can be partial.
 */

/** One material line of an offer's cost, e.g. `{ itemId: 'iron-ore', quantity: 3 }`. */
export interface SmithItemCost {
  itemId: string
  quantity: number
}

export interface SmithOffer {
  itemId: string
  cost: {
    /** Gold the buyer pays. */
    gold: number
    items: readonly SmithItemCost[]
  }
}

/** The only two materials the smith accepts — the tier rule, stated once. */
export const SMITH_MATERIAL_IDS = ['iron-ore', 'steel-ingot'] as const

const offerData = [
  {
    itemId: 'torch',
    cost: { gold: 5, items: [{ itemId: 'iron-ore', quantity: 1 }] },
  },
  {
    itemId: 'coil-rope',
    cost: { gold: 8, items: [{ itemId: 'iron-ore', quantity: 1 }] },
  },
  {
    itemId: 'bedroll',
    cost: { gold: 10, items: [{ itemId: 'iron-ore', quantity: 1 }] },
  },
  {
    itemId: 'waterskin',
    cost: { gold: 12, items: [{ itemId: 'iron-ore', quantity: 1 }] },
  },
  {
    itemId: 'worn-dagger',
    cost: { gold: 15, items: [{ itemId: 'iron-ore', quantity: 2 }] },
  },
  {
    itemId: 'axe',
    cost: { gold: 20, items: [{ itemId: 'iron-ore', quantity: 3 }] },
  },
  {
    itemId: 'pickaxe',
    cost: { gold: 25, items: [{ itemId: 'iron-ore', quantity: 3 }] },
  },
  {
    itemId: 'shortbow',
    cost: { gold: 30, items: [{ itemId: 'iron-ore', quantity: 3 }] },
  },
  {
    itemId: 'flanged-mace',
    cost: { gold: 35, items: [{ itemId: 'iron-ore', quantity: 4 }] },
  },
  {
    itemId: 'iron-sword',
    cost: { gold: 50, items: [{ itemId: 'steel-ingot', quantity: 2 }] },
  },
  {
    itemId: 'ember-staff',
    cost: { gold: 60, items: [{ itemId: 'steel-ingot', quantity: 2 }] },
  },
] as const satisfies readonly SmithOffer[]

export const SMITH_OFFERS: readonly SmithOffer[] = offerData

/** What the smith charges for `itemId`, or `undefined` if he does not stock it. */
export function getSmithOffer(itemId: string): SmithOffer | undefined {
  return SMITH_OFFERS.find((offer) => offer.itemId === itemId)
}

/** What is still missing to pay for an offer: coin short, then each material short. */
export interface SmithShortfall {
  gold: number
  items: SmithItemCost[]
}

/**
 * What `gold` and `held` (itemId → count across slots + hotbar) still lack to
 * cover `offer`, or `null` when the whole payment is there. The full cost is
 * validated up front, so a purchase can never be charged in part.
 */
export function smithShortfall(
  gold: number,
  held: Readonly<Record<string, number>>,
  offer: SmithOffer,
): SmithShortfall | null {
  const missingGold = Math.max(0, offer.cost.gold - gold)
  const missingItems: SmithItemCost[] = []
  for (const line of offer.cost.items) {
    const missing = Math.max(0, line.quantity - (held[line.itemId] ?? 0))
    if (missing > 0) {
      missingItems.push({ itemId: line.itemId, quantity: missing })
    }
  }
  if (missingGold === 0 && missingItems.length === 0) {
    return null
  }
  return { gold: missingGold, items: missingItems }
}

/**
 * A readable price label such as `"50 gold + 2 Steel Ingot"`. The item names
 * come from `nameFor` so this module never has to know the catalog.
 */
export function formatSmithCost(
  offer: SmithOffer,
  nameFor: (itemId: string) => string,
): string {
  const parts = [`${offer.cost.gold} gold`]
  for (const line of offer.cost.items) {
    parts.push(`${line.quantity} ${nameFor(line.itemId)}`)
  }
  return parts.join(' + ')
}
