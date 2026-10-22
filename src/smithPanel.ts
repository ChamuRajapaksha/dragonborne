/**
 * DOM overlay for Brennan's smithy. Mirrors `tradePanel`: a fixed-id overlay
 * whose inner `render` closure rewrites itself from live store state, so gold
 * and material counts stay truthful without the scene re-driving it. Every ware
 * costs gold AND materials, so affordability folds through `smithShortfall`
 * before the buy button is even offered — the purchase flow never sees a cost
 * it cannot charge in full. An "Ask about work" button layers his quest popup
 * on top of the shop; closing quests lands back on the wares.
 */
import {
  SMITH_OFFERS,
  formatGold,
  formatSmithCost,
  getGold,
  getSmithOffer,
  smithShortfall,
  updateGold,
} from './economy'
import type { SmithOffer, SmithShortfall } from './economy'
import {
  addItem,
  countItem,
  getItemById,
  getInventory,
  removeItemEverywhere,
  updateInventory,
} from './inventory'
import type { NpcDefinition } from './story'
import { showQuestPopup } from './questPopup'
import { showToast } from './toast'

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

/** Human-readable toasts for a failed payment — coin short, then materials. */
function nameShortfall(missing: SmithShortfall): string[] {
  const messages: string[] = []
  if (missing.gold > 0) messages.push(`Need ${missing.gold} more gold`)
  for (const line of missing.items) {
    messages.push(`Need ${line.quantity} more ${nameFor(line.itemId)}`)
  }
  return messages
}

/**
 * Buys one ware. The whole payment is pre-validated, then the ware is added
 * first — a full pack toasts and charges nothing — and gold plus materials are
 * only deducted for a ware that actually landed.
 */
function buy(itemId: string): void {
  const offer = getSmithOffer(itemId)
  if (!offer) return

  const missing = smithShortfall(getGold(), heldByMaterial(), offer)
  if (missing) {
    for (const message of nameShortfall(missing)) showToast(message)
    return
  }

  let received = 0
  updateInventory((current) => {
    const intoHotbar = addItem(current, itemId, 1, 'hotbar')
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

  updateGold(-offer.cost.gold)
  for (const line of offer.cost.items) {
    updateInventory((current) => removeItemEverywhere(current, line.itemId, line.quantity).state)
  }

  showToast(`Bought ${nameFor(itemId)} for ${formatSmithCost(offer, nameFor)}`)
}

export function showSmithPanel(
  npc: NpcDefinition,
  classId: string,
  stats: Record<string, number>,
): void {
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
        <button type="button" class="smith-jobs">Ask about work</button>
        <button type="button" class="trade-close">Close</button>
      </div>
    `

    overlay.querySelectorAll<HTMLButtonElement>('[data-smith-buy]').forEach((button) => {
      button.addEventListener('click', () => {
        buy(button.dataset.smithBuy!)
        render()
      })
    })

    overlay.querySelector('.smith-jobs')!.addEventListener('click', () => {
      showQuestPopup(npc, classId, stats)
    })

    overlay.querySelector('.trade-close')!.addEventListener('click', () => {
      overlay.remove()
    })
  }

  render()
}
