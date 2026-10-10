import type { EquipSlot, InventoryState, SlotRef } from './inventory'
import {
  equipCursor,
  equipFromSlot,
  getItemById,
  moveGearToSlot,
  moveStack,
  pickUpGear,
  pickUpHalf,
  pickUpSlot,
  placeCursor,
  placeOne,
  returnCursor,
  subscribeInventory,
  updateInventory,
} from './inventory'
import { paintItemIcons } from './itemIcon'
import { showToast } from './toast'

const PANEL_ID = 'inventory-panel'

/** What the pointer is dragging, while a drag is in flight. */
type DragSource =
  | { kind: 'slot'; ref: SlotRef }
  | { kind: 'gear'; slot: EquipSlot }

let dragSource: DragSource | null = null

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
    <div class="inv-slot" draggable="true" data-container="${container}" data-index="${index}" aria-label="${label}">
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
    <div class="inv-equip-slot" draggable="true" data-equip="${slot}" aria-label="${label}">
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

/**
 * A left or right click on a gear slot. With empty hands it lifts the worn item into
 * the cursor; while carrying it equips the item when it belongs in that slot, and
 * toasts otherwise. Gear stacks are always one, so both mouse buttons do the same.
 */
function activateGearSlot(equipSlot: EquipSlot): void {
  let refused = false

  updateInventory((current) => {
    if (!current.cursor) return pickUpGear(current, equipSlot)

    const result = equipCursor(current, equipSlot)
    refused = !result.ok
    return result.state
  })

  if (refused) showToast('That item does not fit there')
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
    const element = event.target as Element

    const gearTarget = element.closest('[data-equip]')
    if (gearTarget) {
      const slot = gearTarget.getAttribute('data-equip') as EquipSlot
      dragSource = { kind: 'gear', slot }
      event.dataTransfer?.setData('text/plain', `gear:${slot}`)
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
      gearTarget.classList.add('inv-slot-dragging')
      return
    }

    const target = element.closest('[data-container]')
    const ref = target ? readSlotRef(target) : null
    if (!ref) return

    dragSource = { kind: 'slot', ref }
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
      // Worn gear cannot be dropped onto another gear slot; only carryable slots feed
      // the gear slots, and `equipFromSlot` picks the slot from the item itself.
      if (from.kind === 'gear') {
        showToast('Gear goes back to the pack')
        return
      }

      let fitted = true
      updateInventory((current) => {
        const source = current[from.ref.container][from.ref.index]
        const item = source ? getItemById(source.itemId) : undefined
        if (!item || item.equipSlot !== equipSlot) {
          fitted = false
          return current
        }
        return equipFromSlot(current, from.ref).state
      })
      if (!fitted) showToast('That item does not fit there')
      return
    }

    const to = readSlotRef(target)
    if (!to) return

    if (from.kind === 'gear') {
      let moved = false
      updateInventory((current) => {
        const result = moveGearToSlot(current, from.slot, to)
        moved = result.ok
        return result.state
      })
      if (!moved) showToast('That slot holds something else')
      return
    }

    updateInventory((current) => moveStack(current, from.ref, to))
  })

  // Clicking a slot or a gear slot: an empty hand picks the stack up, a full one
  // places it. Gear slots equip or unequip instead; see `activateGearSlot`.
  overlay.addEventListener('click', (event) => {
    const element = event.target as Element

    const gear = element.closest('[data-equip]')
    if (gear) {
      activateGearSlot(gear.getAttribute('data-equip') as EquipSlot)
      return
    }

    const target = element.closest('[data-container]')
    const ref = target ? readSlotRef(target) : null
    if (!ref) return

    updateInventory((current) =>
      current.cursor ? placeCursor(current, ref) : pickUpSlot(current, ref),
    )
  })

  // Right-clicking behaves like left-clicking on gear: half a stack comes up from the
  // pack with empty hands, and one unit goes down from the hand that holds it.
  overlay.addEventListener('contextmenu', (event) => {
    const element = event.target as Element

    const gear = element.closest('[data-equip]')
    if (gear) {
      event.preventDefault()
      activateGearSlot(gear.getAttribute('data-equip') as EquipSlot)
      return
    }

    const target = element.closest('[data-container]')
    const ref = target ? readSlotRef(target) : null
    if (!ref) return
    event.preventDefault()
    updateInventory((current) =>
      current.cursor ? placeOne(current, ref) : pickUpHalf(current, ref),
    )
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