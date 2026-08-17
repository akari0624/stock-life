import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTokens } from '../build/index.ts'
import { TokenValidationError, validateTokenTree } from '../build/validate.ts'

const SRC = path.resolve(import.meta.dirname, '../src')
const temps: string[] = []

const tempDir = async (): Promise<string> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'stock-life-tokens-'))
  temps.push(dir)
  return dir
}

afterAll(async () => {
  await Promise.all(temps.map((dir) => rm(dir, { recursive: true, force: true })))
})

/** 寫一個只有一個 token 檔（+ 選填主題檔）的最小 src 目錄 */
const fixtureSrc = async (files: { name: string; tree: unknown; theme?: boolean }[]): Promise<string> => {
  const dir = await tempDir()
  await mkdir(path.join(dir, 'themes'), { recursive: true })
  for (const file of files) {
    const target = file.theme ? path.join(dir, 'themes', file.name) : path.join(dir, file.name)
    await writeFile(target, JSON.stringify(file.tree))
  }
  return dir
}

const buildFixture = (srcDir: string) => tempDir().then((outDir) => buildTokens({ srcDir, outDir }))

describe('build', () => {
  it('產出三個檔案，且重跑結果一致（deterministic）', async () => {
    const first = await buildTokens({ srcDir: SRC, outDir: await tempDir() })
    const second = await buildTokens({ srcDir: SRC, outDir: await tempDir() })

    expect(Object.keys(first).sort()).toEqual(['keys.ts', 'theme.css', 'tokens.css'])
    expect(second).toEqual(first)
    for (const content of Object.values(first)) {
      expect(content).toContain('Do not edit directly')
    }
  })

  it('三層都在 tokens.css，主題只覆寫 --at-*', async () => {
    const { 'tokens.css': css } = await buildTokens({ srcDir: SRC, outDir: await tempDir() })

    expect(css).toContain('--gt-neutral-950: #0e1216;')
    expect(css).toContain('--at-surface-base: var(--gt-neutral-950);')
    expect(css).toContain('--ct-stage-actor_shadow: var(--at-surface-sunken);')

    const themeBlock = css.slice(css.indexOf('[data-theme="scoreboard"]'))
    expect(themeBlock).toContain('--at-surface-base: var(--gt-green-950);')
    // 任何主題都不得修改 --gt-*（§10.3）
    expect(themeBlock).not.toMatch(/^\s*--gt-/m)
    expect(themeBlock).not.toMatch(/^\s*--ct-/m)
  })

  it('@theme 只收 at + ct，gt 一個都不進去', async () => {
    const { 'theme.css': css } = await buildTokens({ srcDir: SRC, outDir: await tempDir() })

    expect(css).toContain('--color-at-loss: var(--at-loss);')
    expect(css).toContain('--color-ct-stage-actor_shadow: var(--ct-stage-actor_shadow);')
    expect(css).not.toContain('--color-gt-')
    // gt 只能以「被 at 參照」的形式出現，不能自己成為一個 @theme key
    expect(css).not.toMatch(/--color-[\w-]*gt-/)
  })

  it('type role 產出 Tailwind 的 size + line-height + weight 三件一組', async () => {
    const { 'theme.css': css } = await buildTokens({ srcDir: SRC, outDir: await tempDir() })

    expect(css).toContain('--text-body: var(--at-type-body-size);')
    expect(css).toContain('--text-body--line-height: var(--at-type-body-line_height);')
    expect(css).toContain('--text-body--font-weight: var(--at-type-body-weight);')
    // numeric 必須 tabular（§10.5）
    expect(css).toContain('font-variant-numeric: var(--at-type-numeric-variant_numeric);')
  })

  it('keys.ts 的 colorKeys 不含 gt，且列出所有 type role', async () => {
    const { 'keys.ts': ts } = await buildTokens({ srcDir: SRC, outDir: await tempDir() })

    expect(ts).toContain("'at-text-primary',")
    expect(ts).toContain("'ct-stage-actor_shadow',")
    expect(ts).not.toContain("'gt-")
    for (const role of ['display', 'title', 'body', 'caption', 'numeric']) {
      expect(ts).toContain(`'${role}',`)
    }
    expect(ts).toContain("'scoreboard',")
  })
})

describe('驗證', () => {
  it('含 "-" 的 token key 讓 build 失敗', async () => {
    const srcDir = await fixtureSrc([
      { name: 'bad.tokens.json', tree: { at: { $type: 'color', 'text-muted': { $value: '#fff' } } } },
    ])

    await expect(buildFixture(srcDir)).rejects.toThrow(/token key 不得含 "-"/)
  })

  it('key 的其他寫法（大寫、空白）也擋', () => {
    const bad = (tree: unknown) => () => validateTokenTree(tree, { file: 'x.json', kind: 'source' })

    expect(bad({ at: { Text: { $value: '#fff' } } })).toThrow(TokenValidationError)
    expect(bad({ at: { 'text muted': { $value: '#fff' } } })).toThrow(TokenValidationError)
  })

  it('最外層只允許 gt / at / ct', () => {
    expect(() =>
      validateTokenTree({ colors: { red: { $value: '#f00' } } }, { file: 'x.json', kind: 'source' }),
    ).toThrow(/只允許 gt \/ at \/ ct/)
  })

  it('主題檔碰 gt 就失敗', () => {
    expect(() =>
      validateTokenTree({ gt: { red: { 500: { $value: '#f00' } } } }, { file: 't.json', kind: 'theme' }),
    ).toThrow(/主題只能覆寫 alias 層/)
  })

  it('主題檔寫字面色值就失敗（必須是 {gt.*} 參照）', () => {
    expect(() =>
      validateTokenTree(
        { at: { surface: { base: { $value: '#123456' } } } },
        { file: 't.json', kind: 'theme' },
      ),
    ).toThrow(/必須是 \{gt\.\*\} 參照/)
  })

  it('一次回報所有問題，不是只報第一個', () => {
    try {
      validateTokenTree(
        { at: { 'a-b': { $value: '#fff' }, 'c-d': { $value: '#000' } } },
        { file: 'x.json', kind: 'source' },
      )
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(TokenValidationError)
      expect((error as TokenValidationError).issues).toHaveLength(2)
    }
  })
})
