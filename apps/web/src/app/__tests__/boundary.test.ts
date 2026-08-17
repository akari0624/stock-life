/**
 * S16 的判準：**UI 層對 `packages/engine` 的 import 只走公開 API**。
 *
 * 深層 import（`@stock-life/engine/src/domain/...`）或直接指到 `packages/engine/`
 * 的相對路徑，會讓「引擎內部可以自由重構」這個承諾失效——那正是 §3 的分層要防的事。
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.resolve(import.meta.dirname, '../..')
const EXTENSIONS = ['.ts', '.tsx']

const IMPORT_LINE = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await sourceFiles(full)))
    else if (EXTENSIONS.includes(path.extname(entry.name))) files.push(full)
  }
  return files
}

const importsOf = (content: string): string[] =>
  [...content.matchAll(IMPORT_LINE)].map((match) => match[1])

describe('apps/web → packages/engine 的邊界', () => {
  it('只 import "@stock-life/engine" 這個公開入口', async () => {
    const offenders: string[] = []
    let engineImports = 0

    for (const file of await sourceFiles(SRC)) {
      const content = await readFile(file, 'utf8')
      for (const specifier of importsOf(content)) {
        if (specifier === '@stock-life/engine') {
          engineImports += 1
          continue
        }
        if (specifier.startsWith('@stock-life/engine/') || specifier.includes('packages/engine')) {
          offenders.push(`${path.relative(SRC, file)}: ${specifier}`)
        }
      }
    }

    expect(offenders).toEqual([])
    // 不是因為根本沒人用引擎才通過的
    expect(engineImports).toBeGreaterThan(3)
  })

  it('presentation/ 與 app/ 不 import UI 框架以外的東西進 engine（反向依賴不存在）', async () => {
    // 反向：引擎不得知道 apps/web 的存在。engine 那邊已有 lint 規則與 boundary.test.ts
    // 守著，這裡只確認 app 沒有偷偷把型別再匯出成引擎的一部分。
    const files = await sourceFiles(path.join(SRC, 'app'))
    for (const file of files) {
      const content = await readFile(file, 'utf8')
      expect(content, path.relative(SRC, file)).not.toMatch(/from\s+['"].*packages\/engine/)
    }
  })
})
