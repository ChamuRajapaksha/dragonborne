export interface CharacterClass {
  id: string
  name: string
  stats: Record<string, number>
  /** Added to base stats once per level above 1. */
  statGains: Partial<Record<string, number>>
}

export interface Character {
  id: string
  name: string
  classId: string
  stats: Record<string, number>
  createdAt: string
}