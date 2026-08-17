import type { Command } from '../domain/turn/Command.js'
import type { ContentSource } from '../content/loader/ContentSource.js'
import type { ContentValidationIssue } from '../content/loader/loadContentPack.js'
import { createLife, type Life, type LifeOptions } from './createLife.js'
import { defaultPolicy, type Policy } from './policy.js'
import {
  COUNTER_OPPORTUNITIES_DECLINED,
  COUNTER_OPPORTUNITIES_SEEN,
  COUNTER_OPPORTUNITIES_TAKEN,
} from '../domain/systems/opportunity/OpportunitySystem.js'
import {
  COUNTER_POSITIONS_CLOSED,
  COUNTER_RUINED,
  COUNTER_WIPEOUTS,
} from '../domain/systems/position/PositionSystem.js'

// §3.1's final acceptance: a whole life, start to finish, in node — no DOM,
// no React, no presentation layer anywhere on the path. If this file ever
// needs a browser, the layering has already failed.

/** Guard against a policy that keeps proposing decisions that change nothing. */
const MAX_DECISIONS_PER_TURN = 32

export type Outcome = 'financially_free' | 'comfortable' | 'getting_by' | 'scraping_by' | 'in_debt'

/** Thresholds are in the same unit as income (万 per year). Tuned in S19. */
export const OUTCOME_THRESHOLDS: Readonly<Record<Exclude<Outcome, 'in_debt'>, number>> = {
  financially_free: 2000,
  comfortable: 800,
  getting_by: 200,
  scraping_by: 0,
}

export function outcomeFor(netWorth: number): Outcome {
  if (netWorth < 0) return 'in_debt'
  if (netWorth >= OUTCOME_THRESHOLDS.financially_free) return 'financially_free'
  if (netWorth >= OUTCOME_THRESHOLDS.comfortable) return 'comfortable'
  if (netWorth >= OUTCOME_THRESHOLDS.getting_by) return 'getting_by'
  return 'scraping_by'
}

export interface LifeSummary {
  seed: string
  fingerprint: number
  name: string
  finalYear: number
  finalAge: number
  capital: number
  debt: number
  netWorth: number
  income: number
  cognition: number
  network: number
  nerve: number
  careerId: string
  careerRank: number
  traits: string[]
  removedTraits: string[]
  opportunitiesSeen: number
  opportunitiesTaken: number
  opportunitiesDeclined: number
  positionsClosed: number
  positionsRuined: number
  leveragedWipeouts: number
  outcome: Outcome
  commandCount: number
}

export interface RunLifeResult {
  summary: LifeSummary
  /** Everything needed to replay this life: seed + fingerprint + this (§5.1). */
  commandLog: Command[]
  life: Life
}

export interface RunLifeOptions extends Omit<LifeOptions, 'sources'> {
  sources: readonly ContentSource[]
  policy?: Policy
}

export type RunLifeOutcome = { ok: true; result: RunLifeResult } | { ok: false; errors: ContentValidationIssue[] }

/**
 * The settlement summary. Exported because the app's settlement screen (S16)
 * must show the same numbers the balance runner reports — one definition.
 */
export function summariseLife(life: Life, seed: string): LifeSummary {
  const state = life.sim.getSnapshot().state
  const counter = (key: string): number => state.counters[key] ?? 0
  const netWorth = state.capitalState.capital - state.capitalState.debt

  return {
    seed,
    fingerprint: life.fingerprint,
    name: state.player.name,
    finalYear: state.year,
    finalAge: state.player.age,
    capital: state.capitalState.capital,
    debt: state.capitalState.debt,
    netWorth,
    income: state.capitalState.income,
    cognition: state.capitalState.cognition,
    network: state.capitalState.network,
    nerve: state.player.nerve,
    careerId: state.career.id,
    careerRank: state.career.rank,
    traits: [...state.traits.unlocked],
    removedTraits: [...state.traits.removed],
    opportunitiesSeen: counter(COUNTER_OPPORTUNITIES_SEEN),
    opportunitiesTaken: counter(COUNTER_OPPORTUNITIES_TAKEN),
    opportunitiesDeclined: counter(COUNTER_OPPORTUNITIES_DECLINED),
    positionsClosed: counter(COUNTER_POSITIONS_CLOSED),
    positionsRuined: counter(COUNTER_RUINED),
    leveragedWipeouts: counter(COUNTER_WIPEOUTS),
    outcome: outcomeFor(netWorth),
    commandCount: life.sim.getCommandLog().length,
  }
}

/**
 * Plays one complete life under a policy and returns its command log plus a
 * settlement summary. `seed + fingerprint + commandLog` is the whole record
 * — replaying it reproduces this life exactly (§5.1, §5.4).
 */
export async function runLife(options: RunLifeOptions): Promise<RunLifeOutcome> {
  const created = await createLife(options)
  if (!created.ok) return { ok: false, errors: created.errors }

  const life = created.life
  const policy = options.policy ?? defaultPolicy()

  for (let turn = 0; turn < life.totalTurns; turn++) {
    for (let step = 0; step < MAX_DECISIONS_PER_TURN; step++) {
      const command = policy({ view: life.sim.getPlayerView(), turn })
      if (!command || command.type === 'advanceTurn') break
      life.sim.dispatch(command)
    }
    life.sim.dispatch({ type: 'advanceTurn' })
  }

  return {
    ok: true,
    result: {
      summary: summariseLife(life, String(options.seed)),
      commandLog: [...life.sim.getCommandLog()],
      life,
    },
  }
}

/**
 * Replays a recorded command log against a fresh sim. Same seed + same
 * fingerprint + same log must land on the same summary — that is the whole
 * promise save files and share codes are built on (§5.1).
 */
export async function replayLife(
  options: Omit<RunLifeOptions, 'policy'>,
  commandLog: readonly Command[],
): Promise<RunLifeOutcome> {
  const created = await createLife(options)
  if (!created.ok) return { ok: false, errors: created.errors }

  const life = created.life
  for (const command of commandLog) life.sim.dispatch(command)

  return {
    ok: true,
    result: { summary: summariseLife(life, String(options.seed)), commandLog: [...commandLog], life },
  }
}
