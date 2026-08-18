// 批次生圖的進入點。實際跟 ComfyUI 講話的在 art/comfy.ts。
//
//   pnpm --filter engine run art:gen
//   pnpm --filter engine run art:gen -- --only office,bank,fab
//   pnpm --filter engine run art:gen -- --kind actor
//   pnpm --filter engine run art:gen -- --style ink --seed 3
//   pnpm --filter engine run art:gen -- --dry-run

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildSheets } from './art/sheet.js'
import { DEFAULT_STYLE } from './art/styles.js'
import { ACTOR_SIZE, BG_SIZE, DEFAULTS, render, seedFor, serverAlive } from './art/comfy.js'

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const styleId = arg('style') ?? DEFAULT_STYLE
const seedOffset = Number.parseInt(arg('seed') ?? '0', 10)
const only = arg('only')?.split(',').map((id) => id.trim()).filter(Boolean)
const kind = arg('kind')
const steps = Number.parseInt(arg('steps') ?? String(DEFAULTS.steps), 10)
const cfg = Number.parseFloat(arg('cfg') ?? String(DEFAULTS.cfg))
const dryRun = process.argv.includes('--dry-run')

const { style, sheets } = await buildSheets(styleId)

const queue = sheets
  .filter((sheet) => !kind || sheet.kind === kind)
  .filter((sheet) => !only || only.includes(sheet.id))

if (queue.length === 0) {
  console.error('沒有東西要跑（--only / --kind 篩掉了全部）')
  process.exit(1)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const outDir = path.join(root, 'art-out', style.id)

console.log(`風格「${style.id}」，${queue.length} 張，seed 偏移 ${seedOffset}`)
console.log(`輸出：${path.relative(process.cwd(), outDir)}\n`)

if (dryRun) {
  for (const sheet of queue) {
    console.log(`${sheet.id.padEnd(20)} seed=${seedFor(sheet.id, seedOffset)}  ${sheet.kind}`)
  }
  process.exit(0)
}

if (!(await serverAlive())) {
  console.error('連不上 ComfyUI。先把它跑起來：')
  console.error('  cd ~/ai/ComfyUI && ./.venv/bin/python main.py')
  console.error('（或設 COMFY_URL 指到別的位址）')
  process.exit(1)
}

let done = 0
let failed = 0
const started = Date.now()

for (const sheet of queue) {
  const size = sheet.kind === 'bg' ? BG_SIZE : ACTOR_SIZE
  const seed = seedFor(sheet.id, seedOffset)
  const label = `[${done + failed + 1}/${queue.length}] ${sheet.id}`
  try {
    const out = await render(
      sheet.id,
      sheet.prompt,
      sheet.negative,
      seed,
      { ...DEFAULTS, ...size, steps, cfg },
      outDir,
    )
    done += 1
    console.log(`${label} → ${path.basename(out)}`)
  } catch (error) {
    failed += 1
    console.error(`${label} ✗ ${error instanceof Error ? error.message : String(error)}`)
  }
}

const elapsed = ((Date.now() - started) / 1000).toFixed(0)
console.log(`\n${done} 張完成${failed > 0 ? `，${failed} 張失敗` : ''}，共 ${elapsed}s`)
