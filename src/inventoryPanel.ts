import type { EquipSlot, InventoryState, SlotRef } from './inventory'
import {
  equipFromSlot,
  getItemById,
  moveStack,
  returnCursor,
  splitStack,
  subscribeInventory,
  unequipToSlot,
  updateInventory,
} from './inventory'
import { paintItemIcons } from './itemIcon'

const PANEL_ID = 'inventory-panel'

/** Slot the pointer is dragging from, while a drag is in flight. */
let dragSource: SlotRef | null = null

let unsubscribe: (() => void) | null = null

export function isInventoryPanelOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null
}

export function closeInventoryPanel(): void {
  const wasOpen = isInventoryPanelOpen()

  document.getElementById(PANEL_ID)?.remove()
  unsubscribe?.()
  unsubscribe = null
  dragSource = null

  // Park whatever the pointer was carrying. Runs after the panel is gone so the
  // store update reaches the hotbar and HUD without redrawing a removed panel.
  if (wasOpen) updateInventory(returnCursor)
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
 * The stack riding the pointer. Sits after `.inv-panel` so it paints over it without
 * needing a `z-index`, and is empty while nothing is held.
 */
function cursorMarkup(state: InventoryState): string {
  const cursor = state.cursor
  if (!cursor) return ''

  return `
    <div class="inv-cursor" aria-hidden="true">
      <span class="inv-slot-glyph" data-item-id="${cursor.itemId}"></span>
      ${cursor.quantity > 1 ? `<span class="inv-slot-count">${cursor.quantity}</span>` : ''}
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
    ${cursorMarkup(state)}
  `
}

function readSlotRef(element: Element): SlotRef | null {
  const container = element.getAttribute('data-container')
  const index = Number(element.getAttribute('data-index'))
  if ((container !== 'slots' && container !== 'hotbar') || !Number.isInteger(index)) return null
  return { container, index }
}

/**
 * Drag and drop, bound by delegation on the overlay so it survives the innerHTML
 * rewrite in `renderInventoryPanel`.
 *
 * Every drop routes through `updateInventory`, which persists and notifies — so the
 * panel redraws from the store rather than from a local guess, and the no-duplication
 * invariant is enforced by `moveStack`/`equipFromSlot` rather than by the DOM.
 */
function bindDragAndDrop(overlay: HTMLElement): void {
  overlay.addEventListener('dragstart', (event) => {
    const target = (event.target as Element).closest('[data-container]')
    const ref = target ? readSlotRef(target) : null
    if (!ref) return

    dragSource = ref
    event.dataTransfer?.setData('text/plain', `${ref.container}:${ref.index}`)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    target?.classList.add('inv-slot-dragging')
  })

  overlay.addEventListener('dragend', () => {
    dragSource = null
    overlay.querySelectorAll('.inv-slot-dragging').forEach((node) => {
      node.classList.remove('inv-slot-dragging')
    })
  })

  overlay.addEventListener('dragover', (event) => {
    if (!dragSource) return
    const target = (event.target as Element).closest(
      '[data-container], [data-equip]',
    )
    if (!target) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    target.classList.add('inv-slot-dragover')
  })

  overlay.addEventListener('dragleave', (event) => {
    const target = (event.target as Element).closest(
      '[data-container], [data-equip]',
    )
    target?.classList.remove('inv-slot-dragover')
  })

  overlay.addEventListener('drop', (event) => {
    const target = (event.target as Element).closest(
      '[data-container], [data-equip]',
    )
    if (!target || !dragSource) return
    event.preventDefault()
    target.classList.remove('inv-slot-dragover')

    const from = dragSource
    dragSource = null

    const equipSlot = target.getAttribute('data-equip') as EquipSlot | null
    if (equipSlot) {
      // `equipFromSlot` picks the gear slot from the item itself, so the drop is only
      // honoured when the dragged item really belongs in the slot under the pointer.
      // Whatever was already worn returns to the slot the dragged stack came from.
      updateInventory((current) => {
        const source = current[from.container][from.index]
        const item = source ? getItemById(source.itemId) : undefined
        if (!item || item.equipSlot !== equipSlot) return current
        return equipFromSlot(current, from).state
      })
      return
    }

    const to = readSlotRef(target)
    if (!to) return
    updateInventory((current) => moveStack(current, from, to))
  })

  // Right-click splits a stack in half; the split-off half takes the lowest free
  // slot, which is `splitStack`'s job.
  overlay.addEventListener('contextmenu', (event) => {
    const target = (event.target as Element).closest('[data-container]')
    const ref = target ? readSlotRef(target) : null
    if (!ref) return
    event.preventDefault()
    updateInventory((current) => splitStack(current, ref, 1))
  })

  // Double-clicking a stack wears it, and double-clicking a gear slot takes it off.
  overlay.addEventListener('dblclick', (event) => {
    const target = (event.target as Element).closest('[data-container], [data-equip]')
    if (!target) return

    const equipSlot = target.getAttribute('data-equip') as EquipSlot | null
    if (equipSlot) {
      updateInventory((current) => unequipToSlot(current, equipSlot).state)
      return
    }

    const ref = readSlotRef(target)
    if (!ref) return
    updateInventory((current) => equipFromSlot(current, ref).state)
  })
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
  paintItemIcons(overlay)
  document.body.appendChild(overlay)

  bindDragAndDrop(overlay)

  unsubscribe = subscribeInventory((next) => {
    renderInventoryPanel(next)
  })

  overlay.querySelector('#inventory-close')?.addEventListener('click', () => {
    closeInventoryPanel()
  })
}

/** Rewrites the panel's slots in place. No-op when the panel is closed. */
export function renderInventoryPanel(state: InventoryState): void {
  const overlay = document.getElementById(PANEL_ID)
  if (!overlay) return
  overlay.innerHTML = panelContent(state)
  paintItemIcons(overlay)
  overlay.querySelector('#inventory-close')?.addEventListener('click', () => {
    closeInventoryPanel()
  })
}