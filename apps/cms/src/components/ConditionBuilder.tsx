import { Alert, Button, Flex, Input, InputNumber, Segmented, Select, Space, Tag, Tooltip, Typography } from 'antd'
import type { ComparableValue, Expr } from '@stock-life/engine'
import { conditionFields, findField, OP_LABELS, type CompareOp, type ConditionField } from '../editor/fields.ts'
import { fromTree, newRow, toTree, type ConditionRow, type FieldRow } from '../editor/expr.ts'

/**
 * §6.5.3 #2 的條件建構器。
 *
 * 「沒有人會手寫 `{ all: [{ '>=': ['age', 28] }, { not: { flag: 'x' } }] }`」——
 * 所以左邊一律是下拉選單（來源是 `listFacadeFields()`，§6.1），不自由輸入。
 *
 * 表達不出來的節點（`flag`、`chance`、嵌套的 all/any）顯示成一列**唯讀**的標籤。
 * 它們照樣會被匯出——編輯器不提供某個寫法，不代表可以把作者手寫的東西吃掉。
 */

export interface ConditionBuilderProps {
  value: Expr
  onChange: (expr: Expr) => void
  careerNodes?: readonly { id: string; industry: string }[]
  /** 段落事件的 require 只在 `afterYears >= 1` 到期時才驗，這裡要講清楚 */
  hint?: string
}

export function ConditionBuilder({ value, onChange, careerNodes, hint }: ConditionBuilderProps) {
  const fields = conditionFields({ ...(careerNodes ? { careerNodes } : {}) })
  const tree = toTree(value)

  const update = (rows: ConditionRow[], mode = tree.mode): void => {
    onChange(fromTree({ mode, rows }))
  }

  const patchRow = (key: number, patch: Partial<FieldRow>): void => {
    update(
      tree.rows.map((row) => (row.key === key && row.kind === 'field' ? { ...row, ...patch } : row)),
    )
  }

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {hint && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{hint}</Typography.Text>}

      {tree.rows.length === 0 ? (
        <Alert type="info" showIcon message="沒有任何條件——這一格永遠有資格出現" />
      ) : (
        <Flex align="center" gap="small">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>下面這些條件</Typography.Text>
          <Segmented
            size="small"
            value={tree.mode}
            onChange={(mode) => update(tree.rows, mode as 'all' | 'any')}
            options={[
              { label: '全部成立', value: 'all' },
              { label: '任一成立', value: 'any' },
            ]}
            disabled={tree.rows.length < 2}
          />
        </Flex>
      )}

      {tree.rows.map((row) =>
        row.kind === 'opaque' ? (
          <Flex key={row.key} align="center" gap="small">
            <Tag color="default">進階</Tag>
            <Typography.Text code style={{ fontSize: 12 }}>{JSON.stringify(row.expr)}</Typography.Text>
            <Tooltip title="編輯器不提供這種寫法（旗標、機率、嵌套條件），但會原樣保留並匯出">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>唯讀</Typography.Text>
            </Tooltip>
            <Button size="small" type="text" danger onClick={() => update(tree.rows.filter((r) => r.key !== row.key))}>
              移除
            </Button>
          </Flex>
        ) : (
          <RowEditor
            key={row.key}
            row={row}
            fields={fields}
            onChange={(patch) => patchRow(row.key, patch)}
            onRemove={() => update(tree.rows.filter((r) => r.key !== row.key))}
          />
        ),
      )}

      <Button
        size="small"
        type="dashed"
        onClick={() => update([...tree.rows, newRow('age', '>=', 30)])}
        style={{ alignSelf: 'flex-start' }}
      >
        ＋ 加一個條件
      </Button>
    </Space>
  )
}

interface RowEditorProps {
  row: FieldRow
  fields: readonly ConditionField[]
  onChange: (patch: Partial<FieldRow>) => void
  onRemove: () => void
}

function RowEditor({ row, fields, onChange, onRemove }: RowEditorProps) {
  const field = findField(fields, row.path)
  const ops = field?.ops ?? (['>=', '<=', '==', '!='] as CompareOp[])

  const changeField = (path: string): void => {
    const next = findField(fields, path)
    if (!next) return
    const op = next.ops.includes(row.op) ? row.op : (next.ops[0] as CompareOp)
    onChange({ path, op, value: defaultValueFor(next, op) })
  }

  const changeOp = (op: CompareOp): void => {
    // in ↔ 單值切換時要換 value 的形狀，不然存下去是個型別對不上的條件
    const wasList = Array.isArray(row.value)
    const isList = op === 'in'
    if (wasList === isList) {
      onChange({ op })
      return
    }
    onChange({ op, value: isList ? (row.value === undefined ? [] : [row.value as ComparableValue]) : ((row.value as ComparableValue[])[0] ?? '') })
  }

  return (
    <Flex align="center" gap="small" wrap>
      <Select
        size="small"
        style={{ width: 150 }}
        value={row.path}
        onChange={changeField}
        options={fields.map((f) => ({ label: f.label, value: f.path }))}
        showSearch
        optionFilterProp="label"
      />
      <Select
        size="small"
        style={{ width: 108 }}
        value={row.op}
        onChange={(op) => changeOp(op as CompareOp)}
        options={ops.map((op) => ({ label: OP_LABELS[op], value: op }))}
      />
      <ValueEditor field={field} row={row} onChange={onChange} />
      <Segmented
        size="small"
        value={row.negate ? 'not' : 'is'}
        onChange={(mode) => onChange({ negate: mode === 'not' })}
        options={[
          { label: '成立', value: 'is' },
          { label: '不成立', value: 'not' },
        ]}
      />
      <Button size="small" type="text" danger onClick={onRemove}>移除</Button>
    </Flex>
  )
}

function ValueEditor({ field, row, onChange }: { field: ConditionField | undefined; row: FieldRow; onChange: (patch: Partial<FieldRow>) => void }) {
  if (row.op === 'in') {
    const values = (Array.isArray(row.value) ? row.value : []).map(String)
    return (
      <Select
        size="small"
        mode={field?.candidates ? 'multiple' : 'tags'}
        style={{ minWidth: 200 }}
        value={values}
        onChange={(next: string[]) => onChange({ value: next })}
        {...(field?.candidates ? { options: field.candidates.map((value) => ({ label: value, value })) } : {})}
        placeholder="選一個以上"
      />
    )
  }

  if (field?.candidates) {
    return (
      <Select
        size="small"
        style={{ width: 170 }}
        value={String(row.value)}
        onChange={(value) => onChange({ value })}
        options={field.candidates.map((value) => ({ label: value, value }))}
        showSearch
      />
    )
  }

  if (field?.type === 'number') {
    return (
      <InputNumber
        size="small"
        style={{ width: 110 }}
        value={typeof row.value === 'number' ? row.value : Number(row.value)}
        onChange={(value) => onChange({ value: value ?? 0 })}
        {...(field.range ? { min: field.range.min, max: field.range.max } : {})}
      />
    )
  }

  return (
    <Input
      size="small"
      style={{ width: 170 }}
      value={String(row.value)}
      onChange={(event) => onChange({ value: event.target.value })}
    />
  )
}

function defaultValueFor(field: ConditionField, op: CompareOp): ComparableValue | ComparableValue[] {
  if (op === 'in') return field.candidates ? [field.candidates[0] as string] : []
  if (field.candidates) return field.candidates[0] as string
  if (field.type === 'number') return field.range?.min ?? 0
  return ''
}
