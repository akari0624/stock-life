import { describe, it, expect } from 'vitest'
import { SeededRng } from '../../../rng/SeededRng.js'
import {
  twHistoryWorldGenerator,
  twHistoryNoteAt,
  TW_HISTORY_LAST_YEAR,
} from '../TwHistoryWorldGenerator.js'
import { DEFAULT_THEME_POOL } from '../cycles.js'
import { eraAt, type Timeline } from '../Timeline.js'
import { WORLD_RNG_STREAM } from '../WorldGenerator.js'

const generate = (seed: string, startYear = 1985, endYear = 2040): Timeline =>
  twHistoryWorldGenerator.generate(new SeededRng(seed).stream(WORLD_RNG_STREAM), { startYear, endYear })

describe('tw-history', () => {
  it('puts the crashes where they actually happened', () => {
    const timeline = generate('any-seed')
    for (const year of [1990, 1997, 2001, 2008, 2015, 2020, 2022]) {
      expect(eraAt(timeline, year).phase, String(year)).toBe('crash')
    }
    // …and the manias before them
    for (const year of [1989, 2000, 2007, 2021, 2025]) {
      expect(eraAt(timeline, year).phase, String(year)).toBe('mania')
    }
  })

  it('is the same history for every seed — that is the point of the mode', () => {
    const a = generate('seed-a')
    const b = generate('seed-b')
    const upToTable = (timeline: Timeline) =>
      timeline.phases.filter((segment) => segment.startYear <= TW_HISTORY_LAST_YEAR)
    expect(upToTable(a)).toEqual(upToTable(b))
  })

  it('but the years past the table are rolled, and rolled deterministically', () => {
    const a = generate('seed-a')
    const b = generate('seed-b')
    const future = (timeline: Timeline) => timeline.phases.filter((s) => s.startYear > TW_HISTORY_LAST_YEAR)

    expect(future(a).length).toBeGreaterThan(0)
    expect(future(a)).not.toEqual(future(b))
    expect(future(a)).toEqual(future(generate('seed-a')))
  })

  it('covers every year of the requested range with exactly one phase', () => {
    const timeline = generate('coverage', 1985, 2050)
    for (let year = 1985; year <= 2050; year++) {
      const covering = timeline.phases.filter(
        (segment) => year >= segment.startYear && year < segment.startYear + segment.years,
      )
      expect(covering, String(year)).toHaveLength(1)
    }
  })

  it('speaks the same theme vocabulary as the random world (so content works in both)', () => {
    const timeline = generate('themes')
    for (const wave of timeline.themes) {
      expect(DEFAULT_THEME_POOL, wave.theme).toContain(wave.theme)
    }
    // The themes people actually remember, in the years they remember them
    expect(eraAt(timeline, 1999).themes).toContain('internet')
    expect(eraAt(timeline, 2021).themes).toContain('shipping')
    expect(eraAt(timeline, 2024).themes).toContain('ai')
  })

  it('keeps a note for each remembered year (hint, never name — §2)', () => {
    expect(twHistoryNoteAt(1990)).toContain('萬二')
    expect(twHistoryNoteAt(2008)).toContain('金融海嘯')
    // No real company or ticker anywhere in the table
    for (let year = 1985; year <= TW_HISTORY_LAST_YEAR; year++) {
      const note = twHistoryNoteAt(year) ?? ''
      expect(note, String(year)).not.toMatch(/台積電|鴻海|聯發科|2330|0050/)
    }
  })
})
