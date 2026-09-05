export interface CharacterClass {
  id: string
  name: string
  stats: Record<string, number>
}

export interface Character {
  id: string
  name: string
  classId: string
  stats: Record<string, number>
  createdAt: string
}