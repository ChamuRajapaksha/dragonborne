import type { CharacterClass } from './types'

const classData = [
  {
    id: 'warrior',
    name: 'Warrior',
    stats: { strength: 5, agility: 3, intellect: 2 },
  },
  {
    id: 'rogue',
    name: 'Rogue',
    stats: { strength: 3, agility: 5, intellect: 2 },
  },
  {
    id: 'mage',
    name: 'Mage',
    stats: { strength: 2, agility: 3, intellect: 5 },
  },
] as const satisfies readonly CharacterClass[]

export const CLASSES: readonly CharacterClass[] = classData

export function getClassById(classId: string): CharacterClass | undefined {
  return CLASSES.find((c) => c.id === classId)
}