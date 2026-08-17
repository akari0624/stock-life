import { createCoreTwSource } from '../content/packs/core-tw/index.js'
import type { ContentSource } from '../content/loader/ContentSource.js'
import { runLife, type LifeSummary, type Outcome } from './headless.js'
import { defaultPolicy, type DefaultPolicyOptions } from './policy.js'

// TODO.md #8: the only way numbers stop being a feeling. Run N lives, look at
// the distribution, then change weights — not the other way round.

export interface BalanceOptions {
  runs: number
  seedPrefix?: string
  sources?: () => ContentSource[]
  policy?: DefaultPolicyOptions
}

export interface BalanceReport {
  runs: number
  netWorth: { min: number; p25: number; median: number; p75: number; max: number; mean: number }
  outcomes: Record<Outcome, number>
  /** Trait id → share of lives that unlocked it. */
  traitUnlockRate: Record<string, number>
  /** Of the opportunities that were proposed, the share accepted. */
  opportunityAcceptRate: number
  averageOpportunitiesSeen: number
  ruinRate: number
  wipeoutRate: number
  averageCommands: number
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * fraction)))
  return sorted[index] as number
}

export function summariseRuns(summaries: readonly LifeSummary[]): BalanceReport {
  const netWorths = summaries.map((s) => s.netWorth).sort((a, b) => a - b)
  const outcomes: Record<Outcome, number> = {
    financially_free: 0,
    comfortable: 0,
    getting_by: 0,
    scraping_by: 0,
    in_debt: 0,
  }
  const traitCounts = new Map<string, number>()
  let seen = 0
  let taken = 0
  let ruined = 0
  let wipeouts = 0
  let commands = 0

  for (const summary of summaries) {
    outcomes[summary.outcome] += 1
    for (const trait of summary.traits) traitCounts.set(trait, (traitCounts.get(trait) ?? 0) + 1)
    seen += summary.opportunitiesSeen
    taken += summary.opportunitiesTaken
    if (summary.positionsRuined > 0) ruined += 1
    if (summary.leveragedWipeouts > 0) wipeouts += 1
    commands += summary.commandCount
  }

  const runs = summaries.length || 1
  return {
    runs: summaries.length,
    netWorth: {
      min: percentile(netWorths, 0),
      p25: percentile(netWorths, 0.25),
      median: percentile(netWorths, 0.5),
      p75: percentile(netWorths, 0.75),
      max: percentile(netWorths, 1),
      mean: netWorths.reduce((sum, v) => sum + v, 0) / runs,
    },
    outcomes: Object.fromEntries(
      Object.entries(outcomes).map(([key, count]) => [key, count / runs]),
    ) as Record<Outcome, number>,
    traitUnlockRate: Object.fromEntries(
      [...traitCounts].sort().map(([id, count]) => [id, count / runs]),
    ),
    opportunityAcceptRate: seen > 0 ? taken / seen : 0,
    averageOpportunitiesSeen: seen / runs,
    ruinRate: ruined / runs,
    wipeoutRate: wipeouts / runs,
    averageCommands: commands / runs,
  }
}

/** Runs N lives and aggregates them. Pure node — no DOM anywhere on this path. */
export async function runBalance(options: BalanceOptions): Promise<BalanceReport> {
  const sources = options.sources ?? (() => [createCoreTwSource()])
  const prefix = options.seedPrefix ?? 'balance'
  const summaries: LifeSummary[] = []

  for (let i = 0; i < options.runs; i++) {
    const outcome = await runLife({
      seed: `${prefix}-${i}`,
      sources: sources(),
      policy: defaultPolicy(options.policy),
    })
    if (!outcome.ok) throw new Error(`balance run ${i} failed to load content: ${outcome.errors[0]?.message}`)
    summaries.push(outcome.result.summary)
  }

  return summariseRuns(summaries)
}

export function formatBalanceReport(report: BalanceReport): string {
  const pct = (value: number): string => `${(value * 100).toFixed(1)}%`
  const num = (value: number): string => value.toFixed(0)

  const lines = [
    `runs: ${report.runs}`,
    '',
    'net worth (万)',
    `  min ${num(report.netWorth.min)} | p25 ${num(report.netWorth.p25)} | median ${num(report.netWorth.median)} | p75 ${num(report.netWorth.p75)} | max ${num(report.netWorth.max)} | mean ${num(report.netWorth.mean)}`,
    '',
    'outcomes',
    ...Object.entries(report.outcomes).map(([key, share]) => `  ${key.padEnd(18)} ${pct(share)}`),
    '',
    'traits unlocked',
    ...(Object.keys(report.traitUnlockRate).length === 0
      ? ['  (none)']
      : Object.entries(report.traitUnlockRate).map(([id, share]) => `  ${id.padEnd(18)} ${pct(share)}`)),
    '',
    'opportunities',
    `  proposed per life   ${report.averageOpportunitiesSeen.toFixed(2)}`,
    `  accepted            ${pct(report.opportunityAcceptRate)}`,
    `  lives hitting a trap ${pct(report.ruinRate)}`,
    `  leveraged wipeouts  ${pct(report.wipeoutRate)}`,
    '',
    `commands per life: ${report.averageCommands.toFixed(1)}`,
  ]
  return lines.join('\n')
}
