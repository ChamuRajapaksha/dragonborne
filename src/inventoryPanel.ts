import type { InventoryState } from './inventory'

const PANEL_ID = 'inventory-panel'

export function isInventoryPanelOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null
}

export function closeInventoryPanel(): void {
  document.getElementById(PANEL_ID)?.remove()
}

const EQUIP_SLOT_LABELS = {
  mainhand: 'Main Hand',
  head: 'Head',
  chest: 'Chest',
  legs: 'Legs',
} as const

function slotMarkup(
  container: 'hotbar' | 'slots',
  index: number,
  state: InventoryState,
): string {
  const stack = container === 'hotbar' ? state.hotbar[index] : state.slots[index]
  const label = `${container} ${index}`

  if (!stack) {
    return `<div class="inv-slot inv-slot-empty" data-container="${container}" data-index="${index}" aria-label="${label}"></div>`
  }

  return `
    <div class="inv-slot" data-container="${container}" data-index="${index}" aria-label="${label}">
      <span class="inv-slot-glyph" data-item-id="${stack.itemId}"></span>
      <span class="inv-slot-count">${stack.quantity}</span>
    </div>`
}

function equipSlotMarkup(
  slot: keyof typeof EQUIP_SLOT_LABELS,
  state: InventoryState,
): string {
  const stack = state.equipment[slot]
  const label = EQUIP_SLOT_LABELS[slot]

  if (!stack) {
    return `
      <div class="inv-equip-slot inv-slot-empty" data-equip="${slot}" aria-label="${label}">
        <span class="inv-equip-label">${label}</span>
      </div>`
  }

  return `
    <div class="inv-equip-slot" data-equip="${slot}" aria-label="${label}">
      <span class="inv-slot-glyph" data-item-id="${stack.itemId}"></span>
      <span class="inv-equip-label">${label}</span>
    </div>`
}

/**
 * Builds the panel's markup into a detached element. Slot contents are painted by
 * `renderInventoryPanel`, so opening and re-rendering share one code path.
 */
function panelContent(state: InventoryState): string {
  return `
    <div class="inv-panel">
      <h2 class="inv-title">Pack</h2>

      <div class="inv-equip">
        ${(Object.keys(EQUIP_SLOT_LABELS) as (keyof typeof EQUIP_SLOT_LABELS)[])
          .map((slot) => equipSlotMarkup(slot, state))
          .join('')}
      </div>

      <div class="inv-section-label">Hotbar</div>
      <div class="inv-grid inv-grid-hotbar">
        ${state.hotbar
          .map((_, index) => slotMarkup('hotbar', index, state))
          .join('')}
      </div>

      <div class="inv-section-label">Pack</div>
      <div class="inv-grid">
        ${state.slots.map((_, index) => slotMarkup('slots', index, state)).join('')}
      </div>

      <button id="inventory-close">Close</button>
    </div>
  `
}

/**
 * Opens the panel if it is closed. Idempotent — calling it twice does not stack
 * overlays.
 */
export function showInventoryPanel(state: InventoryState): void {
  if (isInventoryPanelOpen()) return

  const overlay = document.createElement('div')
  overlay.id = PANEL_ID
  overlay.innerHTML = panelContent(state)
  document.body.appendChild(overlay)

  overlay.querySelector('#inventory-close')?.addEventListener('click', () => {
    closeInventoryPanel()
  })
}

/** Rewrites the panel's slots in place. No-op when the panel is closed. */
export function renderInventoryPanel(state: InventoryState): void {
  const overlay = document.getElementById(PANEL_ID)
  if (!overlay) return
  overlay.innerHTML = panelContent(state)
  overlay.querySelector('#inventory-close')?.addEventListener('click', () => {
    closeInventoryPanel()
  })
}