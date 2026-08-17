import { describe, it, expect } from 'vitest'
import { SystemRegistry } from '../../SystemRegistry.js'
import { createAdvance } from '../../../turn/advance.js'
import { createInitialGameState } from '../../../state/createGameState.js'
import { Calendar } from '../../../Calendar.js'
import { SeededRng } from '../../../rng/SeededRng.js'
import type { GameState } from '../../../state/GameState.js'
import { createEventSystem, COUNTER_EVENTS_RESOLVED, counterForEventChoice } from '../EventSystem.js'
import { successChance, BASE_SUCCESS_CHANCE, type EventDef } from '../EventDef.js'
import { createTraitSystem, COUNTER_TRAITS_UNLOCKED } from '../../trait/TraitSystem.js'
import type { TraitDef } from '../../trait/TraitDef.js'
import { createCounterSystem, collectContentCounters } from '../../counter/CounterSystem.js'
import { indexOpportunities } from '../../opportunity/Opportunity.js'

const COIN_FLIP: EventDef = {
  id: 'overtime_crunch',
  require: { '>=': ['age', 0] },
  weight: 10,
  prompt: '晚上九點，主管還在。',
  choices: [
    { id: 'safe', label: '準時下班', odds: '+20', mag: 1 },
    { id: 'normal', label: '配合加班', odds: '0', mag: 2 },
    { id: 'bold', label: '拼命表現', odds: '-15', mag: 3 },
  ],
  good: { text: '主管注意到你了。', effects: [{ type: 'stat.add', key: 'income', value: 2 }] },
  bad: { text: '你累壞了。', effects: [{ type: 'stat.add', key: 'burnout', value: 1 }] },
  scene: { bg: 'office', sfx: 'keyboard' },
}

const GATED: EventDef = {
  ...COIN_FLIP,
  id: 'gated_event',
  require: { '>=': ['capital', 1_000_000] },
}

const TRIGGER_ONLY: EventDef = {
  ...COIN_FLIP,
  id: 'drawdown_50',
  weight: 0,
  good: { text: '你撐住了。', effects: [{ type: 'stat.add', key: 'held_through_drawdown', value: 1 }] },
  bad: { text: '你賣了。', effects: [{ type: 'stat.add', key: 'panic_sold', value: 1 }] },
}

const DIAMOND_HANDS: TraitDef = {
  id: 'diamond_hands',
  name: '鑽石手',
  tone: 'gold',
  require: { '>=': ['counter.held_through_drawdown', 2] },
  exclude: ['retail_leek'],
  grants: [{ type: 'stat.add', key: 'nerve', value: 10 }],
  text: '一股都沒賣。',
  scene: { fx: 'trait_unlock', sfx: 'chime' },
  checkOn: ['turn.end'],
}

const RETAIL_LEEK: TraitDef = {
  id: 'retail_leek',
  name: '韭菜',
  tone: 'bad',
  require: { '>=': ['counter.panic_sold', 1] },
  exclude: ['diamond_hands'],
  grants: [],
  text: '每次都賣在最低點。',
  scene: {},
  checkOn: ['turn.end'],
}

interface SetupOptions {
  seed?: string
  events?: EventDef[]
  traits?: TraitDef[]
  capital?: Partial<GameState['capitalState']>
}

function setup(options: SetupOptions = {}) {
  const registry = new SystemRegistry()
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 25 })
  const deps = { turnsPerYear: calendar.turnsPerYear }
  const opportunities = indexOpportunities([])
  const events = options.events ?? [COIN_FLIP]
  const traits = options.traits ?? []
  registry.register(createEventSystem({ events, opportunities, position: deps }))
  registry.register(createCounterSystem({ events, traits }))
  registry.register(createTraitSystem({ traits, opportunities, position: deps }))
  const state = createInitialGameState({ name: 'P', calendar, capital: options.capital })
  return { registry, calendar, state, rng: new SeededRng(options.seed ?? 'event'), advance: createAdvance({ registry, calendar }) }
}

