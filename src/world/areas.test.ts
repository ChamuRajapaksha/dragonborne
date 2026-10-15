import { describe, expect, it } from 'vitest'
import { findMapViolations } from './mapRules'
import { FOREST_MAP, VILLAGE_MAP } from './maps'

describe('area maps', () => {
  it('keeps the forest a uniform shape of known characters', () => {
    expect(findMapViolations(FOREST_MAP)).toEqual([])
  })

  it('keeps the village a uniform shape of known characters', () => {
    expect(findMapViolations(VILLAGE_MAP)).toEqual([])
  })
})

describe('findMapViolations shape rules', () => {
  it('flags an empty map', () => {
    expect(findMapViolations([])).toEqual(['map has no rows'])
  })

  it('flags ragged rows', () => {
    expect(findMapViolations(['TT', 'T'])).toEqual(['row 1 is 1 chars, expected 2'])
  })

  it('flags tile characters missing from the legend', () => {
    expect(findMapViolations(['Tx'])).toEqual(["unknown tile char 'x' at 1,0"])
  })
})
