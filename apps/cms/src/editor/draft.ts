import type { Expr, SceneRef, StateEffect } from '@stock-life/engine'

/**
 * 作者手上那份**還沒寫完**的內容包。
 *
 * ⚠️ 這裡的型別刻意是寬鬆的：`id` 可以是空字串、`prompt` 可以還沒填。
 * 編輯中的事件本來就是不合法的——如果草稿只能裝合法資料，作者連第一個字都
 * 打不出來。合法性由 `validate.ts` 用**同一套 zod schema**回答（§6.5.3 #3），
 * 不在型別上重寫第二套規則。
 *
 * 三檔選項（safe/normal/bold）是 schema 鎖死的形狀（§6.5.5 還沒定案要不要改），
 * 所以草稿也照這個形狀走——編輯器不預設答案，只實作現在的 schema。
 */

export type ChoiceId = 'safe' | 'normal' | 'bold'

export const CHOICE_IDS: readonly ChoiceId[] = ['safe', 'normal', 'bold']

export const CHOICE_LABELS: Record<ChoiceId, string> = {
  safe: '保守',
  normal: '普通',
  bold: '大膽',
}

export interface DraftChoice {
  id: ChoiceId
  label: string
  /** 有號整數字串，例如 `+20`、`0`、`-15`（schema 要求的形狀） */
  odds: string
  mag: number
  good: string
  bad: string
}

export interface DraftLink {
  id: string
  afterYears?: number
  orElse?: string
}

export interface DraftOutcome {
  effects: StateEffect[]
  next?: DraftLink
}

export interface DraftEvent {
  id: string
  require: Expr
  weight: number
  once: boolean
  prompt: string
  choices: DraftChoice[]
  good: DraftOutcome
  bad: DraftOutcome
  scene: SceneRef
}

export interface DraftManifest {
  id: string
  version: string
  engineApi: string
  facadeVersion: number
  requires: { id: string; version: string }[]
  assets: { actors: Record<string, unknown>; bg: Record<string, unknown>; sfx: Record<string, unknown> }
}

/**
 * 一整包草稿。`opportunities` / `careerGraph` / `traits` 是 **unknown 原樣保留**：
 * 這是事件編輯器，不是機會編輯器——但匯入一個有機會的包再匯出時，
 * 不可以把作者的東西吃掉。
 */
export interface PackDraft {
  manifest: DraftManifest
  events: DraftEvent[]
  opportunities: unknown[]
  careerGraph: unknown
  traits: unknown[]
}

/** §6.5.1 的「永遠成立」：schema 要求 require 必填，這是它的中性寫法。 */
export const ALWAYS: Expr = { '>=': ['age', 0] }

export function isAlways(expr: Expr): boolean {
  return JSON.stringify(expr) === JSON.stringify(ALWAYS)
}

/**
 * §6.5.2 的兩種框。入口靠抽籤進來，段落只走箭頭——這是**同一個 schema 的兩種用法**，
 * 差別只在 weight，但作者腦中會混在一起，所以編輯器必須把它變成一個明確的選擇。
 */
export type EventKind = 'entry' | 'beat'

export function kindOf(event: DraftEvent): EventKind {
  return event.weight > 0 ? 'entry' : 'beat'
}

/** core-tw 現有入口事件的權重落在 6–14；8 是最常見的那一檔。 */
export const DEFAULT_ENTRY_WEIGHT = 8

function blankChoices(): DraftChoice[] {
  return [
    { id: 'safe', label: '', odds: '+20', mag: 1, good: '', bad: '' },
    { id: 'normal', label: '', odds: '0', mag: 2, good: '', bad: '' },
    { id: 'bold', label: '', odds: '-20', mag: 3, good: '', bad: '' },
  ]
}

export function newEvent(kind: EventKind, id: string): DraftEvent {
  return {
    id,
    require: ALWAYS,
    weight: kind === 'entry' ? DEFAULT_ENTRY_WEIGHT : 0,
    once: kind === 'beat',
    prompt: '',
    choices: blankChoices(),
    good: { effects: [] },
    bad: { effects: [] },
    scene: {},
  }
}

