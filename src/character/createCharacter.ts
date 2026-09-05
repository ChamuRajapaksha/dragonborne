import type { Character } from './types'
import { getClassById } from './classes'

export function createCharacter(name: string, classId: string): Character | null {
  const classDef = getClassById(classId)
  const trimmedName = name.trim()

  if (!classDef || !trimmedName) {
    return null
  }

  return {
    id: crypto.randomUUID(),
    name: trimmedName,
    classId,
    stats: { ...classDef.stats },
    createdAt: new Date().toISOString(),
  }
}