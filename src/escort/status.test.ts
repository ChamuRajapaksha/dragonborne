import { describe, expect, it } from 'vitest'
import { escortHudLine, escortStatusLine } from './status'
import type { EscortDefinition } from './types'

const def: EscortDefinition = {
  id: 'archivists-escort',
  questId: 'escort-the-archivist',
  npcId: 'village-archivist',
  followRadius: 72,
  stopRadius: 40,
  leashRadius: 480,
  npcSpeed: 165,
  stops: [
    { areaId: 'village', x: 10, y: 10, label: 'Village archive', arrivalLine: 'Archive reached' },
    { areaId: 'forest', x: 20, y: 20, label: 'Thornwood crossing', arrivalLine: 'Crossing reached' },
    { areaId: 'plains', x: 30, y: 30, label: 'Amber Plains ridge', arrivalLine: 'Ridge reached' },
  ],
}

function progress(stopIndex: number) {
  return {
    escortId: def.id,
    npcId: def.npcId,
    stopIndex,
    areaId: 'village',
    x: 160,
    y: 160,
  }
}

describe('escortHudLine', () => {
  it('names the escort with the current stop and counter', () => {
    expect(escortHudLine(progress(0), def, 'Maerwyn')).toBe('Escorting Maerwyn → Village archive (1/3)')
    expect(escortHudLine(progress(1), def, 'Maerwyn')).toBe('Escorting Maerwyn → Thornwood crossing (2/3)')
  })

  it('falls back to the npc id when no display name is supplied', () => {
    expect(escortHudLine(progress(0), def)).toBe('Escorting village-archivist → Village archive (1/3)')
  })

  it('shows the final stop when every stop has been reached', () => {
    expect(escortHudLine(progress(3), def, 'Maerwyn')).toBe('Escorting Maerwyn → Amber Plains ridge (3/3)')
  })

  it('reports no escort for missing data', () => {
    expect(escortHudLine(null, def)).toBe('No escort')
    expect(escortHudLine(progress(0), null)).toBe('No escort')
    expect(escortHudLine(progress(0), { ...def, stops: [] })).toBe('No escort')
  })
})

describe('escortStatusLine', () => {
  it('names the next stop with a step counter', () => {
    expect(escortStatusLine(progress(0), def)).toBe('Next stop: Village archive (1/3)')
    expect(escortStatusLine(progress(1), def)).toBe('Next stop: Thornwood crossing (2/3)')
  })

  it('reports readiness after the final stop', () => {
    expect(escortStatusLine(progress(3), def)).toBe('All stops reached — ready to complete')
  })

  it('is empty without an escort', () => {
    expect(escortStatusLine(null, def)).toBe('')
    expect(escortStatusLine(progress(0), null)).toBe('')
    expect(escortStatusLine(progress(0), { ...def, stops: [] })).toBe('')
  })
})
