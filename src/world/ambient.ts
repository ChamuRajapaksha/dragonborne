/**
 * The ambient day/night palette. Pure keyframe interpolation over minute of
 * day, returning a Phaser-friendly colour number and alpha. Phaser 4 removed
 * Light2D, so the scene renders this as a plain full-screen tint instead.
 */
import { minuteOfDay } from './time'

export interface AmbientTint {
  color: number
  alpha: number
}

interface AmbientKeyframe extends AmbientTint {
  minute: number
}

const NIGHT_COLOR = 0x0b1030
const DAWN_COLOR = 0xffa45c
const DAY_COLOR = 0xffffff
const DUSK_COLOR = 0x8a5a9a

const KEYFRAMES: readonly AmbientKeyframe[] = [
  { minute: 0, color: NIGHT_COLOR, alpha: 0.45 },
  { minute: 270, color: NIGHT_COLOR, alpha: 0.45 },
  { minute: 360, color: DAWN_COLOR, alpha: 0.16 },
  { minute: 450, color: DAY_COLOR, alpha: 0.0 },
  { minute: 1050, color: DAY_COLOR, alpha: 0.0 },
  { minute: 1140, color: DUSK_COLOR, alpha: 0.2 },
  { minute: 1260, color: NIGHT_COLOR, alpha: 0.45 },
  { minute: 1440, color: NIGHT_COLOR, alpha: 0.45 },
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function channel(color: number, shift: number): number {
  return (color >> shift) & 0xff
}

function packColor(r: number, g: number, b: number): number {
  const red = Math.max(0, Math.min(255, Math.round(r)))
  const green = Math.max(0, Math.min(255, Math.round(g)))
  const blue = Math.max(0, Math.min(255, Math.round(b)))
  return (red << 16) | (green << 8) | blue
}

/** The tint the world should carry at an absolute game minute. */
export function ambientAt(totalMinutes: number): AmbientTint {
  const minute = minuteOfDay(totalMinutes)

  for (let i = 0; i < KEYFRAMES.length - 1; i += 1) {
    const from = KEYFRAMES[i]
    const to = KEYFRAMES[i + 1]
    if (!from || !to) break
    if (minute < from.minute || minute >= to.minute) continue

    const span = to.minute - from.minute
    const t = span <= 0 ? 0 : (minute - from.minute) / span
    return {
      color: packColor(
        lerp(channel(from.color, 16), channel(to.color, 16), t),
        lerp(channel(from.color, 8), channel(to.color, 8), t),
        lerp(channel(from.color, 0), channel(to.color, 0), t),
      ),
      alpha: lerp(from.alpha, to.alpha, t),
    }
  }

  // Only reachable for malformed keyframes; fall back to the night tint.
  return { color: NIGHT_COLOR, alpha: 0.45 }
}
