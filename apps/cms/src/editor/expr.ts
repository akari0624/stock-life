import type { ComparableValue, Expr } from '@stock-life/engine'
import { ALWAYS, isAlways } from './draft.ts'
import type { CompareOp } from './fields.ts'

/**
 * 條件樹 ↔ 表單狀態的**雙向**轉換（TODO.md #1 的邊界：條件樹是純資料，可雙向轉換）。
 *
 * 表單能表達的是「一組扁平的比較，用『全部成立』或『任一成立』串起來」。
 * 真實的 Expr 比這個大：可以任意嵌套、可以有 `flag`、`chance`。
 *
 * ⚠️ **表達不出來的節點不會被丟掉，會變成一列唯讀的 `opaque`。**
 * 這是這支檔案最重要的一條規則：作者匯入一個手寫的包、在編輯器裡改了一句台詞、
 * 再匯出——他寫的 `{ not: { flag: 'x' } }` 必須還在。編輯器不提供某個東西，
 * 跟編輯器可以刪掉那個東西，是兩件完全不同的事。
 */

export type ConditionMode = 'all' | 'any'

export interface FieldRow {
  kind: 'field'
  key: number
  /** 「不是…」——對應 `{ not: <leaf> }` */
  negate: boolean
  path: string
  op: CompareOp
  value: ComparableValue | ComparableValue[]
}

export interface OpaqueRow {
  kind: 'opaque'
  key: number
  expr: Expr
}

export type ConditionRow = FieldRow | OpaqueRow

export interface ConditionTree {
  mode: ConditionMode
  rows: ConditionRow[]
}

const COMPARE_OPS: readonly CompareOp[] = ['==', '!=', '>', '>=', '<', '<=', 'in']

let nextKey = 1
const key = (): number => nextKey++

function leafToRow(expr: Expr, negate: boolean): ConditionRow {
  for (const op of COMPARE_OPS) {
    if (op in expr) {
      const operands = (expr as Record<string, unknown>)[op] as [string, ComparableValue | ComparableValue[]]
      return { kind: 'field', key: key(), negate, path: operands[0], op, value: operands[1] }
    }
  }
  // flag / chance / 嵌套的 all·any：留著，但唯讀
  return { kind: 'opaque', key: key(), expr: negate ? { not: expr } : expr }
}

function nodeToRow(expr: Expr): ConditionRow {
  if ('not' in expr) {
    const inner = expr.not
    if ('all' in inner || 'any' in inner || 'not' in inner) {
      return { kind: 'opaque', key: key(), expr }
    }
    return leafToRow(inner, true)
  }
  if ('all' in expr || 'any' in expr) return { kind: 'opaque', key: key(), expr }
  return leafToRow(expr, false)
}

/** Expr → 表單狀態。「永遠成立」攤成沒有任何一列，因為那正是作者的意思。 */
export function toTree(expr: Expr): ConditionTree {
  if (isAlways(expr)) return { mode: 'all', rows: [] }
  if ('all' in expr) return { mode: 'all', rows: expr.all.map(nodeToRow) }
  if ('any' in expr) return { mode: 'any', rows: expr.any.map(nodeToRow) }
  return { mode: 'all', rows: [nodeToRow(expr)] }
}

function rowToExpr(row: ConditionRow): Expr {
  if (row.kind === 'opaque') return row.expr
  const leaf = { [row.op]: [row.path, row.value] } as unknown as Expr
  return row.negate ? { not: leaf } : leaf
}

/** 表單狀態 → Expr。沒有任何一列就是「永遠成立」，schema 要求 require 必填。 */
export function fromTree(tree: ConditionTree): Expr {
  if (tree.rows.length === 0) return ALWAYS
  if (tree.rows.length === 1) return rowToExpr(tree.rows[0] as ConditionRow)
  const children = tree.rows.map(rowToExpr)
  return tree.mode === 'any' ? { any: children } : { all: children }
}

/** 新增一列時的預設值：拿第一個數值欄位，作者八成要改，但至少是合法的。 */
export function newRow(path: string, op: CompareOp, value: ComparableValue): FieldRow {
  return { kind: 'field', key: key(), negate: false, path, op, value }
}
