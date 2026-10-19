import { describe, expect, it } from 'vitest'
import { mulberry32, randomInt, randomPick, shuffle } from './rng'

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const first = mulberry32(1234)
    const second = mulberry32(1234)
    const a = Array.from({ length: 16 }, () => first())
    const b = Array.from({ length: 16 }, () => second())
    expect(a).toEqual(b)
  })

  it('produces different sequences for different seeds', () => {
    const first = mulberry32(1)
    const second = mulberry32(2)
    const a = Array.from({ length: 8 }, () => first())
    const b = Array.from({ length: 8 }, () => second())
    expect(a).not.toEqual(b)
  })

  it('stays within [0, 1)', () => {
    const rng = mulberry32(99)
    for (let i = 0; i < 1000; i += 1) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('randomInt', () => {
  it('never leaves the requested range', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 500; i += 1) {
      const value = randomInt(rng, 3, 9)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThan(9)
    }
  })

  it('eventually draws every value in the range', () => {
    const rng = mulberry32(11)
    const seen = new Set<number>()
    for (let i = 0; i < 300; i += 1) seen.add(randomInt(rng, 0, 5))
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4])
  })
})

describe('randomPick', () => {
  it('only ever returns elements of the array', () => {
    const rng = mulberry32(5)
    const items = ['a', 'b', 'c']
    for (let i = 0; i < 100; i += 1) {
      expect(items).toContain(randomPick(rng, items))
    }
  })

  it('throws on an empty array', () => {
    expect(() => randomPick(mulberry32(1), [])).toThrow()
  })
})

describe('shuffle', () => {
  it('keeps every element', () => {
    const rng = mulberry32(3)
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const shuffled = shuffle(rng, [...items])
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items)
  })

  it('is deterministic per seed', () => {
    const a = shuffle(mulberry32(42), [1, 2, 3, 4, 5, 6, 7, 8, 9])
    const b = shuffle(mulberry32(42), [1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(a).toEqual(b)
  })

  it('handles empty and single-element arrays', () => {
    expect(shuffle(mulberry32(1), [])).toEqual([])
    expect(shuffle(mulberry32(1), ['only'])).toEqual(['only'])
  })
})
