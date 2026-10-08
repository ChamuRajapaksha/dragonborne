export type StatKey = 'strength' | 'agility' | 'intellect' | 'vitality' | 'guard'

export type ItemKind = 'tool' | 'weapon' | 'armour' | 'resource'

export type EquipSlot = 'mainhand' | 'head' | 'chest' | 'legs'

export const EQUIP_SLOTS: readonly EquipSlot[] = ['mainhand', 'head', 'chest', 'legs']

export const INVENTORY_SLOT_COUNT = 27

export const HOTBAR_SLOT_COUNT = 9

export interface ItemIcon {
  glyph: string
  color: number
}

export interface ItemDefinition {
  id: string
  name: string
  description: string
  kind: ItemKind
  /** 1 for gear (tool/weapon/armour), 99 for resources. */
  maxStack: number
  equipSlot?: EquipSlot
  /** `vitality` and `guard` are gear-only; no class defines them. */
  statBonuses?: Partial<Record<StatKey, number>>
  icon: ItemIcon
}

export interface ItemStack {
  itemId: string
  quantity: number
}

export interface InventoryState {
  version: 2
  slots: (ItemStack | null)[]
  hotbar: (ItemStack | null)[]
  equipment: Record<EquipSlot, ItemStack | null>
  selectedHotbarSlot: number
  /** Stack held by the pointer while the inventory panel is open. */
  cursor: ItemStack | null
}
