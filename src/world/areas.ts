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