describe('three-tier risk (§7.2)', () => {
  it('derives the displayed chance and the rolled chance from one function', () => {
    expect(successChance(COIN_FLIP.choices[0] as never)).toBe(BASE_SUCCESS_CHANCE + 20)
    expect(successChance(COIN_FLIP.choices[1] as never)).toBe(BASE_SUCCESS_CHANCE)
    expect(successChance(COIN_FLIP.choices[2] as never)).toBe(BASE_SUCCESS_CHANCE - 15)
  })

  it('shows the player exactly the odds it will roll against', () => {
    const { advance, state, rng } = setup()
    const { nextState } = advance(state, { type: 'advanceTurn' }, rng)
    const pending = nextState.events.pending[0]
    expect(pending?.eventId).toBe(COIN_FLIP.id)
    for (const choice of COIN_FLIP.choices) {
      const shown = pending?.choices.find((c) => c.id === choice.id)
      expect(shown?.chance).toBe(successChance(choice))
      expect(shown?.label).toBe(choice.label)
      expect(shown?.mag).toBe(choice.mag)
    }
  })

  it('matches the observed success rate to the displayed number over many runs', () => {
    let good = 0
    const runs = 400
    for (let i = 0; i < runs; i++) {
      const { advance, state, rng } = setup({ seed: `odds-${i}` })
      let current = advance(state, { type: 'advanceTurn' }, rng).nextState
      const shown = current.events.pending[0]?.choices.find((c) => c.id === 'safe')
      expect(shown?.chance).toBe(70)
      current = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng).nextState
      if ((current.capitalState.income ?? 0) > 0) good += 1
    }
    // Displayed 70%: the roll must land near it, not at some other rate.
    expect(good / runs).toBeGreaterThan(0.6)
    expect(good / runs).toBeLessThan(0.8)
  })

  it('scales outcome effects by the chosen option magnitude', () => {
    const { advance, state, rng } = setup({ seed: 'mag' })
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    current = advance(current, { type: 'resolveEvent', choice: 'bold' }, rng).nextState
    const income = current.capitalState.income
    const burnout = current.counters['burnout'] ?? 0
    // mag 3: either +2×3 income on success, or +1×3 burnout on failure.
    expect(income === 6 || burnout === 3).toBe(true)
    expect(current.counters[COUNTER_EVENTS_RESOLVED]).toBe(1)
    expect(current.counters[counterForEventChoice('bold')]).toBe(1)
  })

  it('never draws an event whose require fails', () => {
    const { advance, state, rng } = setup({ events: [GATED] })
    let current = state
    for (let turn = 0; turn < 20; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      expect(current.events.pending).toEqual([])
    }
  })

  it('never draws a weight-0 event at random, but does run it when triggered', () => {
    const { advance, state, rng } = setup({ events: [TRIGGER_ONLY] })
    let current = state
    for (let turn = 0; turn < 15; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      expect(current.events.pending).toEqual([])
    }

    current.events.queue.push(TRIGGER_ONLY.id)
    current = advance(current, { type: 'advanceTurn' }, rng).nextState
    expect(current.events.pending[0]?.eventId).toBe(TRIGGER_ONLY.id)
  })

  it('不會連續兩年抽到同一個事件', () => {
    // 情境是看得見的（§7.2），所以同一句話連兩年出現會像壞掉。
    const other: EventDef = { ...COIN_FLIP, id: 'other_event', prompt: '另一件事發生了。' }
    const ctx = setup({ seed: 'no-repeat', events: [COIN_FLIP, other] })

    let current = ctx.state
    const drawn: string[] = []
    for (let turn = 0; turn < 20; turn++) {
      current = ctx.advance(current, { type: 'advanceTurn' }, ctx.rng).nextState
      const pending = current.events.pending[0]
      if (pending) drawn.push(pending.eventId)
      current = ctx.advance(current, { type: 'resolveEvent', choice: 'normal' }, ctx.rng).nextState
    }

    expect(drawn.length).toBeGreaterThan(10)
    for (let i = 1; i < drawn.length; i++) {
      expect(drawn[i], `第 ${i} 年又抽到 ${drawn[i]}`).not.toBe(drawn[i - 1])
    }
    // 兩個都真的有出現過——不是只是卡在其中一個
    expect(new Set(drawn).size).toBe(2)
  })

  it('只有一個事件可抽的時候，那一年就安靜過去', () => {
    const ctx = setup({ seed: 'quiet', events: [COIN_FLIP] })
    let current = ctx.advance(ctx.state, { type: 'advanceTurn' }, ctx.rng).nextState
    expect(current.events.pending).toHaveLength(1)

    current = ctx.advance(current, { type: 'resolveEvent', choice: 'normal' }, ctx.rng).nextState
    current = ctx.advance(current, { type: 'advanceTurn' }, ctx.rng).nextState
    expect(current.events.pending).toEqual([])

    // 隔一年之後又抽得到（規則只擋「上一次」）
    current = ctx.advance(current, { type: 'advanceTurn' }, ctx.rng).nextState
    expect(current.events.pending).toHaveLength(1)
  })

  it('但被 event.trigger 叫到的事件不受這條規則限制（考驗本來就會再來）', () => {
    const ctx = setup({ seed: 'trigger-repeat', events: [TRIGGER_ONLY] })
    let current = ctx.state
    for (let i = 0; i < 2; i++) {
      current.events.queue.push(TRIGGER_ONLY.id)
      current = ctx.advance(current, { type: 'advanceTurn' }, ctx.rng).nextState
      expect(current.events.pending[0]?.eventId).toBe(TRIGGER_ONLY.id)
      current = ctx.advance(current, { type: 'resolveEvent', choice: 'normal' }, ctx.rng).nextState
    }
  })

  it('resolves an unanswered event as the neutral option on the next turn', () => {
    const { advance, state, rng } = setup({ seed: 'ignore' })
    let current = advance(state, { type: 'advanceTurn' }, rng).nextState
    expect(current.events.pending).toHaveLength(1)
    current = advance(current, { type: 'advanceTurn' }, rng).nextState
    expect(current.counters[counterForEventChoice('normal')]).toBe(1)
  })

  it('tells the player the situation *before* they choose (§7.2)', () => {
    // The whole point: a decision is three verbs and three percentages until
    // the situation is on screen. So presenting an event has to emit the
    // scene and the prompt — not just queue a pending decision.
    const ctx = setup({ seed: 'prompt' })
    const { nextState, effects } = ctx.advance(ctx.state, { type: 'advanceTurn' }, ctx.rng)

    expect(nextState.events.pending[0]?.prompt).toBe(COIN_FLIP.prompt)
    expect(effects).toContainEqual({ type: 'scene.bg', id: 'office' })
    expect(effects).toContainEqual({ type: 'scene.say', actor: 'narrator', text: COIN_FLIP.prompt })
    // …and the outcome text is *not* spoiled before the choice is made
    expect(effects.some((e) => e.type === 'scene.say' && e.text === COIN_FLIP.good.text)).toBe(false)
    expect(effects.some((e) => e.type === 'scene.say' && e.text === COIN_FLIP.bad.text)).toBe(false)
  })

  it('an event with no prompt still works — the panel falls back to a generic header', () => {
    const bare: EventDef = { ...COIN_FLIP, id: 'bare_event' }
    delete bare.prompt
    const ctx = setup({ seed: 'bare', events: [bare] })
    const { nextState, effects } = ctx.advance(ctx.state, { type: 'advanceTurn' }, ctx.rng)

    expect(nextState.events.pending[0]?.prompt).toBeUndefined()
    expect(effects.some((e) => e.type === 'scene.say')).toBe(false)
  })

  it('emits the outcome text as a hint, never as state', () => {
    const { advance, state, rng } = setup({ seed: 'scene' })
    const current = advance(state, { type: 'advanceTurn' }, rng).nextState
    const { nextState, effects } = advance(current, { type: 'resolveEvent', choice: 'safe' }, rng)

    // 結算只說結果——舞台在「提出」那一刻就已經佈好了，director 會把它留著
    const said = effects.filter((e) => e.type === 'scene.say')
    expect(said).toHaveLength(1)
    expect([COIN_FLIP.good.text, COIN_FLIP.bad.text]).toContain(
      said[0] && 'text' in said[0] ? said[0].text : '',
    )
    expect(effects.some((e) => e.type === 'scene.bg')).toBe(false)
    // SceneHint 對 state 零影響（§6.3）
    expect(nextState.events.pending).toEqual([])
  })
})

