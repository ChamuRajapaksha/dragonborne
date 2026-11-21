export interface EscortStop {
  areaId: string
  x: number
  y: number
  label: string
  arrivalLine: string
}

export interface EscortDefinition {
  id: string
  questId: string
  npcId: string
  followRadius: number
  stopRadius: number
  leashRadius: number
  npcSpeed: number
  stops: readonly EscortStop[]
}

export interface EscortProgress {
  escortId: string
  npcId: string
  stopIndex: number
  areaId: string
  x: number
  y: number
}
