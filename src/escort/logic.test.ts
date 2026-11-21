import { describe, expect, it } from 'vitest'
import { canStartEscort, isEscortComplete, startEscort } from './logic'
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
