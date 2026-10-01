export const TILE_SIZE = 16

export interface TileLegendEntry {
  index: number
  char: string
  name: string
  base: number
  detail: number
  collides: boolean
}

export const TILE_LEGEND: readonly TileLegendEntry[] = [
  { index: 0, char: '.', name: 'grass', base: 0x4e7f43, detail: 0x5e934f, collides: false },
  { index: 1, char: ',', name: 'tall grass', base: 0x3d6b33, detail: 0x54903f, collides: false },
  { index: 2, char: 'T', name: 'tree canopy', base: 0x27562b, detail: 0x2f6b32, collides: true },
  { index: 3, char: 't', name: 'tree trunk', base: 0x5a4128, detail: 0x6b4d2f, collides: true },
  { index: 4, char: '#', name: 'rock', base: 0x6f7176, detail: 0x8b8d92, collides: true },
  { index: 5, char: '~', name: 'water', base: 0x2f6a8f, detail: 0x3f83ad, collides: true },
  { index: 6, char: '-', name: 'dirt path', base: 0x9a8256, detail: 0xab9163, collides: false },
  { index: 7, char: 'b', name: 'bush', base: 0x35632c, detail: 0x43773a, collides: true },
  { index: 8, char: 'r', name: 'roof', base: 0x8f4a3c, detail: 0xa2594a, collides: true },
  { index: 9, char: 'w', name: 'wall', base: 0x7d6a52, detail: 0x92806a, collides: true },
  { index: 10, char: 'f', name: 'floor', base: 0xa89880, detail: 0xbcaa92, collides: false },
  { index: 11, char: 'k', name: 'keep', base: 0x5f6470, detail: 0x717683, collides: true },
]