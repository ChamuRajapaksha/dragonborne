import type { LevelProgress } from './types'

export const MAX_LEVEL = 10
export const XP_STEP = 50

export function xpForLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  const bounded = Math.max(1, Math.min(Math.floor(level), MAX_LEVEL))
  return XP_STEP * bounded * (bounded - 1)
}

function clampXp(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0) return 0
  return Math.min(Math.floor(xp), xpForLevel(MAX_LEVEL))
}

export function levelForXp(xp: number): number {
  const value = clampXp(xp)
  for (let level = MAX_LEVEL; level > 1; level -= 1) {
    if (value >= xpForLevel(level)) return level
  }
  return 1
}

export function levelProgress(xp: number): LevelProgress {
  const value = clampXp(xp)
  const level = levelForXp(value)
  const floor = xpForLevel(level)
  const ceiling = level === MAX_LEVEL ? floor : xpForLevel(level + 1)
  const needed = ceiling - floor
  const current = value - floor

  return {
    level,
    current,
    needed,
    remaining: Math.max(0, needed - current),
    ratio: needed > 0 ? current / needed : 1,
  }
}

export function grantXp(
  xp: number,
  amount: number,
): { xp: number; levelsGained: number } {
  const before = clampXp(xp)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { xp: before, levelsGained: 0 }
  }

  const after = clampXp(before + Math.floor(amount))
  return { xp: after, levelsGained: levelForXp(after) - levelForXp(before) }
}

export function formatLevelProgress(xp: number): string {
  const progress = levelProgress(xp)
  if (progress.level >= MAX_LEVEL) return `Lv ${progress.level} · MAX`
  return `Lv ${progress.level} · ${progress.current}/${progress.needed} XP`
}
