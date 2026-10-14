/**
 * Trader price table. Pure data — the trader buys exactly what is listed here,
 * at a flat price per unit. Future traders or goods extend this list.
 */

export interface TradeOffer {
  itemId: string
  /** Gold paid per unit sold. */
  price: number
}

const offerData = [
  {
    itemId: 'wood',
    price: 4,
  },
] as const satisfies readonly TradeOffer[]

export const TRADE_OFFERS: readonly TradeOffer[] = offerData

/** What the trader pays per unit of `itemId`, or `undefined` if it is not bought here. */
export function getTradePrice(itemId: string): number | undefined {
  return TRADE_OFFERS.find((offer) => offer.itemId === itemId)?.price
}
