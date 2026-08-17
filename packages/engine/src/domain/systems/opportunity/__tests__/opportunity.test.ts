import { describe, it, expect } from 'vitest'
import { SystemRegistry } from '../../SystemRegistry.js'
import { createAdvance } from '../../../turn/advance.js'
import { createInitialGameState } from '../../../state/createGameState.js'
import { toPlayerView } from '../../../state/playerView.js'
import { Calendar } from '../../../Calendar.js'
import { SeededRng } from '../../../rng/SeededRng.js'
import type { GameState } from '../../../state/GameState.js'
import {
  createOpportunitySystem,
  offerIdFor,
  sourceChance,
  flagDeclined,
  flagTaken,
  COUNTER_OPPORTUNITIES_TAKEN,
  COUNTER_OPPORTUNITIES_DECLINED,
} from '../OpportunitySystem.js'
import {
  resolveSignal,
  signalTierFor,
  SIGNAL_HIGH_COGNITION,
  SIGNAL_MID_COGNITION,
  SIGNAL_NETWORK_BUMP,
  type Opportunity,
} from '../Opportunity.js'
import {
  createPositionSystem,
  positionOpener,
  FLAG_LEVERAGED_WIPEOUT,
  COUNTER_PANIC_SOLD,
  COUNTER_HELD_THROUGH_DRAWDOWN,
  COUNTER_TRIALS_FACED,
} from '../../position/PositionSystem.js'

const LIFE_OPPORTUNITY: Opportunity = {
  id: 'mem_supercycle_a',
  tier: 'life',
  window: { eraPhase: [], themes: [] },
  require: { '>=': ['age', 0] },
  sourcedBy: ['colleague', 'broker', 'forum'],
  truth: { multiple: [6, 12], years: [2, 4], ruinChance: 15 },
  signal: {
    low: { text: '同事說這檔穩賺', reveal: [] },
    mid: { text: '做記憶體的，聽說產業要回溫', reveal: ['theme'] },
    high: { text: '營收連三月雙位數成長，但客戶集中度偏高', reveal: ['theme', 'valuation', 'risk'] },
  },
  sizing: ['light', 'normal', 'heavy', 'leveraged'],
  trials: ['drawdown_50', 'triple_temptation', 'family_emergency'],
  scene: { bg: 'office_night', actor: 'colleague_a', sfx: 'phone_ring' },
}

const NORMAL_OPPORTUNITY: Opportunity = {
  ...LIFE_OPPORTUNITY,
  id: 'small_cap_tip',
  tier: 'normal',
  truth: { multiple: [1.2, 1.6], years: [1, 1], ruinChance: 0 },
  trials: [],
  signal: { mid: { text: '朋友報的明牌', reveal: [] } },
}

interface SetupOptions {
  seed?: string
  opportunities?: Opportunity[]
  capital?: Partial<GameState['capitalState']>
  era?: { phase: string; themes: string[] }
}

function setup(options: SetupOptions = {}) {
  const registry = new SystemRegistry()
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 25 })
  const deps = { turnsPerYear: calendar.turnsPerYear }
  registry.register(
    createOpportunitySystem({
      opportunities: options.opportunities ?? [LIFE_OPPORTUNITY],
      onAccept: positionOpener(deps),
    }),
  )
  registry.register(createPositionSystem())
  const state = createInitialGameState({
    name: 'P',
    calendar,
    capital: { capital: 1000, ...options.capital },
    era: options.era ?? { phase: 'boom', themes: ['memory'] },
  })
  return { registry, calendar, state, rng: new SeededRng(options.seed ?? 'opp'), advance: createAdvance({ registry, calendar }) }
}

/** Recursively looks for a property name anywhere in a value. */
function hasKeyDeep(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((item) => hasKeyDeep(item, key))
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (key in record) return true
    return Object.values(record).some((item) => hasKeyDeep(item, key))
  }
  return false
}

