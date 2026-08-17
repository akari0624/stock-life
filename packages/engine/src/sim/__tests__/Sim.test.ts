import { describe, it, expect } from 'vitest'
import { Sim } from '../Sim.js'
import { SystemRegistry } from '../../domain/systems/SystemRegistry.js'
import type { GameSystem } from '../../domain/systems/GameSystem.js'
import { createInitialGameState } from '../../domain/state/createGameState.js'
import { Calendar } from '../../domain/Calendar.js'
import type { Command } from '../../domain/turn/Command.js'

function incomeSystem(): GameSystem {
  return {
    id: 'income',
    order: 1,
    onPhase(phase, ctx) {
      if (phase === 'mid') {
        ctx.state.capitalState.capital += Math.floor(ctx.rng.next() * 1000)
      }
    },
  }
}

function buildSim(seed: string | number = 'sim-test'): Sim {
  const registry = new SystemRegistry()
  registry.register(incomeSystem())
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 22 })
  const initialState = createInitialGameState({ name: 'Player', calendar })
  return new Sim({ seed, initialState, registry, calendar })
}

const SCRIPT: Command[] = [
  { type: 'advanceTurn' },
  { type: 'declineOpportunity', id: 'op-1' },
  { type: 'advanceTurn' },
  { type: 'advanceTurn' },
]

describe('Sim', () => {
  it('dispatch advances state and returns the effects from that call', () => {
    const sim = buildSim()
    const effects = sim.dispatch({ type: 'advanceTurn' })
    expect(Array.isArray(effects)).toBe(true)
    expect(sim.getSnapshot().state.turnIndex).toBe(1)
  })

  it('records every dispatched command in commandLog, in order', () => {
    const sim = buildSim()
    for (const command of SCRIPT) sim.dispatch(command)
    expect(sim.getCommandLog()).toEqual(SCRIPT)
  })

  it('bumps version on every dispatch, for useSyncExternalStore-style subscriptions', () => {
    const sim = buildSim()
    expect(sim.getSnapshot().version).toBe(0)
    sim.dispatch({ type: 'advanceTurn' })
    expect(sim.getSnapshot().version).toBe(1)
    sim.dispatch({ type: 'advanceTurn' })
    expect(sim.getSnapshot().version).toBe(2)
  })

  it('notifies subscribers on dispatch, and stops after unsubscribe', () => {
    const sim = buildSim()
    let calls = 0
    const unsubscribe = sim.subscribe(() => {
      calls += 1
    })
    sim.dispatch({ type: 'advanceTurn' })
    expect(calls).toBe(1)
    unsubscribe()
    sim.dispatch({ type: 'advanceTurn' })
    expect(calls).toBe(1)
  })

  it('replay: same seed + same commandLog reproduces the same final state (golden-style determinism)', () => {
    const simA = buildSim('replay-seed')
    const simB = buildSim('replay-seed')

    for (const command of SCRIPT) simA.dispatch(command)
    for (const command of simA.getCommandLog()) simB.dispatch(command)

    expect(simB.getSnapshot().state).toEqual(simA.getSnapshot().state)
  })

  it('a different seed produces a different final state for the same command script', () => {
    const simA = buildSim('seed-one')
    const simB = buildSim('seed-two')
    for (const command of SCRIPT) simA.dispatch(command)
    for (const command of SCRIPT) simB.dispatch(command)
    expect(simB.getSnapshot().state).not.toEqual(simA.getSnapshot().state)
  })
})
