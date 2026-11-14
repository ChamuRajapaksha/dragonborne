import { describe, expect, it } from 'vitest'
import {
  MS_PER_GAME_MINUTE,
  START_MINUTES,
  advanceClock,
  dayNumber,
  formatClock,
  formatHourMinute,
  minuteOfDay,
  normalizeMinutes,
  phaseAt,
} from './time'

describe('world clock start', () => {
  it('starts a new character on Day 1 at 08:00', () => {
    const clock = { totalMinutes: START_MINUTES }
    expect(dayNumber(clock.totalMinutes)).toBe(1)
    expect(minuteOfDay(clock.totalMinutes)).toBe(480)
    expect(phaseAt(clock.totalMinutes)).toBe('day')
    expect(formatClock(clock)).toBe('Day 1 \u00b7 08:00')
  })
})

describe('world clock phases', () => {
  it('flips at the documented boundaries', () => {
    expect(phaseAt(4 * 60 + 59)).toBe('night')
    expect(phaseAt(5 * 60)).toBe('dawn')
    expect(phaseAt(6 * 60 + 59)).toBe('dawn')
    expect(phaseAt(7 * 60)).toBe('day')
    expect(phaseAt(17 * 60 + 59)).toBe('day')
    expect(phaseAt(18 * 60)).toBe('dusk')
    expect(phaseAt(20 * 60 + 59)).toBe('dusk')
    expect(phaseAt(21 * 60)).toBe('night')
  })

  it('rolls the day number at midnight', () => {
    expect(dayNumber(1439)).toBe(1)
    expect(dayNumber(1440)).toBe(2)
    expect(dayNumber(2879)).toBe(2)
    expect(dayNumber(2880)).toBe(3)
    expect(minuteOfDay(1440)).toBe(0)
  })
})

describe('advanceClock', () => {
  it('advances one game minute per real second', () => {
    const start = { totalMinutes: START_MINUTES }
    expect(advanceClock(start, MS_PER_GAME_MINUTE)).toEqual({ totalMinutes: START_MINUTES + 1 })
    expect(advanceClock(start, MS_PER_GAME_MINUTE * 90)).toEqual({
      totalMinutes: START_MINUTES + 90,
    })
  })

  it('keeps fractional minutes', () => {
    expect(advanceClock({ totalMinutes: 0 }, 500)).toEqual({ totalMinutes: 0.5 })
  })

  it('ignores bad deltas but still returns a new state', () => {
    const start = { totalMinutes: 600 }
    const expected = { totalMinutes: 600 }
    expect(advanceClock(start, 0)).toEqual(expected)
    expect(advanceClock(start, -16)).toEqual(expected)
    expect(advanceClock(start, Number.NaN)).toEqual(expected)
    expect(advanceClock(start, Number.POSITIVE_INFINITY)).toEqual(expected)
    expect(advanceClock(start, 0)).not.toBe(start)
  })
})

describe('time formatting', () => {
  it('pads to 24-hour HH:MM', () => {
    expect(formatHourMinute(0)).toBe('00:00')
    expect(formatHourMinute(485)).toBe('08:05')
    expect(formatHourMinute(1260)).toBe('21:00')
    expect(formatHourMinute(1439)).toBe('23:59')
  })

  it('floors fractional minutes for display', () => {
    expect(formatHourMinute(485.9)).toBe('08:05')
  })

  it('formats the full clock line', () => {
    expect(formatClock({ totalMinutes: START_MINUTES })).toBe('Day 1 \u00b7 08:00')
    expect(formatClock({ totalMinutes: 1440 + 21 * 60 + 14 })).toBe('Day 2 \u00b7 21:14')
  })
})

describe('safe normalization', () => {
  it('reads malformed or negative minutes as zero', () => {
    expect(normalizeMinutes(Number.NaN)).toBe(0)
    expect(normalizeMinutes(Number.POSITIVE_INFINITY)).toBe(0)
    expect(normalizeMinutes(-1)).toBe(0)
    expect(normalizeMinutes(0)).toBe(0)
    expect(normalizeMinutes(12.5)).toBe(12.5)
  })

  it('never produces NaN in display helpers', () => {
    expect(formatHourMinute(Number.NaN)).toBe('00:00')
    expect(formatClock({ totalMinutes: Number.NaN })).toBe('Day 1 \u00b7 00:00')
    expect(phaseAt(Number.NaN)).toBe('night')
    expect(dayNumber(Number.NaN)).toBe(1)
  })
})