/**
 * Advances turns until an opportunity offer shows up. The loop is generous
 * because how often one arrives is a **tuned** number (S19 lowered it once the
 * pack had 24 opportunities instead of 1) — this test is about what an offer
 * looks like when it comes, not about how long the wait is.
 */
function runUntilOffer(seedSuffix = '', options: SetupOptions = {}) {
  const ctx = setup({ seed: `offer${seedSuffix}`, ...options })
  let current = ctx.state
  for (let turn = 0; turn < 400; turn++) {
    current = ctx.advance(current, { type: 'advanceTurn' }, ctx.rng).nextState
    if (current.offers.some((o) => o.source === 'opportunity')) return { ...ctx, state: current }
  }
  throw new Error('no opportunity was ever proposed — check sourceChance()')
}

describe('signal tiers (§1.2)', () => {
  it('maps cognition to a tier, with a deep network buying one step up', () => {
    expect(signalTierFor(0, 0)).toBe('low')
    expect(signalTierFor(SIGNAL_MID_COGNITION, 0)).toBe('mid')
    expect(signalTierFor(SIGNAL_HIGH_COGNITION, 0)).toBe('high')
    expect(signalTierFor(0, SIGNAL_NETWORK_BUMP)).toBe('mid')
    expect(signalTierFor(SIGNAL_MID_COGNITION, SIGNAL_NETWORK_BUMP)).toBe('high')
  })

  it('falls back to whatever tier the author actually wrote', () => {
    const onlyLow = { low: { text: 'only low', reveal: [] } }
    expect(resolveSignal(onlyLow, 'high')?.level.text).toBe('only low')
    const onlyHigh = { high: { text: 'only high', reveal: [] as never[] } }
    expect(resolveSignal(onlyHigh, 'low')?.level.text).toBe('only high')
    expect(resolveSignal({}, 'mid')).toBeUndefined()
  })

  it('shows the same opportunity differently to two players of different cognition', () => {
    // Same network (below the bump threshold) so cognition is the only
    // difference between the two players.
    const network = SIGNAL_NETWORK_BUMP - 1
    const novice = runUntilOffer('-novice', { capital: { cognition: 0, network } })
    const expert = runUntilOffer('-expert', { capital: { cognition: SIGNAL_HIGH_COGNITION, network } })

    const noviceOffer = novice.state.offers.find((o) => o.source === 'opportunity')
    const expertOffer = expert.state.offers.find((o) => o.source === 'opportunity')
    expect(noviceOffer?.label).toBe(LIFE_OPPORTUNITY.signal.low?.text)
    expect(expertOffer?.label).toBe(LIFE_OPPORTUNITY.signal.high?.text)
    expect(noviceOffer?.label).not.toBe(expertOffer?.label)
    expect(noviceOffer?.detail?.themes).toBeUndefined()
    expect(expertOffer?.detail?.reveal).toEqual(['theme', 'valuation', 'risk'])
  })
})

