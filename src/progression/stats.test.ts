import { describe, expect, it } from 'vitest'
import { getClassById } from '../character'
import { levelStatBonuses } from './stats'

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
