/**
 * Pure area-map data: ASCII maps, spawn points, and placement arrays with the
 * interfaces that type them. No imports (not even Phaser types) — this module
 * must stay loadable in plain node so the map rules can be unit-tested.
 */

export interface TilePoint {
  x: number
  y: number
}

export interface Portal {
  x: number
  y: number
  toAreaId: string
  toSpawn: TilePoint
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

export const VILLAGE_MAP = [
'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
'T......,.................b..................rrrrrrrrr......,...T',
'T....,.................,kkrrrrrrrrrrrb......rrrrrrrrr.........,T',
'T.....b.......#.........kkrrrrrrrrrrr..b....wfffffffw........b.T',
'T..........#######...,..kkrrrrrrrrrrr.......wfffffffw..........T',
'T.....,...#########.....kkrrrrrrrrrrr.......wfffffffw.......,..T',
'T....b,.,###.~~~.###.,..kkrrrrrrrrrrr...,...wwwwdwwww..........T',
'T.......###~~~~~~~###...kkrrrrrrrrrrr,.........---..........,,.T',
'T......,##,~~~~~~~,##...kkwwwwwwwwwww,.........----....,..b...,T',
'T......b##~~~~~~~~~##....fffffffffff.....b.....----............T',
'T....rrrrrrrrr~~~~~###..,..,....,.....,........----............T',
'T.,..rrrrrrrrr~~~~~##b............,........,...----.,.......b..T',
'T.,..wfffffffw~~~~,##,.......,...........,.....----......,...,.T',
'Tb...wfffffffw~~~~###........,b....,...........----............T',
'T.b..wfffffffw~~.###.......b.....,,...,...,....----............T',
'Tbb..wwwwdwwww#####...,.........bb...........,.----...,...,....T',
'T..........#######...........,b.bb.........,...----..,.........T',
'T.........,.,.#.........,..................,...----............T',
'T,---,.,......,.......b.................,.....,----,...........T',
'T.---.......bb.b...,.b......................,..----.rrrrrrrrr..T',
'T.---rrrrrrrrrr........b.b...b.................----.rrrrrrrrr..T',
'T.---rrrrrrrrrr.....,---b.,...b................----.wfffffffw..T',
'T.---rrrrrrrrrr,...-------.....................----.wfffffffw..T',
'T.---rrrrrrrrrr....-------....................,----.wfffffffw..T',
'T,---wwwwwwwwww...---------,..............,....----.wwwwdwwww.,T',
'T.---fffffffff.,...-------.....................----..b...,.....T',
'T.---..............-------...,.....,.,.........----....b.......T',
'T,---..,...b..b....,.---...b............b,.....----..........,.T',
'T.---rrrrrrrrrrr....t...,...,........,.,---------------------..T',
'T.---rrrrrrrrrrrrrrrrrrrrrr..,........-----------------------,.T',
'T.---wfffffffwrrrrrrrrrrrrr........,.------------------------..T',
'T.---wfffffffwrrrrrrrrrrrrr...........-----------------------..T',
'T.---wfffffffwwwrrrrrrrrrrr......,..,...---------------------..T',
'T.---wwwwdwwwwfwwwwwwwwwwwwb..........-------------------------T',
'T.---.........,.ffffffffff,...........-------------------------T',
'T,---...,,,...,......................--------------------------T',
'T--------------------------------------------------------------T',
'T--------------------------------------------------------------T',
'T--------------------------------------------------------------T',
'T..,.....,.....,.......rrrrrrrrr...,.--------------------------T',
'T...................,..rrrrrrrrr--....--------------rrrrrrr----T',
'T,..b.b.....,.b.,..b...wfffffffw----..--------------rrrrrrr----T',
'T............,.........wfffffffw-----,..------------rrrrrrr--..T',
'T.b.,bb.....,..........wfffffffw----...,------------rrrrrrr--..T',
'T.b...b.,....b.........wwwwdwwww--..t.bb------------wwwwwww--.,T',
'Tb...bb.....t......,..........................-------fffffb..b.T',
'T.,.......,....,..,...........,...............b,...............T',
'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
]

export const FOREST_SPAWN: TilePoint = { x: 11, y: 24 }
export const VILLAGE_SPAWN: TilePoint = { x: 50, y: 37 }

export const FOREST_NPCS: readonly AreaNpcPlacement[] = [
  { npcId: 'forest-guide', x: 16, y: 22 },
]

export const VILLAGE_NPCS: readonly AreaNpcPlacement[] = [
  { npcId: 'village-smith', x: 12, y: 13 },
  { npcId: 'village-archivist', x: 48, y: 4 },
  { npcId: 'village-host', x: 27, y: 42 },
  { npcId: 'village-trader', x: 56, y: 22 },
]

export const FOREST_PORTALS: readonly Portal[] = [
  {
    x: 62,
    y: 24,
    toAreaId: 'village',
    toSpawn: { x: 4, y: 37 },
    label: 'To Emberhold',
  },
  {
    x: 5,
    y: 24,
    toAreaId: 'cave',
    toSpawn: { x: 6, y: 16 },
    label: 'To the Crystal Cave',
  },
]

export const VILLAGE_PORTALS: readonly Portal[] = [
  {
    x: 2,
    y: 37,
    toAreaId: 'forest',
    toSpawn: { x: 60, y: 24 },
    label: 'To the Thornwood',
  },
]

export const FOREST_ITEMS: readonly AreaItemPlacement[] = [
  { itemId: 'torch', x: 7, y: 24 },
  { itemId: 'heath-herb', x: 13, y: 27, quantity: 3 },
  { itemId: 'oak-kindling', x: 26, y: 17, quantity: 5 },
  { itemId: 'rough-hides', x: 42, y: 8 },
  { itemId: 'emberglass', x: 6, y: 16, onceFlag: true },
  { itemId: 'worn-dagger', x: 57, y: 26, onceFlag: true },
  { itemId: 'axe', x: 58, y: 24, onceFlag: true },
  { itemId: 'steel-ingot', x: 8, y: 15, onceFlag: true },
  { itemId: 'steel-ingot', x: 59, y: 26, onceFlag: true },
]

export const VILLAGE_ITEMS: readonly AreaItemPlacement[] = [
  { itemId: 'iron-ore', x: 38, y: 10, quantity: 5 },
  { itemId: 'bog-reed', x: 7, y: 16, quantity: 3 },
  { itemId: 'coil-rope', x: 17, y: 19 },
  { itemId: 'rough-hides', x: 40, y: 39, quantity: 2 },
  { itemId: 'leather-cap', x: 15, y: 35, onceFlag: true },
  { itemId: 'steel-ingot', x: 38, y: 12, onceFlag: true },
  { itemId: 'steel-ingot', x: 17, y: 36, onceFlag: true },
  { itemId: 'steel-ingot', x: 42, y: 40, onceFlag: true },
]

export const CAVE_SPAWN: TilePoint = { x: 4, y: 16 }

export const CAVE_NPCS: readonly AreaNpcPlacement[] = []

export const CAVE_ITEMS: readonly AreaItemPlacement[] = []

export const CAVE_PORTALS: readonly Portal[] = [
  {
    x: 4,
    y: 18,
    toAreaId: 'forest',
    toSpawn: { x: 6, y: 24 },
    label: 'To the Thornwood',
  },
]
