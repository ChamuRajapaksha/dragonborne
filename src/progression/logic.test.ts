import { describe, expect, it } from 'vitest'
import {
  MAX_LEVEL,
  formatLevelProgress,
  grantXp,
  levelForXp,
  levelProgress,
  xpForLevel,
} from './logic'

describe('xp curve', () => {
  it('uses cumulative thresholds and clamps out-of-range levels', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(300)
    expect(xpForLevel(4)).toBe(600)
    expect(xpForLevel(MAX_LEVEL)).toBe(4500)
    expect(xpForLevel(0)).toBe(0)
    expect(xpForLevel(MAX_LEVEL + 5)).toBe(4500)
    expect(xpForLevel(Number.NaN)).toBe(0)
  })

  it('derives levels from xp at the exact boundaries', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(99)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(299)).toBe(2)
    expect(levelForXp(300)).toBe(3)
    expect(levelForXp(100000)).toBe(MAX_LEVEL)
    expect(levelForXp(-20)).toBe(1)
    expect(levelForXp(Number.NaN)).toBe(1)
  })

  it('reports progress inside the current level', () => {
    expect(levelProgress(150)).toEqual({
      level: 2,
      current: 50,
      needed: 200,
      remaining: 150,
      ratio: 0.25,
    })
    expect(levelProgress(300).current).toBe(0)
    expect(levelProgress(xpForLevel(MAX_LEVEL))).toEqual({
      level: MAX_LEVEL,
      current: 0,
      needed: 0,
      remaining: 0,
      ratio: 1,
    })
  })

  it('formats one shared level label', () => {
    expect(formatLevelProgress(150)).toBe('Lv 2 · 50/200 XP')
    expect(formatLevelProgress(xpForLevel(MAX_LEVEL))).toBe('Lv 10 · MAX')
  })
})

describe('grantXp', () => {
  it('awards xp and counts levels gained', () => {
    expect(grantXp(90, 20)).toEqual({ xp: 110, levelsGained: 1 })
    expect(grantXp(150, 200)).toEqual({ xp: 350, levelsGained: 1 })
    expect(grantXp(0, 4500)).toEqual({ xp: 4500, levelsGained: 9 })
  })

  it('caps xp at the level ceiling', () => {
    expect(grantXp(4400, 500)).toEqual({ xp: 4500, levelsGained: 1 })
  })

  it('ignores invalid grants without changing the state', () => {
    expect(grantXp(150, 0)).toEqual({ xp: 150, levelsGained: 0 })
    expect(grantXp(150, -50)).toEqual({ xp: 150, levelsGained: 0 })
    expect(grantXp(150, Number.NaN)).toEqual({ xp: 150, levelsGained: 0 })
    expect(grantXp(-50, 10)).toEqual({ xp: 10, levelsGained: 0 })
  })
})