describe('OpportunitySystem', () => {
  it('reaches the player more often the better connected they are', () => {
    expect(sourceChance(0)).toBeLessThan(sourceChance(50))
    expect(sourceChance(100_000)).toBeLessThanOrEqual(1)
  })

  it('does not propose an opportunity whose era window does not match', () => {
    const windowed: Opportunity = {
      ...LIFE_OPPORTUNITY,
      window: { eraPhase: ['mania'], themes: ['memory'] },
    }
    const ctx = setup({ opportunities: [windowed], era: { phase: 'crash', themes: ['memory'] }, capital: { network: 200 } })
    let current = ctx.state
    for (let turn = 0; turn < 40; turn++) {
      current = ctx.advance(current, { type: 'advanceTurn' }, ctx.rng).nextState
      expect(current.offers.filter((o) => o.source === 'opportunity')).toEqual([])
    }
  })

  it('does not propose an opportunity whose require fails', () => {
    const gated: Opportunity = { ...LIFE_OPPORTUNITY, require: { '>=': ['cognition', 999] } }
    const ctx = setup({ opportunities: [gated], capital: { network: 200 } })
    let current = ctx.state
    for (let turn = 0; turn < 40; turn++) {
      current = ctx.advance(current, { type: 'advanceTurn' }, ctx.rng).nextState
      expect(current.offers.filter((o) => o.source === 'opportunity')).toEqual([])
    }
  })

  it('never offers a declined opportunity again — a missed chance stays missed', () => {
    const found = runUntilOffer('-decline')
    const offerId = offerIdFor(LIFE_OPPORTUNITY.id)
    let current = found.advance(found.state, { type: 'declineOpportunity', id: offerId }, found.rng).nextState
    expect(current.flags[flagDeclined(LIFE_OPPORTUNITY.id)]).toBe(true)
    expect(current.counters[COUNTER_OPPORTUNITIES_DECLINED]).toBe(1)

    for (let turn = 0; turn < 40; turn++) {
      current = found.advance(current, { type: 'advanceTurn' }, found.rng).nextState
      expect(current.offers.filter((o) => o.source === 'opportunity')).toEqual([])
    }
  })

  it('refuses a position size the content never offered', () => {
    const limited: Opportunity = { ...LIFE_OPPORTUNITY, sizing: ['light'] }
    const found = runUntilOffer('-sizing', { opportunities: [limited] })
    const { nextState } = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(limited.id), sizing: 'leveraged' },
      found.rng,
    )
    expect(nextState.positions.open).toEqual([])
    expect(nextState.counters[COUNTER_OPPORTUNITIES_TAKEN]).toBeUndefined()
  })
})

