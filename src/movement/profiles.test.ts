import { describe, expect, it } from 'vitest'
import {
  CAVE_PROFILE,
  DEFAULT_PROFILE,
  ESCORT_PROFILE,
  resolveMovementContext,
  resolveMovementProfile,
} from './profiles'

describe('movement profiles', () => {
  it('exposes the tuned default profile', () => {
    expect(DEFAULT_PROFILE).toEqual({
      id: 'default',
      maxSpeed: 200,
      acceleration: 1600,
      deceleration: 2000,
      sprintMultiplier: 1.5,
      cameraLerpX: 0.1,
      cameraLerpY: 0.1,
    })
  })

  it('resolves known contexts', () => {
    expect(resolveMovementProfile('default')).toBe(DEFAULT_PROFILE)
    expect(resolveMovementProfile('cave')).toBe(CAVE_PROFILE)
    expect(resolveMovementProfile('escort')).toBe(ESCORT_PROFILE)
  })

  it('falls back to default for unknown contexts', () => {
    expect(resolveMovementProfile('plains')).toBe(DEFAULT_PROFILE)
    expect(resolveMovementProfile('')).toBe(DEFAULT_PROFILE)
  })

  it('keeps escort slower with gentler camera follow', () => {
    expect(ESCORT_PROFILE.maxSpeed).toBeLessThan(DEFAULT_PROFILE.maxSpeed)
    expect(ESCORT_PROFILE.cameraLerpX).toBeLessThan(DEFAULT_PROFILE.cameraLerpX)
    expect(ESCORT_PROFILE.cameraLerpY).toBeLessThan(DEFAULT_PROFILE.cameraLerpY)
  })
})

describe('movement context', () => {
  it('uses the cave context only underground without an escort', () => {
    expect(resolveMovementContext('cave', false)).toBe('cave')
    expect(resolveMovementContext('forest', false)).toBe('default')
    expect(resolveMovementContext('village', false)).toBe('default')
  })

  it('lets an active escort override the area context', () => {
    expect(resolveMovementContext('cave', true)).toBe('escort')
    expect(resolveMovementContext('village', true)).toBe('escort')
    expect(resolveMovementProfile(resolveMovementContext('plains', true))).toBe(ESCORT_PROFILE)
  })
})
