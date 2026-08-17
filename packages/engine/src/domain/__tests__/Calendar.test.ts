import { describe, it, expect } from 'vitest'
import { Calendar, stageForAge } from '../Calendar.js'

describe('Calendar', () => {
  it('year granularity: one turn advances one year and one age', () => {
    const cal = new Calendar({ granularity: 'year', startYear: 1998, startAge: 22 })
    expect(cal.at(0)).toEqual({ year: 1998, age: 22, stage: 'early_career' })
    expect(cal.at(1)).toEqual({ year: 1999, age: 23, stage: 'early_career' })
    expect(cal.at(10)).toEqual({ year: 2008, age: 32, stage: 'early_career' })
  })

  it('quarter granularity: four turns advance one year, content still reads whole years', () => {
    const cal = new Calendar({ granularity: 'quarter', startYear: 1998, startAge: 22 })
    expect(cal.at(0)).toEqual({ year: 1998, age: 22, stage: 'early_career' })
    expect(cal.at(1)).toEqual({ year: 1998, age: 22, stage: 'early_career' })
    expect(cal.at(3)).toEqual({ year: 1998, age: 22, stage: 'early_career' })
    expect(cal.at(4)).toEqual({ year: 1999, age: 23, stage: 'early_career' })
    expect(cal.at(40)).toEqual({ year: 2008, age: 32, stage: 'early_career' })
  })

  it('switching granularity does not change the age/year reached after the same elapsed years', () => {
    const yearly = new Calendar({ granularity: 'year', startYear: 2000, startAge: 20 })
    const quarterly = new Calendar({ granularity: 'quarter', startYear: 2000, startAge: 20 })
    const afterFiveYearsYearly = yearly.at(5)
    const afterFiveYearsQuarterly = quarterly.at(5 * 4)
    expect(afterFiveYearsQuarterly).toEqual(afterFiveYearsYearly)
  })

  it('derives stage from age correctly across all brackets', () => {
    expect(stageForAge(10)).toBe('student')
    expect(stageForAge(21)).toBe('student')
    expect(stageForAge(22)).toBe('early_career')
    expect(stageForAge(34)).toBe('early_career')
    expect(stageForAge(35)).toBe('mid_career')
    expect(stageForAge(49)).toBe('mid_career')
    expect(stageForAge(50)).toBe('late_career')
    expect(stageForAge(64)).toBe('late_career')
    expect(stageForAge(65)).toBe('retirement')
    expect(stageForAge(90)).toBe('retirement')
  })

  it('rejects a negative turnIndex', () => {
    const cal = new Calendar({ granularity: 'year', startYear: 2000, startAge: 20 })
    expect(() => cal.at(-1)).toThrow()
  })
})
