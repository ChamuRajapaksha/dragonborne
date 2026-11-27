import { describe, expect, it } from 'vitest'
import { TILE_SIZE } from '../world/tileset'
import { ESCORTS } from './definitions'
import {
  advanceEscort,
  canCrossPortalWithEscort,
  canStartEscort,
  currentStop,
  followSpeedForDistance,
  isEscortComplete,
  isStopReached,
  relocateEscortAfterPortal,
  startEscort,
  stepFollower,
} from './logic'
import type { EscortDefinition, EscortProgress } from './types'

const def: EscortDefinition = {
  id: 'test-escort',
  questId: 'test-quest',
  npcId: 'test-npc',
  followRadius: 72,
  stopRadius: 40,
  leashRadius: 480,
  npcSpeed: 165,
  stops: [
    { areaId: 'village', x: 10, y: 10, label: 'Gate', arrivalLine: 'Gate reached' },
    { areaId: 'forest', x: 20, y: 20, label: 'Crossing', arrivalLine: 'Crossing reached' },
  ],
}

describe('canStartEscort', () => {
  it('allows an incomplete quest when nobody is being escorted', () => {
    expect(canStartEscort(def, null, [])).toBe(true)
    expect(canStartEscort(def, null, ['other-quest'])).toBe(true)
  })

  it('refuses a second active escort', () => {
    const active = startEscort(def, { areaId: 'village', x: 100, y: 200 })
    expect(canStartEscort(def, active, [])).toBe(false)
  })

  it('refuses a completed quest', () => {
    expect(canStartEscort(def, null, ['test-quest'])).toBe(false)
  })

  it('refuses definitions without stops or ids', () => {
    expect(canStartEscort({ ...def, stops: [] }, null, [])).toBe(false)
    expect(canStartEscort({ ...def, id: '' }, null, [])).toBe(false)
    expect(canStartEscort({ ...def, questId: '' }, null, [])).toBe(false)
    expect(canStartEscort({ ...def, npcId: '' }, null, [])).toBe(false)
  })
})

describe('startEscort', () => {
  it('starts at the first stop with the npc beside the player', () => {
    const at = { areaId: 'village', x: 160, y: 240 }
    expect(startEscort(def, at)).toEqual({
      escortId: 'test-escort',
      npcId: 'test-npc',
      stopIndex: 0,
      areaId: 'village',
      x: 160,
      y: 240,
    })
    expect(at).toEqual({ areaId: 'village', x: 160, y: 240 })
  })

  it('reads invalid coordinates as zero', () => {
    const progress = startEscort(def, { areaId: 'forest', x: Number.NaN, y: Number.POSITIVE_INFINITY })
    expect(progress.x).toBe(0)
    expect(progress.y).toBe(0)
  })
})

describe('isEscortComplete', () => {
  it('completes only after every stop has been reached', () => {
    expect(isEscortComplete(startEscort(def, { areaId: 'village', x: 0, y: 0 }), def)).toBe(false)
    expect(isEscortComplete({ ...startEscort(def, { areaId: 'village', x: 0, y: 0 }), stopIndex: 1 }, def)).toBe(false)
    expect(isEscortComplete({ ...startEscort(def, { areaId: 'village', x: 0, y: 0 }), stopIndex: 2 }, def)).toBe(true)
    expect(isEscortComplete({ ...startEscort(def, { areaId: 'village', x: 0, y: 0 }), stopIndex: 3 }, def)).toBe(true)
  })

  it('never completes a definition without stops', () => {
    const empty = { ...def, stops: [] }
    expect(isEscortComplete(startEscort(def, { areaId: 'village', x: 0, y: 0 }), empty)).toBe(false)
  })
})

describe('currentStop', () => {
  const progress = startEscort(def, { areaId: 'village', x: 0, y: 0 })

  it('walks through the stops in order and returns null past the end', () => {
    expect(currentStop(progress, def)).toBe(def.stops[0])
    expect(currentStop({ ...progress, stopIndex: 1 }, def)).toBe(def.stops[1])
    expect(currentStop({ ...progress, stopIndex: 2 }, def)).toBeNull()
  })

  it('returns null for invalid indices or missing stops', () => {
    expect(currentStop({ ...progress, stopIndex: -1 }, def)).toBeNull()
    expect(currentStop({ ...progress, stopIndex: 1.5 }, def)).toBeNull()
    expect(currentStop(progress, { ...def, stops: [] })).toBeNull()
  })
})

describe('isStopReached', () => {
  const progress = startEscort(def, { areaId: 'village', x: 0, y: 0 })

  it('converts stop tiles to pixels and accepts the edge of the radius', () => {
    const stop = def.stops[0]
    expect(isStopReached(progress, def, { x: stop.x * TILE_SIZE + def.stopRadius, y: stop.y * TILE_SIZE })).toBe(true)
    expect(isStopReached(progress, def, { x: stop.x * TILE_SIZE + def.stopRadius + 1, y: stop.y * TILE_SIZE })).toBe(false)
  })

  it('requires the player to share the stop area', () => {
    expect(isStopReached({ ...progress, areaId: 'forest' }, def, { x: 160, y: 160 })).toBe(false)
  })

  it('rejects non-finite player coordinates', () => {
    expect(isStopReached(progress, def, { x: Number.NaN, y: 160 })).toBe(false)
    expect(isStopReached(progress, def, { x: 160, y: Number.POSITIVE_INFINITY })).toBe(false)
  })
})

