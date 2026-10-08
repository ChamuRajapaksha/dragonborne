import { getItemById } from './catalog'
import type { EquipSlot, InventoryState, ItemStack } from './types'
import { EQUIP_SLOTS, HOTBAR_SLOT_COUNT, INVENTORY_SLOT_COUNT } from './types'

const STORAGE_KEY = 'dragonborne.inventory'

const CURRENT_VERSION = 2

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * A stack is only accepted if the item exists in the catalog and the quantity is a
 * positive whole number no larger than the item's `maxStack`. Anything else is
 * dropped rather than carried into the live state.
 */
function readStack(value: unknown): ItemStack | null {
  if (!isRecord(value)) return null
  if (typeof value.itemId !== 'string') return null

  const item = getItemById(value.itemId)
  if (!item) return null

  const quantity = value.quantity
  if (typeof quantity !== 'number' || !Number.isInteger(quantity)) return null
  if (quantity <= 0) return null

  return { itemId: item.id, quantity: Math.min(quantity, item.maxStack) }
}

/** Normalises any array to exactly `length` slots, padding with `null`. */
function readSlotArray(value: unknown, length: number): (ItemStack | null)[] {
  const source = Array.isArray(value) ? value.slice(0, length) : []
  const slots: (ItemStack | null)[] = Array<ItemStack | null>(length).fill(null)

  for (let index = 0; index < source.length; index += 1) {
    slots[index] = readStack(source[index])
  }

  return slots
}

function readEquipment(value: unknown): Record<EquipSlot, ItemStack | null> {
  const equipment = Object.fromEntries(
    EQUIP_SLOTS.map((slot) => [slot, null]),
  ) as Record<EquipSlot, ItemStack | null>

  if (!isRecord(value)) return equipment

  for (const slot of EQUIP_SLOTS) {
    const stack = readStack(value[slot])
    const item = stack ? getItemById(stack.itemId) : undefined
    // An item only lands in a gear slot if that slot is the one it declares.
    if (item?.equipSlot === slot) equipment[slot] = stack
  }

  return equipment
}

function readSelectedSlot(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return 0
  if (value < 0 || value >= HOTBAR_SLOT_COUNT) return 0
  return value
}

/**
 * Brings a parsed save up to the current schema, repairing anything malformed:
 * unknown item ids and bad lengths become `null`, gear in the wrong slot is
 * discarded, and a hotbar selection out of range resets to 0.
 *
 * Returns `null` only when the payload cannot be recognised at all. A version from
 * the future is rejected rather than guessed at; anything older than the current
 * version is read forward — v1 saves have no cursor, so theirs reads as `null`.
 */
export function migrateInventory(parsed: unknown): InventoryState | null {
  if (!isRecord(parsed)) return null

  const version = parsed.version
  if (typeof version !== 'number' || version > CURRENT_VERSION) return null

  return {
    version: CURRENT_VERSION,
    slots: readSlotArray(parsed.slots, INVENTORY_SLOT_COUNT),
    hotbar: readSlotArray(parsed.hotbar, HOTBAR_SLOT_COUNT),
    equipment: readEquipment(parsed.equipment),
    selectedHotbarSlot: readSelectedSlot(parsed.selectedHotbarSlot),
    cursor: readStack(parsed.cursor),
  }
}

export function loadInventory(): InventoryState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return migrateInventory(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveInventory(state: InventoryState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearInventory(): void {
  localStorage.removeItem(STORAGE_KEY)
}