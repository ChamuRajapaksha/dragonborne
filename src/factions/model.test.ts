import { describe, expect, it } from 'vitest'
import {
  applyReputationDelta,
  formatReputationRewards,
  formatStanding,
  formatUnmetReputation,
  isReputationMet,
  topStanding,
  unmetReputation,
} from './model'

describe('reputation model', () => {
  it('clamps deltas to the allowed range', () => {
    expect(applyReputationDelta(95, 20)).toBe(100)
    expect(applyReputationDelta(-95, -20)).toBe(-100)
  })

  it('evaluates requirements and reports unmet factions', () => {
    const reqs = [{ factionId: 'emberhold', min: 20 }]
    expect(isReputationMet(reqs, { emberhold: 25 })).toBe(true)
    expect(isReputationMet(reqs, { emberhold: 5 })).toBe(false)
    expect(unmetReputation(reqs, { emberhold: 5 })).toEqual([
      { factionId: 'emberhold', required: 20, current: 5 },
    ])
  })

  it('formats rewards and unmet requirements', () => {
    expect(
      formatReputationRewards([
        { factionId: 'emberhold', delta: 8 },
        { factionId: 'traders', delta: -5 },
      ]),
    ).toBe('Emberhold +8, Free Traders -5')
    expect(formatUnmetReputation([{ factionId: 'emberhold', required: 20, current: 5 }])).toBe(
      'Emberhold 20+ (5)',
    )
  })

  it('finds the top standing and returns null when all neutral', () => {
    expect(topStanding({})).toBeNull()
    expect(topStanding({ emberhold: 0, traders: 0 })).toBeNull()
    expect(topStanding({ emberhold: 10, traders: 25 })).toEqual({
      factionId: 'traders',
      value: 25,
      tier: 'friendly',
    })
  })

  it('ignores unknown keys and formats standings', () => {
    expect(topStanding({ bandits: 99, archive: 10 })?.factionId).toBe('archive')
    expect(formatStanding('emberhold', 35)).toBe('Emberhold · Friendly (35)')
  })
})
