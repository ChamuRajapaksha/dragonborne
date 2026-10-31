import { describe, expect, it } from 'vitest'
import {
  TORCH_BURN_MS,
  TORCH_LOW_FUEL_MS,
  TORCH_MAX_FRAME_DELTA_MS,
  burnFuel,
  clampFrameDelta,
  formatTorchTime,
  isLowFuel,
  lightRadiusFor,
} from './torch'

describe('torch burn window', () => {
  it('lasts 90 seconds', () => {
    expect(TORCH_BURN_MS).toBe(90_000)
  })

  it('clamps a long frame so tabbing away cannot spend a whole torch', () => {
    expect(TORCH_MAX_FRAME_DELTA_MS).toBe(250)
    expect(clampFrameDelta(5_000)).toBe(TORCH_MAX_FRAME_DELTA_MS)
    expect(burnFuel(TORCH_BURN_MS, 5_000)).toEqual({
      fuelMs: TORCH_BURN_MS - TORCH_MAX_FRAME_DELTA_MS,
      burnedOut: false,
    })
  })

  it('treats a negative or non-finite frame as no time passing', () => {
    expect(clampFrameDelta(-16)).toBe(0)
    expect(clampFrameDelta(Number.NaN)).toBe(0)
    expect(clampFrameDelta(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('passes an ordinary frame delta through untouched', () => {
    expect(clampFrameDelta(16.7)).toBe(16.7)
  })

  it('subtracts the frame from the remaining fuel', () => {
    expect(burnFuel(50_000, 16)).toEqual({ fuelMs: 49_984, burnedOut: false })
  })

  it('reports burnout on the frame the fuel reaches zero', () => {
    expect(burnFuel(100, 250)).toEqual({ fuelMs: 0, burnedOut: true })
    expect(burnFuel(250, 250)).toEqual({ fuelMs: 0, burnedOut: true })
  })

  it('never drops below zero', () => {
    expect(burnFuel(-1_000, 16)).toEqual({ fuelMs: 0, burnedOut: false })
    expect(burnFuel(Number.NaN, 16)).toEqual({ fuelMs: 0, burnedOut: false })
  })

  it('does not report burnout twice once the torch is already spent', () => {
    expect(burnFuel(0, 16)).toEqual({ fuelMs: 0, burnedOut: false })
  })
})

describe('torch low-fuel warning', () => {
  it('warns at ten seconds and below, but not at zero', () => {
    expect(TORCH_LOW_FUEL_MS).toBe(10_000)
    expect(isLowFuel(10_001)).toBe(false)
    expect(isLowFuel(10_000)).toBe(true)
    expect(isLowFuel(1)).toBe(true)
    expect(isLowFuel(0)).toBe(false)
  })
})

describe('torch light radius', () => {
  it('widens from ambient to carried to selected', () => {
    expect(lightRadiusFor('none')).toBe(72)
    expect(lightRadiusFor('carried')).toBe(220)
    expect(lightRadiusFor('selected')).toBe(280)
    expect(lightRadiusFor('none')).toBeLessThan(lightRadiusFor('carried'))
    expect(lightRadiusFor('carried')).toBeLessThan(lightRadiusFor('selected'))
  })
})

describe('torch HUD clock', () => {
  it('formats a full torch as 1:30', () => {
    expect(formatTorchTime(TORCH_BURN_MS)).toBe('1:30')
  })

  it('pads seconds and rounds up so a live torch never reads 0:00', () => {
    expect(formatTorchTime(72_000)).toBe('1:12')
    expect(formatTorchTime(999)).toBe('0:01')
    expect(formatTorchTime(59_999)).toBe('1:00')
  })

  it('reads zero as 0:00 and clamps bad input', () => {
    expect(formatTorchTime(0)).toBe('0:00')
    expect(formatTorchTime(-500)).toBe('0:00')
    expect(formatTorchTime(Number.NaN)).toBe('0:00')
  })
})
