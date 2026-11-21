import type { KeyFlags, MovementInput, MovementProfile, MovementState } from './types'

const DEFAULT_FACING = { x: 0, y: 1 }
const MAX_DELTA_SECONDS = 0.05

function finite(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function facingOf(state: MovementState | null | undefined): { x: number; y: number } {
  const x = finite(state?.facing?.x)
  const y = finite(state?.facing?.y)
  const length = Math.hypot(x, y)
  if (length <= 0) return { ...DEFAULT_FACING }
  return { x: x / length, y: y / length }
}

function approach(current: number, target: number, maxDelta: number): number {
  const difference = target - current
  if (Math.abs(difference) <= maxDelta) return target
  return current + Math.sign(difference) * maxDelta
}

function sanitizedInput(input: MovementInput | null | undefined): MovementInput {
  let x = Math.max(-1, Math.min(1, finite(input?.x)))
  let y = Math.max(-1, Math.min(1, finite(input?.y)))
  const length = Math.hypot(x, y)
  if (length > 1) {
    x /= length
    y /= length
  }
  return { x, y, sprint: input?.sprint === true }
}

export function movementInputFromFlags(flags: KeyFlags): MovementInput {
  const left = flags?.left === true
  const right = flags?.right === true
  const up = flags?.up === true
  const down = flags?.down === true

  let x = 0
  let y = 0
  if (left !== right) x = left ? -1 : 1
  if (up !== down) y = up ? -1 : 1

  const length = Math.hypot(x, y)
  if (length > 0) {
    x /= length
    y /= length
  }

  return { x, y, sprint: flags?.sprint === true }
}

export function createMovementState(): MovementState {
  return { vx: 0, vy: 0, facing: { ...DEFAULT_FACING } }
}

export function speedOf(state: MovementState): number {
  return Math.hypot(finite(state?.vx), finite(state?.vy))
}

export function isMoving(state: MovementState): boolean {
  return speedOf(state) > 0
}

export function stopMovement(state: MovementState): MovementState {
  return { vx: 0, vy: 0, facing: facingOf(state) }
}

export function stepMovement(
  state: MovementState,
  input: MovementInput,
  profile: MovementProfile,
  deltaSeconds: number,
  enabled = true,
): MovementState {
  if (!enabled) return stopMovement(state)

  const delta = Math.max(0, Math.min(MAX_DELTA_SECONDS, finite(deltaSeconds)))
  const direction = sanitizedInput(input)
  const maxSpeed = Math.max(0, finite(profile?.maxSpeed))
  const acceleration = Math.max(0, finite(profile?.acceleration))
  const deceleration = Math.max(0, finite(profile?.deceleration))
  const multiplier = Math.max(0, finite(profile?.sprintMultiplier)) || 1
  const targetSpeed = maxSpeed * (direction.sprint ? multiplier : 1)
  const hasInput = Math.hypot(direction.x, direction.y) > 0
  const rate = (hasInput ? acceleration : deceleration) * delta

  let vx = approach(finite(state?.vx), hasInput ? direction.x * targetSpeed : 0, rate)
  let vy = approach(finite(state?.vy), hasInput ? direction.y * targetSpeed : 0, rate)

  const speed = Math.hypot(vx, vy)
  if (speed > targetSpeed) {
    const scale = targetSpeed / speed
    vx *= scale
    vy *= scale
  }

  return {
    vx,
    vy,
    facing: hasInput ? { x: direction.x, y: direction.y } : facingOf(state),
  }
}
