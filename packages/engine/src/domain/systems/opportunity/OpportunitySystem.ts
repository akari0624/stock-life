import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import type { Command } from '../../turn/Command.js'
import type { FacadeField } from '../../facade/FacadeField.js'
import type { Offer } from '../../state/Offer.js'
import { addStat } from '../../state/stats.js'
import { isSatisfied } from '../../expr/evaluate.js'
import {
  indexOpportunities,
  resolveSignal,
  signalTierForState,
  type Opportunity,
  type OpportunityIndex,
} from './Opportunity.js'

// §2: the player never picks a target — the system proposes. Whether an
// opportunity reaches you at all is what `network` buys (§1.1); what you see
// when it does is what `cognition` buys (§1.2).

export const OPPORTUNITY_SYSTEM_ID = 'opportunity'
export const OPPORTUNITY_SYSTEM_ORDER = 70

/**
 * Baseline odds one source passes something along in a given year.
 *
 * Tuned in S19 against the balance runner: with the full `core-tw` content
 * set these numbers put a handful of proposals in a lifetime, which is what
 * §1 means by "你會遇到幾次真正的機會". They were several times higher while
 * the pack had a single opportunity in it — an arrival rate only means
 * something read against how much content can match it.
 */
export const BASE_SOURCE_CHANCE = 0.004
export const NETWORK_PER_SOURCE = 0.0011
export const MAX_SOURCE_CHANCE = 0.08
/** A life's worth of decisions is meant to be few (§1) — one proposal a year. */
export const MAX_OFFERS_PER_TURN = 1

export const COUNTER_OPPORTUNITIES_SEEN = 'opportunities_seen'
export const COUNTER_OPPORTUNITIES_TAKEN = 'opportunities_taken'
export const COUNTER_OPPORTUNITIES_DECLINED = 'opportunities_declined'

export const flagDeclined = (opportunityId: string): string => `declined_${opportunityId}`
export const flagTaken = (opportunityId: string): string => `took_${opportunityId}`

export interface OpportunitySystemOptions {
  opportunities: readonly Opportunity[]
  /** Called when the player accepts — PositionSystem owns what happens next. */
  onAccept(ctx: SystemCtx, opportunity: Opportunity, sizing: string): void
}

export const offerIdFor = (opportunityId: string): string => `opportunity:${opportunityId}`

/** Odds that a single source passes this along, given the player's network. */
export function sourceChance(network: number): number {
  return Math.min(MAX_SOURCE_CHANCE, BASE_SOURCE_CHANCE + network * NETWORK_PER_SOURCE)
}

function windowMatches(opportunity: Opportunity, phase: string, themes: readonly string[]): boolean {
  const { eraPhase, themes: wanted } = opportunity.window
  if (eraPhase.length > 0 && !eraPhase.includes(phase)) return false
  if (wanted.length > 0 && !wanted.some((t) => themes.includes(t))) return false
  return true
}

const OPPORTUNITY_FACADE_FIELDS: readonly FacadeField[] = [
  { path: `counter.${COUNTER_OPPORTUNITIES_SEEN}`, label: 'Opportunities proposed', type: 'number' },
  { path: `counter.${COUNTER_OPPORTUNITIES_TAKEN}`, label: 'Opportunities taken', type: 'number' },
  { path: `counter.${COUNTER_OPPORTUNITIES_DECLINED}`, label: 'Opportunities declined', type: 'number' },
]

export function createOpportunitySystem(options: OpportunitySystemOptions): GameSystem {
  const index: OpportunityIndex = indexOpportunities(options.opportunities)

  const clearOffers = (ctx: SystemCtx): void => {
    ctx.state.offers = ctx.state.offers.filter((o) => o.source !== 'opportunity')
  }

  return {
    id: OPPORTUNITY_SYSTEM_ID,
    order: OPPORTUNITY_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase !== 'pre') return
      const { state } = ctx
      clearOffers(ctx)

      const perSource = sourceChance(state.capitalState.network)
      const tier = signalTierForState(state)
      let raised = 0

      for (const opportunity of index.values()) {
        if (raised >= MAX_OFFERS_PER_TURN) break
        // A chance not taken is gone for good — irreversibility is the point (§4.1).
        if (state.flags[flagDeclined(opportunity.id)] || state.flags[flagTaken(opportunity.id)]) continue
        if (!windowMatches(opportunity, state.era.phase, state.era.themes)) continue
        if (!isSatisfied(opportunity.require, { state, rng: ctx.rng })) continue

        // Each listed source rolls independently: more ways in, better odds.
        const reached = opportunity.sourcedBy.some(() => ctx.rng.chance(perSource))
        if (!reached) continue

        const resolved = resolveSignal(opportunity.signal, tier)
        if (!resolved) continue

        const detail: NonNullable<Offer['detail']> = { reveal: [...resolved.level.reveal] }
        // Only content-authored facts are ever revealed. Valuation/risk have
        // no structured fields — they live inside the signal text the author
        // wrote for that tier, which is exactly how `truth` stays hidden.
        if (resolved.level.reveal.includes('theme')) detail.themes = [...opportunity.window.themes]

        state.offers.push({
          id: offerIdFor(opportunity.id),
          source: 'opportunity',
          ref: opportunity.id,
          label: resolved.level.text,
          sizing: [...opportunity.sizing],
          detail,
        })

        addStat(state, COUNTER_OPPORTUNITIES_SEEN, 1)
        ctx.emit({ type: 'stat.add', key: COUNTER_OPPORTUNITIES_SEEN, value: 1 })
        if (opportunity.scene.bg) ctx.emit({ type: 'scene.bg', id: opportunity.scene.bg })
        if (opportunity.scene.actor) ctx.emit({ type: 'scene.actor', id: opportunity.scene.actor })
        if (opportunity.scene.sfx) ctx.emit({ type: 'scene.sfx', id: opportunity.scene.sfx })
        raised += 1
      }
    },

    onCommand(command: Command, ctx: SystemCtx): void {
      if (command.type !== 'takeOpportunity' && command.type !== 'declineOpportunity') return

      const offer = ctx.state.offers.find((o) => o.id === command.id && o.source === 'opportunity')
      if (!offer) return
      const opportunity = index.get(offer.ref)
      if (!opportunity) return

      ctx.state.offers = ctx.state.offers.filter((o) => o.id !== offer.id)

      if (command.type === 'declineOpportunity') {
        ctx.state.flags[flagDeclined(opportunity.id)] = true
        addStat(ctx.state, COUNTER_OPPORTUNITIES_DECLINED, 1)
        ctx.emit({ type: 'flag.set', key: flagDeclined(opportunity.id) })
        ctx.emit({ type: 'stat.add', key: COUNTER_OPPORTUNITIES_DECLINED, value: 1 })
        return
      }

      // Sizes the content didn't offer are not on the menu (§1.3).
      if (!opportunity.sizing.includes(command.sizing)) return

      ctx.state.flags[flagTaken(opportunity.id)] = true
      addStat(ctx.state, COUNTER_OPPORTUNITIES_TAKEN, 1)
      ctx.emit({ type: 'flag.set', key: flagTaken(opportunity.id) })
      ctx.emit({ type: 'stat.add', key: COUNTER_OPPORTUNITIES_TAKEN, value: 1 })
      options.onAccept(ctx, opportunity, command.sizing)
    },

    facadeFields(): FacadeField[] {
      return [...OPPORTUNITY_FACADE_FIELDS]
    },
  }
}
