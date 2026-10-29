import { describe, expect, it } from 'vitest'
import { VILLAGE_MAP } from './maps'
import { findRoomViolations } from './roomRules'
import { VILLAGE_ROOMS } from './rooms'

const ROOM_IDS = [
  'forge',
  'store',
  'inn',
  'archive',
  'longhouse',
  'cottage',
  'warehouse',
  'keep',
  'hall',
]

function insideAnyRoom(x: number, y: number): boolean {
  return VILLAGE_ROOMS.some((room) => {
    const bounds = room.bounds
    return (
      x >= bounds.x &&
      y >= bounds.y &&
      x < bounds.x + bounds.width &&
      y < bounds.y + bounds.height
    )
  })
}

function claimedByDoor(x: number, y: number): boolean {
  return VILLAGE_ROOMS.some((room) =>
    room.doors.some((door) => door.x === x && door.y === y),
  )
}

describe('village rooms', () => {
  it('defines the nine enterable interiors with unique ids', () => {
    expect(VILLAGE_ROOMS.map((room) => room.id)).toEqual(ROOM_IDS)
    expect(new Set(ROOM_IDS).size).toBe(ROOM_IDS.length)
  })

  it('passes every pure room rule against the village map', () => {
    expect(findRoomViolations(VILLAGE_MAP, VILLAGE_ROOMS)).toEqual([])
  })

  it('claims every floor tile with a room', () => {
    const orphans: string[] = []
    VILLAGE_MAP.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        if (row[x] === 'f' && !insideAnyRoom(x, y)) orphans.push(`${x},${y}`)
      }
    })
    expect(orphans).toEqual([])
  })

  it('claims every door tile with a room door', () => {
    const orphans: string[] = []
    VILLAGE_MAP.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        if (row[x] === 'd' && !claimedByDoor(x, y)) orphans.push(`${x},${y}`)
      }
    })
    expect(orphans).toEqual([])
  })
})
