export type { KeyFlags, MovementInput, MovementProfile, MovementState } from './types'
export {
  createMovementState,
  isMoving,
  movementInputFromFlags,
  speedOf,
  stepMovement,
  stopMovement,
} from './logic'
export {
  CAVE_PROFILE,
  DEFAULT_PROFILE,
  ESCORT_PROFILE,
  resolveMovementContext,
  resolveMovementProfile,
} from './profiles'
