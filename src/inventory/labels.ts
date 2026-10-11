import type { EquipSlot } from './types'

/** Human-readable label for every equipment slot, shared by the panel and tooltips. */
export const EQUIP_SLOT_LABELS: Record<EquipSlot, string> = {
  mainhand: 'Main Hand',
  head: 'Head',
  chest: 'Chest',
  legs: 'Legs',
}