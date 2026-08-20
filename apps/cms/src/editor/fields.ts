import { ERA_PHASES, listFacadeFields, type FacadeField } from '@stock-life/engine'

/**
 * §6.5.3 #2：條件建構器的下拉選單。
 *
 * **來源是 `listFacadeFields()`，不是手寫的清單**——§6.1 已經寫明那層 facade
 * 就是編輯器的欄位來源，維護第二份一定會漂掉。
 *
 * 兩件刻意排除的東西：
 *
 * - **`flag.*` / `counter.*` 不在這裡**。它們是開放命名空間（列舉不出來），
 *   而且 §6.5.1 的總則是「counter 與 flag 是編譯產物，不進 UI」。作者匯入的包
 *   裡如果有，`expr.ts` 會原樣留著並顯示成唯讀的一列，不會被吃掉。
 * - **`string[]` 的欄位（`era.themes`）不在這裡**。固定的運算子集合裡沒有
 *   「陣列包含某個值」：`in` 是拿左值去比對右邊的清單，左值是陣列時
 *   `options.includes(['ai'])` 永遠是 false。給作者一個永遠不成立的條件比
 *   不給更糟，所以擋在選單這一層，等引擎補運算子再開。
 */

export type CompareOp = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in'

export const OP_LABELS: Record<CompareOp, string> = {
  '>=': '至少',
  '<=': '最多',
  '>': '大於',
  '<': '小於',
  '==': '等於',
  '!=': '不等於',
  in: '是其中之一',
}

const NUMBER_OPS: readonly CompareOp[] = ['>=', '<=', '>', '<', '==', '!=']
const CATEGORY_OPS: readonly CompareOp[] = ['==', '!=', 'in']

export interface ConditionField {
  path: string
  label: string
  type: FacadeField['type']
  ops: readonly CompareOp[]
  /** 有候選值就只能選，不能自由輸入（§6.5.3 #2） */
  candidates?: readonly string[]
  range?: FacadeField['range']
  /** 這一欄是官方引擎給的，還是載入的內容包長出來的（§7.5 的計數器） */
  source: 'engine'
}

export interface FieldCatalogueInput {
  /** 一起載入的內容包的職涯圖，用來把 `career.id` / `career.industry` 變成選單 */
  careerNodes?: readonly { id: string; industry: string }[]
}

const CHINESE_LABELS: Record<string, string> = {
  age: '年齡',
  year: '西元年',
  stage: '人生階段',
  capital: '本金（万）',
  income: '年收入（万）',
  savingsRate: '儲蓄率',
  debt: '負債（万）',
  cognition: '認知',
  network: '人脈',
  nerve: '心性',
  time: '時間',
  'career.id': '職位',
  'career.industry': '產業',
  'career.rank': '職級',
  'era.phase': '時代階段',
  'family.status': '婚姻狀態',
  'family.kids': '小孩數',
  'position.count': '持有部位數',
  'position.worstDrawdown': '最大回撤',
}

/** 可以用表單建構的條件欄位。 */
export function conditionFields(input: FieldCatalogueInput = {}): ConditionField[] {
  const careerIds = [...new Set((input.careerNodes ?? []).map((node) => node.id))].sort()
  const industries = [...new Set((input.careerNodes ?? []).map((node) => node.industry))].sort()

  return listFacadeFields()
    .filter((field) => field.type !== 'string[]')
    .map((field): ConditionField => {
      const candidates =
        field.enum ??
        (field.path === 'era.phase'
          ? ERA_PHASES
          : field.path === 'career.id'
            ? careerIds
            : field.path === 'career.industry'
              ? industries
              : undefined)

      return {
        path: field.path,
        label: CHINESE_LABELS[field.path] ?? field.label,
        type: field.type,
        ops: field.type === 'number' ? NUMBER_OPS : CATEGORY_OPS,
        ...(candidates && candidates.length > 0 ? { candidates } : {}),
        ...(field.range ? { range: field.range } : {}),
        source: 'engine',
      }
    })
}

export function findField(fields: readonly ConditionField[], path: string): ConditionField | undefined {
  return fields.find((field) => field.path === path)
}
