import { describe, expect, it } from 'vitest'
import { TILE_SIZE } from '../world/tileset'
import {
  advanceEscort,
  canStartEscort,
  currentStop,
  isEscortComplete,
  isStopReached,
  startEscort,
} from './logic'
import type { EscortDefinition } from './types'

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
