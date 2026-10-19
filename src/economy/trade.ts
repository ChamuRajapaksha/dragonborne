/**
 * Trader price tables. Pure data — the trader buys what `TRADE_OFFERS` lists and
 * sells what `SHOP_OFFERS` lists, at a flat price per unit. Future traders or
 * goods extend these lists.
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

export interface ShopOffer {
  itemId: string
  /** Gold the buyer pays per unit. */
  price: number
}

const shopData = [
  {
    itemId: 'sapling',
    price: 12,
  },
] as const satisfies readonly ShopOffer[]

export const SHOP_OFFERS: readonly ShopOffer[] = shopData

/** What the trader charges per unit of `itemId`, or `undefined` if it is not sold here. */
export function getShopPrice(itemId: string): number | undefined {
  return SHOP_OFFERS.find((offer) => offer.itemId === itemId)?.price
}

/**
 * How many units `gold` covers at `price` each. Zero or negative gold buys
 * nothing; a non-positive price is treated as unsellable rather than free.
 */
export function maxAffordable(gold: number, price: number): number {
  if (gold <= 0 || price <= 0) return 0
  return Math.floor(gold / price)
}
