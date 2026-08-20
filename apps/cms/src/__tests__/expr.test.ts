import { describe, it, expect } from 'vitest'
import type { Expr } from '@stock-life/engine'
import { fromTree, toTree } from '../editor/expr.ts'
import { ALWAYS } from '../editor/draft.ts'

describe('條件樹 ↔ 表單狀態', () => {
  const roundTrip = (expr: Expr): Expr => fromTree(toTree(expr))

  it('表單建得出來的條件雙向轉換不變形', () => {
    for (const expr of [
      { '>=': ['age', 28] },
      { all: [{ '>=': ['age', 28] }, { '==': ['career.industry', 'tech'] }] },
      { any: [{ '<': ['capital', 100] }, { in: ['stage', ['student', 'early_career']] }] },
      { not: { '>=': ['nerve', 50] } },
      { all: [{ '>=': ['age', 30] }, { not: { '==': ['family.status', 'single'] } }] },
    ] as Expr[]) {
      expect(roundTrip(expr)).toEqual(expr)
    }
  })

  it('「永遠成立」攤成沒有任何一列，再組回同一個寫法', () => {
    expect(toTree(ALWAYS).rows).toHaveLength(0)
    expect(fromTree({ mode: 'all', rows: [] })).toEqual(ALWAYS)
  })

  it('表單表達不出來的節點原樣留著——不提供編輯不等於可以刪掉', () => {
    const authored: Expr = {
      all: [
        { '>=': ['age', 28] },
        { not: { flag: 'burned_by_2000_bubble' } },
        { chance: 0.25 },
        { any: [{ '>=': ['capital', 500] }, { '>=': ['income', 200] }] },
      ],
    }
    const tree = toTree(authored)
    expect(tree.rows.map((row) => row.kind)).toEqual(['field', 'opaque', 'opaque', 'opaque'])
    expect(roundTrip(authored)).toEqual(authored)
  })

  it('counter 的條件也活得下來（計數器不進 UI，但寫好的要留著）', () => {
    const expr: Expr = { all: [{ '>=': ['counter.cofounded', 3] }, { '>=': ['age', 40] }] }
    expect(roundTrip(expr)).toEqual(expr)
  })
})
