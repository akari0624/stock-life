import { describe, it, expect } from 'vitest'
import { exprSchema } from '../expr.js'

describe('exprSchema', () => {
  it('accepts the §6.2 example condition tree', () => {
    const tree = {
      all: [
        { '>=': ['age', 30] },
        { '>=': ['capital', 5_000_000] },
        { '==': ['career.industry', 'tech'] },
        { not: { flag: 'burned_by_2000_bubble' } },
      ],
    }
    expect(exprSchema.safeParse(tree).success).toBe(true)
  })

  it('accepts every fixed operator', () => {
    const trees = [
      { all: [] },
      { any: [] },
      { not: { flag: 'x' } },
      { '==': ['age', 1] },
      { '!=': ['age', 1] },
      { '>': ['age', 1] },
      { '>=': ['age', 1] },
      { '<': ['age', 1] },
      { '<=': ['age', 1] },
      { in: ['career.industry', ['tech', 'finance']] },
      { flag: 'x' },
      { chance: 0.5 },
    ]
    for (const t of trees) {
      expect(exprSchema.safeParse(t).success).toBe(true)
    }
  })

  it('accepts dynamic flag.* / counter.* facade paths as comparison targets', () => {
    expect(exprSchema.safeParse({ '>=': ['counter.held_through_drawdown', 3] }).success).toBe(true)
    expect(exprSchema.safeParse({ '==': ['flag.diamond_hands', true] }).success).toBe(true)
  })

  it('rejects a left-hand side that is not a ModStateView facade path', () => {
    const result = exprSchema.safeParse({ '>=': ['state.love.caught', 0] })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown operator', () => {
    const result = exprSchema.safeParse({ startsWith: ['career.id', 'x'] })
    expect(result.success).toBe(false)
  })

  it('rejects chance outside [0, 1]', () => {
    expect(exprSchema.safeParse({ chance: 1.5 }).success).toBe(false)
    expect(exprSchema.safeParse({ chance: -0.1 }).success).toBe(false)
  })

  it('supports arbitrarily nested all/any/not', () => {
    const tree = { all: [{ any: [{ not: { all: [{ chance: 0.2 }] } }] }] }
    expect(exprSchema.safeParse(tree).success).toBe(true)
  })
})
