import type { Command } from '../domain/turn/Command.js'
import type { PlayerView } from '../domain/state/playerView.js'
import type { Sizing } from '../domain/expr/effects.js'
import type { EventChoiceId } from '../domain/systems/event/EventDef.js'
import { DICE_CHANNELS, type DiceChannel } from '../domain/systems/economy/DiceSystem.js'
import { nextDecision } from './decisions.js'

// A policy stands in for the player: given what a player could see, it
// returns the next decision, or undefined to end the turn. It only ever gets
// a PlayerView, so a policy — like a player — cannot peek at `truth`.

export interface PolicyContext {
  view: PlayerView
  turn: number
}

export type Policy = (ctx: PolicyContext) => Command | undefined

export interface DefaultPolicyOptions {
  /** Which of the three risk tiers this player reaches for (§7.2). */
  risk?: EventChoiceId
  /** Position size taken when an opportunity is accepted (§1.3). */
  sizing?: Sizing
  /** Accept opportunities at all? */
  takesOpportunities?: boolean
  /** Accept career moves when offered? */
  takesCareerMoves?: boolean
  /** Hold through position trials, or sell into them? */
  holdsThroughTrials?: boolean
  /** Relative split of dice pips across channels. */
  diceWeights?: Partial<Record<DiceChannel, number>>
}

const EVEN_SPLIT: Record<DiceChannel, number> = { study: 1, social: 1, work: 1, rest: 1 }

/** Splits `pool` pips across channels by weight, never losing a pip to rounding. */
export function splitDice(pool: number, weights: Record<DiceChannel, number>): Record<string, number> {
  const total = DICE_CHANNELS.reduce((sum, channel) => sum + Math.max(0, weights[channel]), 0)
  const assignment: Record<string, number> = {}
  if (pool <= 0) return assignment

  let assigned = 0
  let best: DiceChannel = DICE_CHANNELS[0]
  for (const channel of DICE_CHANNELS) {
    const weight = Math.max(0, weights[channel])
    const share = total > 0 ? Math.floor((pool * weight) / total) : 0
    assignment[channel] = share
    assigned += share
    if (weight > Math.max(0, weights[best])) best = channel
  }
  // Whatever rounding left over goes to the favoured channel, so a policy
  // can never stall by proposing an all-zero allocation.
  assignment[best] = (assignment[best] ?? 0) + (pool - assigned)
  return assignment
}

/**
 * A plain, configurable stand-in player. Balance runs vary its options to
 * see how different play styles fare (§5.4, TODO.md #8).
 */
export function defaultPolicy(options: DefaultPolicyOptions = {}): Policy {
  const risk = options.risk ?? 'normal'
  const sizing = options.sizing ?? 'normal'
  const takesOpportunities = options.takesOpportunities ?? true
  const takesCareerMoves = options.takesCareerMoves ?? true
  const holds = options.holdsThroughTrials ?? true
  const weights = { ...EVEN_SPLIT, ...options.diceWeights }

  return ({ view }: PolicyContext): Command | undefined => {
    // Same derivation the UI uses (S16) — see decisions.ts for why that matters.
    const decision = nextDecision(view)
    if (!decision) return undefined

    switch (decision.kind) {
      case 'event':
        return { type: 'resolveEvent', choice: risk }
      case 'trial':
        return { type: 'resolveTrial', positionId: decision.positionId, choice: holds ? 'hold' : 'sell' }
      case 'dice':
        return { type: 'allocateDice', assignment: splitDice(decision.pool, weights) }
      case 'offer': {
        const offer = decision.offer
        const wanted = offer.source === 'career' ? takesCareerMoves : takesOpportunities
        if (!wanted) return { type: 'declineOpportunity', id: offer.id }
        const size = offer.sizing.includes(sizing) ? sizing : (offer.sizing[0] as Sizing)
        return { type: 'takeOpportunity', id: offer.id, sizing: size }
      }
    }
  }
}
