/**
 * 一次 style-dictionary build，三個 custom format 消費同一份 token AST（§10.3）。
 *
 * 主題檔被掛進 `themes.<name>.at.*` 這個命名空間，所以它與一般 token 在
 * **同一個 dictionary** 裡——`{gt.*}` 參照因此解析得出來，也不需要第二次 build。
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import StyleDictionary from 'style-dictionary'
import type { Config } from 'style-dictionary/types'
import { formatKeysTs, formatThemeCss, formatTokensCss } from './formats.ts'
import { validateTokenTree, type TokenTree } from './validate.ts'

export const OUTPUT_FILES = ['tokens.css', 'theme.css', 'keys.ts'] as const
export type OutputFile = (typeof OUTPUT_FILES)[number]

export interface BuildOptions {
  /** 放 `*.tokens.json` 的目錄；`<srcDir>/themes/` 下的是主題覆寫檔 */
  srcDir: string
  outDir: string
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** token 檔之間會共用 `at` 這種前綴（顏色與字體各一檔），所以合併必須是 deep。 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key]
    if (isPlainObject(existing) && isPlainObject(value)) {
      deepMerge(existing, value)
    } else {
      target[key] = value
    }
  }
}

const tokenFilesIn = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.tokens.json'))
    .map((e) => e.name)
    .sort() // 檔案順序決定輸出順序 → build 必須是 deterministic
}

const readTree = async (file: string, kind: 'source' | 'theme'): Promise<TokenTree> => {
  const tree = JSON.parse(await readFile(file, 'utf8')) as unknown
  validateTokenTree(tree, { file: path.basename(file), kind })
  return tree as TokenTree
}

/** 讀 + 驗證 + 合併成單一 token 樹（含 `themes.*` 命名空間）。 */
export async function collectTokens(srcDir: string): Promise<TokenTree> {
  const merged: Record<string, unknown> = {}

  for (const name of await tokenFilesIn(srcDir)) {
    deepMerge(merged, (await readTree(path.join(srcDir, name), 'source')) as Record<string, unknown>)
  }

  const themesDir = path.join(srcDir, 'themes')
  const themes: Record<string, unknown> = {}
  for (const name of await tokenFilesIn(themesDir)) {
    const themeName = name.replace(/\.tokens\.json$/, '')
    if (themeName.includes('-')) {
      throw new Error(`主題檔名不得含 "-"（${name}）：它會變成 data-theme 的值與 key 的一部分`)
    }
    themes[themeName] = await readTree(path.join(themesDir, name), 'theme')
  }
  if (Object.keys(themes).length > 0) merged.themes = themes

  return merged as TokenTree
}

export async function buildTokens(options: BuildOptions): Promise<Record<OutputFile, string>> {
  const tokens = await collectTokens(options.srcDir)

  const config: Config = {
    usesDtcg: true,
    tokens: tokens as Config['tokens'],
    log: { verbosity: 'default', warnings: 'error' },
    hooks: {
      formats: {
        'stock-life/tokens.css': ({ dictionary }) => formatTokensCss(dictionary.allTokens),
        'stock-life/theme.css': ({ dictionary }) => formatThemeCss(dictionary.allTokens),
        'stock-life/keys.ts': ({ dictionary }) => formatKeysTs(dictionary.allTokens),
      },
    },
    platforms: {
      css: {
        transforms: ['name/kebab'],
        buildPath: `${options.outDir}${path.sep}`,
        files: [
          { destination: 'tokens.css', format: 'stock-life/tokens.css' },
          { destination: 'theme.css', format: 'stock-life/theme.css' },
          { destination: 'keys.ts', format: 'stock-life/keys.ts' },
        ],
      },
    },
  }

  const sd = new StyleDictionary(config)
  await sd.buildAllPlatforms()

  const written = await Promise.all(
    OUTPUT_FILES.map(async (name) => [name, await readFile(path.join(options.outDir, name), 'utf8')] as const),
  )
  return Object.fromEntries(written) as Record<OutputFile, string>
}
