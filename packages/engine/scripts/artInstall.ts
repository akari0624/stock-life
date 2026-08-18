// 把 art-out/ 的成品裝進遊戲：轉 webp（角色順便去背）→ apps/web/public/art/
// → 產生 core-tw 的 assets 對照表。
//
//   pnpm --filter engine run art:install
//   pnpm --filter engine run art:install -- --style ink
//
// 轉檔那一段是 Python（Pillow + rembg），跑在獨立的 venv：
//   ART_PYTHON=/path/to/python pnpm --filter engine run art:install
//
// 產生的 `assets.ts` 是內容包 manifest 的 `assets` 區塊（§6.4）——**唯一**
// 允許出現檔案路徑的地方。domain 仍然只認 id，補完素材一行都不用改。

import { spawn } from 'node:child_process'
import { access, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'
import { buildSheets } from './art/sheet.js'
import { DEFAULT_STYLE } from './art/styles.js'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..', '..', '..')
const { style, sheets } = await buildSheets(arg('style') ?? DEFAULT_STYLE)

const srcDir = path.join(repo, 'art-out', style.id)
const outDir = path.join(repo, 'apps', 'web', 'public', 'art')
const actors = sheets.filter((sheet) => sheet.kind === 'actor').map((sheet) => sheet.id)
const python = process.env.ART_PYTHON ?? path.join(os.homedir(), 'ai', 'art-tools', '.venv', 'bin', 'python')

try {
  await access(python)
} catch {
  console.error(`找不到 Python：${python}`)
  console.error('建一個帶 pillow 與 rembg 的 venv，或用 ART_PYTHON 指過去')
  process.exit(1)
}

console.log(`轉檔：${path.relative(repo, srcDir)} → ${path.relative(repo, outDir)}`)
const code = await run(python, [path.join(here, 'art', 'postprocess.py'), srcDir, outDir, actors.join(',')])
if (code !== 0) process.exit(code)

// 只把**真的存在**的檔案寫進 manifest：沒生出來的維持 fallback，不要宣告一個 404
const present = {
  bg: new Set(await listWebp(path.join(outDir, 'bg'))),
  actors: new Set(await listWebp(path.join(outDir, 'actors'))),
}

const entries = (kind: 'bg' | 'actor'): string =>
  sheets
    .filter((sheet) => sheet.kind === kind)
    .map((sheet) => sheet.id)
    .filter((id) => present[kind === 'bg' ? 'bg' : 'actors'].has(id))
    .sort()
    .map((id) => `    ${id}: '/art/${kind === 'bg' ? 'bg' : 'actors'}/${id}.webp',`)
    .join('\n')

const file = path.join(repo, 'packages/engine/src/content/packs/core-tw/assets.ts')
await writeFile(
  file,
  `// 由 \`pnpm --filter engine run art:install\` 產生，不要手改。
//
// §6.4 的 \`assets\` 區塊：id → 檔案。**這是全專案唯一出現素材路徑的地方**——
// domain 只認 id，缺的走 AssetResolver 的 fallback（§6.3）。
// 想換整套美術，重跑一次 art:gen + art:install 就好，內容與規則零改動。
//
// 風格：${style.id}

export const coreTwAssets = {
  actors: {
${entries('actor')}
  },
  bg: {
${entries('bg')}
  },
  // 音效還沒有素材（TODO #5b）：缺檔就靜音，dev 模式印 would-play
  sfx: {},
}
`,
  'utf8',
)
console.log(`\nwrote ${path.relative(repo, file)} — 背景 ${present.bg.size}、角色 ${present.actors.size}`)

async function listWebp(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir)
    return files.filter((file) => file.endsWith('.webp')).map((file) => file.replace(/\.webp$/, ''))
  } catch {
    return []
  }
}

function run(command: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('close', (code) => resolve(code ?? 1))
  })
}
