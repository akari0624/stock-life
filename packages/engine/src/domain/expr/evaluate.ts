import type { GameState } from '../state/GameState.js'
import type { FacadePath } from '../facade/ModStateView.js'
import { readFacade } from '../facade/ModStateView.js'
import type { RngStream } from '../rng/SeededRng.js'

// §6.2: the condition tree. Operator set is fixed — content never gets to
// invent new comparators. Left-hand sides are always ModStateView paths, so
// validity is checked against the same whitelist that governs facade reads.

export type ComparableValue = string | number | boolean

export type Expr =
  | { all: Expr[] }
  | { any: Expr[] }
  | { not: Expr }
  | { '==': [FacadePath, ComparableValue] }
  | { '!=': [FacadePath, ComparableValue] }
  | { '>': [FacadePath, number] }
  | { '>=': [FacadePath, number] }
  | { '<': [FacadePath, number] }
  | { '<=': [FacadePath, number] }
  | { in: [FacadePath, ComparableValue[]] }
  | { flag: string }
  | { chance: number }

export interface EvalContext {
  state: GameState
  rng: RngStream
  /** Node-visit ceiling, guarding against pathological/malicious content (TODO.md #2). */
  stepLimit?: number
}

export const DEFAULT_EXPR_STEP_LIMIT = 10_000

export interface EvaluateStepLimitError {
  type: 'step_limit_exceeded'
  message: string
  limit: number
}

export type EvaluateResult = { ok: true; value: boolean } | { ok: false; error: EvaluateStepLimitError }

class StepLimitExceeded extends Error {
  readonly limit: number

  constructor(limit: number) {
    super(`Expr evaluation exceeded the step limit (${limit} nodes visited)`)
    this.limit = limit
  }
}

/**
 * Evaluates a condition tree against state. Never throws for content-caused
 * problems (e.g. runaway recursion hitting the step limit) — those come
 * back as `{ ok: false, error }` so a malicious/broken content pack can't
 * take the whole turn down with it.
 */
export function evaluate(expr: Expr, ctx: EvalContext): EvaluateResult {
  const limit = ctx.stepLimit ?? DEFAULT_EXPR_STEP_LIMIT
  let steps = 0

  const step = (): void => {
    steps += 1
    if (steps > limit) throw new StepLimitExceeded(limit)
  }

  const run = (node: Expr): boolean => {
    step()

    if ('all' in node) return node.all.every(run)
    if ('any' in node) return node.any.some(run)
    if ('not' in node) return !run(node.not)

    if ('==' in node) return readFacade(ctx.state, node['=='][0]) === node['=='][1]
    if ('!=' in node) return readFacade(ctx.state, node['!='][0]) !== node['!='][1]
    if ('>' in node) return Number(readFacade(ctx.state, node['>'][0])) > node['>'][1]
    if ('>=' in node) return Number(readFacade(ctx.state, node['>='][0])) >= node['>='][1]
    if ('<' in node) return Number(readFacade(ctx.state, node['<'][0])) < node['<'][1]
    if ('<=' in node) return Number(readFacade(ctx.state, node['<='][0])) <= node['<='][1]

    if ('in' in node) {
      const [path, options] = node.in
      return options.includes(readFacade(ctx.state, path) as ComparableValue)
    }

    if ('flag' in node) return readFacade(ctx.state, `flag.${node.flag}`) === true
    if ('chance' in node) return ctx.rng.chance(node.chance)

    throw new Error(`Unknown expr node: ${JSON.stringify(node)}`)
  }

  try {
    return { ok: true, value: run(expr) }
  } catch (err) {
    if (err instanceof StepLimitExceeded) {
      return {
        ok: false,
        error: { type: 'step_limit_exceeded', message: err.message, limit: err.limit },
      }
    }
    throw err
  }
}

/**
 * The gate systems actually use: "does this content's `require` pass right
 * now?". A tree that blows the step limit is treated as unsatisfied — a
 * broken condition must never hand out an offer or fire an event, and it
 * must never take the turn down (TODO.md #2).
 */
export function isSatisfied(expr: Expr, ctx: EvalContext): boolean {
  const result = evaluate(expr, ctx)
  return result.ok && result.value
}
