import { describe, it, expect } from 'vitest'
import { SystemRegistry } from '../../SystemRegistry.js'
import { createAdvance } from '../../../turn/advance.js'
import { createInitialGameState } from '../../../state/createGameState.js'
import { Calendar } from '../../../Calendar.js'
import { SeededRng } from '../../../rng/SeededRng.js'
import type { GameState } from '../../../state/GameState.js'
import {
  createDiceSystem,
  DICE_CHANNELS,
  COUNTER_DICE_POOL,
  COUNTER_DICE_SPENT,
  counterForChannel,
  DICE_FACES,
  DICE_RANK_BONUS,
} from '../DiceSystem.js'
import { createCapitalSystem, DEBT_INTEREST_RATE, DEBT_REPAYMENT_RATE } from '../CapitalSystem.js'
import { createCognitionSystem } from '../CognitionSystem.js'
import { createNetworkSystem, NETWORK_DECAY_FLOOR } from '../NetworkSystem.js'

function setup(seed = 'economy', overrides: Partial<GameState['capitalState']> = {}) {
  const registry = new SystemRegistry()
  registry.register(createDiceSystem())
  registry.register(createCapitalSystem())
  registry.register(createCognitionSystem())
  registry.register(createNetworkSystem())
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 22 })
  const state = createInitialGameState({ name: 'P', calendar, capital: overrides })
  return { registry, calendar, state, rng: new SeededRng(seed), advance: createAdvance({ registry, calendar }) }
}

describe('DiceSystem', () => {
  it('rolls a fresh pool at the start of each period, in the documented range', () => {
    const { advance, state, rng } = setup()
    let current = state
    for (let turn = 0; turn < 20; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      const pool = current.counters[COUNTER_DICE_POOL] as number
      expect(pool).toBeGreaterThanOrEqual(1)
      expect(pool).toBeLessThanOrEqual(DICE_FACES + current.career.rank * DICE_RANK_BONUS)
      expect(current.counters[COUNTER_DICE_SPENT]).toBe(0)
    }
  })

  it('is reproducible for the same seed and differs across seeds', () => {
    const rolls = (seed: string): number[] => {
      const { advance, state, rng } = setup(seed)
      const out: number[] = []
      let current = state
      for (let turn = 0; turn < 15; turn++) {
        current = advance(current, { type: 'advanceTurn' }, rng).nextState
        out.push(current.counters[COUNTER_DICE_POOL] as number)
      }
      return out
    }
    expect(rolls('seed-a')).toEqual(rolls('seed-a'))
    expect(rolls('seed-a')).not.toEqual(rolls('seed-b'))
  })

  it('spends pips on abilities and records how they were spent', () => {
    const { advance, state, rng } = setup()
    const rolled = advance(state, { type: 'advanceTurn' }, rng).nextState
    const pool = rolled.counters[COUNTER_DICE_POOL] as number
    expect(pool).toBeGreaterThanOrEqual(1)

    const { nextState, effects } = advance(rolled, { type: 'allocateDice', assignment: { study: 1 } }, rng)
    expect(nextState.capitalState.cognition).toBe(rolled.capitalState.cognition + 1)
    expect(nextState.counters[counterForChannel('study')]).toBe(1)
    expect(nextState.counters[COUNTER_DICE_SPENT]).toBe(1)
    expect(effects).toContainEqual({ type: 'stat.add', key: 'cognition', value: 1 })
  })

  it('never lets the player spend more pips than were rolled', () => {
    const { advance, state, rng } = setup()
    const rolled = advance(state, { type: 'advanceTurn' }, rng).nextState
    const pool = rolled.counters[COUNTER_DICE_POOL] as number

    const { nextState } = advance(rolled, { type: 'allocateDice', assignment: { study: 999, social: 999 } }, rng)
    expect(nextState.counters[COUNTER_DICE_SPENT]).toBe(pool)
    const spentOnChannels = DICE_CHANNELS.reduce(
      (sum, c) => sum + ((nextState.counters[counterForChannel(c)] as number) ?? 0),
      0,
    )
    expect(spentOnChannels).toBe(pool)
  })

  it('ignores unknown channels and negative amounts', () => {
    const { advance, state, rng } = setup()
    const rolled = advance(state, { type: 'advanceTurn' }, rng).nextState
    const { nextState } = advance(
      rolled,
      { type: 'allocateDice', assignment: { nonsense: 5, study: -3 } },
      rng,
    )
    expect(nextState.counters[COUNTER_DICE_SPENT]).toBe(0)
    expect(nextState.counters['nonsense']).toBeUndefined()
  })

  it('lets unspent pips expire at the next roll rather than banking them', () => {
    const { advance, state, rng } = setup()
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    const first = current.counters[COUNTER_DICE_POOL] as number
    current = advance(current, { type: 'advanceTurn' }, rng).nextState
    expect(current.counters[COUNTER_DICE_POOL]).not.toBe(first + (current.counters[COUNTER_DICE_POOL] as number))
    expect(current.counters[COUNTER_DICE_SPENT]).toBe(0)
  })

  it('contributes its counters to the mod-facing whitelist', () => {
    const { registry } = setup()
    const paths = registry.allFacadeFields().map((f) => f.path)
    expect(paths).toContain(`counter.${COUNTER_DICE_POOL}`)
    for (const channel of DICE_CHANNELS) {
      expect(paths).toContain(`counter.${counterForChannel(channel)}`)
    }
  })
})

