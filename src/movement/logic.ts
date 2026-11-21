import type { KeyFlags, MovementInput } from './types'

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