describe('advanceEscort', () => {
  const nearby: EscortDefinition = {
    ...def,
    stops: [
      { areaId: 'village', x: 10, y: 10, label: 'Gate', arrivalLine: 'Gate reached' },
      { areaId: 'village', x: 11, y: 10, label: 'Road', arrivalLine: 'Road reached' },
    ],
  }

  it('advances one stop per call without skipping nearby stops', () => {
    const progress = startEscort(nearby, { areaId: 'village', x: 160, y: 160 })
    const player = { x: 170, y: 160 }

    const first = advanceEscort(progress, nearby, player)
    expect(first.arrived).toBe(nearby.stops[0])
    expect(first.complete).toBe(false)
    expect(first.progress.stopIndex).toBe(1)
    expect(progress.stopIndex).toBe(0)

    const second = advanceEscort(first.progress, nearby, player)
    expect(second.arrived).toBe(nearby.stops[1])
    expect(second.complete).toBe(true)
    expect(second.progress.stopIndex).toBe(2)

    const third = advanceEscort(second.progress, nearby, player)
    expect(third.arrived).toBeNull()
    expect(third.complete).toBe(true)
    expect(third.progress).toBe(second.progress)
  })

  it('waits at the current stop until the player is in range', () => {
    const progress = startEscort(def, { areaId: 'village', x: 0, y: 0 })
    const result = advanceEscort(progress, def, { x: 0, y: 0 })

    expect(result.arrived).toBeNull()
    expect(result.complete).toBe(false)
    expect(result.progress).toBe(progress)
  })
})

describe('followSpeedForDistance', () => {
  it('uses the base speed up to the leash radius', () => {
    expect(followSpeedForDistance(def, 0)).toBe(def.npcSpeed)
    expect(followSpeedForDistance(def, def.leashRadius)).toBe(def.npcSpeed)
    expect(followSpeedForDistance(def, Number.NaN)).toBe(def.npcSpeed)
  })

  it('applies the catch-up boost beyond the leash radius', () => {
    expect(followSpeedForDistance(def, def.leashRadius + 1)).toBeCloseTo(def.npcSpeed * 1.6, 6)
  })
})

describe('stepFollower', () => {
  const progress = startEscort(def, { areaId: 'village', x: 100, y: 100 })

  it('holds position inside the follow radius', () => {
    const next = stepFollower(progress, def, { x: 150, y: 100 }, 0.05)

    expect(next).toEqual(progress)
    expect(next).not.toBe(progress)
  })

  it('moves toward the player at the configured speed without mutating progress', () => {
    const next = stepFollower(progress, def, { x: 300, y: 100 }, 0.02)

    expect(next.x).toBeCloseTo(103.3, 6)
    expect(next.y).toBe(100)
    expect(next.areaId).toBe(progress.areaId)
    expect(next.stopIndex).toBe(progress.stopIndex)
    expect(progress.x).toBe(100)
  })

  it('normalizes diagonal steering', () => {
    const next = stepFollower(progress, def, { x: 400, y: 400 }, 0.02)

    expect(Math.hypot(next.x - progress.x, next.y - progress.y)).toBeCloseTo(165 * 0.02, 6)
    expect(next.x - progress.x).toBeCloseTo(next.y - progress.y, 6)
  })

  it('speeds up when the player is beyond the leash', () => {
    const near = stepFollower(progress, def, { x: 570, y: 100 }, 0.05)
    const far = stepFollower(progress, def, { x: 700, y: 100 }, 0.05)

    expect(far.x - progress.x).toBeCloseTo(def.npcSpeed * 1.6 * 0.05, 6)
    expect(far.x - progress.x).toBeGreaterThan(near.x - progress.x)
  })

  it('stops at the follow radius instead of overshooting', () => {
    const next = stepFollower(progress, def, { x: 173, y: 100 }, 0.05)

    expect(next.x).toBeCloseTo(101, 6)
    expect(next.y).toBe(100)
  })

  it('caps long frames and handles non-finite values', () => {
    const capped = stepFollower(progress, def, { x: 900, y: 100 }, 0.05)
    expect(stepFollower(progress, def, { x: 900, y: 100 }, 10)).toEqual(capped)

    const broken = stepFollower(
      { ...progress, x: Number.NaN, y: Number.POSITIVE_INFINITY },
      def,
      { x: Number.NaN, y: 100 },
      0.05,
    )
    expect(Number.isFinite(broken.x)).toBe(true)
    expect(Number.isFinite(broken.y)).toBe(true)
    expect(broken.y).toBeGreaterThan(0)
  })

  it('does not move when the follower has no speed', () => {
    const next = stepFollower(progress, { ...def, npcSpeed: 0 }, { x: 900, y: 100 }, 0.05)

    expect(next).toEqual(progress)
  })
})

