// Batch balance run (TODO.md #8). Node only — importing anything from a
// browser here would break §3.1's whole point.
//
//   pnpm --filter engine run balance -- --runs 10000
//   pnpm --filter engine run balance -- --runs 2000 --risk bold --sizing leveraged

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
if (arg('sell') !== undefined) policy.holdsThroughTrials = false

const started = Date.now()
const report = await runBalance({ runs, seedPrefix: arg('seed') ?? 'balance', policy })
const elapsed = ((Date.now() - started) / 1000).toFixed(1)

console.log(formatBalanceReport(report))
console.log(`\n(${runs} lives in ${elapsed}s)`)
