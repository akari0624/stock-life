/**
 * TODO.md #5a 的第一條：**所有視覺資源只透過 id 引用，不得硬編碼路徑**。
 *
 * 這條靠自律守不住（隨手 import 一張 png 太方便了），所以用測試掃原始碼。
 * 路徑只能出現在內容包 manifest 的 `assets` 區塊裡。
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const PRESENTATION = path.resolve(import.meta.dirname, '..')

const FILE_EXTENSIONS = ['.ts', '.tsx', '.css']
const ASSET_LITERAL = /["'`][^"'`]*\.(?:png|jpe?g|webp|gif|avif|svg|mp3|ogg|wav|m4a)["'`]/i
const URL_FUNCTION = /url\(\s*["']?[^)"'$]/i
/** 註解裡舉例（例如說明 manifest 可以填 "path.png"）不算違規 */
const COMMENT = /^\s*(?:\/\/|\/\*|\*)/

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue
      files.push(...(await sourceFiles(full)))
    } else if (FILE_EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(full)
    }
  }
  return files
}

describe('presentation/ 不得硬編碼素材路徑', () => {
  it('沒有任何檔名字面量（png/jpg/mp3…）', async () => {
    const files = await sourceFiles(PRESENTATION)
    expect(files.length).toBeGreaterThan(4)

    const offenders: string[] = []
    for (const file of files) {
      const content = await readFile(file, 'utf8')
      for (const [index, line] of content.split('\n').entries()) {
        if (COMMENT.test(line)) continue
        if (ASSET_LITERAL.test(line)) {
          offenders.push(`${path.relative(PRESENTATION, file)}:${index + 1}: ${line.trim()}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('CSS 裡沒有寫死的 url()（圖只能靠 --c-bg-image 之類的變數注入）', async () => {
    const files = (await sourceFiles(PRESENTATION)).filter((file) => file.endsWith('.css'))
    expect(files.length).toBeGreaterThan(0)

    const offenders: string[] = []
    for (const file of files) {
      const content = await readFile(file, 'utf8')
      for (const [index, line] of content.split('\n').entries()) {
        if (COMMENT.test(line)) continue
        if (URL_FUNCTION.test(line) && !line.includes('var(')) {
          offenders.push(`${path.relative(PRESENTATION, file)}:${index + 1}: ${line.trim()}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
