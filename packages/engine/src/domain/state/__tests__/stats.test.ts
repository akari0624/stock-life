import { describe, it, expect } from 'vitest'
import { addStat, setStat, readStat, isStatKey, STAT_KEYS } from '../stats.js'
import { createInitialGameState } from '../createGameState.js'
import { Calendar } from '../../Calendar.js'
import { applyStateEffect } from '../../expr/effects.js'
import { SeededRng } from '../../rng/SeededRng.js'

function buildState() {
  return createInitialGameState({
    name: 'P',
    calendar: new Calendar({ granularity: 'year', startYear: 2000, startAge: 22 }),
  })
}

describe('stat routing', () => {
  it('sends every known stat key to its own slice, not to counters', () => {
    const state = buildState()
    for (const key of STAT_KEYS) {
      addStat(state, key, 0.5)
      expect(state.counters[key]).toBeUndefined()
    }
    expect(readStat(state, 'income')).toBe(0.5)
    expect(readStat(state, 'nerve')).toBe(100) // already at its ceiling
  })

  it('sends anything else to the open counter namespace', () => {
    const state = buildState()
    expect(isStatKey('panic_sold')).toBe(false)
    addStat(state, 'panic_sold', 2)
    addStat(state, 'panic_sold', 1)
    expect(state.counters['panic_sold']).toBe(3)
  })

  it('clamps stats to their documented bounds and reports the delta actually applied', () => {
    const state = buildState()
    expect(addStat(state, 'capital', -100)).toBe(0)
    expect(state.capitalState.capital).toBe(0)

    expect(addStat(state, 'nerve', 50)).toBe(0) // starts at 100, capped at 100
    expect(addStat(state, 'nerve', -30)).toBe(-30)
    expect(state.player.nerve).toBe(70)

    addStat(state, 'savingsRate', 5)
    expect(state.capitalState.savingsRate).toBe(1)
  })

  it('setStat moves a value to an absolute target, returning the jump', () => {
    const state = buildState()
    expect(setStat(state, 'income', 60)).toBe(60)
    expect(setStat(state, 'income', 75)).toBe(15)
    expect(setStat(state, 'dice_pool', 4)).toBe(4)
    expect(setStat(state, 'dice_pool', 0)).toBe(-4)
    expect(state.counters['dice_pool']).toBe(0)
  })

  it('is the same routing content effects get, so `stat.add income` moves income', () => {
    const state = buildState()
    const rng = new SeededRng('s').stream('x')
    const next = applyStateEffect(state, { type: 'stat.add', key: 'income', value: 2 }, rng)
    expect(next.capitalState.income).toBe(2)
    expect(next.counters['income']).toBeUndefined()

    const withCounter = applyStateEffect(next, { type: 'stat.add', key: 'held_through_drawdown', value: 1 }, rng)
    expect(withCounter.counters['held_through_drawdown']).toBe(1)
  })
})
