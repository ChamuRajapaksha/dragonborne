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
import type { ItemKind, StatKey } from './inventory'
import type { NpcDefinition } from './story'
import { paintItemIcons } from './itemIcon'
import { formatStatBonus } from './itemTooltipModel'
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

/** The smith's category chips, in display order. `Materials` is the resource kind. */
const CHIPS: readonly { id: ItemKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armour', label: 'Armour' },
  { id: 'tool', label: 'Tools' },
  { id: 'resource', label: 'Materials' },
]

type SmithChip = ItemKind | 'all'

/** What a ware does in one line: its stat bonuses, or its blurb otherwise. */
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

/**
 * `50 gold + 2 Steel Ingot`, each component coloured by whether you cover it —
 * green when owned, red when short, both decided by the same `smithShortfall`
 * that gates the purchase.
 */
function costHtml(offer: SmithOffer, missing: SmithShortfall | null): string {
  const shortGold = (missing?.gold ?? 0) > 0
  const shortItems = new Set(missing?.items.map((line) => line.itemId) ?? [])
  const parts = [
    `<span class="${shortGold ? 'cost-short' : 'cost-met'}">${offer.cost.gold} gold</span>`,
    ...offer.cost.items.map(
      (line) =>
        `<span class="${shortItems.has(line.itemId) ? 'cost-short' : 'cost-met'}">${
          line.quantity
        } ${nameFor(line.itemId)}</span>`,
    ),
  ]
  return parts.join(' + ')
}

/** Why a ware is unaffordable: coin short first, then each material short. */
function shortfallReason(
  missing: SmithShortfall,
  gold: number,
  held: Readonly<Record<string, number>>,
): string {
  const parts: string[] = []
  if (missing.gold > 0) parts.push(`needs ${missing.gold} more gold (you have ${gold})`)
  for (const line of missing.items) {
    parts.push(
      `needs ${line.quantity} ${nameFor(line.itemId)} (you have ${held[line.itemId] ?? 0})`,
    )
  }
  return parts.join(', ')
}

function smithRowHtml(
  offer: SmithOffer,
  gold: number,
  held: Readonly<Record<string, number>>,
): string {
  const itemId = offer.itemId
  const missing = smithShortfall(gold, held, offer)
  return `
        <div class="trade-row${missing ? ' is-disabled' : ''}">
          <span class="trade-row-icon"><span data-item-id="${itemId}"></span></span>
          <span class="trade-row-main">
            <span class="trade-row-name">${nameFor(itemId)}</span>
            <span class="trade-row-effect">${effectLine(itemId)}</span>
          </span>
          <span class="trade-row-deal">${costHtml(offer, missing)}</span>
          <span class="trade-row-actions">
            <button type="button" data-smith-buy="${itemId}" ${
              missing ? 'disabled' : ''
            }>Buy</button>
          </span>
          ${
            missing
              ? `<span class="trade-row-reason">${shortfallReason(missing, gold, held)}</span>`
              : ''
          }
        </div>`
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

  let chip: SmithChip = 'all'

  const render = () => {
    const gold = getGold()
    const held = heldByMaterial()
    const wares = SMITH_OFFERS.filter(
      (offer) => chip === 'all' || (getItemById(offer.itemId)?.kind ?? 'resource') === chip,
    )

    overlay.innerHTML = `
      <div class="trade-panel">
        <div class="trade-header">
          <p class="trade-npc-role">${npc.role}</p>
          <h2>${npc.name}</h2>
          <p class="trade-npc-greeting">${npc.greeting}</p>
          <p class="trade-gold">${formatGold(gold)}</p>
        </div>
        <div class="trade-tabs">
          ${CHIPS.map(
            (entry) => `
          <button type="button" class="trade-tab${
            chip === entry.id ? ' active' : ''
          }" data-chip="${entry.id}">${entry.label}</button>`,
          ).join('')}
        </div>
        <div class="trade-body">
          ${
            wares.length === 0
              ? '<p class="trade-empty">Nothing in this category yet</p>'
              : wares.map((offer) => smithRowHtml(offer, gold, held)).join('')
          }
        </div>
        <div class="trade-footer">
          <button type="button" class="smith-jobs">Ask about work</button>
          <button type="button" class="trade-close">Close</button>
        </div>
      </div>
    `

    paintItemIcons(overlay)

    overlay.querySelectorAll<HTMLButtonElement>('[data-chip]').forEach((button) => {
      button.addEventListener('click', () => {
        chip = (button.dataset.chip as SmithChip) ?? 'all'
        render()
      })
    })

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
