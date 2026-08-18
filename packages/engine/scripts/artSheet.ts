// 生完之後的看片檯：把 art-out/<style>/ 的圖排成一張 contact sheet，
// 一次看完 71 張，圈出要重跑的。
//
//   pnpm --filter engine run art:sheet              # 單一風格，看整批
//   pnpm --filter engine run art:sheet -- --style ink
//   pnpm --filter engine run art:sheet -- --compare  # 各風格並排，用來選風格
//
// 刻意做成靜態 HTML 讀本機檔案：不需要任何影像套件，也不必先轉檔。
// 每張圖底下就是它的 id 與用途，看到不行的直接：
//   pnpm --filter engine run art:gen -- --only <那幾個 id> --seed 1

import { access, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildSheets } from './art/sheet.js'
import { DEFAULT_STYLE, STYLES } from './art/styles.js'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const { style, sheets } = await buildSheets(arg('style') ?? DEFAULT_STYLE)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const outDir = path.join(root, 'art-out', style.id)
const compare = process.argv.includes('--compare')

const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

if (compare) {
  await writeCompare()
  process.exit(0)
}

const cards: string[] = []
let have = 0

for (const sheet of sheets) {
  const png = `${sheet.id}.png`
  const done = await exists(path.join(outDir, png))
  if (done) have += 1
  cards.push(
    `<figure class="${done ? '' : 'missing'}">` +
      (done ? `<img src="./${png}" loading="lazy" alt="${sheet.id}">` : `<div class="gap">還沒生</div>`) +
      `<figcaption><b>${sheet.id}</b> <span>${sheet.uses}×</span><br>${escape(sheet.subject.zh)}</figcaption>` +
      `</figure>`,
  )
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>${style.id} · contact sheet</title>
<style>
  body { margin: 0; padding: 1.5rem; background: #14161a; color: #e6e6e6;
         font: 14px/1.5 system-ui, sans-serif; }
  h1 { font-size: 1.1rem; font-weight: 600; }
  .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  figure { margin: 0; background: #1d2026; border-radius: .5rem; overflow: hidden; }
  img { display: block; width: 100%; aspect-ratio: 16/9; object-fit: cover; }
  .gap { display: grid; place-items: center; aspect-ratio: 16/9; color: #6b7280; }
  figure.missing { outline: 1px dashed #4b5563; }
  figcaption { padding: .5rem .75rem .75rem; font-size: .8rem; color: #b6bcc6; }
  figcaption b { color: #fff; font-family: ui-monospace, monospace; }
  figcaption span { color: #8b93a1; }
</style>
<h1>${style.id} — ${have}/${sheets.length} 張已生成</h1>
<div class="grid">
${cards.join('\n')}
</div>
`

const out = path.join(outDir, 'index.html')
await mkdir(outDir, { recursive: true })
await writeFile(out, html, 'utf8')
console.log(`wrote ${path.relative(process.cwd(), out)} — ${have}/${sheets.length} 張`)
console.log(`用瀏覽器開：explorer.exe "$(wslpath -w '${out}')"`)

/** 同一個場景、四種風格並排——選風格的時候只有這個看得出差別。 */
async function writeCompare(): Promise<void> {
  const dir = path.join(root, 'art-out')
  const rows: string[] = []

  for (const sheet of sheets) {
    const cells: string[] = []
    for (const option of STYLES) {
      const rel = `./${option.id}/${sheet.id}.png`
      const done = await exists(path.join(dir, option.id, `${sheet.id}.png`))
      cells.push(
        `<td>${done ? `<img src="${rel}" loading="lazy" alt="${option.id}">` : '<div class="gap">—</div>'}</td>`,
      )
    }
    if (cells.every((cell) => cell.includes('gap'))) continue
    rows.push(`<tr><th><b>${sheet.id}</b><br><span>${escape(sheet.subject.zh)}</span></th>${cells.join('')}</tr>`)
  }

  const html = `<!doctype html>
<meta charset="utf-8">
<title>風格比較</title>
<style>
  body { margin: 0; padding: 1.5rem; background: #14161a; color: #e6e6e6;
         font: 14px/1.5 system-ui, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: .35rem; vertical-align: top; }
  thead th { position: sticky; top: 0; background: #14161a; text-align: center; }
  tbody th { width: 12rem; text-align: left; font-weight: 400; color: #b6bcc6; }
  tbody th b { color: #fff; font-family: ui-monospace, monospace; }
  tbody th span { font-size: .8rem; color: #8b93a1; }
  img { display: block; width: 100%; border-radius: .375rem; }
  .gap { aspect-ratio: 16/9; display: grid; place-items: center; color: #4b5563;
         border: 1px dashed #333840; border-radius: .375rem; }
</style>
<h1>風格比較</h1>
<table>
<thead><tr><th></th>${STYLES.map((option) => `<th>${option.id}</th>`).join('')}</tr></thead>
<tbody>
${rows.join('\n')}
</tbody>
</table>
`
  const out = path.join(dir, 'compare.html')
  await mkdir(dir, { recursive: true })
  await writeFile(out, html, 'utf8')
  console.log(`wrote ${path.relative(process.cwd(), out)}`)
  console.log(`用瀏覽器開：explorer.exe "$(wslpath -w '${out}')"`)
}

function escape(text: string): string {
  return text.replace(/[<>&]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[char] ?? char)
}
