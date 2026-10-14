import { formatGold, getGold, getTradePrice } from './economy'
import { countItem, getItemById, getInventory } from './inventory'
import type { NpcDefinition } from './story'

const PANEL_ID = 'trade-popup'

export function isTradePanelOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null
}

export function closeTradePanel(): void {
  document.getElementById(PANEL_ID)?.remove()
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
    const state = getInventory()

    const offers = [
      {
        itemId: 'wood',
        name: getItemById('wood')?.name ?? 'Wood',
        price: getTradePrice('wood') ?? 0,
        held: countItem(state, 'wood', 'slots') + countItem(state, 'wood', 'hotbar'),
      },
    ]

    overlay.innerHTML = `
      <div class="trade-panel">
        <p class="trade-npc-role">${npc.role}</p>
        <h2>${npc.name}</h2>
        <p class="trade-npc-greeting">${npc.greeting}</p>
        <p class="trade-gold">${formatGold(getGold())}</p>
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
            <button type="button" data-sell="${offer.itemId}" data-qty="1">Sell 1</button>
            <button type="button" data-sell="${offer.itemId}" data-qty="10">Sell 10</button>
            <button type="button" data-sell="${offer.itemId}" data-qty="all">Sell All</button>
          </div>
        </div>`,
          )
          .join('')}
        <button type="button" class="trade-close">Close</button>
      </div>
    `

    overlay.querySelector('.trade-close')!.addEventListener('click', () => {
      overlay.remove()
    })
  }

  render()
}