describe('CapitalSystem', () => {
  it('saves the configured share of income into capital each year', () => {
    const { advance, state, rng } = setup('cap', { income: 100, savingsRate: 0.25 })
    const { nextState } = advance(state, { type: 'advanceTurn' }, rng)
    expect(nextState.capitalState.capital).toBe(25)
  })

  it('accrues interest on debt and repays it out of capital', () => {
    const { advance, state, rng } = setup('debt', { income: 0, savingsRate: 0, capital: 1000, debt: 100 })
    const { nextState } = advance(state, { type: 'advanceTurn' }, rng)

    const withInterest = 100 * (1 + DEBT_INTEREST_RATE)
    const payment = withInterest * DEBT_REPAYMENT_RATE
    expect(nextState.capitalState.debt).toBeCloseTo(withInterest - payment, 6)
    expect(nextState.capitalState.capital).toBeCloseTo(1000 - payment, 6)
    expect(nextState.counters['years_in_debt']).toBe(1)
  })

  it('never lets capital or debt go negative', () => {
    const { advance, state, rng } = setup('broke', { income: 0, savingsRate: 0, capital: 0, debt: 10 })
    let current = state
    for (let turn = 0; turn < 30; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      expect(current.capitalState.capital).toBeGreaterThanOrEqual(0)
      expect(current.capitalState.debt).toBeGreaterThanOrEqual(0)
    }
  })

  it('does nothing to a debt-free player beyond saving', () => {
    const { advance, state, rng } = setup('clean', { income: 50, savingsRate: 0.2 })
    const { nextState } = advance(state, { type: 'advanceTurn' }, rng)
    expect(nextState.capitalState.debt).toBe(0)
    expect(nextState.counters['years_in_debt']).toBeUndefined()
  })
})

describe('CognitionSystem and NetworkSystem', () => {
  it('only accrue experience while employed', () => {
    const { advance, state, rng } = setup('unemployed')
    let current = state
    for (let turn = 0; turn < 10; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
    }
    expect(current.career.rank).toBe(0)
    expect(current.capitalState.cognition).toBe(0)
    expect(current.counters['experience_years']).toBeUndefined()
  })

  it('grow cognition and network over a career, from independent rng streams', () => {
    const { advance, state, rng } = setup('employed')
    let current = { ...state, career: { id: 'engineer_junior', industry: 'tech', rank: 1 } }
    for (let turn = 0; turn < 30; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
    }
    expect(current.counters['experience_years']).toBe(30)
    expect(current.capitalState.cognition).toBeGreaterThan(0)
    expect(current.capitalState.network).toBeGreaterThan(0)
    // Same chance, same turn count — different streams, so different results.
    expect(current.capitalState.cognition).not.toBe(current.capitalState.network)
  })

  it('lets an unmaintained network decay above the floor', () => {
    const { advance, state, rng } = setup('decay', { network: NETWORK_DECAY_FLOOR + 20 })
    let current = state
    for (let turn = 0; turn < 10; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
    }
    expect(current.capitalState.network).toBeLessThan(NETWORK_DECAY_FLOOR + 20)
    expect(current.capitalState.network).toBeGreaterThanOrEqual(NETWORK_DECAY_FLOOR)
  })

  it('all three capitals are readable through the mod-facing whitelist', () => {
    const { registry } = setup()
    const paths = registry.allFacadeFields().map((f) => f.path)
    expect(paths).toContain('capital')
    expect(paths).toContain('cognition')
    expect(paths).toContain('network')
  })
})
