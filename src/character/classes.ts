import type { CharacterClass } from './types'

const classData = [
  {
    id: 'warrior',
    name: 'Warrior',
    stats: { strength: 5, agility: 3, intellect: 2 },
    statGains: { strength: 2, agility: 1 },
  },
  {
    id: 'rogue',
    name: 'Rogue',
    stats: { strength: 3, agility: 5, intellect: 2 },
    statGains: { agility: 2, strength: 1 },
  },
  {
    id: 'mage',
    name: 'Mage',
    stats: { strength: 2, agility: 3, intellect: 5 },
    statGains: { intellect: 2, agility: 1 },
  },
  {
    id: 'cleric',
    name: 'Cleric',
    stats: { strength: 3, agility: 2, intellect: 5 },
    statGains: { intellect: 2, strength: 1 },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    stats: { strength: 4, agility: 5, intellect: 1 },
    statGains: { agility: 2, strength: 1 },
  },
  {
    id: 'bard',
    name: 'Bard',
    stats: { strength: 3, agility: 3, intellect: 4 },
    statGains: { strength: 1, agility: 1, intellect: 1 },
  },
] as const satisfies readonly CharacterClass[]

export const CLASSES: readonly CharacterClass[] = classData

export function getClassById(classId: string): CharacterClass | undefined {
  return CLASSES.find((c) => c.id === classId)
}
