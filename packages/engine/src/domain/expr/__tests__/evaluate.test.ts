import { describe, it, expect } from 'vitest'
import { evaluate, DEFAULT_EXPR_STEP_LIMIT, type Expr, type EvalContext } from '../evaluate.js'
import { createInitialGameState } from '../../state/createGameState.js'
import { Calendar } from '../../Calendar.js'
import { SeededRng } from '../../rng/SeededRng.js'

function buildCtx(overrides: Partial<EvalContext['state']> = {}, seed = 'expr-test'): EvalContext {
  const calendar = new Calendar({ granularity: 'year', startYear: 2000, startAge: 30 })
  const state = { ...createInitialGameState({ name: 'P', calendar }), ...overrides }
  state.capitalState.capital = 5_500_000
  state.career.industry = 'tech'
  state.flags['burned_by_2000_bubble'] = false
  return { state, rng: new SeededRng(seed).stream('expr') }
}

function ok(result: ReturnType<typeof evaluate>): boolean {
  if (!result.ok) throw new Error(`expected ok result, got error: ${JSON.stringify(result)}`)
  return result.value
}

describe('evaluate', () => {
  it('evaluates the §6.2 example condition tree', () => {
    const ctx = buildCtx()
    const expr: Expr = {
      all: [
        { '>=': ['age', 30] },
        { '>=': ['capital', 5_000_000] },
        { '==': ['career.industry', 'tech'] },
        { not: { flag: 'burned_by_2000_bubble' } },
      ],
    }
    expect(ok(evaluate(expr, ctx))).toBe(true)
  })

  it('all() is false if any child is false', () => {
    const ctx = buildCtx()
    const expr: Expr = { all: [{ '>=': ['age', 30] }, { '>=': ['capital', 999_000_000] }] }
    expect(ok(evaluate(expr, ctx))).toBe(false)
  })

  it('any() is true if at least one child is true', () => {
    const ctx = buildCtx()
    const expr: Expr = { any: [{ '<': ['age', 10] }, { '>=': ['capital', 1] }] }
    expect(ok(evaluate(expr, ctx))).toBe(true)
  })

  it('not() negates', () => {
    const ctx = buildCtx()
    expect(ok(evaluate({ not: { '>=': ['age', 999] } }, ctx))).toBe(true)
    expect(ok(evaluate({ not: { '>=': ['age', 0] } }, ctx))).toBe(false)
  })

  it('supports nested all/any/not combinations', () => {
    const ctx = buildCtx()
    const expr: Expr = {
      all: [
        { any: [{ '==': ['career.industry', 'finance'] }, { '==': ['career.industry', 'tech'] }] },
        { not: { any: [{ '<': ['capital', 0] }, { flag: 'burned_by_2000_bubble' }] } },
      ],
    }
    expect(ok(evaluate(expr, ctx))).toBe(true)
  })

  it('supports ==, !=, >, >=, <, <=', () => {
    const ctx = buildCtx()
    expect(ok(evaluate({ '==': ['age', 30] }, ctx))).toBe(true)
    expect(ok(evaluate({ '!=': ['age', 30] }, ctx))).toBe(false)
    expect(ok(evaluate({ '>': ['age', 29] }, ctx))).toBe(true)
    expect(ok(evaluate({ '>=': ['age', 30] }, ctx))).toBe(true)
    expect(ok(evaluate({ '<': ['age', 31] }, ctx))).toBe(true)
    expect(ok(evaluate({ '<=': ['age', 30] }, ctx))).toBe(true)
  })

  it('supports in', () => {
    const ctx = buildCtx()
    expect(ok(evaluate({ in: ['career.industry', ['finance', 'tech']] }, ctx))).toBe(true)
    expect(ok(evaluate({ in: ['career.industry', ['finance', 'medicine']] }, ctx))).toBe(false)
  })

  it('flag reads flag.<name> off state', () => {
    const ctx = buildCtx()
    ctx.state.flags['diamond_hands'] = true
    expect(ok(evaluate({ flag: 'diamond_hands' }, ctx))).toBe(true)
    expect(ok(evaluate({ flag: 'never_set' }, ctx))).toBe(false)
  })

  describe('chance', () => {
    it('draws from the injected rng stream, not from Math.random', () => {
      const stateA = buildCtx().state
      const stateB = buildCtx().state
      const rngA = new SeededRng('chance-seed').stream('expr')
      const rngB = new SeededRng('chance-seed').stream('expr')

      const resultsA = Array.from({ length: 30 }, () =>
        ok(evaluate({ chance: 0.5 }, { state: stateA, rng: rngA })),
      )
      const resultsB = Array.from({ length: 30 }, () =>
        ok(evaluate({ chance: 0.5 }, { state: stateB, rng: rngB })),
      )
      expect(resultsA).toEqual(resultsB)
    })

    it('chance(1) is always true, chance(0) is always false', () => {
      const ctx = buildCtx()
      for (let i = 0; i < 20; i++) expect(ok(evaluate({ chance: 1 }, ctx))).toBe(true)
      for (let i = 0; i < 20; i++) expect(ok(evaluate({ chance: 0 }, ctx))).toBe(false)
    })
  })

  describe('step limit', () => {
    it('returns a clear error instead of throwing or hanging when the tree is too large', () => {
      const ctx = buildCtx()
      const hugeAll: Expr = { all: Array.from({ length: 50 }, () => ({ '>=': ['age', 0] }) as Expr) }
      const result = evaluate(hugeAll, { ...ctx, stepLimit: 10 })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('step_limit_exceeded')
        expect(result.error.limit).toBe(10)
        expect(typeof result.error.message).toBe('string')
      }
    })

    it('does not throw even for a step-limit violation', () => {
      const ctx = buildCtx()
      const hugeAll: Expr = { all: Array.from({ length: 50 }, () => ({ '>=': ['age', 0] }) as Expr) }
      expect(() => evaluate(hugeAll, { ...ctx, stepLimit: 5 })).not.toThrow()
    })

    it('a reasonably sized tree fits comfortably under the default limit', () => {
      const ctx = buildCtx()
      const tree: Expr = { all: Array.from({ length: 20 }, () => ({ '>=': ['age', 0] }) as Expr) }
      const result = evaluate(tree, ctx)
      expect(result).toEqual({ ok: true, value: true })
      expect(DEFAULT_EXPR_STEP_LIMIT).toBeGreaterThan(20)
    })
  })
})
