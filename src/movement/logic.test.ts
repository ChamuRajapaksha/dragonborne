import { describe, expect, it } from 'vitest'
import {
  createMovementState,
  isMoving,
  speedOf,
  stepMovement,
  stopMovement,
} from './logic'
import { CAVE_PROFILE, DEFAULT_PROFILE, ESCORT_PROFILE, resolveMovementProfile } from './profiles'
import type { MovementInput, MovementProfile, MovementState } from './types'

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

describe('movement clamping and safety', () => {
  it('clamps total speed to the sprint multiplier', () => {
    const sprinting = { x: 1, y: 0, sprint: true }
    const state = run(createMovementState(), sprinting, 10)

    expect(speedOf(state)).toBeCloseTo(profile.maxSpeed * profile.sprintMultiplier, 6)

    const walking = stepMovement(state, input(1, 0), profile, 0.05)
    expect(speedOf(walking)).toBe(profile.maxSpeed)
  })

  it('caps delta so a long frame cannot teleport the player', () => {
    const longFrame = stepMovement(createMovementState(), input(1, 0), profile, 10)
    const cappedFrame = stepMovement(createMovementState(), input(1, 0), profile, 0.05)
    expect(longFrame).toEqual(cappedFrame)
  })

  it('reads non-finite values as zero', () => {
    const state = stepMovement(createMovementState(), input(1, Number.NaN), profile, 0.05)
    expect(state.vx).toBe(80)
    expect(state.vy).toBe(0)

    const brokenState = stepMovement(
      { vx: Number.NaN, vy: Number.POSITIVE_INFINITY, facing: { x: Number.NaN, y: 0 } },
      input(1, 0),
      profile,
      0.05,
    )
    expect(brokenState.vx).toBe(80)
    expect(brokenState.vy).toBe(0)

    const brokenProfile = stepMovement(
      createMovementState(),
      input(1, 0),
      { ...profile, maxSpeed: Number.NaN, acceleration: Number.NaN },
      0.05,
    )
    expect(brokenProfile.vx).toBe(0)
    expect(brokenProfile.vy).toBe(0)
    expect(brokenProfile.facing).toEqual({ x: 1, y: 0 })
  })

  it('stops immediately when disabled', () => {
    const moving = run(createMovementState(), input(0, -1), 10)
    const disabled = stepMovement(moving, input(0, -1), profile, 0.05, false)

    expect(disabled.vx).toBe(0)
    expect(disabled.vy).toBe(0)
    expect(disabled.facing).toEqual({ x: 0, y: -1 })
  })
})

describe('movement invariants across real profiles', () => {
  const realProfiles = [
    DEFAULT_PROFILE,
    CAVE_PROFILE,
    ESCORT_PROFILE,
    resolveMovementProfile('unknown'),
  ]
  const inputs: MovementInput[] = [
    input(Number.NaN, Number.POSITIVE_INFINITY),
    { x: Number.NEGATIVE_INFINITY, y: Number.NaN, sprint: true },
    { x: 1000, y: -1000, sprint: true },
    null as unknown as MovementInput,
  ]
  const states: MovementState[] = [
    createMovementState(),
    {
      vx: Number.NaN,
      vy: Number.POSITIVE_INFINITY,
      facing: { x: Number.NaN, y: Number.NEGATIVE_INFINITY },
    },
    null as unknown as MovementState,
  ]
  const deltas = [Number.NaN, Number.POSITIVE_INFINITY, -1, 0, 10]

  it('never emits NaN, unbounded speed, or a zero facing vector', () => {
    for (const currentProfile of realProfiles) {
      const limit = currentProfile.maxSpeed * currentProfile.sprintMultiplier
      for (const state of states) {
        for (const direction of inputs) {
          for (const delta of deltas) {
            for (const enabled of [true, false]) {
              const next = stepMovement(state, direction, currentProfile, delta, enabled)

              expect(Number.isFinite(next.vx)).toBe(true)
              expect(Number.isFinite(next.vy)).toBe(true)
              expect(speedOf(next)).toBeLessThanOrEqual(limit + 1e-9)
              expect(Number.isFinite(next.facing.x)).toBe(true)
              expect(Number.isFinite(next.facing.y)).toBe(true)
              expect(Math.hypot(next.facing.x, next.facing.y)).toBeGreaterThan(0)
            }
          }
        }
      }
    }
  })
})