describe('positions (§1.3, §7.1)', () => {
  it('opens a position sized as a share of capital and marks the opportunity taken', () => {
    const found = runUntilOffer('-take')
    const capitalBefore = found.state.capitalState.capital
    const { nextState, effects } = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(LIFE_OPPORTUNITY.id), sizing: 'normal' },
      found.rng,
    )

    expect(nextState.positions.open).toHaveLength(1)
    expect(nextState.positions.count).toBe(1)
    const position = nextState.positions.open[0]
    expect(position?.tier).toBe('life')
    expect(position?.stake).toBeCloseTo(capitalBefore * 0.3, 6)
    expect(position?.borrowed).toBe(0)
    expect(nextState.capitalState.capital).toBeCloseTo(capitalBefore * 0.7, 6)
    expect(nextState.flags[flagTaken(LIFE_OPPORTUNITY.id)]).toBe(true)
    expect(effects).toContainEqual({
      type: 'position.open',
      opportunityId: LIFE_OPPORTUNITY.id,
      sizing: 'normal',
    })
  })

  it('runs yearly trials for a life-tier position, through the ordinary event pipeline', () => {
    const found = runUntilOffer('-trials')
    let current = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(LIFE_OPPORTUNITY.id), sizing: 'normal' },
      found.rng,
    ).nextState

    const triggered: string[] = []
    for (let turn = 0; turn < 6 && current.positions.open.length > 0; turn++) {
      const result = found.advance(current, { type: 'advanceTurn' }, found.rng)
      current = result.nextState
      for (const effect of result.effects) {
        if (effect.type === 'event.trigger') triggered.push(effect.eventId)
      }
    }

    expect(triggered.length).toBeGreaterThan(0)
    for (const id of triggered) expect(LIFE_OPPORTUNITY.trials).toContain(id)
    expect(current.counters[COUNTER_TRIALS_FACED]).toBe(triggered.length)
    expect(current.positions.worstDrawdown).toBeGreaterThan(0)
  })

  it('settles a normal-tier position once, with no trials at all', () => {
    const found = runUntilOffer('-normal', { opportunities: [NORMAL_OPPORTUNITY] })
    let current = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(NORMAL_OPPORTUNITY.id), sizing: 'normal' },
      found.rng,
    ).nextState

    const triggered: string[] = []
    for (let turn = 0; turn < 5 && current.positions.open.length > 0; turn++) {
      const result = found.advance(current, { type: 'advanceTurn' }, found.rng)
      current = result.nextState
      triggered.push(...result.effects.filter((e) => e.type === 'event.trigger').map((e) => e.eventId))
    }

    expect(triggered).toEqual([])
    expect(current.positions.closed).toHaveLength(1)
    expect(current.positions.count).toBe(0)
  })

  it('a trial reaches the player as an ordinary event, not just as an effect (§7.1)', () => {
    // The trial arrives on the event pipeline: PositionSystem puts the id in
    // the inbox and EventSystem turns it into a pending decision. Emitting the
    // effect alone would tell the *performance* about a trial the player never
    // gets to answer — which is exactly what S19's fuller content exposed.
    const found = runUntilOffer('-trial-event')
    let current = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(LIFE_OPPORTUNITY.id), sizing: 'normal' },
      found.rng,
    ).nextState

    for (let turn = 0; turn < 12; turn++) {
      current = found.advance(current, { type: 'advanceTurn' }, found.rng).nextState
      if (current.events.queue.length > 0 || current.events.pending.length > 0) break
    }

    const queued = [...current.events.queue, ...current.events.pending.map((p) => p.eventId)]
    expect(queued.length).toBeGreaterThan(0)
    expect(LIFE_OPPORTUNITY.trials).toContain(queued[0])
  })

  it('同一個考驗不會連續兩年丟給你', () => {
    const found = runUntilOffer('-trial-repeat')
    let current = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(LIFE_OPPORTUNITY.id), sizing: 'normal' },
      found.rng,
    ).nextState

    const thrown: string[] = []
    for (let turn = 0; turn < 20; turn++) {
      const result = found.advance(current, { type: 'advanceTurn' }, found.rng)
      current = result.nextState
      for (const effect of result.effects) {
        if (effect.type === 'event.trigger') thrown.push(effect.eventId)
      }
    }

    // 部位到期就結清了，所以一輩子丟不了太多次——有兩次就足以檢查連續性
    expect(thrown.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < thrown.length; i++) {
      expect(thrown[i], `連續兩次都是 ${thrown[i]}`).not.toBe(thrown[i - 1])
    }
  })

  it('treats an unanswered trial as holding, and a sell as panic selling', () => {
    const found = runUntilOffer('-hold')
    let current = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(LIFE_OPPORTUNITY.id), sizing: 'normal' },
      found.rng,
    ).nextState

    // Never answer a trial: the next turn resolves it as a hold.
    for (let turn = 0; turn < 4 && current.positions.open.length > 0; turn++) {
      current = found.advance(current, { type: 'advanceTurn' }, found.rng).nextState
    }
    expect(current.counters[COUNTER_HELD_THROUGH_DRAWDOWN] ?? 0).toBeGreaterThan(0)

    const sellRun = runUntilOffer('-sell')
    let selling = sellRun.advance(
      sellRun.state,
      { type: 'takeOpportunity', id: offerIdFor(LIFE_OPPORTUNITY.id), sizing: 'normal' },
      sellRun.rng,
    ).nextState
    while (!selling.positions.open[0]?.pendingTrial && selling.positions.open.length > 0) {
      selling = sellRun.advance(selling, { type: 'advanceTurn' }, sellRun.rng).nextState
    }
    const positionId = selling.positions.open[0]?.id ?? ''
    selling = sellRun.advance(selling, { type: 'resolveTrial', positionId, choice: 'sell' }, sellRun.rng).nextState
    expect(selling.counters[COUNTER_PANIC_SOLD]).toBe(1)
    expect(selling.positions.open).toEqual([])
    expect(selling.positions.closed[0]?.soldEarly).toBe(true)
  })

  it('turns a failed leveraged bet into debt and unlocks the fallout chain', () => {
    const doomed: Opportunity = {
      ...LIFE_OPPORTUNITY,
      id: 'doomed_bet',
      truth: { multiple: [6, 12], years: [1, 1], ruinChance: 100 },
      trials: [],
    }
    const found = runUntilOffer('-leverage', { opportunities: [doomed] })
    let current = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(doomed.id), sizing: 'leveraged' },
      found.rng,
    ).nextState

    const position = current.positions.open[0]
    expect(position?.borrowed).toBeGreaterThan(0)

    while (current.positions.open.length > 0) {
      current = found.advance(current, { type: 'advanceTurn' }, found.rng).nextState
    }

    expect(current.capitalState.debt).toBeGreaterThan(0)
    expect(current.flags[FLAG_LEVERAGED_WIPEOUT]).toBe(true)
    expect(current.positions.closed[0]?.shortfall).toBeGreaterThan(0)
  })

  it('leaves an unleveraged loss inside the portfolio — no debt, no fallout flag', () => {
    const doomed: Opportunity = {
      ...LIFE_OPPORTUNITY,
      id: 'doomed_bet',
      truth: { multiple: [6, 12], years: [1, 1], ruinChance: 100 },
      trials: [],
    }
    const found = runUntilOffer('-noleverage', { opportunities: [doomed] })
    let current = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(doomed.id), sizing: 'heavy' },
      found.rng,
    ).nextState
    while (current.positions.open.length > 0) {
      current = found.advance(current, { type: 'advanceTurn' }, found.rng).nextState
    }
    expect(current.capitalState.debt).toBe(0)
    expect(current.flags[FLAG_LEVERAGED_WIPEOUT]).toBeUndefined()
  })
})

