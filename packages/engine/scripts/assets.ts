// 素材需求清單（TODO.md #5a）。掃過已載入的內容包，把每個 scene id 數出來。
//
//   pnpm --filter engine run assets              # 表格，缺的排前面
//   pnpm --filter engine run assets -- --all     # 連已經有檔案的一起列
//   pnpm --filter engine run assets -- --manifest > assets.json
//   pnpm --filter engine run assets -- --json    # 給別的工具吃
//
// 為什麼需要這支：scene id 是就近寫在事件旁邊的（§6.3），所以沒有任何一個檔案
// 「列出全部背景」。這支就是那份清單，從內容算出來，不用手維護。

import { createCoreTwSource } from '../src/content/packs/core-tw/index.js'
import { loadContentPack } from '../src/content/loader/loadContentPack.js'
import { mergeContentPacks } from '../src/content/loader/merge.js'
import {
  ASSET_KINDS,
  assetManifestSkeleton,
  collectRequiredAssets,
  type AssetKind,
  type AssetUsage,
} from '../src/content/assets/requiredAssets.js'

const KIND_LABEL: Record<AssetKind, string> = {
  bg: '背景 bg',
  actor: '角色 actor',
  sfx: '音效 sfx',
  fx: '特效 fx（CSS 動畫，不需要檔案）',
}

const result = await loadContentPack(createCoreTwSource())
if (!result.ok) {
  console.error('內容包載不起來：')
  for (const issue of result.issues) console.error(`  ${issue.section} ${issue.path.join('.')} — ${issue.message}`)
  process.exit(1)
}

const { content } = mergeContentPacks([result.pack])
const requirements = collectRequiredAssets(content)

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(requirements, null, 2))
} else if (process.argv.includes('--manifest')) {
  // 貼進內容包的 manifest.assets，把空字串換成檔名就有圖了（§6.4）
  console.log(JSON.stringify(assetManifestSkeleton(requirements), null, 2))
} else {
  const showAll = process.argv.includes('--all')

  for (const kind of ASSET_KINDS) {
    const all = requirements[kind]
    const missing = all.filter((usage) => !usage.provided)
    const rows = showAll ? all : missing
    const width = Math.max(0, ...rows.map((row) => row.id.length))

    const tail = kind === 'fx' ? '' : `，${missing.length} 個還沒有檔案`
    console.log(`\n${KIND_LABEL[kind]} — ${all.length} 個 id${tail}`)
    for (const row of rows) console.log(`  ${line(row, width)}`)
  }

  const total = ASSET_KINDS.filter((kind) => kind !== 'fx').reduce(
    (sum, kind) => sum + requirements[kind].filter((usage) => !usage.provided).length,
    0,
  )
  console.log(`\n合計 ${total} 個素材還在跑 fallback。`)
}

function line(usage: AssetUsage, width: number): string {
  const mark = usage.provided ? '✓' : ' '
  const users = usage.usedBy.slice(0, 3).join(', ')
  const more = usage.usedBy.length > 3 ? ` +${usage.usedBy.length - 3}` : ''
  return `${mark} ${usage.id.padEnd(width)}  ${String(usage.count).padStart(3)}×  ${users}${more}`
}
