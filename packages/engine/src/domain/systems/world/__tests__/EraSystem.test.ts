import { describe, it, expect } from 'vitest'
import { createEraSystem, eraStateFor } from '../EraSystem.js'
import { randomWorldGenerator } from '../RandomWorldGenerator.js'
import { WORLD_RNG_STREAM } from '../WorldGenerator.js'
import { eraAt, type Timeline } from '../Timeline.js'
import { SeededRng } from '../../../rng/SeededRng.js'
import { SystemRegistry } from '../../SystemRegistry.js'
import { createAdvance } from '../../../turn/advance.js'
import { createInitialGameState } from '../../../state/createGameState.js'
import { Calendar } from '../../../Calendar.js'
import { readFacade } from '../../../facade/ModStateView.js'
import { evaluate } from '../../../expr/evaluate.js'

const START_YEAR = 1995

function makeTimeline(seed = 'era-system'): Timeline {
  return randomWorldGenerator.generate(new SeededRng(seed).stream(WORLD_RNG_STREAM), {
    startYear: START_YEAR,
    endYear: START_YEAR + 60,
  })
}

function setup(timeline = makeTimeline()) {
  const registry = new SystemRegistry()
  registry.register(createEraSystem({ timeline }))
  const calendar = new Calendar({ granularity: 'year', startYear: START_YEAR, startAge: 22 })
  const state = createInitialGameState({
    name: 'P',
    calendar,
    era: eraStateFor(timeline, START_YEAR),
  })
  return { registry, calendar, state, timeline, advance: createAdvance({ registry, calendar }) }
}

describe('EraSystem', () => {
  it('seeds the initial state with the era of the starting year', () => {
    const { state, timeline } = setup()
    expect(state.era.phase).toBe(eraAt(timeline, START_YEAR).phase)
    expect(state.era.themes).toEqual(eraAt(timeline, START_YEAR).themes)
  })

  it('keeps era in sync with the calendar as turns advance', () => {
    const { advance, state, timeline, calendar } = setup()
    const rng = new SeededRng('run')
    let current = state
    for (let turn = 1; turn <= 40; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      const expected = eraAt(timeline, calendar.at(turn).year)
      expect(current.year).toBe(calendar.at(turn).year)
      expect(current.era.phase).toBe(expected.phase)
      expect(current.era.themes).toEqual(expected.themes)
    }
  })

  it('reaches every phase of the cycle over a full life', () => {
    const { advance, state } = setup()
    const rng = new SeededRng('run')
    const seen = new Set<string>([state.era.phase])
    let current = state
    for (let turn = 0; turn < 47; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      seen.add(current.era.phase)
    }
    expect(seen).toContain('crash')
    expect(seen).toContain('boom')
  })

  it('exposes era.phase / era.themes on the facade, readable by a condition tree', () => {
    const { registry, advance, state } = setup()
    const paths = registry.allFacadeFields().map((f) => f.path)
    expect(paths).toContain('era.phase')
    expect(paths).toContain('era.themes')

    const phaseField = registry.allFacadeFields().find((f) => f.path === 'era.phase')
    expect(phaseField?.enum).toContain('crash')
    // System contribution replaces the static entry rather than duplicating it.
    expect(paths.filter((p) => p === 'era.phase')).toHaveLength(1)

    const rng = new SeededRng('facade')
    let current = state
    for (let turn = 0; turn < 47; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      if (current.era.phase === 'crash') break
    }
    expect(readFacade(current, 'era.phase')).toBe(current.era.phase)

    const result = evaluate(
      { in: ['era.phase', ['boom', 'mania', 'crash', 'recovery', 'recession']] },
      { state: current, rng: new SeededRng('e').stream('expr') },
    )
    expect(result).toEqual({ ok: true, value: true })
  })

  it('resyncs a state whose era was never seeded', () => {
    const timeline = makeTimeline()
    const { advance } = setup(timeline)
    const calendar = new Calendar({ granularity: 'year', startYear: START_YEAR, startAge: 22 })
    const unseeded = createInitialGameState({ name: 'P', calendar })
    expect(unseeded.era.phase).toBe('unknown')

    const { nextState } = advance(unseeded, { type: 'advanceTurn' }, new SeededRng('r'))
    expect(nextState.era.phase).toBe(eraAt(timeline, calendar.at(1).year).phase)
  })

  it('replays identically from the same seed', () => {
    const runA = setup(makeTimeline('same'))
    const runB = setup(makeTimeline('same'))
    const rngA = new SeededRng('replay')
    const rngB = new SeededRng('replay')
    let a = runA.state
    let b = runB.state
    for (let turn = 0; turn < 20; turn++) {
      a = runA.advance(a, { type: 'advanceTurn' }, rngA).nextState
      b = runB.advance(b, { type: 'advanceTurn' }, rngB).nextState
    }
    expect(a).toEqual(b)
  })
})
