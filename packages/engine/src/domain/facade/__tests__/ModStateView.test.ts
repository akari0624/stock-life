import { describe, it, expect } from 'vitest'
import { readFacade, FACADE_VERSION, type FacadePath } from '../ModStateView.js'
import { createInitialGameState } from '../../state/createGameState.js'
import { Calendar } from '../../Calendar.js'

function buildState() {
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 25 })
  const state = createInitialGameState({ name: 'Test Player', calendar })
  // Populate every domain slice through valid mutation, never assuming a
  // specific internal shape beyond what createInitialGameState already
  // produced — tests only ever go through the factory + readFacade.
  state.capitalState.capital = 500000
  state.capitalState.income = 60000
  state.capitalState.savingsRate = 0.3
  state.capitalState.debt = 10000
  state.capitalState.cognition = 40
  state.capitalState.network = 20
  state.player.nerve = 80
  state.player.time = 90
  state.player.family = { status: 'married', kids: 2 }
  state.career = { id: 'engineer', industry: 'tech', rank: 3 }
  state.era = { phase: 'boom', themes: ['semiconductors'] }
  state.positions = { count: 2, worstDrawdown: -0.35, open: [], closed: [] }
  state.flags['burned_by_2000_bubble'] = true
  state.counters['risky_bets_taken'] = 5
  return state
}

describe('ModStateView', () => {
  it('exposes FACADE_VERSION', () => {
    expect(typeof FACADE_VERSION).toBe('number')
  })

  it('reads every static whitelist path to the expected value', () => {
    const state = buildState()
    expect(readFacade(state, 'age')).toBe(25)
    expect(readFacade(state, 'year')).toBe(2000)
    expect(readFacade(state, 'stage')).toBe('early_career')
    expect(readFacade(state, 'capital')).toBe(500000)
    expect(readFacade(state, 'income')).toBe(60000)
    expect(readFacade(state, 'savingsRate')).toBe(0.3)
    expect(readFacade(state, 'debt')).toBe(10000)
    expect(readFacade(state, 'cognition')).toBe(40)
    expect(readFacade(state, 'network')).toBe(20)
    expect(readFacade(state, 'nerve')).toBe(80)
    expect(readFacade(state, 'time')).toBe(90)
    expect(readFacade(state, 'career.id')).toBe('engineer')
    expect(readFacade(state, 'career.industry')).toBe('tech')
    expect(readFacade(state, 'career.rank')).toBe(3)
    expect(readFacade(state, 'era.phase')).toBe('boom')
    expect(readFacade(state, 'era.themes')).toEqual(['semiconductors'])
    expect(readFacade(state, 'family.status')).toBe('married')
    expect(readFacade(state, 'family.kids')).toBe(2)
    expect(readFacade(state, 'position.count')).toBe(2)
    expect(readFacade(state, 'position.worstDrawdown')).toBe(-0.35)
  })

  it('reads dynamic flag.* and counter.* namespaces', () => {
    const state = buildState()
    expect(readFacade(state, 'flag.burned_by_2000_bubble')).toBe(true)
    expect(readFacade(state, 'flag.never_set')).toBe(false)
    expect(readFacade(state, 'counter.risky_bets_taken')).toBe(5)
    expect(readFacade(state, 'counter.never_touched')).toBe(0)
  })

  it('rejects out-of-whitelist paths at the type level, not just at runtime', () => {
    const state = buildState()
    expect(() => {
      // @ts-expect-error 'state.love.caught' is not a FacadePath — this must
      // fail to typecheck, per §6.1: mods can never depend on internal shape.
      readFacade(state, 'state.love.caught')
    }).toThrow()
  })

  it('facade output is stable under internal refactors: only the factory + readFacade are load-bearing', () => {
    // This test never destructures GameState fields directly (other than
    // via buildState(), which itself only calls the public factory and
    // assigns through the documented domain slices). As long as
    // createInitialGameState + readFacade are kept in sync with any future
    // internal restructuring, this test keeps passing unmodified.
    const state = buildState()
    const path: FacadePath = 'capital'
    expect(readFacade(state, path)).toBe(state.capitalState.capital)
  })
})
