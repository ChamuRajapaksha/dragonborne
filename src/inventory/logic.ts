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

/** Addresses one of the 36 carryable slots: 9 hotbar + 27 grid. */
export interface SlotRef {
  container: ItemContainer
  index: number
}

function readSlot(state: InventoryState, ref: SlotRef): ItemStack | null {
  return readContainer(state, ref.container)[ref.index] ?? null
}

function writeSlot(
  state: InventoryState,
  ref: SlotRef,
  stack: ItemStack | null,
): InventoryState {
  const contents = readContainer(state, ref.container).slice()
  contents[ref.index] = stack
  return writeContainer(state, ref.container, contents)
}

function isSameSlot(a: SlotRef, b: SlotRef): boolean {
  return a.container === b.container && a.index === b.index
}

function isInRange(state: InventoryState, ref: SlotRef): boolean {
  const contents = readContainer(state, ref.container)
  return ref.index >= 0 && ref.index < contents.length
}

/**
 * Moves or swaps the stack at `from` into `to`. Both may live in different
 * containers, so a hotbar slot can be dropped into the grid and back.
 *
 * Merging rules, in order:
 * - empty target — the stack moves whole;
 * - same item and the target has room — the stacks merge;
 * - otherwise — the two slots swap, so nothing is ever lost or duplicated.
 *
 * Returns `state` unchanged for an empty source or an out-of-range index.
 */
export function moveStack(
  state: InventoryState,
  from: SlotRef,
  to: SlotRef,
): InventoryState {
  if (isSameSlot(from, to)) return state

  const source = readSlot(state, from)
  const target = readSlot(state, to)
  if (!source || !isInRange(state, to)) return state

  const freed = writeSlot(state, from, null)
  if (!target) return writeSlot(freed, to, source)

  const item = getItemById(source.itemId)
  const room = item ? item.maxStack - target.quantity : 0

  if (
    item &&
    source.itemId === target.itemId &&
    source.quantity <= room
  ) {
    const merged: ItemStack = {
      itemId: source.itemId,
      quantity: target.quantity + source.quantity,
    }
    return writeSlot(freed, to, merged)
  }

  return writeSlot(writeSlot(freed, to, source), from, target)
}

/**
 * Splits `amount` off the stack at `ref` into the lowest free slot of the same
 * container. Returns `state` unchanged when there is nothing to split or no room.
 */
export function splitStack(
  state: InventoryState,
  ref: SlotRef,
  amount: number,
): InventoryState {
  const source = readSlot(state, ref)
  if (!source || amount <= 0 || amount >= source.quantity) return state

  const contents = readContainer(state, ref.container)
  const freeIndex = contents.findIndex((stack, index) => !stack && index !== ref.index)
  if (freeIndex < 0) return state

  return writeSlot(
    writeSlot(state, ref, { itemId: source.itemId, quantity: source.quantity - amount }),
    { container: ref.container, index: freeIndex },
    { itemId: source.itemId, quantity: amount },
  )
}

/**
 * Base class stats plus the bonuses of everything worn. Returns a fresh object —
 * `character.stats` is never mutated, so quest gating can call this freely.
 *
 * Stats that only gear provides (`vitality`, `guard`) appear here even though no
 * class declares them.
 */
export function effectiveStats(
  stats: Record<string, number>,
  state: InventoryState,
): Record<string, number> {
  const merged: Record<string, number> = { ...stats }

  for (const stack of Object.values(state.equipment)) {
    if (!stack) continue
    const item = getItemById(stack.itemId)
    if (!item?.statBonuses) continue
    for (const [stat, bonus] of Object.entries(item.statBonuses)) {
      merged[stat] = (merged[stat] ?? 0) + (bonus ?? 0)
    }
  }

  return merged
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

function setEquipment(
  state: InventoryState,
  slot: EquipSlot,
  stack: ItemStack | null,
): InventoryState {
  return {
    ...state,
    equipment: { ...state.equipment, [slot]: stack },
  }
}

export interface EquipResult {
  state: InventoryState
  /** False when nothing changed — see `reason`. */
  ok: boolean
  reason?: 'empty-slot' | 'not-equippable' | 'inventory-full' | 'nothing-equipped'
  /** The item that came out of the gear slot, if a previous one was replaced. */
  displaced: ItemStack | null
}

/**
 * Moves the stack at `ref` into the gear slot its item declares. The stack leaves
 * the container, so the slot it vacated is used for whatever was equipped before —
 * which makes replacing a piece of gear impossible to fail.
 */
export function equipFromSlot(state: InventoryState, ref: SlotRef): EquipResult {
  const stack = readSlot(state, ref)
  if (!stack) return { state, ok: false, reason: 'empty-slot', displaced: null }

  const item = getItemById(stack.itemId)
  if (!item?.equipSlot) {
    return { state, ok: false, reason: 'not-equippable', displaced: null }
  }

  const previous = state.equipment[item.equipSlot]
  const withGear = setEquipment(writeSlot(state, ref, null), item.equipSlot, stack)

  if (!previous) return { state: withGear, ok: true, displaced: null }

  const refilled = writeSlot(withGear, ref, previous)
  return { state: refilled, ok: true, displaced: previous }
}

/**
 * Moves the gear in `slot` back into the lowest free carryable slot. On a full
 * inventory the item stays equipped and `ok` is false — nothing is ever dropped.
 */
export function unequipToSlot(
  state: InventoryState,
  slot: EquipSlot,
  container: ItemContainer = 'slots',
): EquipResult {
  const stack = state.equipment[slot]
  if (!stack) return { state, ok: false, reason: 'nothing-equipped', displaced: null }

  const result = addItem(state, stack.itemId, stack.quantity, container)
  if (result.remainder > 0) return { state, ok: false, reason: 'inventory-full', displaced: null }

  return { state: setEquipment(result.state, slot, null), ok: true, displaced: stack }
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