describe('counters (§7.5)', () => {
  it('lists every counter the loaded content writes to, for the editor and for mods', () => {
    expect(collectContentCounters([COIN_FLIP, TRIGGER_ONLY], [])).toEqual([
      'burnout',
      'held_through_drawdown',
      'panic_sold',
    ])
  })

  it('puts those counters on the mod-facing whitelist', () => {
    const { registry } = setup({ events: [COIN_FLIP, TRIGGER_ONLY] })
    const paths = registry.allFacadeFields().map((f) => f.path)
    expect(paths).toContain('counter.held_through_drawdown')
    expect(paths).toContain('counter.burnout')
  })

  it('lets third-party trait data unlock off an official counter', () => {
    // The trait below is "somebody else's content": it was never mentioned
    // when the counter was defined, and no engine code knows it exists.
    const modTrait: TraitDef = {
      id: 'mod_burnout_survivor',
      name: 'Mod: 過勞倖存者',
      tone: 'gold',
      require: { '>=': ['counter.burnout', 1] },
      exclude: [],
      grants: [{ type: 'stat.add', key: 'nerve', value: 1 }],
      text: 'from a mod',
      scene: {},
      checkOn: ['event.resolve'],
    }
    const { advance, state, rng } = setup({ seed: 'mod', traits: [modTrait] })
    let current = state
    for (let turn = 0; turn < 20 && !current.traits.unlocked.includes(modTrait.id); turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
      if (current.events.pending.length > 0) {
        current = advance(current, { type: 'resolveEvent', choice: 'bold' }, rng).nextState
      }
    }
    expect(current.counters['burnout']).toBeGreaterThan(0)
    expect(current.traits.unlocked).toContain(modTrait.id)
  })
})

