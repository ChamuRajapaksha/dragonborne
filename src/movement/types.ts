export interface MovementInput {
  x: number
  y: number
  sprint: boolean
}

export interface MovementProfile {
  id: string
  maxSpeed: number
  acceleration: number
  deceleration: number
  sprintMultiplier: number
  cameraLerpX: number
  cameraLerpY: number
}

export interface MovementState {
  vx: number
  vy: number
  facing: { x: number; y: number }
}

export interface KeyFlags {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  sprint: boolean
}