export function emptyDraft(): PackDraft {
  return {
    manifest: {
      id: 'my-pack',
      version: '1.0.0',
      engineApi: '^1',
      facadeVersion: 1,
      requires: [],
      assets: { actors: {}, bg: {}, sfx: {} },
    },
    events: [],
    opportunities: [],
    careerGraph: { nodes: [], edges: [] },
    traits: [],
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

function normalizeLink(value: unknown): DraftLink | undefined {
  const raw = asRecord(value)
  if (typeof raw.id !== 'string') return undefined
  return {
    id: raw.id,
    ...(typeof raw.afterYears === 'number' ? { afterYears: raw.afterYears } : {}),
    ...(typeof raw.orElse === 'string' ? { orElse: raw.orElse } : {}),
  }
}

function normalizeOutcome(value: unknown): DraftOutcome {
  const raw = asRecord(value)
  const next = normalizeLink(raw.next)
  return {
    // effects 原樣搬過來：counter／flag 這類編輯器不提供的效果**必須留著**
    // （§6.5.1 說它們不進 UI，不是說可以把作者寫好的東西刪掉）
    effects: asArray(raw.effects) as StateEffect[],
    ...(next ? { next } : {}),
  }
}

function normalizeChoices(value: unknown): DraftChoice[] {
  const raw = asArray(value).map(asRecord)
  return CHOICE_IDS.map((id, index) => {
    const found = raw.find((choice) => choice.id === id) ?? raw[index] ?? {}
    const fallback = blankChoices()[index] as DraftChoice
    return {
      id,
      label: asString(found.label),
      odds: asString(found.odds, fallback.odds),
      mag: asNumber(found.mag, fallback.mag),
      good: asString(found.good),
      bad: asString(found.bad),
    }
  })
}

export function normalizeEvent(value: unknown): DraftEvent {
  const raw = asRecord(value)
  const scene = asRecord(raw.scene)
  return {
    id: asString(raw.id),
    require: (raw.require ?? ALWAYS) as Expr,
    weight: asNumber(raw.weight, 0),
    once: raw.once === true,
    prompt: asString(raw.prompt),
    choices: normalizeChoices(raw.choices),
    good: normalizeOutcome(raw.good),
    bad: normalizeOutcome(raw.bad),
    scene: {
      ...(typeof scene.bg === 'string' ? { bg: scene.bg } : {}),
      ...(typeof scene.actor === 'string' ? { actor: scene.actor } : {}),
      ...(typeof scene.sfx === 'string' ? { sfx: scene.sfx } : {}),
      ...(typeof scene.fx === 'string' ? { fx: scene.fx } : {}),
    },
  }
}

/** 把匯入的 JSON 攤成草稿。壞掉的地方補預設值，讓作者能在編輯器裡修，而不是被拒於門外。 */
export function normalizeDraft(value: unknown): PackDraft {
  const file = asRecord(value)
  const manifest = asRecord(file.manifest)
  const assets = asRecord(manifest.assets)
  const blank = emptyDraft()

  return {
    manifest: {
      id: asString(manifest.id, blank.manifest.id),
      version: asString(manifest.version, blank.manifest.version),
      engineApi: asString(manifest.engineApi, blank.manifest.engineApi),
      facadeVersion: asNumber(manifest.facadeVersion, blank.manifest.facadeVersion),
      requires: asArray(manifest.requires) as { id: string; version: string }[],
      assets: {
        actors: asRecord(assets.actors),
        bg: asRecord(assets.bg),
        sfx: asRecord(assets.sfx),
      },
    },
    events: asArray(file.events).map(normalizeEvent),
    opportunities: asArray(file.opportunities),
    careerGraph: file.careerGraph ?? blank.careerGraph,
    traits: asArray(file.traits),
  }
}

/**
 * 草稿 → 匯出用的內容包檔案。
 *
 * `provides` 從實際陣列長度算出來，不讓作者手寫（§6.4：手寫的數字一定會對不上）。
 * 空字串的 scene id 與 afterYears: 0 在這裡清掉——它們是表單的中間狀態，
 * 不是作者想寫進包裡的東西。
 */
export function toPackFile(draft: PackDraft): Record<string, unknown> {
  return {
    manifest: {
      ...draft.manifest,
      provides: {
        events: draft.events.length,
        opportunities: draft.opportunities.length,
        careers: (asRecord(draft.careerGraph).nodes as unknown[] | undefined)?.length ?? 0,
        traits: draft.traits.length,
        worldGenerators: [],
      },
    },
    events: draft.events.map(cleanEvent),
    opportunities: draft.opportunities,
    careerGraph: draft.careerGraph,
    traits: draft.traits,
  }
}

function cleanLink(link: DraftLink | undefined): DraftLink | undefined {
  if (!link || link.id.length === 0) return undefined
  return {
    id: link.id,
    // 0 與省略在引擎裡是同一件事（§7.2）——寫成省略，讓匯出的 JSON 讀起來就是作者的意思
    ...(link.afterYears !== undefined && link.afterYears > 0 ? { afterYears: link.afterYears } : {}),
    ...(link.orElse !== undefined && link.orElse.length > 0 ? { orElse: link.orElse } : {}),
  }
}

function cleanEvent(event: DraftEvent): Record<string, unknown> {
  const scene = Object.fromEntries(
    Object.entries(event.scene).filter(([, id]) => typeof id === 'string' && id.length > 0),
  )
  const outcome = (branch: DraftOutcome): Record<string, unknown> => {
    const next = cleanLink(branch.next)
    return { effects: branch.effects, ...(next ? { next } : {}) }
  }
  return {
    id: event.id,
    require: event.require,
    weight: event.weight,
    once: event.once,
    prompt: event.prompt,
    choices: event.choices,
    good: outcome(event.good),
    bad: outcome(event.bad),
    scene,
  }
}
