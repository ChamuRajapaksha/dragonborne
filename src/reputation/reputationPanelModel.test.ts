import { describe, expect, it } from 'vitest'
import { FACTIONS } from '../factions/data'
import { buildReputationRows, formatReputationSummary } from './reputationPanelModel'

describe('buildReputationRows', () => {
  it('renders one row per faction with neutral defaults', () => {
    const rows = buildReputationRows({})
    expect(rows).toHaveLength(FACTIONS.length)
    expect(new Set(rows.map((row) => row.factionId)).size).toBe(FACTIONS.length)
    for (const row of rows) {
      expect(row.value).toBe(0)
      expect(row.tier).toBe('neutral')
      expect(row.tierLabel).toBe('Neutral')
      expect(row.barPercent).toBe(0)
      expect(row.name).toBeTruthy()
      expect(row.description).toBeTruthy()
    }
  })

  it('sorts by standing descending, then by name', () => {
    const rows = buildReputationRows({
      archive: 10,
      emberhold: 35,
      forge: -20,
      traders: 35,
      wardens: 0,
    })
    expect(rows.map((row) => row.factionId)).toEqual([
      'emberhold',
      'traders',
      'archive',
      'wardens',
      'forge',
    ])
  })

  it('fills the bar by magnitude so negative standings grow from the centre', () => {
    const rows = buildReputationRows({ emberhold: 35, forge: -40, archive: -500 })
    const byId = new Map(rows.map((row) => [row.factionId, row]))
    expect(byId.get('emberhold')?.barPercent).toBe(35)
    expect(byId.get('forge')?.barPercent).toBe(40)
    expect(byId.get('archive')?.barPercent).toBe(100)
    expect(byId.get('archive')?.value).toBe(-100)
  })

  it('treats non-finite and unknown values as neutral', () => {
    const rows = buildReputationRows({ emberhold: Number.NaN, bandits: 90 })
    expect(rows.every((row) => row.value === 0 && row.tier === 'neutral')).toBe(true)
  })

  it('notes prices only where standing changes them', () => {
    const rows = buildReputationRows({
      archive: 80,
      emberhold: 80,
      forge: 35,
      traders: -35,
      wardens: 80,
    })
    const byId = new Map(rows.map((row) => [row.factionId, row]))
    expect(byId.get('forge')?.priceNote).toBe('−10% buy, +10% sell')
    expect(byId.get('traders')?.priceNote).toBe('+15% buy, −15% sell')
    for (const id of ['archive', 'emberhold', 'wardens']) {
      expect(byId.get(id)?.priceNote).toBeNull()
    }
  })
})

describe('formatReputationSummary', () => {
  it('counts every tier group in row order', () => {
    const rows = buildReputationRows({
      archive: 0,
      emberhold: 25,
      forge: -30,
      traders: 10,
      wardens: 25,
    })
    expect(formatReputationSummary(rows)).toBe('2 friendly · 2 neutral · 1 hostile')
  })

  it('reads an untouched world as all neutral', () => {
    expect(formatReputationSummary(buildReputationRows({}))).toBe('5 neutral')
  })
})
