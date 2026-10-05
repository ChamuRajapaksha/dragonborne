import { HOTBAR_SLOT_COUNT, type InventoryState } from './inventory'
import { paintItemIcons } from './itemIcon'

const HOTBAR_ID = 'hotbar'

export function isHotbarMounted(): boolean {
  return document.getElementById(HOTBAR_ID) !== null
}

export function destroyHotbar(): void {
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
}

/** Redraws the mounted hotbar in place. No-op when it is not mounted. */
export function renderHotbar(state: InventoryState): void {
  const element = document.getElementById(HOTBAR_ID)
  if (!element) return

  element.innerHTML = Array.from({ length: HOTBAR_SLOT_COUNT }, (_, index) =>
    slotMarkup(state, index),
  ).join('')
  paintItemIcons(element)
}