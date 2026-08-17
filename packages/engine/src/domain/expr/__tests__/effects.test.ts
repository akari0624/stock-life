import { describe, it, expect } from 'vitest'
import {
  applyStateEffect,
  isStateEffect,
  isSceneHint,
  EffectRegistry,
  type Effect,
  type SceneHint,
  type StateEffect,
} from '../effects.js'
import { createInitialGameState } from '../../state/createGameState.js'
import { cloneGameState } from '../../state/GameState.js'
import { Calendar } from '../../Calendar.js'
import { SeededRng } from '../../rng/SeededRng.js'

function buildState() {
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 30 })
  return createInitialGameState({ name: 'P', calendar })
}

function rng() {
  return new SeededRng('effects-test').stream('effects')
}

describe('StateEffect / SceneHint separation', () => {
  it('isStateEffect and isSceneHint partition the Effect union without overlap', () => {
    const effects: Effect[] = [
      { type: 'stat.add', key: 'risky_bets', value: 1 },
      { type: 'capital.mul', value: 1.1 },
      { type: 'flag.set', key: 'diamond_hands' },
      { type: 'trait.grant', id: 'diamond_hands' },
      { type: 'position.open', opportunityId: 'op-1', sizing: 'normal' },
      { type: 'event.trigger', eventId: 'ev-1' },
      { type: 'scene.bg', id: 'bg-1' },
      { type: 'scene.actor', id: 'actor-1' },
      { type: 'scene.say', actor: 'actor-1', text: 'hi' },
      { type: 'scene.sfx', id: 'sfx-1' },
      { type: 'scene.bgm', id: 'bgm-1' },
      { type: 'scene.fx', id: 'fx-1' },
    ]
    for (const e of effects) {
      expect(isStateEffect(e)).not.toBe(isSceneHint(e))
    }
    expect(effects.filter(isStateEffect)).toHaveLength(6)
    expect(effects.filter(isSceneHint)).toHaveLength(6)
  })
})

describe('applyStateEffect', () => {
  it('is pure: never mutates the state object passed in', () => {
    const state = buildState()
    const snapshot = cloneGameState(state)
    applyStateEffect(state, { type: 'capital.mul', value: 2 }, rng())
    expect(state).toEqual(snapshot)
  })

  it('stat.add accumulates into counters.<key> for keys that are not real stats', () => {
    const state = buildState()
    const next = applyStateEffect(state, { type: 'stat.add', key: 'risky_bets', value: 3 }, rng())
    expect(next.counters['risky_bets']).toBe(3)
    const next2 = applyStateEffect(next, { type: 'stat.add', key: 'risky_bets', value: 2 }, rng())
    expect(next2.counters['risky_bets']).toBe(5)
  })

  it('capital.mul multiplies capitalState.capital', () => {
    const state = buildState()
    state.capitalState.capital = 1000
    const next = applyStateEffect(state, { type: 'capital.mul', value: 1.5 }, rng())
    expect(next.capitalState.capital).toBe(1500)
  })

  it('flag.set sets flags.<key> to true', () => {
    const state = buildState()
    const next = applyStateEffect(state, { type: 'flag.set', key: 'diamond_hands' }, rng())
    expect(next.flags['diamond_hands']).toBe(true)
  })

  it('trait.grant adds to traits.unlocked idempotently', () => {
    const state = buildState()
    const once = applyStateEffect(state, { type: 'trait.grant', id: 'diamond_hands' }, rng())
    const twice = applyStateEffect(once, { type: 'trait.grant', id: 'diamond_hands' }, rng())
    expect(twice.traits.unlocked).toEqual(['diamond_hands'])
  })

  it('position.open is inert here — PositionSystem is the only thing that opens a position', () => {
    const state = buildState()
    const next = applyStateEffect(
      state,
      { type: 'position.open', opportunityId: 'op-1', sizing: 'heavy' },
      rng(),
    )
    expect(next.positions.count).toBe(0)
    expect(next.positions.open).toEqual([])
  })

  it('event.trigger does not throw and does not corrupt state', () => {
    const state = buildState()
    const next = applyStateEffect(state, { type: 'event.trigger', eventId: 'ev-1' }, rng())
    expect(next).toEqual(state)
  })
})

describe('SceneHint never touches state (§6.3)', () => {
  it('applying a full sequence of StateEffects produces the same final state whether SceneHints are interleaved or stripped out entirely', () => {
    const stateEffects: StateEffect[] = [
      { type: 'stat.add', key: 'x', value: 1 },
      { type: 'capital.mul', value: 2 },
      { type: 'flag.set', key: 'f' },
    ]
    const sceneHints: SceneHint[] = [
      { type: 'scene.bg', id: 'bg-1' },
      { type: 'scene.say', actor: 'a', text: 'hello' },
      { type: 'scene.fx', id: 'fx-1' },
    ]
    const interleaved: Effect[] = [
      sceneHints[0]!,
      stateEffects[0]!,
      sceneHints[1]!,
      stateEffects[1]!,
      sceneHints[2]!,
      stateEffects[2]!,
    ]

    const base = buildState()
    base.capitalState.capital = 100

    let withHints = base
    for (const e of interleaved) {
      if (isStateEffect(e)) withHints = applyStateEffect(withHints, e, rng())
    }

    let withoutHints = base
    for (const e of stateEffects) {
      withoutHints = applyStateEffect(withoutHints, e, rng())
    }

    expect(withHints).toEqual(withoutHints)
  })
})

describe('EffectRegistry', () => {
  it('resolves a named effect by name, without content ever inlining logic', () => {
    const registry = new EffectRegistry()
    registry.register('diamond_hands_bonus', () => [{ type: 'stat.add', key: 'diamond_hands_bonus', value: 1 }])
    expect(registry.has('diamond_hands_bonus')).toBe(true)
    const state = buildState()
    const produced = registry.expand('diamond_hands_bonus', { state, rng: rng() })
    expect(produced).toEqual([{ type: 'stat.add', key: 'diamond_hands_bonus', value: 1 }])
  })

  it('throws registering the same name twice', () => {
    const registry = new EffectRegistry()
    registry.register('a', () => [])
    expect(() => registry.register('a', () => [])).toThrow()
  })

  it('throws expanding an unknown name', () => {
    const registry = new EffectRegistry()
    const state = buildState()
    expect(() => registry.expand('nope', { state, rng: rng() })).toThrow()
  })

  it('names() lists everything registered, for schema enum generation', () => {
    const registry = new EffectRegistry()
    registry.register('a', () => [])
    registry.register('b', () => [])
    expect(registry.names().sort()).toEqual(['a', 'b'])
  })
})
