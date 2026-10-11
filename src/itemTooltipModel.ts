import { EQUIP_SLOT_LABELS } from './inventory/labels'
import type {
  EquipSlot,
  ItemDefinition,
  ItemKind,
  StatKey,
} from './inventory/types'

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Strength',
  agility: 'Agility',
  intellect: 'Intellect',
  vitality: 'Vitality',
  guard: 'Guard',
}

export const KIND_LABELS: Record<ItemKind, string> = {
  tool: 'Tool',
  weapon: 'Weapon',
  armour: 'Armour',
  resource: 'Resource',
}

const STAT_ORDER: readonly StatKey[] = [
  'strength',
  'agility',
  'intellect',
  'vitality',
  'guard',
]

export interface ItemTooltipModel {
  name: string
  subtitle: string
  description: string
  statLines: string[]
  quantityLine: string | null
}

/** Renders a stat bonus as "+2 Strength" or "-1 Agility". */
export function formatStatBonus(key: StatKey, value: number): string {
  const label = STAT_LABELS[key] ?? key
  return `${value > 0 ? '+' : ''}${value} ${label}`
}

/** Turns the item's data into the text a hover tooltip will display. */
export function buildTooltipModel(
  item: ItemDefinition,
  options: { quantity?: number } = {},
): ItemTooltipModel {
  const bonuses = item.statBonuses ?? {}
  const statLines = STAT_ORDER.flatMap((key) => {
    const value = bonuses[key]
    return value === undefined ? [] : [formatStatBonus(key, value)]
  })

  const subtitleParts = [KIND_LABELS[item.kind] ?? item.kind]
  if (item.equipSlot) subtitleParts.push(equipSlotLabel(item.equipSlot))

  const quantityLine = item.maxStack > 1 ? `Stack ${options.quantity ?? 1} / ${item.maxStack}` : null

  return {
    name: item.name,
    subtitle: subtitleParts.join(' \u00b7 '),
    description: item.description,
    statLines,
    quantityLine,
  }
}

/** Human-readable label for an equipment slot, for tooltips. */
export function equipSlotLabel(equipSlot: EquipSlot): string {
  return EQUIP_SLOT_LABELS[equipSlot] ?? equipSlot
}