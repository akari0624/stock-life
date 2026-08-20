import {
  BASE_SUCCESS_CHANCE,
  sizingSchema,
  STAT_KEYS,
  type StateEffect,
} from '@stock-life/engine'
import { CHOICE_IDS, CHOICE_LABELS, DEFAULT_ENTRY_WEIGHT, type PackDraft } from './draft.ts'
import { conditionFields, OP_LABELS, type CompareOp, type ConditionField } from './fields.ts'
import { assetCatalogue, type AssetCatalogue } from './assets.ts'
import type { Baseline } from './EditorStore.ts'

/**
 * §6.5.6 第一格：**產一段提示詞，讓作者拿去問 AI**。
 *
 * ⚠️ 這裡一個清單都不手寫。欄位來自 `conditionFields()`（也就是 §6.1 的
 * `listFacadeFields()`）、統計欄位名來自 `STAT_KEYS`、效果型別由
 * `StateEffect['type']` 在編譯期逼著列滿、成功率基準來自 `BASE_SUCCESS_CHANCE`、
 * 素材 id 來自 `assetCatalogue()`——跟條件建構器與資產選擇器是**同一份來源**。
 *
 * 理由跟 §6.5.3 #2 一樣：手抄的第二份清單一定會漂掉。差別只在代價——選單漂掉是
 * 作者選不到，提示詞漂掉是 AI 產出一整批看起來很像、但載不進去的事件。
 */

export type PromptShape = 'mixed' | 'entry' | 'arc'

export const SHAPE_LABELS: Record<PromptShape, string> = {
  mixed: '各來一些',
  entry: '全部都是入口事件',
  arc: '一串連續劇情',
}

export interface PromptOptions {
  /** 要 AI 產幾個事件 */
  count: number
  shape: PromptShape
  /** 作者自己寫的題材，例如「三十歲上下的職場」。空的就不出現在提示詞裡 */
  topic: string
}

export const DEFAULT_PROMPT_OPTIONS: PromptOptions = { count: 6, shape: 'mixed', topic: '' }

/**
 * 效果型別的說明。key 是 `StateEffect['type']`，所以**引擎新增一種效果、
 * 這裡沒補說明時，TypeScript 會擋下來**——這就是不手抄清單的做法在這一格的樣子。
 */
const EFFECT_LINES: Record<StateEffect['type'], string> = {
  'stat.add': `{ "type": "stat.add", "key": "<${STAT_KEYS.join(' | ')}>", "value": <數字，可負> }`,
  'capital.mul': '{ "type": "capital.mul", "value": <倍率；0.7 = 賠掉三成，1.5 = 多五成> }',
  'flag.set': '{ "type": "flag.set", "key": "<英數與底線>" }',
  'trait.grant': '{ "type": "trait.grant", "id": "<特質 id>" }',
  'position.open': `{ "type": "position.open", "opportunityId": "<機會 id>", "sizing": "<${sizingSchema.options.join(' | ')}>" }`,
}

const EFFECT_NOTES: Record<StateEffect['type'], string> = {
  'stat.add':
    '數值會乘上玩家所選那一檔的 mag（保守 1、普通 2、大膽 3），所以只要寫「普通」的量。'
    + '`key` 只用上面那幾個。清單以外的 key 會變成計數器（範例裡若出現不認得的 key 就是那種），那是給進階作者接條件用的，你不用跟著寫',
  'capital.mul': '不受 mag 影響',
  'flag.set': '記住「這件事發生過」，之後可以拿來當條件',
  'trait.grant': '只在你確定那個特質存在時才用',
  'position.open': '只在你確定那個機會存在時才用',
}

function fieldLine(field: ConditionField): string {
  const ops = field.ops.map((op: CompareOp) => `"${op}"`).join(' / ')
  const values = field.candidates
    ? `值：${field.candidates.map((value) => `"${value}"`).join(' / ')}`
    : field.range
      ? `值：${field.range.min}–${field.range.max}`
      : field.type === 'number'
        ? '值：數字'
        : '值：字串'
  return `- \`${field.path}\`（${field.label}） — 可用 ${ops} — ${values}`
}

/** 只列前幾個，提示詞不是資產目錄——作者要精挑會回編輯器的選擇器裡挑。 */
const ASSET_SAMPLE = 40

