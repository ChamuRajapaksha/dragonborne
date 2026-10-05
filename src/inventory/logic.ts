import { getItemById } from './catalog'
import type { EquipSlot, InventoryState, ItemStack } from './types'
import { EQUIP_SLOTS, HOTBAR_SLOT_COUNT, INVENTORY_SLOT_COUNT } from './types'

export function createEmptyInventory(): InventoryState {
  const equipment = Object.fromEntries(
    EQUIP_SLOTS.map((slot) => [slot, null]),
  ) as Record<EquipSlot, null>

  return {
    version: 1,
    slots: Array<ItemStack | null>(INVENTORY_SLOT_COUNT).fill(null),
    hotbar: Array<ItemStack | null>(HOTBAR_SLOT_COUNT).fill(null),
    equipment,
    selectedHotbarSlot: 0,
  }
}

/** Which stack array an operation applies to. Equipment is not a container. */
export type ItemContainer = 'slots' | 'hotbar'

function readContainer(state: InventoryState, container: ItemContainer): (ItemStack | null)[] {
  return container === 'hotbar' ? state.hotbar : state.slots
}

function writeContainer(
  state: InventoryState,
  container: ItemContainer,
  contents: (ItemStack | null)[],
): InventoryState {
  return container === 'hotbar' ? { ...state, hotbar: contents } : { ...state, slots: contents }
}

export interface AddItemResult {
  state: InventoryState
  added: number
  /** Left over because the container was full. Callers must keep this on the ground. */
  remainder: number
}

/**
 * Adds `quantity` of `itemId`, topping up partial stacks at the lowest slot index
 * first, then filling empty slots. Never mutates `state` or the stacks it holds.
 */
export function addItem(
  state: InventoryState,
  itemId: string,
  quantity: number,
  container: ItemContainer = 'slots',
): AddItemResult {
  const item = getItemById(itemId)
  if (!item || quantity <= 0) return { state, added: 0, remainder: Math.max(quantity, 0) }

  const contents = readContainer(state, container).map((stack) =>
    stack ? { ...stack } : null,
  )

  let remaining = quantity

  for (const stack of contents) {
    if (remaining <= 0) break
    if (!stack || stack.itemId !== itemId) continue
    const room = item.maxStack - stack.quantity
    if (room <= 0) continue
    const moved = Math.min(room, remaining)
    stack.quantity += moved
    remaining -= moved
  }

  for (let index = 0; index < contents.length && remaining > 0; index += 1) {
    if (contents[index]) continue
    const moved = Math.min(item.maxStack, remaining)
    contents[index] = { itemId, quantity: moved }
    remaining -= moved
  }

  return {
    state: writeContainer(state, container, contents),
    added: quantity - remaining,
    remainder: remaining,
  }
}

export interface RemoveItemResult {
  state: InventoryState
  removed: number
  /** Short of what was asked for, because the container did not hold enough. */
  shortfall: number
}

/**
 * Removes up to `quantity` of `itemId`, emptying the lowest-indexed stack first.
 * Never mutates `state` or the stacks it holds.
 */
export function removeItem(
  state: InventoryState,
  itemId: string,
  quantity: number,
  container: ItemContainer = 'slots',
): RemoveItemResult {
  if (quantity <= 0) return { state, removed: 0, shortfall: 0 }

  const contents = readContainer(state, container).map((stack) =>
    stack ? { ...stack } : null,
  )
  let remaining = quantity

  for (let index = 0; index < contents.length && remaining > 0; index += 1) {
    const stack = contents[index]
    if (!stack || stack.itemId !== itemId) continue
    const taken = Math.min(stack.quantity, remaining)
    remaining -= taken
    const left = stack.quantity - taken
    contents[index] = left > 0 ? { itemId, quantity: left } : null
  }

  return {
    state: writeContainer(state, container, contents),
    removed: quantity - remaining,
    shortfall: remaining,
  }
}

/** Total of `itemId` held in one container. */
export function countItem(
  state: InventoryState,
  itemId: string,
  container: ItemContainer = 'slots',
): number {
  return readContainer(state, container).reduce(
    (total, stack) => (stack && stack.itemId === itemId ? total + stack.quantity : total),
    0,
  )
}

/** Capacity left for `itemId` in one container, respecting per-item stack limits. */
export function remainingCapacity(
  state: InventoryState,
  itemId: string,
  container: ItemContainer = 'slots',
): number {
  const item = getItemById(itemId)
  if (!item) return 0
  return item.maxStack * readContainer(state, container).length - countItem(state, itemId, container)
}
