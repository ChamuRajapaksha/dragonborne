import type { TilePoint } from './maps'

export interface AreaRoomDoor {
  x: number
  y: number
  outside: TilePoint
}

export interface AreaRoom {
  id: string
  name: string
  bounds: { x: number; y: number; width: number; height: number }
  spawn: TilePoint
  doors: readonly AreaRoomDoor[]
}

/**
 * Village interiors, pure data so the room rules can be tested without Phaser.
 * Each room's bounds cover only its floor tiles; doors sit on the wall row and
 * name the outside tile they open onto.
 */
export const VILLAGE_ROOMS: readonly AreaRoom[] = [
  {
    id: 'forge',
    name: 'The Forge',
    bounds: { x: 4, y: 9, width: 11, height: 8 },
    spawn: { x: 9, y: 13 },
    doors: [{ x: 9, y: 16, outside: { x: 9, y: 18 } }],
  },
  {
    id: 'store',
    name: 'The Store',
    bounds: { x: 51, y: 18, width: 11, height: 8 },
    spawn: { x: 56, y: 22 },
    doors: [{ x: 56, y: 25, outside: { x: 56, y: 27 } }],
  },
  {
    id: 'inn',
    name: 'The Inn',
    bounds: { x: 22, y: 38, width: 11, height: 8 },
    spawn: { x: 27, y: 42 },
    doors: [{ x: 27, y: 45, outside: { x: 27, y: 47 } }],
  },
  {
    id: 'archive',
    name: 'The Archive',
    bounds: { x: 43, y: 0, width: 11, height: 8 },
    spawn: { x: 48, y: 4 },
    doors: [{ x: 48, y: 7, outside: { x: 48, y: 9 } }],
  },
  {
    id: 'longhouse',
    name: 'The Longhouse',
    bounds: { x: 4, y: 27, width: 11, height: 8 },
    spawn: { x: 9, y: 31 },
    doors: [{ x: 9, y: 34, outside: { x: 9, y: 36 } }],
  },
]