function assetLine(catalogue: AssetCatalogue, kind: 'bg' | 'actor', label: string): string | undefined {
  const ids = catalogue[kind]
    .filter((option) => option.provided)
    .map((option) => option.id)
    .slice(0, ASSET_SAMPLE)
  if (ids.length === 0) return undefined
  return `- ${label}（\`scene.${kind === 'actor' ? 'actor' : 'bg'}\`）：${ids.join(' / ')}`
}

function shapeBrief(options: PromptOptions): string {
  switch (options.shape) {
    case 'entry':
      return `${options.count} 個**互不相關的入口事件**：每一個都 \`weight: ${DEFAULT_ENTRY_WEIGHT}\`、都不寫 \`next\`。`
    case 'arc':
      return [
        `**一串 ${options.count} 段的連續劇情**：`,
        `第一段是入口（\`weight: ${DEFAULT_ENTRY_WEIGHT}\`），其餘每一段都 \`weight: 0\`、`,
        '只靠上一段的 `next` 進來。成功與失敗可以通往不同的段落，',
        '最後也可以匯流回同一段（兩邊指同一個 id 就好）。',
      ].join('')
    case 'mixed':
      return `${options.count} 個事件：大部分是獨立的入口事件，其中挑一兩個往下接一段續集（用 \`next\`）。`
  }
}

/**
 * 提示詞正文。`draft` 只用來取「已經有的事件 id」與素材清單——AI 要接得上作者
 * 已經寫好的東西，而不是每次都從零開始。
 */
