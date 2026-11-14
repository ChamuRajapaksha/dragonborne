/**
 * The world clock. Pure TypeScript — no Phaser, no DOM — so the passing of time
 * can be unit-tested and replayed exactly. One real second is one game minute,
 * so a full day is 24 real minutes.
 */

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night'

export interface ClockState {
  /** Absolute game minutes since the character was created. May be fractional. */
  totalMinutes: number
}

export const MINUTES_PER_DAY = 1440
export const START_MINUTES = 8 * 60
export const MS_PER_GAME_MINUTE = 1000

const DAWN_START = 5 * 60
const DAY_START = 7 * 60
const DUSK_START = 18 * 60
const NIGHT_START = 21 * 60

/** Malformed or negative absolute minutes read as the beginning of the clock. */
export function normalizeMinutes(totalMinutes: number): number {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return 0
  return totalMinutes
}

/** Minute of the current day, `0..1439`. Fractional minutes are floored. */
export function minuteOfDay(totalMinutes: number): number {
  const whole = Math.floor(normalizeMinutes(totalMinutes))
  return ((whole % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

/** 1-based day number; the absolute clock never wraps, so days never collide. */
export function dayNumber(totalMinutes: number): number {
  return Math.floor(normalizeMinutes(totalMinutes) / MINUTES_PER_DAY) + 1
}

/** `dawn` 05:00–06:59, `day` 07:00–17:59, `dusk` 18:00–20:59, `night` otherwise. */
export function phaseAt(totalMinutes: number): DayPhase {
  const minute = minuteOfDay(totalMinutes)
  if (minute >= DAWN_START && minute < DAY_START) return 'dawn'
  if (minute >= DAY_START && minute < DUSK_START) return 'day'
  if (minute >= DUSK_START && minute < NIGHT_START) return 'dusk'
  return 'night'
}

/**
 * Advances the clock by a real-time delta. Non-finite or negative deltas are
 * ignored, and a new state is always returned so callers can compare identity.
 */
export function advanceClock(state: ClockState, deltaMs: number): ClockState {
  const base = normalizeMinutes(state.totalMinutes)
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return { totalMinutes: base }
  return { totalMinutes: base + deltaMs / MS_PER_GAME_MINUTE }
}

/** 24-hour `HH:MM`, padded and safe against malformed input. */
export function formatHourMinute(minuteOfDay: number): string {
  const normalized = Number.isFinite(minuteOfDay)
    ? ((Math.floor(minuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
    : 0
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** `Day 1 · 08:05`, the HUD's clock line. */
export function formatClock(state: ClockState): string {
  const day = dayNumber(state.totalMinutes)
  const minute = minuteOfDay(state.totalMinutes)
  return `Day ${day} \u00b7 ${formatHourMinute(minute)}`
}
