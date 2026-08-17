import type { Expr } from '../../expr/evaluate.js'
import type { SceneRef, Sizing } from '../../expr/effects.js'
import type { GameState } from '../../state/GameState.js'

// §7.1: the core object of the game. Two halves that must never touch:
// `truth` (what the thing actually is — seed + era decide it, the player
// never sees it) and `signal` (what this particular player is able to
// perceive — a function of cognition and network, §1.2).

export interface OpportunityTruth {
  /** [min, max] return multiple; the actual figure is rolled per position. */
  multiple: [number, number]
  /** [min, max] years to play out. */
  years: [number, number]
  /** Percent chance the whole thing is a trap. */
  ruinChance: number
}

export type SignalReveal = 'theme' | 'valuation' | 'risk'

export interface SignalLevel {
  text: string
  reveal: SignalReveal[]
}

/** All three optional — §2: "三版選填，只填一版時其他層級 fallback". */
export interface OpportunitySignal {
  low?: SignalLevel
  mid?: SignalLevel
  high?: SignalLevel
}

export interface Opportunity {
  id: string
  /**
   * §7.1: a data field, never a hardcoded branch. `life` runs yearly trials,
   * anything else settles once — and a mod can mark its own opportunity
   * `life` without the engine knowing that opportunity exists.
   */
  tier: string
  window: { eraPhase: string[]; themes: string[] }
  require: Expr
  sourcedBy: string[]
  truth: OpportunityTruth
  signal: OpportunitySignal
  sizing: Sizing[]
  trials: string[]
  scene: SceneRef
}

/** The tier whose positions go through yearly trials (§7.1, §1.3). */
export const LIFE_TIER = 'life'

export type SignalTier = 'low' | 'mid' | 'high'

const TIER_ORDER: readonly SignalTier[] = ['low', 'mid', 'high']

export const SIGNAL_MID_COGNITION = 20
export const SIGNAL_HIGH_COGNITION = 40
/** Enough contacts and someone explains it to you properly, whatever you know. */
export const SIGNAL_NETWORK_BUMP = 30

/**
 * §1.2: the real multiple is fixed; signal quality is a function of ability.
 * Cognition sets the tier, a deep network bumps it one step.
 */
export function signalTierFor(cognition: number, network: number): SignalTier {
  let index = cognition >= SIGNAL_HIGH_COGNITION ? 2 : cognition >= SIGNAL_MID_COGNITION ? 1 : 0
  if (network >= SIGNAL_NETWORK_BUMP) index = Math.min(TIER_ORDER.length - 1, index + 1)
  return TIER_ORDER[index] as SignalTier
}

export function signalTierForState(state: GameState): SignalTier {
  return signalTierFor(state.capitalState.cognition, state.capitalState.network)
}

/**
 * Picks the description this player gets. Falls back down first (a player
 * who earned `high` but only `low` was written still gets something), then
 * up — content that fills a single tier serves every ability level.
 */
export function resolveSignal(
  signal: OpportunitySignal,
  tier: SignalTier,
): { tier: SignalTier; level: SignalLevel } | undefined {
  const index = TIER_ORDER.indexOf(tier)
  for (let i = index; i >= 0; i--) {
    const candidate = TIER_ORDER[i] as SignalTier
    const level = signal[candidate]
    if (level) return { tier: candidate, level }
  }
  for (let i = index + 1; i < TIER_ORDER.length; i++) {
    const candidate = TIER_ORDER[i] as SignalTier
    const level = signal[candidate]
    if (level) return { tier: candidate, level }
  }
  return undefined
}

/** Fast lookup by id, shared by the systems that need to resolve an offer. */
export type OpportunityIndex = ReadonlyMap<string, Opportunity>

export function indexOpportunities(opportunities: readonly Opportunity[]): OpportunityIndex {
  return new Map(opportunities.map((o) => [o.id, o]))
}
