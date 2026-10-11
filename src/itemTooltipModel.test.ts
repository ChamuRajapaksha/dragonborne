import { describe, expect, it } from 'vitest'
import type { ItemDefinition } from './inventory'
import { getItemById } from './inventory'
import {
  buildTooltipModel,
  equipSlotLabel,
  formatStatBonus,
} from './itemTooltipModel'

function item(id: string): ItemDefinition {
  const found = getItemById(id)
  expect(found).toBeDefined()
  return found as ItemDefinition
}

describe('formatStatBonus', () => {
  it('prefixes positive bonuses with a plus', () => {
    expect(formatStatBonus('strength', 2)).toBe('+2 Strength')
  })

  it('leaves negative bonuses sign-led', () => {
    expect(formatStatBonus('agility', -1)).toBe('-1 Agility')
  })

  it('renders zero as signed zero', () => {
    expect(formatStatBonus('guard', 0)).toBe('0 Guard')
  })
})

describe('equipSlotLabel', () => {
  it('maps every equipment slot to its label', () => {
    expect(equipSlotLabel('mainhand')).toBe('Main Hand')
    expect(equipSlotLabel('head')).toBe('Head')
    expect(equipSlotLabel('chest')).toBe('Chest')
    expect(equipSlotLabel('legs')).toBe('Legs')
  })
})

describe('buildTooltipModel', () => {
  it('renders a weapon with kind, equip slot, and stat lines', () => {
    const model = buildTooltipModel(item('flanged-mace'))

    expect(model.name).toBe('Flanged Mace')
    expect(model.subtitle).toBe('Weapon \u00b7 Main Hand')
    expect(model.description).toContain('A temple relic repurposed.')
    expect(model.statLines).toEqual(['+1 Strength', '+1 Guard'])
    expect(model.quantityLine).toBeNull()
  })

  it('orders armour stat lines by the canonical stat order', () => {
    const model = buildTooltipModel(item('leather-cap'))

    expect(model.subtitle).toBe('Armour \u00b7 Head')
    expect(model.statLines).toEqual(['+1 Agility', '+1 Guard'])
  })

  it('shows a stack line for stackable resources', () => {
    const model = buildTooltipModel(item('heath-herb'), { quantity: 3 })

    expect(model.subtitle).toBe('Resource')
    expect(model.statLines).toEqual([])
    expect(model.quantityLine).toBe('Stack 3 / 99')
  })

  it('defaults the stack quantity to one', () => {
    expect(buildTooltipModel(item('heath-herb')).quantityLine).toBe('Stack 1 / 99')
  })

  it('omits the stack line for non-stackable tools with no stats', () => {
    const model = buildTooltipModel(item('torch'))

    expect(model.subtitle).toBe('Tool')
    expect(model.statLines).toEqual([])
    expect(model.quantityLine).toBeNull()
  })
})