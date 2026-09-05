import type { Character } from './types'

const STORAGE_KEY = 'dragonborne.character'

export function saveCharacter(character: Character): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(character))
}

export function loadCharacter(): Character | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<Character>
    if (!parsed.id || !parsed.name || !parsed.classId || !parsed.stats) {
      return null
    }
    return parsed as Character
  } catch {
    return null
  }
}

export function clearCharacter(): void {
  localStorage.removeItem(STORAGE_KEY)
}