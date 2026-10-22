/**
 * DOM overlay for Brennan's smithy. Mirrors `tradePanel`: a fixed-id overlay
 * whose inner `render` closure rewrites itself from live store state, so gold
 * and material counts stay truthful without the scene re-driving it. Every ware
 * costs gold AND materials, so affordability folds through `smithShortfall`
 * before the buy button is even offered — the purchase flow never sees a cost
 * it cannot charge in full.
 */
import {
  SMITH_OFFERS,
  formatGold,
  formatSmithCost,
  getGold,
  smithShortfall,
} from './economy'
import type { SmithOffer } from './economy'
import { countItem, getItemById, getInventory } from './inventory'
import type { NpcDefinition } from './story'

const PANEL_ID = 'smith-popup'

export function isSmithPanelOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null
}

export function closeSmithPanel(): void {
  document.getElementById(PANEL_ID)?.remove()
}

function nameFor(itemId: string): string {
  return getItemById(itemId)?.name ?? itemId
}

/** One material count across the pack and the hotbar. */
function countHeld(itemId: string): number {
  const state = getInventory()
  return countItem(state, itemId, 'slots') + countItem(state, itemId, 'hotbar')
}

/** Every cost material the smith accepts, held count included. */
function heldByMaterial(): Record<string, number> {
  const held: Record<string, number> = {}
  for (const offer of SMITH_OFFERS) {
    for (const line of offer.cost.items) {
      if (held[line.itemId] === undefined) held[line.itemId] = countHeld(line.itemId)
    }
  }
  return held
}

interface SmithWareView {
  itemId: string
  name: string
  cost: string
  held: string
  affordable: boolean
}

function wareView(offer: SmithOffer, gold: number, held: Record<string, number>): SmithWareView {
  const missing = smithShortfall(gold, held, offer)
  return {
    itemId: offer.itemId,
    name: nameFor(offer.itemId),
    cost: formatSmithCost(offer, nameFor),
    held: offer.cost.items
      .map((line) => `You hold ${held[line.itemId] ?? 0} ${nameFor(line.itemId)}`)
      .join(' · '),
    affordable: missing === null,
  }
}

export function showSmithPanel(npc: NpcDefinition): void {
  closeSmithPanel()

  const overlay = document.createElement('div')
  overlay.id = PANEL_ID
  document.body.appendChild(overlay)

  const render = () => {
    const gold = getGold()
    const held = heldByMaterial()
    const wares = SMITH_OFFERS.map((offer) => wareView(offer, gold, held))

    overlay.innerHTML = `
      <div class="trade-panel smith-panel">
        <p class="trade-npc-role">${npc.role}</p>
        <h2>${npc.name}</h2>
        <p class="trade-npc-greeting">${npc.greeting}</p>
        <p class="trade-gold">${formatGold(gold)}</p>
        <h3 class="trade-section-label">Wares</h3>
        ${wares
          .map(
            (ware) => `
        <div class="trade-card">
          <h3>${ware.name}</h3>
          <p>
            <span class="trade-price">${ware.cost}</span>
            <span class="trade-held">${ware.held}</span>
          </p>
          <div class="trade-actions">
            <button type="button" data-smith-buy="${ware.itemId}" ${
              ware.affordable ? '' : 'disabled'
            }>Buy 1</button>
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
