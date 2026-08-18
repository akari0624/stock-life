// 產生專案根目錄的 `ART.md`：要生哪些圖、檔名叫什麼、prompt 是什麼。
//
//   pnpm --filter engine run art                 # 用預設風格重新產生 ART.md
//   pnpm --filter engine run art -- --style ink  # 換風格，七十一條一起換
//   pnpm --filter engine run art -- --json       # 給批次工具吃，不寫檔
//
// id 清單不是手打的，是從內容算出來的（跟 `run assets` 同一個來源）。

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildSheets, type Sheet } from './art/sheet.js'
import { COMMON_NEGATIVE, COMMON_RULES, DEFAULT_STYLE, SIZE, STYLES, type ArtStyle } from './art/styles.js'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const { style, sheets, stale } = await buildSheets(arg('style') ?? DEFAULT_STYLE)

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(sheets, null, 2))
} else {
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'ART.md')
  await writeFile(out, render(sheets, style, stale), 'utf8')
  console.log(`wrote ${path.relative(process.cwd(), out)} — ${sheets.length} 張圖，風格「${style.id}」`)
}

function render(sheets: Sheet[], style: ArtStyle, stale: string[]): string {
  const bg = sheets.filter((sheet) => sheet.kind === 'bg')
  const actor = sheets.filter((sheet) => sheet.kind === 'actor')
  const lines: string[] = []

  lines.push('# ART · 素材需求與 prompt')
  lines.push('')
  lines.push('> **這個檔案是產生的，不要手改。**')
  lines.push('> 改題材去 `packages/engine/scripts/art/subjects.ts`，改畫風去 `art/styles.ts`，')
  lines.push('> 然後 `pnpm --filter engine run art`（加 `--style <id>` 換風格）。')
  lines.push('> id 清單來自內容本身，內容多一個背景這裡就會多一條。')
  lines.push('')
  lines.push(`目前風格：**${style.id}** — ${style.label}`)
  lines.push('')
  lines.push(`共 ${sheets.length} 張：背景 ${bg.length}、角色 ${actor.length}。`)
  lines.push('')

  lines.push('## 規格')
  lines.push('')
  lines.push('- **檔名就是 id**：背景 `<id>.webp`、角色 `<id>.webp`（例：`office.webp`）')
  lines.push(`- **尺寸**：背景 ${SIZE.bg}（16:9）、角色 ${SIZE.actor}（3:4）；之後再放大`)
  lines.push('- **角色要去背**（PNG 帶 alpha 再轉 webp）。舞台是靠下對齊、寬度 22%，會裁到腰上下')
  lines.push('- **背景會被壓暗**（不透明度 0.35–1），對話框壓在底部 20%，兩側 22% 站角色——')
  lines.push('  所以那三塊要留白、低細節，畫面重心放中上')
  lines.push('- **不能有看得懂的字、商標、可辨識的企業**（DESIGN §2：暗示但不指名）')
  lines.push('- **背景裡不要有醒目的人**：角色是另一層貼上去的')
  lines.push('- 生完把檔名填進內容包的 `manifest.assets`（骨架：`pnpm --filter engine run assets -- --manifest`）')
  lines.push('')

  lines.push('## 怎麼生')
  lines.push('')
  lines.push('本機 ComfyUI（WSL）+ SDXL。開好服務之後：')
  lines.push('')
  lines.push('```bash')
  lines.push('pnpm --filter engine run art:gen                        # 全部 71 張')
  lines.push('pnpm --filter engine run art:gen -- --only office,bank  # 只重跑這幾張')
  lines.push('pnpm --filter engine run art:gen -- --seed 1            # 換一批構圖')
  lines.push('```')
  lines.push('')
  lines.push('產出在 `art-out/<style>/<id>.png`（不進 git）。每張的 seed 由 id 決定，')
  lines.push('所以重跑同一個 id 會拿到同一張；要換構圖就改 `--seed`。')
  lines.push('')

  lines.push('## 共用風格（改這段等於改全部）')
  lines.push('')
  lines.push('```')
  lines.push(`look     : ${style.look}`)
  lines.push(`palette  : ${style.palette}`)
  lines.push(`light    : ${style.light}`)
  lines.push(`rules    : ${COMMON_RULES}`)
  lines.push(`negative : ${[COMMON_NEGATIVE, style.negative].filter(Boolean).join(', ')}`)
  lines.push('```')
  lines.push('')
  lines.push('可換的風格：')
  for (const option of STYLES) {
    lines.push(`- \`${option.id}\`${option.id === style.id ? ' ←（目前）' : ''} — ${option.label}`)
  }
  lines.push('')

  lines.push('## 背景（照使用次數排，先畫上面的）')
  lines.push('')
  for (const sheet of bg) lines.push(...entry(sheet))

  lines.push('## 角色')
  lines.push('')
  lines.push('`narrator` 不用畫：它只是對話框上的名字，永遠不佔角色位。')
  lines.push('')
  for (const sheet of actor) lines.push(...entry(sheet))

  if (stale.length > 0) {
    lines.push('## ⚠️ 已經沒有內容在用的 subject')
    lines.push('')
    lines.push(stale.map((id) => `\`${id}\``).join('、') + ' —— 可以從 `subjects.ts` 刪掉。')
    lines.push('')
  }

  return lines.join('\n')
}

function entry(sheet: Sheet): string[] {
  const users = sheet.usedBy.slice(0, 6).join('、')
  const more = sheet.usedBy.length > 6 ? ` 等 ${sheet.usedBy.length} 筆` : ''
  return [
    `### \`${sheet.file}\` · ${sheet.uses}×`,
    '',
    `${sheet.subject.zh}　（用在：${users}${more}）`,
    '',
    '```',
    sheet.prompt,
    '```',
    '',
  ]
}
