/**
 * 這些判準必須用**實際編譯出來的 CSS** 驗證，不能靠口頭確認（PLAN.md S12）：
 *
 * - `bg-gt-green-500` 這類原色 utility 根本不存在
 * - 含 `_` 的 class 真的可用（Tailwind 的 `_` → 空白只作用於方括號 arbitrary value）
 * - `bg-at-loss/20` 的 alpha 修飾符正常
 */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const run = promisify(execFile)

const WEB_ROOT = path.resolve(import.meta.dirname, '../../..')
const PROBE = path.join(import.meta.dirname, 'fixtures/probe.css')

let css = ''
let tempDir = ''

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'stock-life-tw-'))
  const out = path.join(tempDir, 'out.css')
  await run(path.join(WEB_ROOT, 'node_modules/.bin/tailwindcss'), ['--input', PROBE, '--output', out], {
    cwd: WEB_ROOT,
  })
  css = await readFile(out, 'utf8')
}, 60_000)

afterAll(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true })
})

/** 取出某個 class 的規則本體（class 名稱裡的 `/` 在 CSS 選擇器裡是 `\/`）。 */
const ruleFor = (className: string): string | undefined => {
  const selector = `.${className.replace('/', '\\/')} {`
  const start = css.indexOf(selector)
  if (start === -1) return undefined
  return css.slice(start, css.indexOf('}', start) + 1)
}

describe('編譯出來的 utility', () => {
  it('at 層的 alias utility 存在，且指向 alias 變數（主題才能生效）', () => {
    expect(ruleFor('bg-at-surface-raised')).toContain('var(--color-at-surface-raised)')
    expect(ruleFor('text-at-loss')).toContain('var(--color-at-loss)')
    expect(ruleFor('border-at-border-strong')).toContain('var(--color-at-border-strong)')
  })

  it('gt 層的原色 utility **不存在**', () => {
    expect(ruleFor('bg-gt-green-500')).toBeUndefined()
    expect(ruleFor('text-gt-neutral-100')).toBeUndefined()
    expect(ruleFor('border-gt-neutral-800')).toBeUndefined()
    // 但 gt 變數本身要在 :root 裡（at 靠它取值）
    expect(css).toContain('--gt-green-500: #12b981;')
  })

  it('含 `_` 的 class 原樣保留，沒有被轉成空白', () => {
    const rule = ruleFor('bg-ct-stage-actor_shadow')
    expect(rule).toBeDefined()
    expect(rule).toContain('var(--color-ct-stage-actor_shadow)')
    expect(css).not.toContain('actor shadow')
  })

  it('alpha 修飾符 bg-at-loss/20 正確產生半透明', () => {
    const rule = ruleFor('bg-at-loss/20')
    expect(rule).toBeDefined()
    expect(rule).toMatch(/color-mix\(/)
    expect(rule).toContain('20%')
  })

  it('type role 一個 class 綁三件事', () => {
    const display = ruleFor('text-display')
    expect(display).toContain('font-size: var(--text-display)')
    // Tailwind 會包一層 --tw-* 覆寫點，所以只斷言 role 變數確實被引用
    expect(display).toMatch(/line-height:.*var\(--text-display--line-height\)/)
    expect(display).toMatch(/font-weight:.*var\(--text-display--font-weight\)/)
    expect(display).toMatch(/letter-spacing:.*var\(--text-display--letter-spacing\)/)
  })

  it('numeric role 是 tabular', () => {
    expect(css).toContain('font-variant-numeric: var(--at-type-numeric-variant_numeric)')
    expect(css).toContain('--at-type-numeric-variant_numeric: tabular-nums;')
  })

  it('font-sans 走 token', () => {
    expect(ruleFor('font-sans')).toContain('var(--font-sans)')
  })

  it('主題只覆寫 alias 層，gt 不被任何主題修改', () => {
    const themeBlock = css.slice(css.indexOf('[data-theme="scoreboard"]'))
    expect(themeBlock).toContain('--at-surface-base: var(--gt-green-950);')
    expect(themeBlock).not.toMatch(/^\s*--gt-/m)
  })
})
