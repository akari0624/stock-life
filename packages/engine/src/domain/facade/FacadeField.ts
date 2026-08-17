import type { FacadePath } from './ModStateView.js'

export type FacadeFieldType = 'number' | 'string' | 'boolean' | 'enum' | 'string[]'

export interface FacadeFieldRange {
  min: number
  max: number
}

/**
 * Metadata for one static facade field — the source of truth for the future
 * fill-in-the-blank editor's dropdowns/inputs (§6.1). Dynamic namespaces
 * (`flag.*`, `counter.*`) are not enumerable and are described separately
 * by content/schema (S5) via a prefix pattern rather than a fixed list.
 */
export interface FacadeField {
  path: FacadePath
  label: string
  type: FacadeFieldType
  enum?: readonly string[]
  range?: FacadeFieldRange
}

const STATIC_FACADE_FIELDS: readonly FacadeField[] = [
  { path: 'age', label: 'Age', type: 'number', range: { min: 0, max: 120 } },
  { path: 'year', label: 'Calendar year', type: 'number' },
  {
    path: 'stage',
    label: 'Life stage',
    type: 'enum',
    enum: ['student', 'early_career', 'mid_career', 'late_career', 'retirement'],
  },
  { path: 'capital', label: 'Capital', type: 'number' },
  { path: 'income', label: 'Income', type: 'number' },
  { path: 'savingsRate', label: 'Savings rate', type: 'number', range: { min: 0, max: 1 } },
  { path: 'debt', label: 'Debt', type: 'number' },
  { path: 'cognition', label: 'Cognition', type: 'number' },
  { path: 'network', label: 'Network', type: 'number' },
  { path: 'nerve', label: 'Nerve', type: 'number' },
  { path: 'time', label: 'Time', type: 'number' },
  { path: 'career.id', label: 'Career: position id', type: 'string' },
  { path: 'career.industry', label: 'Career: industry', type: 'string' },
  { path: 'career.rank', label: 'Career: rank', type: 'number' },
  { path: 'era.phase', label: 'Era: phase', type: 'string' },
  { path: 'era.themes', label: 'Era: themes', type: 'string[]' },
  {
    path: 'family.status',
    label: 'Family status',
    type: 'enum',
    enum: ['single', 'partnered', 'married', 'divorced', 'widowed'],
  },
  { path: 'family.kids', label: 'Number of kids', type: 'number' },
  { path: 'position.count', label: 'Open position count', type: 'number' },
  { path: 'position.worstDrawdown', label: 'Worst drawdown', type: 'number' },
]

/**
 * Enumerable facade fields. In S3 this is just the static list above; from
 * S6 onward each GameSystem contributes its own fields via `facadeFields()`
 * and the registry merges them in here.
 */
export function listFacadeFields(): FacadeField[] {
  return [...STATIC_FACADE_FIELDS]
}
