import { describe, it, expect } from 'vitest'
import { SeededRng } from '../../../rng/SeededRng.js'
import {
  randomWorldGenerator,
  CRASH_INTERVAL,
  THEME_WAVE_INTERVAL,
  THEME_WAVE_DURATION,
  DEFAULT_THEME_POOL,
} from '../RandomWorldGenerator.js'
import { createDefaultWorldGeneratorRegistry } from '../defaultRegistry.js'
import { WorldGeneratorRegistry, WORLD_RNG_STREAM } from '../WorldGenerator.js'
import { eraAt, ERA_PHASES, type Timeline } from '../Timeline.js'

const OPTS = { startYear: 1990, endYear: 2040 }

function generate(seed: string): Timeline {
  return randomWorldGenerator.generate(new SeededRng(seed).stream(WORLD_RNG_STREAM), OPTS)
}

function crashYears(timeline: Timeline): number[] {
  return timeline.phases.filter((s) => s.phase === 'crash').map((s) => s.startYear)
}

function gaps(years: number[]): number[] {
  return years.slice(1).map((year, i) => year - (years[i] as number))
}

describe('RandomWorldGenerator', () => {
  it('produces an identical timeline for the same seed', () => {
    expect(generate('alpha')).toEqual(generate('alpha'))
  })

  it('produces different timelines for different seeds', () => {
    expect(generate('alpha')).not.toEqual(generate('beta'))
  })

  it('lays down contiguous phase segments covering the whole requested span', () => {
    const timeline = generate('coverage')
    expect(timeline.phases.length).toBeGreaterThan(0)
    let expectedStart = timeline.startYear
    for (const segment of timeline.phases) {
      expect(segment.startYear).toBe(expectedStart)
      expect(segment.years).toBeGreaterThanOrEqual(1)
      expect(ERA_PHASES).toContain(segment.phase)
      expectedStart += segment.years
    }
    expect(expectedStart).toBeGreaterThan(timeline.endYear)
  })

  it('never opens the world on a crash — the game starts mid-cycle', () => {
    for (let i = 0; i < 50; i++) {
      expect(generate(`open-${i}`).phases[0]?.phase).toBe('recovery')
    }
  })

  it('spaces big crashes 8–12 years apart across many seeds', () => {
    const observed: number[] = []
    for (let i = 0; i < 100; i++) {
      const intervals = gaps(crashYears(generate(`crash-${i}`)))
      expect(intervals.length).toBeGreaterThan(0)
      observed.push(...intervals)
    }
    for (const interval of observed) {
      expect(interval).toBeGreaterThanOrEqual(CRASH_INTERVAL[0])
      expect(interval).toBeLessThanOrEqual(CRASH_INTERVAL[1])
    }
    // Guard against a generator that technically passes the band by always
    // picking the same number.
    expect(new Set(observed).size).toBeGreaterThan(1)
  })

  it('starts a theme wave every 5–8 years, each lasting 3–6 years', () => {
    const starts: number[] = []
    for (let i = 0; i < 100; i++) {
      const timeline = generate(`theme-${i}`)
      expect(timeline.themes.length).toBeGreaterThan(0)
      for (const wave of timeline.themes) {
        expect(DEFAULT_THEME_POOL).toContain(wave.theme)
        expect(wave.years).toBeGreaterThanOrEqual(THEME_WAVE_DURATION[0])
        expect(wave.years).toBeLessThanOrEqual(THEME_WAVE_DURATION[1])
      }
      starts.push(...gaps(timeline.themes.map((w) => w.startYear)))
    }
    for (const gap of starts) {
      expect(gap).toBeGreaterThanOrEqual(THEME_WAVE_INTERVAL[0])
      expect(gap).toBeLessThanOrEqual(THEME_WAVE_INTERVAL[1])
    }
  })

  it('never repeats the same theme back to back', () => {
    for (let i = 0; i < 50; i++) {
      const themes = generate(`repeat-${i}`).themes.map((w) => w.theme)
      for (let j = 1; j < themes.length; j++) {
        expect(themes[j]).not.toBe(themes[j - 1])
      }
    }
  })

  it('honours a custom theme pool', () => {
    const timeline = randomWorldGenerator.generate(new SeededRng('pool').stream(WORLD_RNG_STREAM), {
      ...OPTS,
      themePool: ['only_theme'],
    })
    expect(new Set(timeline.themes.map((w) => w.theme))).toEqual(new Set(['only_theme']))
  })

  it('rejects an end year before the start year', () => {
    expect(() =>
      randomWorldGenerator.generate(new SeededRng('x').stream(WORLD_RNG_STREAM), {
        startYear: 2000,
        endYear: 1999,
      }),
    ).toThrow()
  })
})

describe('eraAt', () => {
  it('reports the phase and every theme active in that year', () => {
    const timeline: Timeline = {
      generatorId: 'test',
      startYear: 2000,
      endYear: 2010,
      phases: [
        { phase: 'recovery', startYear: 2000, years: 3 },
        { phase: 'boom', startYear: 2003, years: 4 },
        { phase: 'crash', startYear: 2007, years: 1 },
        { phase: 'recession', startYear: 2008, years: 3 },
      ],
      themes: [
        { theme: 'memory', startYear: 2001, years: 4 },
        { theme: 'internet', startYear: 2003, years: 3 },
      ],
    }
    expect(eraAt(timeline, 2000)).toEqual({ phase: 'recovery', themes: [] })
    expect(eraAt(timeline, 2004)).toEqual({ phase: 'boom', themes: ['memory', 'internet'] })
    expect(eraAt(timeline, 2007)).toEqual({ phase: 'crash', themes: [] })
  })

  it('clamps years outside the generated range instead of throwing', () => {
    const timeline = generate('clamp')
    expect(() => eraAt(timeline, timeline.startYear - 50)).not.toThrow()
    expect(() => eraAt(timeline, timeline.endYear + 500)).not.toThrow()
    expect(eraAt(timeline, timeline.startYear - 50).phase).toBe(timeline.phases[0]?.phase)
  })
})

describe('WorldGeneratorRegistry', () => {
  it('ships both official generators preregistered and can look them up by id', () => {
    const registry = createDefaultWorldGeneratorRegistry()
    expect(registry.ids()).toEqual(expect.arrayContaining(['random', 'tw-history']))
    expect(registry.get('random')).toBe(randomWorldGenerator)
  })

  it('accepts a third-party generator without the engine knowing its name', () => {
    const registry = createDefaultWorldGeneratorRegistry()
    registry.register({
      id: 'jp-1980',
      generate: () => ({
        generatorId: 'jp-1980',
        startYear: 1980,
        endYear: 1990,
        phases: [{ phase: 'mania', startYear: 1980, years: 11 }],
        themes: [],
      }),
    })
    expect(registry.has('jp-1980')).toBe(true)
    expect(registry.get('jp-1980').generate(new SeededRng('s').stream('world'), OPTS).phases[0]?.phase).toBe('mania')
  })

  it('rejects duplicate ids and unknown lookups', () => {
    const registry = new WorldGeneratorRegistry()
    registry.register(randomWorldGenerator)
    expect(() => registry.register(randomWorldGenerator)).toThrow()
    expect(() => registry.get('nope')).toThrow()
  })
})
