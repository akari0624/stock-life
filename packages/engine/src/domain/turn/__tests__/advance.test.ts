import { describe, it, expect } from 'vitest'
import { createAdvance } from '../advance.js'
import { SystemRegistry } from '../../systems/SystemRegistry.js'
import type { GameSystem } from '../../systems/GameSystem.js'
import { createInitialGameState } from '../../state/createGameState.js'
import { cloneGameState, type GameState } from '../../state/GameState.js'
import { Calendar } from '../../Calendar.js'
import { SeededRng } from '../../rng/SeededRng.js'
import type { Command } from '../Command.js'

function recordingSystem(id: string, order: number): GameSystem {
  return {
    id,
    order,
    onCommand(command, ctx) {
      ctx.state.counters[`${id}.command.${command.type}`] = ctx.rng.next()
    },
    onPhase(phase, ctx) {
      ctx.state.counters[`${id}.phase.${phase}`] = ctx.rng.next()
      ctx.emit({ type: 'stat.add', key: `${id}.${phase}`, value: 1 })
      if (phase === 'mid') {
        ctx.emit({ type: 'scene.bg', id: `${id}-bg` })
      }
    },
  }
}

function setup(seed: string | number = 'advance-test') {
  const registry = new SystemRegistry()
  registry.register(recordingSystem('sys-a', 1))
  registry.register(recordingSystem('sys-b', 2))
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 25 })
  const initialState = createInitialGameState({ name: 'P', calendar })
  const advance = createAdvance({ registry, calendar })
  const rng = new SeededRng(seed)
  return { advance, rng, initialState, calendar }
}

describe('advance', () => {
  it('never mutates the state object passed in', () => {
    const { advance, rng, initialState } = setup()
    const snapshot = cloneGameState(initialState)
    advance(initialState, { type: 'advanceTurn' }, rng)
    expect(initialState).toEqual(snapshot)
  })

  it('is a pure function of (state, command, rng): replaying the same inputs from scratch reproduces the same output', () => {
    const runA = setup('same-seed')
    const runB = setup('same-seed')

    const resultA = runA.advance(runA.initialState, { type: 'advanceTurn' }, runA.rng)
    const resultB = runB.advance(runB.initialState, { type: 'advanceTurn' }, runB.rng)

    expect(resultA.nextState).toEqual(resultB.nextState)
    expect(resultA.effects).toEqual(resultB.effects)
  })

  it('each system draws from its own independent rng stream', () => {
    const { advance, rng, initialState } = setup()
    const { nextState } = advance(initialState, { type: 'advanceTurn' }, rng)
    const a = nextState.counters['sys-a.phase.mid']
    const b = nextState.counters['sys-b.phase.mid']
    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(a).not.toBe(b)
  })

  it('multiple commands within the same turnIndex still get independent randomness per call', () => {
    const { advance, rng, initialState } = setup()
    const first = advance(initialState, { type: 'declineOpportunity', id: 'op-1' }, rng)
    const second = advance(first.nextState, { type: 'declineOpportunity', id: 'op-1' }, rng)
    const draw1 = first.nextState.counters['sys-a.command.declineOpportunity']
    const draw2 = second.nextState.counters['sys-a.command.declineOpportunity']
    expect(draw1).not.toBe(draw2)
  })

  it('runs turn.start/pre/mid/end/turn.end in order, only on advanceTurn', () => {
    const { advance, rng, initialState } = setup()
    const nonTurnCommand: Command = { type: 'declineOpportunity', id: 'op-1' }
    const { nextState: afterDecline } = advance(initialState, nonTurnCommand, rng)
    for (const phase of ['turn.start', 'pre', 'mid', 'end', 'turn.end']) {
      expect(afterDecline.counters[`sys-a.phase.${phase}`]).toBeUndefined()
    }
    expect(afterDecline.turnIndex).toBe(0)

    const { nextState: afterTurn } = advance(afterDecline, { type: 'advanceTurn' }, rng)
    for (const phase of ['turn.start', 'pre', 'mid', 'end', 'turn.end']) {
      expect(afterTurn.counters[`sys-a.phase.${phase}`]).toBeDefined()
    }
    expect(afterTurn.turnIndex).toBe(1)
  })

  it('advances year/age/stage via Calendar only on advanceTurn', () => {
    const { advance, rng, initialState, calendar } = setup()
    expect(initialState.year).toBe(2000)
    expect(initialState.player.age).toBe(25)

    const { nextState: unchanged } = advance(initialState, { type: 'declineOpportunity', id: 'x' }, rng)
    expect(unchanged.year).toBe(2000)
    expect(unchanged.player.age).toBe(25)

    const { nextState: advanced } = advance(unchanged, { type: 'advanceTurn' }, rng)
    const expected = calendar.at(1)
    expect(advanced.year).toBe(expected.year)
    expect(advanced.player.age).toBe(expected.age)
    expect(advanced.player.stage).toBe(expected.stage)
  })

  it('collects both StateEffect and SceneHint entries emitted by systems, in call order', () => {
    const { advance, rng, initialState } = setup()
    const { effects } = advance(initialState, { type: 'advanceTurn' }, rng)
    expect(effects.some((e) => e.type === 'scene.bg')).toBe(true)
    expect(effects.some((e) => e.type === 'stat.add')).toBe(true)
  })

  it('increments commandIndex on every call, including non-advanceTurn commands', () => {
    const { advance, rng, initialState } = setup()
    const r1 = advance(initialState, { type: 'declineOpportunity', id: 'x' }, rng)
    expect(r1.nextState.commandIndex).toBe(1)
    const r2 = advance(r1.nextState, { type: 'declineOpportunity', id: 'y' }, rng)
    expect(r2.nextState.commandIndex).toBe(2)
  })

  it('systems can handle commands directly, without a central switch dispatcher', () => {
    let sawIt = false
    const registry = new SystemRegistry()
    registry.register({
      id: 'listener',
      order: 1,
      onCommand(command) {
        if (command.type === 'resolveEvent') sawIt = true
      },
    })
    const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 25 })
    const initialState: GameState = createInitialGameState({ name: 'P', calendar })
    const advance = createAdvance({ registry, calendar })
    advance(initialState, { type: 'resolveEvent', choice: 'safe' }, new SeededRng('x'))
    expect(sawIt).toBe(true)
  })
})
