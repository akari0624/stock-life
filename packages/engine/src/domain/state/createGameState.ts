import type { Calendar } from '../Calendar.js'
import type { GameState } from './GameState.js'

export interface CreateGameStateOptions {
  name: string
  calendar: Calendar
}

/**
 * The single source of truth for "what does a fresh GameState look like".
 * Tests and systems alike should go through this rather than hand-building
 * state object literals — that's what keeps facade/system tests decoupled
 * from GameState's internal shape.
 */
export function createInitialGameState(options: CreateGameStateOptions): GameState {
  const point = options.calendar.at(0)
  return {
    turnIndex: 0,
    commandIndex: 0,
    year: point.year,
    player: {
      name: options.name,
      age: point.age,
      stage: point.stage,
      nerve: 100,
      time: 100,
      family: { status: 'single', kids: 0 },
    },
    capitalState: {
      capital: 0,
      income: 0,
      savingsRate: 0,
      debt: 0,
      cognition: 0,
      network: 0,
    },
    career: {
      id: 'unemployed',
      industry: 'none',
      rank: 0,
    },
    era: {
      phase: 'unknown',
      themes: [],
    },
    positions: {
      count: 0,
      worstDrawdown: 0,
    },
    traits: {
      unlocked: [],
      removed: [],
    },
    counters: {},
    flags: {},
  }
}
