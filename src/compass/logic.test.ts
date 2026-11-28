import { describe, expect, it } from 'vitest'
import { compassDirection, distanceInTiles, formatCompassReading } from './logic'

describe('compassDirection', () => {
  it('names all eight screen-space directions', () => {
    expect(compassDirection(1, 0)).toBe('east')
    expect(compassDirection(1, 1)).toBe('south-east')
    expect(compassDirection(0, 1)).toBe('south')
    expect(compassDirection(-1, 1)).toBe('south-west')
    expect(compassDirection(-1, 0)).toBe('west')
    expect(compassDirection(-1, -1)).toBe('north-west')
    expect(compassDirection(0, -1)).toBe('north')
    expect(compassDirection(1, -1)).toBe('north-east')
  })

  it('treats zero and non-finite vectors as east', () => {
    expect(compassDirection(0, 0)).toBe('east')
    expect(compassDirection(Number.NaN, 4)).toBe('east')
    expect(compassDirection(4, Number.POSITIVE_INFINITY)).toBe('east')
  })
})

describe('distanceInTiles', () => {
  it('rounds pixel distance into whole tiles', () => {
    expect(distanceInTiles({ x: 0, y: 0 }, { x: 32, y: 0 })).toBe(2)
    expect(distanceInTiles({ x: 0, y: 0 }, { x: 32, y: 32 })).toBe(3)
  })

  it('supports a custom tile size and rejects invalid input', () => {
    expect(distanceInTiles({ x: 0, y: 0 }, { x: 50, y: 0 }, 25)).toBe(2)
    expect(distanceInTiles({ x: Number.NaN, y: 0 }, { x: 32, y: 0 })).toBe(0)
    expect(distanceInTiles({ x: 0, y: 0 }, { x: 32, y: 0 }, 0)).toBe(0)
  })
})

describe('formatCompassReading', () => {
  it('names the direction and distance', () => {
    expect(formatCompassReading({ label: 'Emberhold', x: 672, y: 384 }, { x: 0, y: 384 })).toBe(
      'Emberhold: east, 42 tiles',
    )
  })

  it('reads as right here at close range', () => {
    expect(formatCompassReading({ label: 'Sella', x: 640, y: 272 }, { x: 640, y: 272 })).toBe(
      'Sella is right here',
    )
  })
})
