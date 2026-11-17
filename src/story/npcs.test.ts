import { describe, expect, it } from 'vitest'
import { isFactionId } from '../factions/data'
import { getNpcById, npcGreeting } from './npcs'
import type { NpcDefinition } from './npcs'

describe('npcGreeting', () => {
  const smith = getNpcById('village-smith')!

  it('selects the greeting for the faction tier', () => {
    expect(npcGreeting(smith, { forge: -60 })).toBe(smith.greetings!.hated)
    expect(npcGreeting(smith, { forge: -35 })).toBe(smith.greetings!.hostile)
    expect(npcGreeting(smith, { forge: 35 })).toBe(smith.greetings!.friendly)
    expect(npcGreeting(smith, { forge: 60 })).toBe(smith.greetings!.honored)
    expect(npcGreeting(smith, { forge: 90 })).toBe(smith.greetings!.revered)
  })

  it('falls back to the base greeting when the tier has no line', () => {
    expect(npcGreeting(smith, { forge: 0 })).toBe(smith.greeting)
    expect(npcGreeting(getNpcById('village-archivist')!, { archive: -80 })).toBe(
      getNpcById('village-archivist')!.greeting,
    )
  })

  it('falls back when the NPC has no faction or no tier lines', () => {
    const guide = getNpcById('forest-guide')!
    const noFaction: NpcDefinition = {
      ...smith,
      factionId: undefined,
      greetings: { friendly: 'A line that should never show' },
    }
    expect(npcGreeting(noFaction, { forge: 90 })).toBe(smith.greeting)
    expect(npcGreeting(guide, { wardens: 90 })).toBe(guide.greeting)
  })

  it('reads a missing faction value as neutral', () => {
    expect(npcGreeting(smith, {})).toBe(smith.greeting)
  })

  it('points every assigned NPC at a known faction', () => {
    const ids = [
      'forest-guide',
      'village-smith',
      'village-archivist',
      'village-host',
      'village-trader',
      'night-watch',
    ]
    for (const id of ids) {
      const factionId = getNpcById(id)?.factionId
      expect(factionId).toBeDefined()
      expect(isFactionId(factionId!)).toBe(true)
    }
  })
})
