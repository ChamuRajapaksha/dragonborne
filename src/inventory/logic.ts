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
