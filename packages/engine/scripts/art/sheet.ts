// 「要生哪些圖、prompt 是什麼」的單一來源。ART.md 與批次生圖都讀這裡，
// 兩邊各算一次就會對不上。

import { createCoreTwSource } from '../../src/content/packs/core-tw/index.js'
import { loadContentPack } from '../../src/content/loader/loadContentPack.js'
import { mergeContentPacks } from '../../src/content/loader/merge.js'
import { collectRequiredAssets, type AssetUsage } from '../../src/content/assets/requiredAssets.js'
import { NARRATOR_ACTOR } from '../../src/domain/expr/sceneIds.js'
import { ACTOR_SUBJECTS, BG_SUBJECTS, type Subject } from './subjects.js'
import { COMMON_NEGATIVE, COMMON_RULES, FRAMING, KIND_NEGATIVE, findStyle, type ArtStyle } from './styles.js'

export type Kind = 'bg' | 'actor'

export interface Sheet {
  kind: Kind
  id: string
  file: string
  uses: number
  usedBy: string[]
  subject: Subject
  prompt: string
  negative: string
}

export interface SheetSet {
  style: ArtStyle
  sheets: Sheet[]
  /** subjects.ts 有、但已經沒有內容在用的 id */
  stale: string[]
}

/**
 * **風格擺最前面。** SDXL 的 CLIP 一段只吃 77 個 token，超過就切塊，
 * 後面那塊權重低到幾乎沒作用——題材在前、風格在後的寫法，會讓四種風格長得一模一樣
 * （實測過：`--style pixel` 產出的完全不是像素圖）。
 */
function compose(kind: Kind, subject: Subject, style: ArtStyle): string {
  const head = [style.look, style.palette, subject.light ?? style.light]
  // 角色的取景詞帶著族裔，所以要排在題材**之前**；背景反過來，題材先講比較準。
  const body = kind === 'actor' ? [FRAMING.actor, subject.en] : [subject.en, FRAMING.bg]
  return [...head, ...body, COMMON_RULES].join('. ')
}

function rowsFor(
  kind: Kind,
  usages: AssetUsage[],
  subjects: Record<string, Subject>,
  style: ArtStyle,
): { rows: Sheet[]; missing: string[] } {
  const missing: string[] = []
  const rows: Sheet[] = []

  for (const usage of usages) {
    // 旁白只出現在對話框的名字欄，永遠不佔角色位，所以沒有圖
    if (kind === 'actor' && usage.id === NARRATOR_ACTOR) continue
    const subject = subjects[usage.id]
    if (!subject) {
      missing.push(usage.id)
      continue
    }
    rows.push({
      kind,
      id: usage.id,
      file: `${usage.id}.webp`,
      uses: usage.count,
      usedBy: usage.usedBy,
      subject,
      prompt: compose(kind, subject, style),
      negative: [KIND_NEGATIVE[kind], COMMON_NEGATIVE, style.negative].filter(Boolean).join(', '),
    })
  }

  return { rows, missing }
}

/** 內容加了新背景而 subject 沒補，這裡直接爆並指名——清單不會默默過期。 */
export async function buildSheets(styleId: string): Promise<SheetSet> {
  const style = findStyle(styleId)
  if (!style) throw new Error(`沒有這個風格：${styleId}`)

  const result = await loadContentPack(createCoreTwSource())
  if (!result.ok) throw new Error('內容包載不起來，先修內容再產 prompt')

  const { content } = mergeContentPacks([result.pack])
  const required = collectRequiredAssets(content)

  const bg = rowsFor('bg', required.bg, BG_SUBJECTS, style)
  const actor = rowsFor('actor', required.actor, ACTOR_SUBJECTS, style)
  const missing = [...bg.missing, ...actor.missing]
  if (missing.length > 0) {
    throw new Error(`scripts/art/subjects.ts 少了這些 id：${missing.join(', ')}`)
  }

  const stale = [
    ...Object.keys(BG_SUBJECTS).filter((id) => !required.bg.some((usage) => usage.id === id)),
    ...Object.keys(ACTOR_SUBJECTS).filter((id) => !required.actor.some((usage) => usage.id === id)),
  ]

  return { style, sheets: [...bg.rows, ...actor.rows], stale }
}
