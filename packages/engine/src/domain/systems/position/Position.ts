import type { RngStream } from '../../rng/SeededRng.js'
import type { Sizing } from '../../expr/effects.js'
import type { Opportunity } from '../opportunity/Opportunity.js'

// §1.3: entry is a position size, not a yes/no. §1's formula
// (multiple × capital × how long you hold) is settled here.

/** Share of current capital committed, per §1.3's table. */
export const SIZING_FRACTION: Record<Sizing, number> = {
  light: 0.1,
  normal: 0.3,
  heavy: 0.8,
  leveraged: 1,
}

/**
 * Borrowed capital as a multiple of the stake. Only `leveraged` borrows —
 * and that is the one option whose losses spill into your life (§1.3).
 */
export const SIZING_LEVERAGE: Record<Sizing, number> = {
  light: 0,
  normal: 0,
  heavy: 0,
  leveraged: 1,
}

/** What a ruined position gives back — near-total loss, not exactly zero. */
export const RUIN_RECOVERY = 0.05

/** The era at entry tilts both the payoff and the odds of it being a trap. */
export const ERA_MULTIPLE_FACTOR: Record<string, number> = {
  recovery: 1,
  boom: 1.1,
  mania: 1.25,
  crash: 0.7,
  recession: 0.85,
}

export const ERA_RUIN_FACTOR: Record<string, number> = {
  recovery: 1,
  boom: 1,
  mania: 1.3,
  crash: 1.2,
  recession: 1.1,
}

/**
 * ⚠️ Engine-only. This is `truth` resolved into actual numbers (§7.1) and it
 * must never reach the presentation layer while the position is open — see
 * `toPlayerView()` and the test that walks a whole life asserting it.
 */
export interface PositionSecret {
  multiple: number
  years: number
  ruinChance: number
  ruined: boolean
}

export interface Position {
  id: string
  opportunityId: string
  /** Copied from the opportunity's data field — never inferred from the id. */
  tier: string
  sizing: Sizing
  /** Capital taken out of the player's pocket at entry. */
  stake: number
  /** Margin borrowed on top of the stake (leveraged only). */
  borrowed: number
  openedOnTurn: number
  settlesOnTurn: number
  /** Trial ids this position may throw at the player while it's open. */
  trials: string[]
  /** Worst paper drawdown seen so far, as a fraction — player-visible. */
  drawdown: number
  /** A trial waiting for a `resolveTrial` command. */
  pendingTrial?: { id: string; drawdown: number }
  /**
   * The trial this position threw last. Excluded from the next roll for the
   * same reason the event draw excludes `lastDrawn` — with the situation on
   * screen (§7.2), the same one twice running reads like a bug.
   */
  lastTrial?: string
  secret: PositionSecret
}

export interface ClosedPosition {
  id: string
  opportunityId: string
  sizing: Sizing
  stake: number
  borrowed: number
  openedOnTurn: number
  closedOnTurn: number
  /** What came back, after the borrowed part was repaid. */
  proceeds: number
  /** Debt left behind when proceeds could not cover the margin (§1.3). */
  shortfall: number
  ruined: boolean
  soldEarly: boolean
  worstDrawdown: number
}

export function clonePosition(position: Position): Position {
  const copy: Position = {
    ...position,
    trials: [...position.trials],
    secret: { ...position.secret },
  }
  if (position.pendingTrial) copy.pendingTrial = { ...position.pendingTrial }
  else delete copy.pendingTrial
  return copy
}

export function cloneClosedPosition(position: ClosedPosition): ClosedPosition {
  return { ...position }
}

/**
 * Rolls `truth` into the numbers this particular position will settle on.
 * Seed + era decide it, at entry — the player's later behaviour cannot move
 * the underlying reality, only how much of it they capture (§1.2).
 */
export function resolveTruth(opportunity: Opportunity, eraPhase: string, rng: RngStream): PositionSecret {
  const [minMultiple, maxMultiple] = opportunity.truth.multiple
  const [minYears, maxYears] = opportunity.truth.years
  const eraFactor = ERA_MULTIPLE_FACTOR[eraPhase] ?? 1
  const ruinFactor = ERA_RUIN_FACTOR[eraPhase] ?? 1

  const rolled = minMultiple + rng.next() * (maxMultiple - minMultiple)
  const ruinChance = Math.min(100, opportunity.truth.ruinChance * ruinFactor)
  const ruined = rng.chance(ruinChance / 100)

  return {
    multiple: rolled * eraFactor,
    years: rng.int(Math.round(minYears), Math.round(maxYears)),
    ruinChance,
    ruined,
  }
}