describe('truth never reaches the player (§7.1)', () => {
  it('keeps the resolved multiple out of offers, effects and the player view while a position is open', () => {
    const found = runUntilOffer('-truth')
    const opened = found.advance(
      found.state,
      { type: 'takeOpportunity', id: offerIdFor(LIFE_OPPORTUNITY.id), sizing: 'normal' },
      found.rng,
    )
    let current = opened.nextState
    const secret = current.positions.open[0]?.secret
    expect(secret).toBeDefined()

    const emitted = [...opened.effects]
    for (let turn = 0; turn < 2 && current.positions.open.length > 0; turn++) {
      const result = found.advance(current, { type: 'advanceTurn' }, found.rng)
      current = result.nextState
      emitted.push(...result.effects)
    }
    expect(current.positions.open).toHaveLength(1) // still open: nothing revealed yet

    const view = toPlayerView(current)
    const serialisedView = JSON.stringify(view)
    const serialisedEffects = JSON.stringify(emitted)
    const serialisedOffers = JSON.stringify(current.offers)

    // The resolved multiple is a full-precision float — if it leaked
    // anywhere, it would leak verbatim.
    const multiple = String(secret?.multiple)
    expect(serialisedView).not.toContain(multiple)
    expect(serialisedEffects).not.toContain(multiple)
    expect(serialisedOffers).not.toContain(multiple)
    expect(hasKeyDeep(view, 'secret')).toBe(false)
    expect(hasKeyDeep(view, 'ruined')).toBe(false)
    expect(hasKeyDeep(view, 'multiple')).toBe(false)
    expect(hasKeyDeep(view, 'ruinChance')).toBe(false)
    // Everything else about the position is still the player's to see.
    expect(view.positions.open[0]?.sizing).toBe('normal')
    expect(view.positions.open[0]?.drawdown).toBe(current.positions.open[0]?.drawdown)
  })

  it('cannot be read through the mod-facing facade either', () => {
    const { registry } = setup()
    const paths = registry.allFacadeFields().map((f) => f.path)
    expect(paths.some((p) => p.includes('truth') || p.includes('multiple') || p.includes('secret'))).toBe(false)
  })
})

describe('determinism', () => {
  it('reproduces the same life from the same seed and command sequence', () => {
    const run = (): GameState => {
      const found = runUntilOffer('-replay')
      let current = found.advance(
        found.state,
        { type: 'takeOpportunity', id: offerIdFor(LIFE_OPPORTUNITY.id), sizing: 'heavy' },
        found.rng,
      ).nextState
      for (let turn = 0; turn < 8; turn++) {
        current = found.advance(current, { type: 'advanceTurn' }, found.rng).nextState
      }
      return current
    }
    expect(run()).toEqual(run())
  })
})
