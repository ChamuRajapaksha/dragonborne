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
  intro?: AreaIntro
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
  'T......,.................b..................,..b..,..b.....,...T',
  'T....,.................,.............b....b...................,T',
  'T.....b.......#........................b.........b...........b.T',
  'T..........#######...,.....,,...................b.,,...,.......T',
  'T.....,...#########..........,..,...........,.......,.b,....,..T',
  'T....b,.,###.~~~.###.,..........b.......,...b..................T',
  'T.......###~~~~~~~###...b........,...,.............,........,,.T',
  'T......,##,~~~~~~~,##................,............-....,..b...,T',
  'T......b##~~~~~~~~~##....................b.......,-............T',
  'T......###~~~~~~~~~###..,..,....,.....,...........-............T',
  'T.,.....##~~~~~~~~~##b............,........,......-.,.......b..T',
  'T.,.....##,~~~~~~~,##,.......,...........,........-......,...,.T',
  'Tb....b.###~~~~~~~###........,b....,..............-............T',
  'T.b..b..,###.~~~.###.......b.....,,...,...,.......-............T',
  'Tbb....,..#########...,.........bb...........,..,,-...,...,....T',
  'T..........#######...........,b.bb.........,......-..,.........T',
  'T.........,.,.#.........,..................,......-............T',
  'T,,..,.,......,.......b.............,...,.....,...-,...........T',
  'T...........bb.b...,.b......................,.....-....b.......T',
  'T...,..................b.b...b.....,.............,-............T',
  'T.,.................,---b.,...b.....b.,.........,.-.......b,...T',
  'T....,b......,.,...-------............,........,..-.b.,........T',
  'T....b.............-------...........,........,...-...b........T',
  'T,b,...,..........---------,..............,......b-........,..,T',
  'T........b..,..,...-------........................-..b...,.....T',
  'T..................-------...,.....,.,............-....b.......T',
  'T,,....,...b..b....,.---...b............b,........-..........,.T',
  'T......b..b.........,...,...,........,.,-.........-.....b...,..T',
  'T...........b...,,...........,........-----...---------......,.T',
  'T...,..............b...............,.---------------------.....T',
  'T..,...b..............................----------------------...T',
  'T............,.,..b.......,......,..,...---------------------..T',
  'T.....................,....b..........-------------------------T',
  'T.b...........,..,,......,,...........-------------------------T',
  'T,......,,,...,......................--------------------------T',
  'T..........,........b...,............--------------------------T',
  'T.-------------------------------------------------------------T',
  'T......b,..,.........b,..,..b....,...--------------------------T',
  'T..,.....,.....,..........,........,.--------------------------T',
  'T...................,..........---....-------------------------T',
  'T,..b.b.....,.b.,..b.........-------..-------------------------T',
  'T............,..........,.,.---------,..---------------------..T',
  'T.b.,bb.....,.............,..-------...,.-------------------...T',
  'T.b...b.,....b...........b.....---....bb...---------------,...,T',
  'Tb...bb............,.........b................---------...b..b.T',
  'T.,.......,....,..,......b.bb.,...............b,...............T',
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
}

export const FOREST: AreaDefinition = {
  id: 'forest',
  name: 'The Thornwood',
  backgroundColor: 0x1d2b1d,
  map: FOREST_MAP,
  defaultSpawn: { x: 11, y: 24 },
  npcs: [{ npcId: 'forest-guide', x: 16, y: 22 }],
  portals: [
    {
      x: 62,
      y: 24,
      toAreaId: 'village',
      toSpawn: { x: 4, y: 37 },
      label: 'To Emberhold',
    },
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