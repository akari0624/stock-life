import { describe, it, expect } from 'vitest'
import { SystemRegistry } from '../../SystemRegistry.js'
import { createAdvance } from '../../../turn/advance.js'
import { createInitialGameState } from '../../../state/createGameState.js'
import { Calendar } from '../../../Calendar.js'
import { SeededRng } from '../../../rng/SeededRng.js'
import { createEventSystem } from '../EventSystem.js'
import { createCounterSystem } from '../../counter/CounterSystem.js'
import type { EventDef } from '../EventDef.js'
import type { Expr } from '../../../expr/evaluate.js'
import { indexOpportunities } from '../../opportunity/Opportunity.js'

// §7.2 的故事圖：一個 outcome 的 `next` 就是圖上的一條邊。這一疊測試釘住的是
// 「作者寫了什麼就會演什麼」——包括他寫的延遲、他寫的退路，以及 once。

/** odds '+100' = 必定成功、'-100' = 必定失敗，讓分岔可以被確定性地測出來。 */
const choices = (alwaysGood: boolean) =>
  (['safe', 'normal', 'bold'] as const).map((id) => ({
    id,
    label: id,
    odds: alwaysGood ? '+100' : '-100',
    mag: 1,
    good: `${id} 成功`,
    bad: `${id} 失敗`,
  }))

const event = (id: string, extra: Partial<EventDef> = {}): EventDef => ({
  id,
  require: { '>=': ['age', 0] },
  weight: 0,
  prompt: `${id} 的情境`,
  choices: choices(true),
  good: { effects: [] },
  bad: { effects: [] },
  scene: {},
  ...extra,
})

const IMPOSSIBLE: Expr = { '>=': ['capital', 1_000_000_000] }

function setup(events: EventDef[], seed = 'story') {
  const registry = new SystemRegistry()
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 25 })
  const deps = { turnsPerYear: calendar.turnsPerYear }
  registry.register(createEventSystem({ events, opportunities: indexOpportunities([]), position: deps }))
  registry.register(createCounterSystem({ events, traits: [] }))
  return {
    state: createInitialGameState({ name: 'P', calendar }),
    rng: new SeededRng(seed),
    advance: createAdvance({ registry, calendar }),
  }
}

describe('next：一條邊就是一條邊（§7.2）', () => {
  it('成功與失敗可以通往不同的事件，而且就在同一年接上', () => {
    const events = [
      event('a', { weight: 10, choices: choices(true), good: { effects: [], next: { id: 'b_good' } } }),
      event('b_good'),
      event('c_bad'),
    ]
    const { advance, state, rng } = setup(events)

    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    expect(current.events.pending[0]?.eventId).toBe('a')
    const yearOfA = current.year

    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
    expect(current.events.pending[0]?.eventId).toBe('b_good')
    expect(current.year, '同一年立刻接上，不是明年').toBe(yearOfA)
  })

  it('失敗那條走 bad.next', () => {
    const events = [
      event('a', {
        weight: 10,
        choices: choices(false),
        good: { effects: [], next: { id: 'b_good' } },
        bad: { effects: [], next: { id: 'c_bad' } },
      }),
      event('b_good'),
      event('c_bad'),
    ]
    const { advance, state, rng } = setup(events)
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
    expect(current.events.pending[0]?.eventId).toBe('c_bad')
  })

  it('同一年的接續不檢查目標的 require——鏡頭還沒切走，世界沒變', () => {
    const events = [
      event('a', { weight: 10, good: { effects: [], next: { id: 'gated' } } }),
      event('gated', { require: IMPOSSIBLE }),
    ]
    const { advance, state, rng } = setup(events)
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
    expect(current.events.pending[0]?.eventId).toBe('gated')
  })
})

describe('afterYears：排到未來的那一年', () => {
  it('三年後才演，中間三年都不演', () => {
    const events = [
      event('a', { weight: 10, once: true, good: { effects: [], next: { id: 'later', afterYears: 3 } } }),
      event('later'),
    ]
    const { advance, state, rng } = setup(events)

    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    const start = current.year
    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
    expect(current.events.pending, '結算完的當下不該有東西').toEqual([])
    expect(current.events.queue[0]).toMatchObject({ eventId: 'later', turnsLeft: 3, checkRequire: true })

    const seen: { year: number; id: string }[] = []
    for (let turn = 0; turn < 5; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      const pending = current.events.pending[0]
      if (pending) {
        seen.push({ year: current.year, id: pending.eventId })
        current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
      }
    }

    expect(seen).toEqual([{ year: start + 3, id: 'later' }])
  })

  it('到期時 require 不成立就走 orElse', () => {
    const events = [
      event('a', {
        weight: 10,
        once: true,
        good: { effects: [], next: { id: 'gated', afterYears: 2, orElse: 'fallback' } },
      }),
      event('gated', { require: IMPOSSIBLE }),
      event('fallback'),
    ]
    const { advance, state, rng } = setup(events)
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    const start = current.year
    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState

    for (let turn = 0; turn < 3; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      if (current.events.pending.length > 0) break
    }
    expect(current.events.pending[0]?.eventId).toBe('fallback')
    expect(current.year).toBe(start + 2)
  })

  it('沒寫 orElse 就安靜跳過，不會硬演', () => {
    const events = [
      event('a', { weight: 10, once: true, good: { effects: [], next: { id: 'gated', afterYears: 1 } } }),
      event('gated', { require: IMPOSSIBLE }),
    ]
    const { advance, state, rng } = setup(events)
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
    for (let turn = 0; turn < 4; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      expect(current.events.pending).toEqual([])
    }
    expect(current.events.queue, '到期後就不該再留在佇列裡').toEqual([])
  })
})

describe('once：一輩子一次', () => {
  it('抽籤只會抽到一次，之後那些年就安靜過去', () => {
    const events = [event('solo', { weight: 10, once: true })]
    const { advance, state, rng } = setup(events)

    let current = state
    let presented = 0
    for (let turn = 0; turn < 12; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      if (current.events.pending.length > 0) {
        presented += 1
        current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
      }
    }
    expect(presented).toBe(1)
    expect(current.events.fired).toEqual(['solo'])
  })

  it('已經用掉的 once 事件被 next 指到時，改走 orElse', () => {
    const events = [
      event('spender', { weight: 10, good: { effects: [], next: { id: 'solo', orElse: 'instead' } } }),
      event('solo', { once: true }),
      event('instead'),
    ]
    const { advance, state, rng } = setup(events)

    // 第一次：solo 真的演出來
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
    expect(current.events.pending[0]?.eventId).toBe('solo')
    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState

    // 第二次抽到 spender：solo 已經用掉了，換 orElse
    for (let turn = 0; turn < 4; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      if (current.events.pending[0]?.eventId === 'spender') break
    }
    expect(current.events.pending[0]?.eventId).toBe('spender')
    current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
    expect(current.events.pending[0]?.eventId).toBe('instead')
  })
})
