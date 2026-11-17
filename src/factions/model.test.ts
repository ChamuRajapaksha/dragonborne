import { describe, expect, it } from 'vitest'
import {
  applyReputationDelta,
  formatReputationAward,
  formatReputationRewards,
  formatShopStanding,
  formatStanding,
  formatUnmetReputation,
  isReputationMet,
  reputationAwardChanges,
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

  it('formats shop standings with notes only when prices move', () => {
    expect(formatShopStanding('forge', 0)).toBe('The Deep Forge · Neutral')
    expect(formatShopStanding('traders', 35)).toBe(
      'Free Traders · Friendly (−10% buy, +10% sell)',
    )
    expect(formatShopStanding('traders', -35)).toBe(
      'Free Traders · Hostile (+15% buy, −15% sell)',
    )
  })
})

describe('reputation awards', () => {
  it('computes the tier each reward lands on', () => {
    const changes = reputationAwardChanges(
      [
        { factionId: 'emberhold', delta: 8 },
        { factionId: 'traders', delta: -5 },
      ],
      { emberhold: 15, traders: 20 },
    )

    expect(changes).toEqual([
      {
        factionId: 'emberhold',
        name: 'Emberhold',
        delta: 8,
        previous: 15,
        value: 23,
        tier: 'friendly',
      },
      {
        factionId: 'traders',
        name: 'Free Traders',
        delta: -5,
        previous: 20,
        value: 15,
        tier: 'neutral',
      },
    ])
  })

  it('accumulates repeated factions and clamps the result', () => {
    const changes = reputationAwardChanges(
      [
        { factionId: 'forge', delta: 10 },
        { factionId: 'forge', delta: 10 },
      ],
      { forge: 95 },
    )

    expect(changes.map((change) => change.value)).toEqual([100, 100])
    expect(formatReputationAward(changes[1])).toBe('The Deep Forge +10 (Revered)')
  })

  it('skips unknown factions and zero deltas', () => {
    const changes = reputationAwardChanges(
      [
        { factionId: 'bandits', delta: 20 },
        { factionId: 'archive', delta: 0 },
        { factionId: 'archive', delta: 5 },
      ],
      {},
    )

    expect(changes).toHaveLength(1)
    expect(changes[0].factionId).toBe('archive')
  })
})
