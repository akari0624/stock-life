/**
 * Token 驗證（DESIGN.md §10.3）
 *
 * 兩條規則是這條 pipeline 的地基，違反就讓 build 失敗：
 *
 * 1. token key **不得含 `-`**。`-` 恆為層級分隔符，`{"at": {"text-muted": …}}`
 *    產出的名稱會與兩層 nesting 完全無法區分，命名就失去機器可逆性。
 * 2. 主題檔**只能覆寫 alias 層**，且每個值都必須是 `{gt.*}` 參照——
 *    這樣任何主題都不可能改到 `--gt-*`（§10.3 的「主題」段）。
 */

export const TIERS = ['gt', 'at', 'ct'] as const
export type Tier = (typeof TIERS)[number]

export type TokenTree = { [key: string]: TokenTree | unknown }

export class TokenValidationError extends Error {
  readonly issues: string[]
  constructor(file: string, issues: string[]) {
    super(`${file}: ${issues.length} token 驗證錯誤\n  - ${issues.join('\n  - ')}`)
    this.name = 'TokenValidationError'
    this.issues = issues
  }
}

const KEY_PATTERN = /^[a-z0-9_]+$/
const PURE_REF = /^\{[^{}]+\}$/
const GT_REF = /^\{gt\.[^{}]+\}$/

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** DTCG 的 `$` 開頭欄位是 metadata，不是層級。 */
const childKeys = (node: Record<string, unknown>): string[] =>
  Object.keys(node).filter((k) => !k.startsWith('$'))

export const isLeaf = (node: unknown): node is Record<string, unknown> =>
  isPlainObject(node) && '$value' in node

export interface ValidateOptions {
  /** 檔名，只用在錯誤訊息裡 */
  file: string
  /** `source` = 一般 token 檔（gt/at/ct）；`theme` = 主題覆寫檔（只准 at + gt 參照） */
  kind: 'source' | 'theme'
}

/** 走訪整棵樹，蒐集所有問題後一次拋出（不要只報第一個，token 檔常一次錯好幾處）。 */
export function validateTokenTree(tree: unknown, opts: ValidateOptions): void {
  const issues: string[] = []

  if (!isPlainObject(tree)) {
    throw new TokenValidationError(opts.file, ['最外層必須是物件'])
  }

  const roots = childKeys(tree)
  const allowedRoots: readonly string[] = opts.kind === 'theme' ? ['at'] : TIERS
  for (const root of roots) {
    if (!allowedRoots.includes(root)) {
      issues.push(
        opts.kind === 'theme'
          ? `最外層 "${root}"：主題只能覆寫 alias 層（at），不得碰 ${TIERS.filter((t) => t !== 'at').join('/')}`
          : `最外層 "${root}"：只允許 ${TIERS.join(' / ')}`,
      )
    }
  }
  if (roots.length === 0) issues.push('檔案沒有任何 token')

  const walk = (node: unknown, path: string[]): void => {
    if (!isPlainObject(node)) {
      issues.push(`${path.join('.')}：必須是物件`)
      return
    }

    if (isLeaf(node)) {
      const value = node.$value
      if (typeof value !== 'string' && typeof value !== 'number') {
        issues.push(`${path.join('.')}：$value 必須是字串或數字`)
        return
      }
      if (typeof value === 'string' && value.includes('{') && !PURE_REF.test(value)) {
        issues.push(
          `${path.join('.')}：值要嘛是純參照（"{gt.red.500}"）要嘛是字面值，不接受混合字串`,
        )
      }
      if (opts.kind === 'theme' && !(typeof value === 'string' && GT_REF.test(value))) {
        issues.push(
          `${path.join('.')}：主題的值必須是 {gt.*} 參照（實際：${JSON.stringify(value)}）`,
        )
      }
      return
    }

    const children = childKeys(node)
    if (children.length === 0) {
      issues.push(`${path.join('.')}：既不是 token（無 $value）也沒有子節點`)
      return
    }
    for (const key of children) {
      if (key.includes('-')) {
        issues.push(
          `${[...path, key].join('.')}：token key 不得含 "-"（"-" 恆為層級分隔符，` +
            `同層級的複合詞請用 "_"，例如 actor_shadow）`,
        )
        continue
      }
      if (!KEY_PATTERN.test(key)) {
        issues.push(`${[...path, key].join('.')}：token key 只能用小寫英數與 "_"`)
        continue
      }
      walk(node[key], [...path, key])
    }
  }

  for (const root of roots) walk(tree[root], [root])

  if (issues.length > 0) throw new TokenValidationError(opts.file, issues)
}
