import { describe, expect, it } from 'vitest'
import { FACTION_IDS, FACTIONS, getFactionById, isFactionId } from './data'

describe('faction catalog', () => {
  it('lists unique faction ids', () => {
    expect(new Set(FACTIONS.map((faction) => faction.id)).size).toBe(FACTIONS.length)
    expect(new Set(FACTION_IDS).size).toBe(FACTION_IDS.length)
  })

  it('gives every faction a name and description', () => {
    for (const faction of FACTIONS) {
      expect(faction.id.length).toBeGreaterThan(0)
      expect(faction.name.length).toBeGreaterThan(0)
      expect(faction.description.length).toBeGreaterThan(0)
    }
  })

  it('round-trips factions by id', () => {
    for (const faction of FACTIONS) {
      expect(getFactionById(faction.id)).toBe(faction)
      expect(isFactionId(faction.id)).toBe(true)
    }
  })

  it('rejects unknown ids', () => {
    expect(getFactionById('')).toBeUndefined()
    expect(getFactionById('bandits')).toBeUndefined()
    expect(isFactionId('bandits')).toBe(false)
  })
})
