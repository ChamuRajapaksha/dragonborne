import { describe, expect, it } from 'vitest'
import { movementInputFromFlags } from './logic'
import type { KeyFlags } from './types'

function flags(overrides: Partial<KeyFlags> = {}): KeyFlags {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false,
    ...overrides,
  }
}

describe('movementInputFromFlags', () => {
  it('returns neutral input when no keys are held', () => {
    expect(movementInputFromFlags(flags())).toEqual({ x: 0, y: 0, sprint: false })
  })

  it('maps each direction to a unit axis', () => {
    expect(movementInputFromFlags(flags({ left: true }))).toEqual({ x: -1, y: 0, sprint: false })
    expect(movementInputFromFlags(flags({ right: true }))).toEqual({ x: 1, y: 0, sprint: false })
    expect(movementInputFromFlags(flags({ up: true }))).toEqual({ x: 0, y: -1, sprint: false })
    expect(movementInputFromFlags(flags({ down: true }))).toEqual({ x: 0, y: 1, sprint: false })
  })

  it('cancels opposing keys', () => {
    expect(movementInputFromFlags(flags({ left: true, right: true }))).toEqual({
      x: 0,
      y: 0,
      sprint: false,
    })
    expect(movementInputFromFlags(flags({ up: true, down: true, sprint: true }))).toEqual({
      x: 0,
      y: 0,
      sprint: true,
    })
  })

  it('normalizes diagonals to unit length', () => {
    const input = movementInputFromFlags(flags({ right: true, down: true }))
    expect(Math.hypot(input.x, input.y)).toBeCloseTo(1, 10)
    expect(input.x).toBeCloseTo(Math.SQRT1_2, 10)
    expect(input.y).toBeCloseTo(Math.SQRT1_2, 10)
  })

  it('passes the sprint flag through', () => {
    expect(movementInputFromFlags(flags({ right: true, sprint: true }))).toEqual({
      x: 1,
      y: 0,
      sprint: true,
    })
  })
})
