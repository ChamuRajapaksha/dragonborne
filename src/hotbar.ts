import { getInventory, getItemById, HOTBAR_SLOT_COUNT, type InventoryState } from './inventory'
import { paintItemIcons } from './itemIcon'
import { buildTooltipModel } from './itemTooltipModel'
import { hideItemTooltip, moveItemTooltip, showItemTooltip } from './itemTooltip'

const HOTBAR_ID = 'hotbar'

export function isHotbarMounted(): boolean {
  return document.getElementById(HOTBAR_ID) !== null
}

export function destroyHotbar(): void {
  hideItemTooltip()
  document.getElementById(HOTBAR_ID)?.remove()
}

function slotMarkup(state: InventoryState, index: number): string {
  const stack = state.hotbar[index]
  const selected = state.selectedHotbarSlot === index ? ' inv-slot-selected' : ''
  const key = index + 1

  if (!stack) {
    return `<div class="hotbar-slot inv-slot-empty${selected}" data-hotbar-index="${index}" aria-label="Slot ${key}"><span class="hotbar-key">${key}</span></div>`
  }

  return `
    <div class="hotbar-slot${selected}" data-hotbar-index="${index}" aria-label="Slot ${key}">
      <span class="hotbar-key">${key}</span>
      <span class="inv-slot-glyph" data-item-id="${stack.itemId}"></span>
      ${stack.quantity > 1 ? `<span class="inv-slot-count">${stack.quantity}</span>` : ''}
    </div>`
}

/**
 * Hover tooltips for the bottom hotbar. The hotbar element survives `renderHotbar`
 * (only its innerHTML is rewritten), so binding here once per mount is enough; the
 * same cached-slot pattern as the pack panel avoids rebuilding the tooltip on every
 * pixel of movement.
 */
function bindHotbarTooltips(element: HTMLElement): void {
  let hoveredSlot: Element | null = null

  element.addEventListener('mousemove', (event) => {
    const slot = (event.target as Element).closest('[data-hotbar-index]')
    if (!slot) {
      hoveredSlot = null
      hideItemTooltip()
      return
    }

    if (slot === hoveredSlot) {
      moveItemTooltip(slot.getBoundingClientRect())
      return
    }

    hoveredSlot = slot

    const index = Number(slot.getAttribute('data-hotbar-index'))
    const stack = Number.isInteger(index) ? getInventory().hotbar[index] : null
    const item = stack ? getItemById(stack.itemId) : undefined
    if (!stack || !item) {
      hideItemTooltip()
      return
    }

    showItemTooltip(buildTooltipModel(item, { quantity: stack.quantity }), item.id)
    moveItemTooltip(slot.getBoundingClientRect())
  })

  element.addEventListener('mouseleave', () => {
    hoveredSlot = null
    hideItemTooltip()
  })
}

/**
 * Appends the hotbar to the page. Safe to call twice — an existing hotbar is torn
 * down first, so a `scene.restart` can't leave two sets of slots on screen.
 */
export function mountHotbar(state: InventoryState): void {
  destroyHotbar()

  const element = document.createElement('div')
  element.id = HOTBAR_ID
  element.innerHTML = Array.from({ length: HOTBAR_SLOT_COUNT }, (_, index) =>
    slotMarkup(state, index),
  ).join('')
  paintItemIcons(element)

  document.body.appendChild(element)
  bindHotbarTooltips(element)
}

/** Redraws the mounted hotbar in place. No-op when it is not mounted. */
export function renderHotbar(state: InventoryState): void {
  const element = document.getElementById(HOTBAR_ID)
  if (!element) return

  // Same stale-tooltip issue as the pack panel: the rewrite destroys the hovered slot.
  hideItemTooltip()
  element.innerHTML = Array.from({ length: HOTBAR_SLOT_COUNT }, (_, index) =>
    slotMarkup(state, index),
  ).join('')
  paintItemIcons(element)
}