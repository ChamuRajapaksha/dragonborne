export interface CompassPoint {
  label: string
  x: number
  y: number
}

/** A quest giver's static position, in pixels. */
export interface QuestTarget extends CompassPoint {
  areaId: string
  npcId: string
}