describe('traits (§7.5)', () => {
  it('unlocks when the threshold over behaviour counters is met', () => {
    const { advance, state, rng } = setup({ traits: [DIAMOND_HANDS] })
    const current = state
    current.counters['held_through_drawdown'] = 2
    const { nextState, effects } = advance(current, { type: 'advanceTurn' }, rng)
    expect(nextState.traits.unlocked).toContain('diamond_hands')
    expect(nextState.player.nerve).toBe(100) // granted +10 but already capped
    expect(nextState.counters[COUNTER_TRAITS_UNLOCKED]).toBe(1)
    expect(effects).toContainEqual({ type: 'trait.grant', id: 'diamond_hands' })
    expect(effects).toContainEqual({ type: 'scene.fx', id: 'trait_unlock' })
  })

  it('does not unlock while the threshold is unmet', () => {
    const { advance, state, rng } = setup({ traits: [DIAMOND_HANDS] })
    const { nextState } = advance(state, { type: 'advanceTurn' }, rng)
    expect(nextState.traits.unlocked).toEqual([])
  })

  it('applies exclusion: the newly earned personality displaces its opposite into removed[]', () => {
    const { advance, state, rng } = setup({ traits: [DIAMOND_HANDS, RETAIL_LEEK] })
    let current = state
    current.counters['held_through_drawdown'] = 2
    current = advance(current, { type: 'advanceTurn' }, rng).nextState
    expect(current.traits.unlocked).toEqual(['diamond_hands'])

    current.counters['panic_sold'] = 1
    current = advance(current, { type: 'advanceTurn' }, rng).nextState
    expect(current.traits.unlocked).toEqual(['retail_leek'])
    expect(current.traits.removed).toEqual(['diamond_hands'])
  })

  it('never re-grants a personality that was displaced', () => {
    const { advance, state, rng } = setup({ traits: [DIAMOND_HANDS, RETAIL_LEEK] })
    let current = state
    current.counters['held_through_drawdown'] = 2
    current.counters['panic_sold'] = 1
    current = advance(current, { type: 'advanceTurn' }, rng).nextState
    for (let turn = 0; turn < 5; turn++) {
      current = advance(current, { type: 'advanceTurn' }, rng).nextState
    }
    const bothHeld = current.traits.unlocked.filter((id) =>
      ['diamond_hands', 'retail_leek'].includes(id),
    )
    expect(bothHeld).toHaveLength(1)
  })

  it('honours whatever checkOn the data names, with no engine change', () => {
    // Same trait, two different timings — only the data differs.
    const atTurnEnd: TraitDef = { ...DIAMOND_HANDS, checkOn: ['turn.end'] }
    const atEventResolve: TraitDef = { ...DIAMOND_HANDS, checkOn: ['event.resolve'] }

    const turnEndRun = setup({ seed: 'timing', traits: [atTurnEnd] })
    let a = turnEndRun.state
    a.counters['held_through_drawdown'] = 2
    a = turnEndRun.advance(a, { type: 'advanceTurn' }, turnEndRun.rng).nextState
    expect(a.traits.unlocked).toContain('diamond_hands')

    const eventRun = setup({ seed: 'timing', traits: [atEventResolve] })
    let b = eventRun.state
    b.counters['held_through_drawdown'] = 2
    b = eventRun.advance(b, { type: 'advanceTurn' }, eventRun.rng).nextState
    // turn.end came and went; this one only listens to event.resolve.
    expect(b.traits.unlocked).toEqual([])
    b = eventRun.advance(b, { type: 'resolveEvent', choice: 'safe' }, eventRun.rng).nextState
    expect(b.traits.unlocked).toContain('diamond_hands')
  })
})

describe('determinism', () => {
  it('replays the same events and traits from the same seed and commands', () => {
    const run = (): GameState => {
      const { advance, state, rng } = setup({ seed: 'replay', traits: [DIAMOND_HANDS, RETAIL_LEEK] })
      let current = state
      for (let turn = 0; turn < 12; turn++) {
        current = advance(current, { type: 'advanceTurn' }, rng).nextState
        current = advance(current, { type: 'resolveEvent', choice: 'bold' }, rng).nextState
      }
      return current
    }
    expect(run()).toEqual(run())
  })
})
