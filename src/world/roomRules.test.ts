import { describe, expect, it } from 'vitest'
import { findRoomViolations } from './roomRules'
import type { AreaRoom } from './rooms'

const MAP = [
  'TTTTTT',
  'TffffT',
  'TffffT',
  'TwwdwT',
  'T....T',
  'TTTTTT',
]

const ROOM: AreaRoom = {
  id: 'test-room',
  name: 'The Test Room',
  bounds: { x: 1, y: 1, width: 4, height: 2 },
  spawn: { x: 2, y: 2 },
  doors: [{ x: 3, y: 3, outside: { x: 3, y: 4 } }],
}

describe('findRoomViolations', () => {
  it('accepts a room whose floor, spawn and door all line up', () => {
    expect(findRoomViolations(MAP, [ROOM])).toEqual([])
  })

  it('flags duplicate room ids', () => {
    expect(findRoomViolations(MAP, [ROOM, { ...ROOM }])).toContain(
      "room 'test-room' has a duplicate id",
    )
  })

  it('flags bounds that leave the map', () => {
    const room = { ...ROOM, bounds: { x: 5, y: 1, width: 4, height: 2 } }
    expect(findRoomViolations(MAP, [room])).toContain(
      "room 'test-room' bounds 5,1,4,2 leave the map",
    )
  })

  it('flags overlapping rooms', () => {
    const other = { ...ROOM, id: 'other-room' }
    expect(findRoomViolations(MAP, [ROOM, other])).toContain(
      "rooms 'test-room' and 'other-room' overlap",
    )
  })

  it('flags a non-floor tile inside the bounds', () => {
    const map = [...MAP]
    map[2] = 'TfTffT'
    expect(findRoomViolations(map, [ROOM])).toContain(
      "room 'test-room' tile 2,2 is 'T', expected floor 'f'",
    )
  })

  it('flags a spawn outside the bounds', () => {
    const room = { ...ROOM, spawn: { x: 4, y: 4 } }
    expect(findRoomViolations(MAP, [room])).toContain(
      "room 'test-room' spawn 4,4 is outside its bounds",
    )
  })

  it('flags a spawn that is not floor', () => {
    const map = [...MAP]
    map[2] = 'TfTffT'
    expect(findRoomViolations(map, [ROOM])).toContain(
      "room 'test-room' spawn 2,2 is not floor",
    )
  })

  it('flags a door that is not a d tile', () => {
    const map = [...MAP]
    map[3] = 'TwwwwT'
    expect(findRoomViolations(map, [ROOM])).toContain(
      "room 'test-room' door 3,3 is not a 'd' tile",
    )
  })

  it('flags an outside tile that is not adjacent to its door', () => {
    const room = { ...ROOM, doors: [{ x: 3, y: 3, outside: { x: 4, y: 4 } }] }
    expect(findRoomViolations(MAP, [room])).toContain(
      "room 'test-room' outside tile 4,4 is not adjacent to door 3,3",
    )
  })

  it('flags an outside tile that is not walkable', () => {
    const map = [...MAP]
    map[4] = 'T..T.T'
    expect(findRoomViolations(map, [ROOM])).toContain(
      "room 'test-room' outside tile 3,4 is not walkable",
    )
  })

  it('flags an orphan floor tile', () => {
    const map = [...MAP]
    map[4] = 'T..f.T'
    expect(findRoomViolations(map, [ROOM])).toContain(
      'floor tile 3,4 is not inside any room',
    )
  })

  it('flags an orphan door tile', () => {
    const map = [...MAP]
    map[4] = 'T..d.T'
    expect(findRoomViolations(map, [ROOM])).toContain(
      'door tile 3,4 does not belong to any room',
    )
  })
})
