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
    bounds: { x: 6, y: 12, width: 7, height: 3 },
    spawn: { x: 9, y: 13 },
    doors: [{ x: 9, y: 15, outside: { x: 9, y: 16 } }],
  },
  {
    id: 'store',
    name: 'The Store',
    bounds: { x: 53, y: 21, width: 7, height: 3 },
    spawn: { x: 56, y: 22 },
    doors: [{ x: 56, y: 24, outside: { x: 56, y: 25 } }],
  },
  {
    id: 'inn',
    name: 'The Inn',
    bounds: { x: 24, y: 41, width: 7, height: 3 },
    spawn: { x: 27, y: 42 },
    doors: [{ x: 27, y: 44, outside: { x: 27, y: 45 } }],
  },
  {
    id: 'archive',
    name: 'The Archive',
    bounds: { x: 45, y: 3, width: 7, height: 3 },
    spawn: { x: 48, y: 4 },
    doors: [{ x: 48, y: 6, outside: { x: 48, y: 7 } }],
  },
  {
    id: 'longhouse',
    name: 'The Longhouse',
    bounds: { x: 6, y: 30, width: 7, height: 3 },
    spawn: { x: 9, y: 31 },
    doors: [{ x: 9, y: 33, outside: { x: 9, y: 34 } }],
  },
  {
    id: 'cottage',
    name: 'The Cottage',
    bounds: { x: 6, y: 21, width: 8, height: 3 },
    spawn: { x: 9, y: 22 },
    doors: [{ x: 9, y: 24, outside: { x: 9, y: 25 } }],
  },
  {
    id: 'warehouse',
    name: 'The Warehouse',
    bounds: { x: 53, y: 41, width: 5, height: 3 },
    spawn: { x: 55, y: 42 },
    doors: [{ x: 55, y: 44, outside: { x: 55, y: 45 } }],
  },
  {
    id: 'keep',
    name: 'The Keep',
    bounds: { x: 27, y: 4, width: 9, height: 4 },
    spawn: { x: 31, y: 6 },
    doors: [{ x: 31, y: 8, outside: { x: 31, y: 9 } }],
  },
  {
    id: 'hall',
    name: 'The Hall',
    bounds: { x: 16, y: 30, width: 10, height: 3 },
    spawn: { x: 20, y: 31 },
    doors: [{ x: 20, y: 33, outside: { x: 20, y: 34 } }],
  },
]
