import { describe, it, expect } from 'vitest'
import { SystemRegistry } from '../../SystemRegistry.js'
import { createAdvance } from '../../../turn/advance.js'
import { createInitialGameState } from '../../../state/createGameState.js'
import { Calendar } from '../../../Calendar.js'
import { SeededRng } from '../../../rng/SeededRng.js'
import { createCareerSystem, COUNTER_CAREER_MOVES, COUNTER_CAREER_DECLINED } from '../CareerSystem.js'
import { edgesFrom, findNode, type CareerGraph } from '../CareerGraph.js'

const GRAPH: CareerGraph = {
  nodes: [
    { id: 'engineer_junior', industry: 'tech', rank: 1, income: [45, 65] },
    { id: 'engineer_senior', industry: 'tech', rank: 2, income: [70, 100] },
    { id: 'trader_junior', industry: 'finance', rank: 1, income: [40, 90] },
  ],
  edges: [
    { from: 'engineer_junior', to: 'engineer_senior', require: { '>=': ['age', 26] }, surfacedAs: 'opportunity' },
    { from: 'engineer_junior', to: 'trader_junior', require: { '>=': ['network', 999] }, surfacedAs: 'opportunity' },
  ],
}

function setup(seed = 'career', startAge = 22) {
  const registry = new SystemRegistry()
  registry.register(createCareerSystem({ graph: GRAPH, startNodeId: 'engineer_junior' }))
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge })
  const state = createInitialGameState({ name: 'P', calendar })
  return { registry, calendar, state, rng: new SeededRng(seed), advance: createAdvance({ registry, calendar }) }
}

describe('CareerGraph', () => {
  it('is a directed graph, queried by edges rather than by array position', () => {
    expect(findNode(GRAPH, 'engineer_senior')?.rank).toBe(2)
    expect(edgesFrom(GRAPH, 'engineer_junior').map((e) => e.to)).toEqual(['engineer_senior', 'trader_junior'])
    expect(edgesFrom(GRAPH, 'engineer_senior')).toEqual([])
  })

  it('refuses a start node that is not in the graph', () => {
    expect(() => createCareerSystem({ graph: GRAPH, startNodeId: 'nope' })).toThrow()
  })
})

describe('CareerSystem', () => {
  it('drops a fresh character onto the start node and rolls an income in its band', () => {
    const { advance, state, rng } = setup()
    const { nextState } = advance(state, { type: 'advanceTurn' }, rng)
    expect(nextState.career.id).toBe('engineer_junior')
    expect(nextState.career.industry).toBe('tech')
    expect(nextState.career.rank).toBe(1)
    expect(nextState.capitalState.income).toBeGreaterThanOrEqual(45)
    expect(nextState.capitalState.income).toBeLessThanOrEqual(65)
  })

  it('only surfaces edges whose condition holds', () => {
    const { advance, state, rng } = setup('offers', 22)
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    expect(current.offers).toEqual([]) // age 22 < 26, and network 0 < 999

    for (let turn = 0; turn < 5; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
    }
    expect(current.player.age).toBeGreaterThanOrEqual(26)
    expect(current.offers.map((o) => o.ref)).toEqual(['engineer_senior'])
    const offer = current.offers[0]
    expect(offer?.source).toBe('career')
    expect(offer?.sizing).toEqual(['normal'])
  })

  it('walks a character from the start node along an edge to the second position', () => {
    const { advance, state, rng } = setup('walk', 26)
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    const offer = current.offers.find((o) => o.ref === 'engineer_senior')
    expect(offer).toBeDefined()

    const result = advance(current, { type: 'takeOpportunity', id: offer?.id ?? '', sizing: 'normal' }, rng)
    current = result.nextState
    expect(current.career.id).toBe('engineer_senior')
    expect(current.career.rank).toBe(2)
    expect(current.capitalState.income).toBeGreaterThanOrEqual(70)
    expect(current.counters[COUNTER_CAREER_MOVES]).toBe(1)
    expect(current.offers).toEqual([])
    expect(result.effects.some((e) => e.type === 'stat.add' && e.key === 'income')).toBe(true)
  })

  it('records a declined move and stops offering it that turn', () => {
    const { advance, state, rng } = setup('decline', 26)
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    const offerId = current.offers[0]?.id ?? ''
    current = advance(current, { type: 'declineOpportunity', id: offerId }, rng).nextState
    expect(current.offers).toEqual([])
    expect(current.counters[COUNTER_CAREER_DECLINED]).toBe(1)
    expect(current.career.id).toBe('engineer_junior')
  })

  it('re-offers a declined move next turn, since the condition still holds', () => {
    const { advance, state, rng } = setup('reoffer', 26)
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    current = advance(current, { type: 'declineOpportunity', id: current.offers[0]?.id ?? '' }, rng).nextState
    current = advance(current, { type: 'advanceTurn' }, rng).nextState
    expect(current.offers.map((o) => o.ref)).toEqual(['engineer_senior'])
  })

  it('ignores a command referencing an offer it never raised', () => {
    const { advance, state, rng } = setup('ghost', 26)
    const current = advance(state, { type: 'advanceTurn' }, rng).nextState
    const { nextState } = advance(current, { type: 'takeOpportunity', id: 'career:nope', sizing: 'normal' }, rng)
    expect(nextState.career.id).toBe('engineer_junior')
    expect(nextState.counters[COUNTER_CAREER_MOVES]).toBeUndefined()
  })

  it('replays identically from the same seed and command sequence', () => {
    const run = (): unknown => {
      const { advance, state, rng } = setup('replay', 26)
      let current = advance(state, { type: 'advanceTurn' }, rng).nextState
      current = advance(current, { type: 'takeOpportunity', id: current.offers[0]?.id ?? '', sizing: 'normal' }, rng)
        .nextState
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      return current
    }
    expect(run()).toEqual(run())
  })
})
