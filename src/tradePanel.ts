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
import type { StatKey } from './inventory'
import { paintItemIcons } from './itemIcon'
import { formatStatBonus } from './itemTooltipModel'
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

type TradeTab = 'buy' | 'sell'

/** What an item does in one line: its stat bonuses for gear, its blurb otherwise. */
function effectLine(itemId: string): string {
  const item = getItemById(itemId)
  if (!item) return ''
  const bonuses = item.statBonuses
    ? Object.entries(item.statBonuses)
        .map(([key, value]) => formatStatBonus(key as StatKey, value))
        .join(', ')
    : ''
  return bonuses || item.description
}

interface TradeRowView {
  itemId: string
  name: string
  /** The explicit exchange, e.g. `Cost: 12 gold → Get: 1 Oak Sapling`. */
  deal: string
  /** Set when the row cannot be used; shown under the row instead of hidden in a toast. */
  reason: string | null
  held: number
  actions: string
}

/** One compact shop row: icon · name + effect · what you pay → what you get · have · buttons. */
function tradeRowHtml(view: TradeRowView): string {
  return `
        <div class="trade-row${view.reason ? ' is-disabled' : ''}">
          <span class="trade-row-icon"><span data-item-id="${view.itemId}"></span></span>
          <span class="trade-row-main">
            <span class="trade-row-name">${view.name}</span>
            <span class="trade-row-effect">${effectLine(view.itemId)}</span>
          </span>
          <span class="trade-row-deal">${view.deal}</span>
          <span class="trade-row-have">Have ${view.held}</span>
          <span class="trade-row-actions">${view.actions}</span>
          ${view.reason ? `<span class="trade-row-reason">${view.reason}</span>` : ''}
        </div>`
}

/** Buy rows: what each ware costs and how many you could afford right now. */
function buyRows(gold: number): string {
  return SHOP_OFFERS.map((offer) => {
    const name = getItemById(offer.itemId)?.name ?? offer.itemId
    const affordable = maxAffordable(gold, offer.price)
    return tradeRowHtml({
      itemId: offer.itemId,
      name,
      deal: `Cost: ${offer.price} gold → Get: 1 ${name}`,
      reason: affordable >= 1 ? null : `needs ${offer.price} gold (you have ${gold})`,
      held: countOffer(offer.itemId),
      actions: `
            <button type="button" data-buy="${offer.itemId}" data-qty="1" ${
              affordable >= 1 ? '' : 'disabled'
            } title="Buy 1">&#215;1</button>
            <button type="button" data-buy="${offer.itemId}" data-qty="10" ${
              affordable >= 10 ? '' : 'disabled'
            } title="Buy 10">&#215;10</button>`,
    })
  }).join('')
}

/** Sell rows: what the trader pays for a unit you carry. */
function sellRows(): string {
  return TRADE_OFFERS.map((offer) => {
    const name = getItemById(offer.itemId)?.name ?? offer.itemId
    const held = countOffer(offer.itemId)
    return tradeRowHtml({
      itemId: offer.itemId,
      name,
      deal: `Cost: 1 ${name} → Get: ${offer.price} gold`,
      reason: held >= 1 ? null : `needs 1 ${name} (you have 0)`,
      held,
      actions: `
            <button type="button" data-sell="${offer.itemId}" data-qty="1" ${
              held >= 1 ? '' : 'disabled'
            } title="Sell 1">&#215;1</button>
            <button type="button" data-sell="${offer.itemId}" data-qty="10" ${
              held >= 1 ? '' : 'disabled'
            } title="Sell 10">&#215;10</button>
            <button type="button" data-sell="${offer.itemId}" data-qty="all" ${
              held >= 1 ? '' : 'disabled'
            }>All</button>`,
    })
  }).join('')
}

/**
 * DOM overlay for talking to a trader. Mirrors `questPopup`: a fixed-id overlay
 * whose inner `render` closure rewrites itself from live store state, so gold
 * and wood counts stay truthful without the scene re-driving it. The shell is
 * a fixed header (role / name / greeting / gold), a Buy|Sell tab strip and a
 * footer, with only the list body scrolling — so Close never leaves the screen.
 */
export function showTradePanel(npc: NpcDefinition): void {
  closeTradePanel()

  const overlay = document.createElement('div')
  overlay.id = PANEL_ID
  document.body.appendChild(overlay)

  let tab: TradeTab = 'buy'

  const render = () => {
    const gold = getGold()

    overlay.innerHTML = `
      <div class="trade-panel">
        <div class="trade-header">
          <p class="trade-npc-role">${npc.role}</p>
          <h2>${npc.name}</h2>
          <p class="trade-npc-greeting">${npc.greeting}</p>
          <p class="trade-gold">${formatGold(gold)}</p>
        </div>
        <div class="trade-tabs">
          <button type="button" class="trade-tab${
            tab === 'buy' ? ' active' : ''
          }" data-tab="buy">Buy</button>
          <button type="button" class="trade-tab${
            tab === 'sell' ? ' active' : ''
          }" data-tab="sell">Sell</button>
        </div>
        <div class="trade-body">
          ${tab === 'buy' ? buyRows(gold) : sellRows()}
        </div>
        <div class="trade-footer">
          <button type="button" class="trade-close">Close</button>
        </div>
      </div>
    `

    paintItemIcons(overlay)

    overlay.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        tab = button.dataset.tab === 'sell' ? 'sell' : 'buy'
        render()
      })
    })

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
