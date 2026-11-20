import { describe, expect, it } from 'vitest'
import { createCharacter, getClassById } from '../character'
import { createEmptyInventory, equipFromSlot } from '../inventory'
import { characterStats, levelStatBonuses } from './stats'

describe('level stat bonuses', () => {
  it('adds nothing at level 1 or below', () => {
    expect(levelStatBonuses('warrior', 1)).toEqual({})
    expect(levelStatBonuses('warrior', 0)).toEqual({})
    expect(levelStatBonuses('warrior', Number.NaN)).toEqual({})
  })

  it('scales each class gain by levels above 1', () => {
    expect(levelStatBonuses('warrior', 2)).toEqual({ strength: 2, agility: 1 })
    expect(levelStatBonuses('warrior', 4)).toEqual({ strength: 6, agility: 3 })
    expect(levelStatBonuses('mage', 3)).toEqual({ intellect: 4, agility: 2 })
    expect(levelStatBonuses('bard', 2)).toEqual({
      strength: 1,
      agility: 1,
      intellect: 1,
    })
  })

  it('ignores unknown classes and leaves class data untouched', () => {
    expect(levelStatBonuses('unknown', 5)).toEqual({})
    levelStatBonuses('rogue', 5)
    expect(getClassById('rogue')?.statGains).toEqual({ agility: 2, strength: 1 })
  })
})

describe('characterStats', () => {
  const warrior = () => createCharacter('Bran', 'warrior')!

  it('matches base stats at level 1', () => {
    const character = warrior()
    expect(characterStats(character, createEmptyInventory(), 1)).toEqual(character.stats)
  })

  it('adds level gains on top of equipped gear', () => {
    const character = warrior()
    const base = createEmptyInventory()
    const slots = base.slots.slice()
    slots[0] = { itemId: 'flanged-mace', quantity: 1 }
    const equipped = equipFromSlot({ ...base, slots }, { container: 'slots', index: 0 }).state

    expect(characterStats(character, equipped, 3)).toEqual({
      strength: 10,
      agility: 5,
      intellect: 2,
      guard: 1,
    })
  })

  it('does not mutate the character or the inventory', () => {
    const character = warrior()
    const inventory = createEmptyInventory()
    const stats = characterStats(character, inventory, 4)
    stats.strength = 999

    expect(character.stats.strength).toBe(5)
    expect(inventory.slots.every((slot) => slot === null)).toBe(true)
  })
})
