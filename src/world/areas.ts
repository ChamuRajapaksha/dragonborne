import Phaser from 'phaser'
import type { TileLegendEntry } from './tileset'
import { TILE_BY_CHAR, TILE_SIZE } from './tileset'

export interface TilePoint {
  x: number
  y: number
}

export function parseAreaMap(
  rows: readonly string[],
  legend: ReadonlyMap<string, TileLegendEntry> = TILE_BY_CHAR,
): number[][] {
  if (rows.length === 0) throw new Error('Area map has no rows')

  const width = rows[0]?.length ?? 0
  if (width === 0) throw new Error('Area map has an empty first row')

  const data: number[][] = []

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Area map row ${y} is ${row.length} chars, expected ${width}`)
    }

    const tiles: number[] = []
    for (let x = 0; x < row.length; x += 1) {
      const char = row[x] ?? ''
      const tile = legend.get(char)
      if (!tile) {
        throw new Error(
          `Area map has unknown tile char '${char}' at ${x},${y} (no entry in the legend)`,
        )
      }
      tiles.push(tile.index)
    }
    data.push(tiles)
  })

  return data
}

export function tileToWorld(point: TilePoint, size = TILE_SIZE): TilePoint {
  return { x: point.x * size, y: point.y * size }
}

export function worldToTile(x: number, y: number, size = TILE_SIZE): TilePoint {
  return { x: Math.floor(x / size), y: Math.floor(y / size) }
}

export interface Portal {
  x: number
  y: number
  toAreaId: string
  toSpawn: { x: number; y: number }
  label: string
}

export interface AreaNpcPlacement {
  npcId: string
  x: number
  y: number
}

export interface AreaItemPlacement {
  itemId: string
  x: number // tile coords
  y: number
  quantity?: number // default 1
  /** One-time pickup: hidden for good once its progress flag has been set. */
  onceFlag?: boolean
}

export interface AreaIntro {
  title: string
  body: readonly string[]
}

export interface AreaDefinition {
  id: string
  name: string
  backgroundColor: number
  map: readonly string[]
  defaultSpawn: { x: number; y: number }
  npcs: readonly AreaNpcPlacement[]
  portals: readonly Portal[]
  /** Items lying on the ground; respawn on re-entry unless `onceFlag` is set. */
  items?: readonly AreaItemPlacement[]
  intro?: AreaIntro
  /** Area the HUD waypoint hint points at; must be the destination of one of `portals`. */
  waypointAreaId?: string
}

const FOREST_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T,.b.,T,.T....,...,............TT.....T.,T.,.....,.......,....,T',
  'T.,,,.b..TTT.....#...T..........T.,.,...TT,,.,.T,,...,.,.......T',
  'T........,..,..b,T...,..T...,T......T,.T..T..,.,..,....,.....T.T',
  'T.T,,TT.,..T..b....T..,,.T.T,........T.....,..b,T..T...T,....T,T',
  'T....,..#,....b.,..T,TT...,.T...,.....#...Tb,.....,T..T,.T,T.,.T',
  'T.,...,b....,.TT......T...,,.......T.#...........,.,..,.,,.....T',
  'T..,,T,,........,.T,......T....T,..T......b.......T.,.T..,.,..,T',
  'T........,........T.....#.....................TT.....T.......,.T',
  'T.,.,....b...,.#.....,....,.T.,.T..#,,T...T.T.....,...T.....TT.T',
  'T.,,,..........T.,.T,,..T.#..#...T,..T...#..,#....T,....,......T',
  'T....T.TT,#.....T.#.,.,b..,.,.T.......T.T..#...T,T,.#.,.,,T.,..T',
  'T.T....T.......,.b.T....,.,T.....T,.......,.T..T..T..T.,T..,..bT',
  'T.T,T,,..T..,.T...T....,,,.....,.,...b.T.,...,.T.,..T.,,,,..,..T',
  'T.,.,,...,....,#.,.T.T...,..,..T....,.T#.,.,T................T.T',
  'T.,...T................,......T,....T.b...,..T.,,.....,...T...,T',
  'TT...T...................,T,.,.....T..,..,....,T...b.......,,.bT',
  'T........#####........T.b..T...T...,.T..,.#,..,.....,.T..,.....T',
  'TT.....###...###.......T....,...,...........T.,........T.T..,..T',
  'T.....##.......##........,.T....................T..,T..,T.,b...T',
  'T....##.........##.......T..,..,.......T.T.T#....b..,..,...,..bT',
  'T....#...........#....,.T,.,.,...T,..,T..,,..............T.#.b.T',
  'TT..##...........##...TT.,T,,,,.,...T...,T......T....T.....,...T',
  'T#------------------------------------------------------------.T',
  'T.------------------------------------------------------------.T',
  'T.------------------------------------------------------------.T',
  'TT..##...........##....,...,.---,,....T...T.,..........,T.,....T',
  'T....#...........#...,,....,,---.bT....b.TT,,.T...b,...b.....TTT',
  'T,...##.........##....b..,,T.---.,...b,..TT,...,TT....T,.....T.T',
  'TT....##.......##....b,..#...---....T.#...b.,.,T.....,..T..T.T.T',
  'T,.....###...###........T.T..---.....,...,,.T.,,....T.....,,.T,T',
  'T........#####.......,...T.T.---...T..,T.T.#.TT.........T..,.,.T',
  'T,...,............,....,...,,---,....T.#T....#..b,...,,,..,T...T',
  'T.T.............,.T.,..T..,..---.,T...b,.,.T..T...T,T..T..T.,..T',
  'T...,.,,......,.#,.,.T....T.T---.b.,.,.,..T....,...b.,.T...T...T',
  'T..,...,,.,.....,#,..T.T,.,,T---b......T...,..,,...T.....TT,.b.T',
  'T..T...,.....,....,........,-----.TT...T.,..,....,.,...,...,...T',
  'T.,...TT.T..,.T.,#T.....-------------,.T,,....#.,,.........TT..T',
  'T.,.,T....,...,.,...,.-----------------,T.........,.....b..T,T.T',
  'T........T..b......,.-------------------.T......,T.T,.#.,.#T.T.T',
  'T...T.,T..T..,.#.,.,.-------------------.,...,.....,....b...T.,T',
  'T....,..,bT.......b..-------------------....T,......,.b.....T..T',
  'T...,bb..,.......,...,-----------------...,...T.T,.,.,,........T',
  'T...T.T...T......,..,,b,-------------,T.TT.,.b.........,.......T',
  'T.T..,..,T......,..,,TTT..TT-----...,....T.....,.....,........,T',
  'Tb......,..,,,..,T,......,.T......,..TT..,...,..b.......,.b..#.T',
  'TT.....,..T.,.T...,.,.,.........T..,.T..,.....T........,.......T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
]

const VILLAGE_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T......,.................b................rrrrrrrrrrrrrrrrr,...T',
  'T....,.................,kkrrrrrrrrrrrb....rrrrrrrrrrrrrrrrr...,T',
  'T.....b.......#.........kkrrrrrrrrrrr..b..rrrrrrrrrrrrrrrrr..b.T',
  'T..........#######...,..kkrrrrrrrrrrr.....rrrrrrrrrrrrrrrrr....T',
  'T.....,...#########.....kkrrrrrrrrrrr.....wwwwwwwwwwwwwwwww.,..T',
  'T....b,.,###.~~~.###.,..kkrrrrrrrrrrr...,.wfffffffffffffffw....T',
  'T.......###~~~~~~~###...kkrrrrrrrrrrr,.....ffff---ffffffff..,,.T',
  'T......,##,~~~~~~~,##...kkwwwwwwwwwww,.........----....,..b...,T',
  'T......b##~~~~~~~~~##....fffffffffff.....b.....----............T',
  'T......###~~~~~~~~~###..,..,....,.....,........----............T',
  'T.,.....##~~~~~~~~~##b............,........,...----.,.......b..T',
  'T.,.....##,~~~~~~~,##,.......,...........,.....----......,...,.T',
  'Tb....b.###~~~~~~~###........,b....,...........----............T',
  'T.b..b..,###.~~~.###.......b.....,,...,...,....----............T',
  'Tbb....,..#########...,.........bb...........,.----...,...,....T',
  'T..........#######...........,b.bb.........,...----..,.........T',
  'T.........,.,.#.........,.......rrrrrrr....,...----............T',
  'T,---,.,......,.......b.........rrrrrrrr,.....,----,...........T',
  'T.---.......bb.b...,.b..........rrrrrrrr....,..----.rrrrrrrr...T',
  'T.---rrrrrrrrrr........b.b...b..rrrrrrrr.......----.rrrrrrrr...T',
  'T.---rrrrrrrrrr.....,---b.,...b.wwwwwwwr.......----.rrrrrrrr...T',
  'T.---rrrrrrrrrr,...-------.......fffffww.......----.rrrrrrrr...T',
  'T.---rrrrrrrrrr....-------........fffff.......,----.wwwwwwww...T',
  'T,---wwwwwwwwww...---------,..............,....----..ffffff,..,T',
  'T.---fffffffff.,...-------.....................----..b...,.....T',
  'T.---..............-------...,.....,.,.........----....b.......T',
  'T,---..,...b..b....,.---...b............b,.....----..........,.T',
  'T.---rrrrrrrrrrr....,...,...,........,.,---------------------..T',
  'T.---rrrrrrrrrrrrrrrrrrrrrr..,........-----------------------,.T',
  'T.---rrrrrrrrrrrrrrrrrrrrrr........,.------------------------..T',
  'T.---rrrrrrrrrrrrrrrrrrrrrr...........-----------------------..T',
  'T.---wwwwwwwwwwwrrrrrrrrrrr......,..,...---------------------..T',
  'T.---ffffffffffwwwwwwwwwwwwb..........-------------------------T',
  'T.---.........,.ffffffffff,...........-------------------------T',
  'T,---...,,,...,......................--------------------------T',
  'T--------------------------------------------------------------T',
  'T--------------------------------------------------------------T',
  'T--------------------------------------------------------------T',
  'T..,.....,.....,..........,........,.--------------------------T',
  'T...................,..rrrrrrrrr--....--------------rrrrrrr----T',
  'T,..b.b.....,.b.,..b..rrrrrrrrrr----..--------------rrrrrrr----T',
  'T............,........rrrrrrrrrr-----,..------------rrrrrrr--..T',
  'T.b.,bb.....,.........rrrrrrrrrr----...,------------rrrrrrr--..T',
  'T.b...b.,....b........rwwwwwwwww--....bb------------wwwwwww--.,T',
  'Tb...bb............,..wwwwwwwww...............-------fffffb..b.T',
  'T.,.......,....,..,....fffffff,...............b,...............T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
]

export const VILLAGE: AreaDefinition = {
  id: 'village',
  name: 'Emberhold',
  backgroundColor: 0x2c3e2c,
  map: VILLAGE_MAP,
  defaultSpawn: { x: 50, y: 37 },
  npcs: [
    { npcId: 'village-smith', x: 56, y: 37 },
    { npcId: 'village-archivist', x: 44, y: 31 },
    { npcId: 'village-host', x: 50, y: 31 },
  ],
  portals: [
    {
      x: 2,
      y: 37,
      toAreaId: 'forest',
      toSpawn: { x: 60, y: 24 },
      label: 'To the Thornwood',
    },
  ],
  items: [
    { itemId: 'iron-ore', x: 38, y: 10, quantity: 5 },
    { itemId: 'bog-reed', x: 7, y: 16, quantity: 3 },
    { itemId: 'coil-rope', x: 17, y: 19 },
    { itemId: 'rough-hides', x: 40, y: 39, quantity: 2 },
    { itemId: 'leather-cap', x: 15, y: 35, onceFlag: true },
  ],
}

export const FOREST: AreaDefinition = {
  id: 'forest',
  name: 'The Thornwood',
  backgroundColor: 0x1d2b1d,
  map: FOREST_MAP,
  defaultSpawn: { x: 11, y: 24 },
  npcs: [{ npcId: 'forest-guide', x: 16, y: 22 }],
  waypointAreaId: 'village',
  portals: [
    {
      x: 62,
      y: 24,
      toAreaId: 'village',
      toSpawn: { x: 4, y: 37 },
      label: 'To Emberhold',
    },
  ],
  items: [
    { itemId: 'torch', x: 7, y: 24 },
    { itemId: 'heath-herb', x: 13, y: 27, quantity: 3 },
    { itemId: 'oak-kindling', x: 26, y: 17, quantity: 5 },
    { itemId: 'rough-hides', x: 45, y: 8 },
    { itemId: 'emberglass', x: 6, y: 16, onceFlag: true },
    { itemId: 'worn-dagger', x: 57, y: 26, onceFlag: true },
  ],
  intro: {
    title: 'The Thornwood',
    body: [
      'You wake on a cold stone ring at the edge of the woods, the fire long burned down to ash.',
      'Somewhere east, past the trees and the long dirt track, smoke rises from a village.',
      'A stranger waits by the ring, watching to see what kind of traveller you are.',
    ],
  },
}

export const AREAS: Readonly<Record<string, AreaDefinition>> = {
  forest: FOREST,
  village: VILLAGE,
}

export function getAreaById(areaId: string): AreaDefinition {
  const area = AREAS[areaId]
  if (!area) throw new Error(`Unknown area '${areaId}'`)
  return area
}

export function getAreaSize(area: AreaDefinition): Phaser.Geom.Rectangle {
  const width = (area.map[0]?.length ?? 0) * TILE_SIZE
  const height = area.map.length * TILE_SIZE
  return new Phaser.Geom.Rectangle(0, 0, width, height)
}

export function getAreaSpawn(area: AreaDefinition): { x: number; y: number } {
  return tileToWorld(area.defaultSpawn)
}