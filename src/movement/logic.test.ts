import { describe, expect, it } from 'vitest'
import {
  createMovementState,
  isMoving,
  speedOf,
  stepMovement,
  stopMovement,
} from './logic'
import type { MovementInput, MovementProfile } from './types'

const profile: MovementProfile = {
  id: 'test',
  maxSpeed: 200,
  acceleration: 1600,
  deceleration: 2000,
  sprintMultiplier: 1.5,
  cameraLerpX: 0.1,
  cameraLerpY: 0.1,
}

function input(x: number, y: number): MovementInput {
  return { x, y, sprint: false }
}

function run(state: ReturnType<typeof createMovementState>, direction: MovementInput, frames: number) {
  let current = state
  for (let index = 0; index < frames; index += 1) {
    current = stepMovement(current, direction, profile, 0.05)
  }
  return current
}

describe('movement stepping', () => {
  it('starts stopped and facing down', () => {
    const state = createMovementState()
    expect(state).toEqual({ vx: 0, vy: 0, facing: { x: 0, y: 1 } })
    expect(isMoving(state)).toBe(false)
    expect(speedOf(state)).toBe(0)
  })

  it('accelerates toward the target speed without mutating the prior state', () => {
    const start = createMovementState()
    const first = stepMovement(start, input(1, 0), profile, 0.05)
    const second = stepMovement(first, input(1, 0), profile, 0.05)
    const third = stepMovement(second, input(1, 0), profile, 0.05)

    expect(first.vx).toBe(80)
    expect(second.vx).toBe(160)
    expect(third.vx).toBe(200)
    expect(start.vx).toBe(0)
    expect(first.vy).toBe(0)
  })

  it('keeps diagonal speed at the configured maximum', () => {
    const diagonal = input(Math.SQRT1_2, Math.SQRT1_2)
    const state = run(createMovementState(), diagonal, 10)

    expect(speedOf(state)).toBeCloseTo(profile.maxSpeed, 6)
    expect(state.vx).toBeCloseTo(profile.maxSpeed * Math.SQRT1_2, 6)
    expect(state.vy).toBeCloseTo(profile.maxSpeed * Math.SQRT1_2, 6)
  })

  it('decelerates to a full stop on neutral input', () => {
    const moving = run(createMovementState(), input(1, 0), 10)
    const coasting = stepMovement(moving, input(0, 0), profile, 0.05)
    const stopped = stepMovement(coasting, input(0, 0), profile, 0.05)

    expect(coasting.vx).toBe(100)
    expect(stopped.vx).toBe(0)
    expect(isMoving(stopped)).toBe(false)
  })

  it('remembers the last non-zero input as facing', () => {
    const moved = run(createMovementState(), input(-1, 0), 2)
    expect(moved.facing).toEqual({ x: -1, y: 0 })

    const neutral = stepMovement(moved, input(0, 0), profile, 0.05)
    expect(neutral.facing).toEqual({ x: -1, y: 0 })

    expect(stopMovement(neutral)).toEqual({ vx: 0, vy: 0, facing: { x: -1, y: 0 } })
    expect(stopMovement(createMovementState()).facing).toEqual({ x: 0, y: 1 })
  })
})