export function buildPrompt(
  options: PromptOptions,
  draft: PackDraft,
  baseline: Baseline | undefined,
): string {
  const catalogue = assetCatalogue(draft, baseline?.manifests ?? [])
  const fields = conditionFields({ careerNodes: baseline?.careerNodes ?? [] })
  const existingIds = draft.events.map((event) => event.id).filter((id) => id.length > 0)
  const examples = baseline?.sampleEvents ?? []

  const out: string[] = []

  out.push('你是一款中文人生模擬遊戲的內容作者。請照下面的 schema 產生一批**文字遊戲用的事件**。')
  out.push('')
  out.push(`## 要產什麼\n\n${shapeBrief(options)}`)
  if (options.topic.trim().length > 0) out.push(`題材：${options.topic.trim()}`)
  out.push('')
  out.push(
    [
      '## 輸出格式',
      '',
      '**只輸出 JSON，不要說明文字、不要 markdown 圍籬。** 最外層長這樣：',
      '',
      '```',
      '{ "events": [ <事件物件>, <事件物件>, ... ] }',
      '```',
    ].join('\n'),
  )
  out.push('')
  out.push(
    [
      '## 一個事件物件',
      '',
      '```',
      '{',
      '  "id": "英數與底線，全世界唯一",',
      '  "require": <條件，見下>,',
      `  "weight": <入口事件 6–14；劇情段落一律 0>,`,
      '  "once": <true = 一輩子只演一次>,',
      '  "prompt": "玩家做決定前讀到的情境，一到兩句",',
      '  "choices": [ <剛好三個，見下> ],',
      '  "good": { "effects": [ <效果> ], "next": <可省略> },',
      '  "bad":  { "effects": [ <效果> ], "next": <可省略> },',
      '  "scene": { "bg": "<背景 id>", "actor": "<角色 id>" }',
      '}',
      '```',
    ].join('\n'),
  )
  out.push('')
  out.push(
    [
      '## choices：剛好三個，不能多也不能少',
      '',
      `id 依序是 ${CHOICE_IDS.map((id) => `\`${id}\`（${CHOICE_LABELS[id]}）`).join('、')}，各出現一次。`,
      '',
      '```',
      ...CHOICE_IDS.map(
        (id, index) =>
          `{ "id": "${id}", "label": "按鈕上的動作，六到十個字", "odds": "${['+20', '0', '-20'][index]}", "mag": ${index + 1}, "good": "擲骰成功時讀到的一句", "bad": "擲骰失敗時讀到的一句" }`,
      ),
      '```',
      '',
      `- \`odds\` 是**有號整數字串**（\`"+20"\`／\`"0"\`／\`"-15"\`），成功率 = ${BASE_SUCCESS_CHANCE}% + odds。保守的正、大膽的負。`,
      '- `mag` 是結果的倍率：保守 1、普通 2、大膽 3。它會去乘 `good`／`bad` 的 `stat.add`。',
      '- 每個選項的 `good`／`bad` 是**那個動作**的結果文案，不是共用的一句：「推掉」跟「全押」不能共用同一句話。',
      '- 三個選項共用 `good`／`bad` 那一組 `effects`（由各自的 mag 縮放），所以效果只寫一次。',
    ].join('\n'),
  )
  out.push('')
  out.push(
    [
      '## require：什麼時候有資格被抽到',
      '',
      '```',
      '{ ">=": ["age", 28] }                                  單一條件',
      '{ "all": [ { ">=": ["age", 28] }, { ">=": ["network", 12] } ] }   都要成立',
      '{ "any": [ ... ] }  { "not": { ... } }                  或 / 反',
      '{ "flag": "some_flag" }                                某個 flag 立過了',
      '{ "chance": 0.3 }                                      三成機率',
      '```',
      '',
      '左邊只能用下面這些欄位，**不要自己發明**：',
      '',
      ...fields.map(fieldLine),
      '',
      `運算子的意思：${(Object.keys(OP_LABELS) as CompareOp[]).map((op) => `\`${op}\` ${OP_LABELS[op]}`).join('、')}。`,
      '劇情段落（`weight: 0`）被 `next` 指到時**不檢查** require，寫 `{ ">=": ["age", 0] }` 就好。',
    ].join('\n'),
  )
  out.push('')
  out.push(
    [
      '## effects：結果改變了什麼',
      '',
      '只有這幾種，`type` 打錯就整包載不進去：',
      '',
      ...(Object.keys(EFFECT_LINES) as StateEffect['type'][]).map(
        (type) => `- \`${EFFECT_LINES[type]}\`\n  ${EFFECT_NOTES[type]}`,
      ),
      '',
      '一格通常一到三個效果，數值克制一點：一次事件不該讓人生翻盤。',
    ].join('\n'),
  )
  out.push('')
  out.push(
    [
      '## next：這一格之後演哪一格',
      '',
      '```',
      '"next": { "id": "下一格的 id" }                    同一年立刻接上',
      '"next": { "id": "下一格的 id", "afterYears": 5 }   五年後才演',
      '"next": { "id": "本命", "afterYears": 5, "orElse": "備案" }',
      '```',
      '',
      '- `next` 掛在 `good`／`bad` 上，不是掛在事件上——成功與失敗才能通往不同的地方。',
      '- `afterYears >= 1` 時到期會檢查目標的 `require`，不成立就改演 `orElse`。',
      '- **指到的 id 一定要真的存在**（在你這次產的這批裡面）。',
    ].join('\n'),
  )

  const assetLines = [assetLine(catalogue, 'bg', '背景'), assetLine(catalogue, 'actor', '角色')].filter(
    (line): line is string => line !== undefined,
  )
  if (assetLines.length > 0) {
    out.push('')
    out.push(
      [
        '## scene：從下面的 id 挑，不要自己造',
        '',
        ...assetLines,
        '',
        '挑不到夠像的就整個 `scene` 留空物件 `{}`。',
      ].join('\n'),
    )
  }

  if (existingIds.length > 0) {
    out.push('')
    out.push(
      [
        '## 已經有的事件',
        '',
        `這些 id 已經被用掉了，**不要重複**：${existingIds.join('、')}`,
      ].join('\n'),
    )
  }

  if (examples.length > 0) {
    out.push('')
    out.push(
      [
        '## 範例（這是遊戲裡真的在跑的事件，語氣照這個來）',
        '',
        '```json',
        JSON.stringify({ events: examples }, null, 2),
        '```',
      ].join('\n'),
    )
  }

  out.push('')
  out.push(
    [
      '## 文字怎麼寫',
      '',
      '- 中文（繁體），敘事口吻，寫具體的畫面與動作，不要形容詞堆砌、不要說教。',
      '- `prompt` 停在**選擇之前**：把人放進處境，不要先講結果。',
      '- 成功不一定是好事、失敗不一定是壞事——兩邊都要像真的會發生的事。',
      '- 每句話不超過四十個字。',
      '',
      '再說一次：**只輸出 JSON**。',
    ].join('\n'),
  )

  return out.join('\n')
}
