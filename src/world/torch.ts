/** How long one torch burns before it is consumed, in milliseconds. */
export const TORCH_BURN_MS = 90_000

/**
 * Longest frame delta a burn may apply. Tabbing away can hand the game a delta
 * of many seconds; clamping stops a single frame from eating a whole torch.
 */
export const TORCH_MAX_FRAME_DELTA_MS = 250

/** Remaining fuel at or below this reads as a low-fuel warning. */
export const TORCH_LOW_FUEL_MS = 10_000

/** How the torch is being carried: not at all, in the pack, or selected. */
export type TorchLightState = 'none' | 'carried' | 'selected'

const LIGHT_RADII: Readonly<Record<TorchLightState, number>> = {
  none: 72,
  carried: 220,
  selected: 280,
}

export function lightRadiusFor(state: TorchLightState): number {
  return LIGHT_RADII[state]
}

/** Cleans a frame delta: non-finite or negative reads as zero, and it is capped. */
export function clampFrameDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0
  return Math.min(deltaMs, TORCH_MAX_FRAME_DELTA_MS)
}

export interface BurnResult {
  /** Fuel left after this frame, never below zero. */
  fuelMs: number
  /** True only on the frame the fuel reaches zero; false once already spent. */
  burnedOut: boolean
}

/**
 * Burns a carried torch by one clamped frame. A torch with no fuel stays at
 * zero without reporting burnout again, so the caller's "gone out" toast only
 * fires once.
 */
export function burnFuel(fuelMs: number, deltaMs: number): BurnResult {
  const remaining = Number.isFinite(fuelMs) ? Math.max(0, fuelMs) : 0
  if (remaining <= 0) return { fuelMs: 0, burnedOut: false }

  const next = Math.max(0, remaining - clampFrameDelta(deltaMs))
  return { fuelMs: next, burnedOut: next === 0 }
}

export function isLowFuel(fuelMs: number): boolean {
  return fuelMs > 0 && fuelMs <= TORCH_LOW_FUEL_MS
}