describe('canCrossPortalWithEscort', () => {
  const progress = startEscort(def, { areaId: 'village', x: 300, y: 300 })

  it('allows crossing when the player stays near the escort', () => {
    expect(canCrossPortalWithEscort(progress, def, { x: 364, y: 300 })).toBe(true)
  })

  it('blocks crossing when the escort lags behind', () => {
    expect(canCrossPortalWithEscort(progress, def, { x: 365, y: 300 })).toBe(false)
  })

  it('allows crossing without an escort and rejects non-finite player coordinates', () => {
    expect(canCrossPortalWithEscort(null as unknown as EscortProgress, def, { x: 0, y: 0 })).toBe(true)
    expect(canCrossPortalWithEscort(progress, def, { x: Number.NaN, y: 300 })).toBe(false)
  })
})

describe('relocateEscortAfterPortal', () => {
  it('keeps identity and stop progress while moving to the new area', () => {
    const progress = { ...startEscort(def, { areaId: 'village', x: 300, y: 300 }), stopIndex: 1 }
    const next = relocateEscortAfterPortal(progress, 'plains', { x: 128, y: 160 })

    expect(next).toEqual({ ...progress, areaId: 'plains', x: 128, y: 160 })
    expect(progress.areaId).toBe('village')
  })

  it('sanitizes missing or non-finite spawn coordinates', () => {
    const progress = startEscort(def, { areaId: 'village', x: 0, y: 0 })

    expect(relocateEscortAfterPortal(progress, 'forest', { x: Number.NaN, y: Number.POSITIVE_INFINITY })).toEqual({
      ...progress,
      areaId: 'forest',
      x: 0,
      y: 0,
    })
    expect(relocateEscortAfterPortal(null as unknown as EscortProgress, 'forest', { x: 1, y: 2 })).toBeNull()
  })
})

describe('escort transition sequence', () => {
  const route: EscortDefinition = {
    ...def,
    stops: [
      { areaId: 'village', x: 10, y: 10, label: 'Gate', arrivalLine: 'Gate reached' },
      { areaId: 'forest', x: 20, y: 20, label: 'Crossing', arrivalLine: 'Crossing reached' },
    ],
  }

  it('carries the follower through both stops and a portal without skipping progress', () => {
    expect(canStartEscort(route, null, ['unrelated'])).toBe(true)
    let progress = startEscort(route, { areaId: 'village', x: 160, y: 160 })

    const first = advanceEscort(progress, route, { x: 160, y: 160 })
    expect(first.arrived).toBe(route.stops[0])
    expect(first.complete).toBe(false)
    progress = first.progress

    const atPortal = { x: 500, y: 160 }
    expect(canCrossPortalWithEscort(progress, route, atPortal)).toBe(false)
    for (let frame = 0; frame < 40; frame += 1) {
      progress = stepFollower(progress, route, atPortal, 0.05)
    }
    expect(canCrossPortalWithEscort(progress, route, atPortal)).toBe(false)
    expect(canCrossPortalWithEscort(progress, route, { x: atPortal.x - 16, y: atPortal.y })).toBe(true)

    progress = relocateEscortAfterPortal(progress, 'forest', { x: 320, y: 320 })
    expect(progress).toMatchObject({ areaId: 'forest', stopIndex: 1, x: 320, y: 320 })

    const final = advanceEscort(progress, route, { x: 320, y: 320 })
    expect(final.arrived).toBe(route.stops[1])
    expect(final.complete).toBe(true)
    expect(isEscortComplete(final.progress, route)).toBe(true)
  })
})

describe('escort invariants across real definitions', () => {
  it('keeps follower coordinates finite with malformed frames', () => {
    for (const definition of Object.values(ESCORTS)) {
      const progress = startEscort(definition, {
        areaId: definition.stops[0].areaId,
        x: Number.NaN,
        y: Number.POSITIVE_INFINITY,
      })
      const player = { x: Number.NEGATIVE_INFINITY, y: Number.NaN }

      for (const delta of [Number.NaN, -1, 0, 10]) {
        const next = stepFollower(progress, definition, player, delta)
        expect(Number.isFinite(next.x), `${definition.id} x`).toBe(true)
        expect(Number.isFinite(next.y), `${definition.id} y`).toBe(true)
        expect(next.areaId).toBe(progress.areaId)
        expect(next.stopIndex).toBe(progress.stopIndex)
        expect(progress.x).toBe(0)
      }
    }
  })

  it('never advances or crosses a portal on non-finite player coordinates', () => {
    for (const definition of Object.values(ESCORTS)) {
      const progress = startEscort(definition, { areaId: definition.stops[0].areaId, x: 160, y: 160 })
      const broken = { x: Number.NaN, y: Number.NEGATIVE_INFINITY }

      expect(advanceEscort(progress, definition, broken).progress).toBe(progress)
      expect(canCrossPortalWithEscort(progress, definition, broken)).toBe(false)
    }
  })
})
