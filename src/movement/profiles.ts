import type { MovementProfile } from './types'

export const DEFAULT_PROFILE: MovementProfile = {
  id: 'default',
  maxSpeed: 200,
  acceleration: 1600,
  deceleration: 2000,
  sprintMultiplier: 1.5,
  cameraLerpX: 0.1,
  cameraLerpY: 0.1,
}

export const CAVE_PROFILE: MovementProfile = {
  id: 'cave',
  maxSpeed: 180,
  acceleration: 1400,
  deceleration: 2000,
  sprintMultiplier: 1.4,
  cameraLerpX: 0.1,
  cameraLerpY: 0.1,
}

export const ESCORT_PROFILE: MovementProfile = {
  id: 'escort',
  maxSpeed: 175,
  acceleration: 1400,
  deceleration: 1800,
  sprintMultiplier: 1.35,
  cameraLerpX: 0.08,
  cameraLerpY: 0.08,
}

const PROFILES: Readonly<Record<string, MovementProfile>> = {
  default: DEFAULT_PROFILE,
  cave: CAVE_PROFILE,
  escort: ESCORT_PROFILE,
}

export function resolveMovementProfile(contextId: string): MovementProfile {
  return PROFILES[contextId] ?? DEFAULT_PROFILE
}

export function resolveMovementContext(areaId: string, escortActive: boolean): string {
  if (escortActive) return 'escort'
  return areaId === 'cave' ? 'cave' : 'default'
}
