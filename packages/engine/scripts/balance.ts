// Batch balance run (TODO.md #8). Node only — importing anything from a
// browser here would break §3.1's whole point.
//
//   pnpm --filter engine run balance -- --runs 10000
//   pnpm --filter engine run balance -- --runs 2000 --risk bold --sizing leveraged
//   pnpm --filter engine run balance -- --runs 1000 --world tw-history --year 1990

import { runBalance, formatBalanceReport } from '../src/sim/balance.js'
import type { DefaultPolicyOptions } from '../src/sim/policy.js'
import type { EventChoiceId } from '../src/domain/systems/event/EventDef.js'
import type { Sizing } from '../src/domain/expr/effects.js'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const runs = Number.parseInt(arg('runs') ?? '1000', 10)
const policy: DefaultPolicyOptions = {}
const risk = arg('risk')
if (risk) policy.risk = risk as EventChoiceId
const sizing = arg('sizing')
if (sizing) policy.sizing = sizing as Sizing
if (process.argv.includes('--sell')) policy.holdsThroughTrials = false
// 一個「什麼機會都不接」的玩家：用來檢查放掉機會那一線的內容真的長得出來
if (process.argv.includes('--decline')) policy.takesOpportunities = false

const started = Date.now()
const world = arg('world')
const startYear = arg('year')
const report = await runBalance({
  runs,
  seedPrefix: arg('seed') ?? 'balance',
  policy,
  ...(world ? { worldGeneratorId: world } : {}),
  ...(startYear ? { startYear: Number.parseInt(startYear, 10) } : {}),
})
const elapsed = ((Date.now() - started) / 1000).toFixed(1)

console.log(formatBalanceReport(report))
console.log(`\n(${runs} lives in ${elapsed}s)`)
