import {
  SHOP_OFFERS,
  TRADE_OFFERS,
  formatGold,
  getGold,
  getShopPrice,
  getTradePrice,
  maxAffordable,
  updateGold,
} from './economy'
import {
  addItem,
  countItem,
  getItemById,
  getInventory,
  removeItemEverywhere,
  updateInventory,
} from './inventory'
import type { NpcDefinition } from './story'
import { showToast } from './toast'

const PANEL_ID = 'trade-popup'

export function isTradePanelOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null
}

export function closeTradePanel(): void {
  document.getElementById(PANEL_ID)?.remove()
}

/** Wood the player carries across the pack and the hotbar. */
function countOffer(itemId: string): number {
  const state = getInventory()
  return countItem(state, itemId, 'slots') + countItem(state, itemId, 'hotbar')
}

/**
 * Drains up to `quantity` of `itemId` from the pack and hotbar, then credits the
 * gold actually earned. Nothing is paid for wood that was not removed.
 */
function sell(itemId: string, quantity: number): void {
  const price = getTradePrice(itemId) ?? 0
  let removed = 0

  updateInventory((current) => {
    const result = removeItemEverywhere(current, itemId, quantity)
    removed = result.removed
    return result.state
  })

  if (removed <= 0) {
    showToast('Nothing to sell')
    return
  }

  updateGold(removed * price)
  const name = getItemById(itemId)?.name ?? itemId
  showToast(`+${removed * price} gold for ${removed} ${name}`)
}

/**
 * Fills the hotbar first so the purchase is visible without opening the pack,
 * then the grid. Gold is deducted only for units actually received — `updateGold`
 * clamps at zero, so over-deducting would silently burn the shortfall.
 */
function buy(itemId: string, quantity: number): void {
  const price = getShopPrice(itemId) ?? 0
  const wanted = Math.min(quantity, maxAffordable(getGold(), price))

  if (wanted <= 0) {
    showToast('Not enough gold')
    return
  }

  let received = 0
  updateInventory((current) => {
    const intoHotbar = addItem(current, itemId, wanted, 'hotbar')
    const result =
      intoHotbar.remainder > 0
        ? addItem(intoHotbar.state, itemId, intoHotbar.remainder, 'slots')
        : intoHotbar
    received = result.added
    return result.state
  })

  if (received <= 0) {
    showToast('Your pack is full')
    return
  }

  updateGold(-received * price)
  const name = getItemById(itemId)?.name ?? itemId
  showToast(`-${received * price} gold for ${received} ${name}`)
}

/**
 * DOM overlay for talking to a trader. Mirrors `questPopup`: a fixed-id overlay
 * whose inner `render` closure rewrites itself from live store state, so gold
 * and wood counts stay truthful without the scene re-driving it.
 */
export function showTradePanel(npc: NpcDefinition): void {
  closeTradePanel()

  const overlay = document.createElement('div')
  overlay.id = PANEL_ID
  document.body.appendChild(overlay)

  const render = () => {
    const gold = getGold()
    const shop = SHOP_OFFERS.map((offer) => {
      const affordable = maxAffordable(gold, offer.price)
      return {
        itemId: offer.itemId,
        name: getItemById(offer.itemId)?.name ?? offer.itemId,
        price: offer.price,
        held: countOffer(offer.itemId),
        canBuy1: affordable >= 1,
        canBuy10: affordable >= 10,
      }
    })
    const offers = TRADE_OFFERS.map((offer) => ({
      itemId: offer.itemId,
      name: getItemById(offer.itemId)?.name ?? offer.itemId,
      price: offer.price,
      held: countOffer(offer.itemId),
    }))

    overlay.innerHTML = `
      <div class="trade-panel">
        <p class="trade-npc-role">${npc.role}</p>
        <h2>${npc.name}</h2>
        <p class="trade-npc-greeting">${npc.greeting}</p>
        <p class="trade-gold">${formatGold(gold)}</p>
        <h3 class="trade-section-label">Buy</h3>
        ${shop
          .map(
            (offer) => `
        <div class="trade-card">
          <h3>${offer.name}</h3>
          <p>
            <span class="trade-price">${offer.price} gold each</span>
            <span class="trade-held">You hold ${offer.held}</span>
          </p>
          <div class="trade-actions">
            <button type="button" data-buy="${offer.itemId}" data-qty="1" ${
              offer.canBuy1 ? '' : 'disabled'
            }>Buy 1</button>
            <button type="button" data-buy="${offer.itemId}" data-qty="10" ${
              offer.canBuy10 ? '' : 'disabled'
            }>Buy 10</button>
          </div>
        </div>`,
          )
          .join('')}
        <h3 class="trade-section-label">Sell</h3>
        ${offers
          .map(
            (offer) => `
        <div class="trade-card">
          <h3>${offer.name}</h3>
          <p>
            <span class="trade-price">${offer.price} gold each</span>
            <span class="trade-held">You hold ${offer.held}</span>
          </p>
          <div class="trade-actions">
            <button type="button" data-sell="${offer.itemId}" data-qty="1" ${
              offer.held < 1 ? 'disabled' : ''
            }>Sell 1</button>
            <button type="button" data-sell="${offer.itemId}" data-qty="10" ${
              offer.held < 1 ? 'disabled' : ''
            }>Sell 10</button>
            <button type="button" data-sell="${offer.itemId}" data-qty="all" ${
              offer.held < 1 ? 'disabled' : ''
            }>Sell All</button>
          </div>
        </div>`,
          )
          .join('')}
        <button type="button" class="trade-close">Close</button>
      </div>
    `

    overlay.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((button) => {
      button.addEventListener('click', () => {
        buy(button.dataset.buy!, Number(button.dataset.qty))
        render()
      })
    })

    overlay.querySelectorAll<HTMLButtonElement>('[data-sell]').forEach((button) => {
      button.addEventListener('click', () => {
        const itemId = button.dataset.sell!
        const qty = button.dataset.qty
        const held = countOffer(itemId)
        sell(itemId, qty === 'all' ? held : Math.min(Number(qty), held))
        render()
      })
    })

    overlay.querySelector('.trade-close')!.addEventListener('click', () => {
      overlay.remove()
    })
  }

  render()
}
