import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../createGameState.js'
import { Calendar } from '../../Calendar.js'

describe('createInitialGameState', () => {
  it('derives year/age/stage from the given Calendar at turn 0', () => {
    const calendar = new Calendar({ granularity: 'year', startYear: 1995, startAge: 18 })
    const state = createInitialGameState({ name: 'Alice', calendar })
    expect(state.turnIndex).toBe(0)
    expect(state.year).toBe(1995)
    expect(state.player.age).toBe(18)
    expect(state.player.stage).toBe('student')
    expect(state.player.name).toBe('Alice')
  })

  it('starts every domain slice at a sane zero state', () => {
    const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 22 })
    const state = createInitialGameState({ name: 'Bob', calendar })
    expect(state.capitalState).toEqual({
      capital: 0,
      income: 0,
      savingsRate: 0,
      debt: 0,
      cognition: 0,
      network: 0,
    })
    expect(state.positions).toEqual({ count: 0, worstDrawdown: 0 })
    expect(state.traits).toEqual({ unlocked: [], removed: [] })
    expect(state.counters).toEqual({})
    expect(state.flags).toEqual({})
  })

  it('is a plain, independently-mutable object across calls (no shared references)', () => {
    const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 22 })
    const a = createInitialGameState({ name: 'A', calendar })
    const b = createInitialGameState({ name: 'B', calendar })
    a.capitalState.capital = 999
    expect(b.capitalState.capital).toBe(0)
  })
})
