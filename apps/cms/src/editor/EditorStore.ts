import {
  createCoreTwSource,
  loadContentPack,
  mergeContentPacks,
  validateMergedContent,
  PasteSource,
  type EventChoiceId,
  type LoadedContentPack,
  type Manifest,
  type ProbeReport,
} from '@stock-life/engine'
import {
  emptyDraft,
  kindOf,
  newEvent,
  normalizeDraft,
  toPackFile,
  type DraftEvent,
  type DraftManifest,
  type EventKind,
  type PackDraft,
} from './draft.ts'
import { validateDraft, type ValidationReport } from './validate.ts'
import { TrialRunner } from '../trial/client.ts'
import type { TrialRequest } from '../trial/protocol.ts'

/**
 * 編輯器的唯一組裝點。跟 apps/web 的 `AppStore` 同一個做法（§10.1）：
 * 沒有狀態管理套件，store 自己持有狀態，UI 用 `useSyncExternalStore` 訂閱。
 *
 * 草稿存在 `localStorage`，跟 §6.5 提到的 `PackLibrary` 是**兩件不同的東西**：
 * 那邊存的是「驗證過、可以玩」的包；這邊存的是「寫到一半、大概是壞的」草稿。
 * 硬要共用一個儲存體會逼其中一邊放棄自己的前提。
 */

export const DRAFT_KEY = 'stock-life.cms.draft'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** 一起載入的官方包提供的東西：可以被 `next` 指到的事件、下拉選單的候選值。 */
export interface Baseline {
  eventIds: ReadonlySet<string>
  careerNodes: { id: string; industry: string }[]
  opportunityIds: string[]
  traitIds: string[]
  manifests: Manifest[]
}

export interface TrialState {
  running: boolean
  runs: number
  risk: EventChoiceId
  report: ProbeReport | undefined
  errors: string[] | undefined
}

export interface VerifyState {
  checking: boolean
  ok: boolean | undefined
  messages: string[]
}

export interface EditorSnapshot {
  draft: PackDraft
  /** 目前選到第幾格；-1 = 沒有選 */
  selected: number
  withCoreTw: boolean
  baseline: Baseline | undefined
  validation: ValidationReport
  trial: TrialState
  verify: VerifyState
  notice: { kind: 'ok' | 'error'; text: string } | undefined
}

function browserStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage as KeyValueStore | undefined
  } catch {
    return undefined
  }
}

export interface EditorStoreOptions {
  store?: KeyValueStore
  /** 測試用：跳過官方包載入與 Worker */
  loadBaseline?: boolean
}

export class EditorStore {
  private readonly listeners = new Set<() => void>()
  private readonly store: KeyValueStore | undefined
  private readonly trialRunner = new TrialRunner()

  private draft: PackDraft
  private selected = -1
  private withCoreTw = true
  private baseline: Baseline | undefined
  private trial: TrialState = { running: false, runs: 200, risk: 'normal', report: undefined, errors: undefined }
  private verifyState: VerifyState = { checking: false, ok: undefined, messages: [] }
  private notice: EditorSnapshot['notice']
  private snapshot: EditorSnapshot

  constructor(options: EditorStoreOptions = {}) {
    this.store = options.store ?? browserStore()
    this.draft = this.read()
    this.selected = this.draft.events.length > 0 ? 0 : -1
    this.snapshot = this.build()
    if (options.loadBaseline !== false) void this.loadBaseline()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): EditorSnapshot => this.snapshot

  // ── 選取與草稿 ─────────────────────────────────────────────

  select(index: number): void {
    this.selected = index
    this.commit(false)
  }

  addEvent(kind: EventKind): void {
    const id = this.freshId(kind === 'entry' ? 'new_event' : 'new_beat')
    this.draft = { ...this.draft, events: [...this.draft.events, newEvent(kind, id)] }
    this.selected = this.draft.events.length - 1
    this.commit()
  }

  duplicateEvent(index: number): void {
    const source = this.draft.events[index]
    if (!source) return
    const copy: DraftEvent = structuredClone(source)
    copy.id = this.freshId(source.id)
    const events = [...this.draft.events]
    events.splice(index + 1, 0, copy)
    this.draft = { ...this.draft, events }
    this.selected = index + 1
    this.commit()
  }

  removeEvent(index: number): void {
    const events = this.draft.events.filter((_, at) => at !== index)
    this.draft = { ...this.draft, events }
    this.selected = Math.min(this.selected, events.length - 1)
    this.commit()
  }

  /**
   * 改一格。
   *
   * 改 id 時**連帶改掉所有指向它的箭頭**：id 是圖上的節點名字，改名不該把作者
   * 昨天接好的線全部弄斷。這是編輯器該替作者做的事，不是該讓他自己去找的事。
   */
  updateEvent(index: number, patch: Partial<DraftEvent>): void {
    const current = this.draft.events[index]
    if (!current) return
    const updated = { ...current, ...patch }
    let events = this.draft.events.map((event, at) => (at === index ? updated : event))

    if (patch.id !== undefined && patch.id !== current.id && current.id.length > 0) {
      events = events.map((event, at) => (at === index ? event : renameLinks(event, current.id, patch.id as string)))
    }

    this.draft = { ...this.draft, events }
    this.commit()
  }

  /** §6.5.2：入口與段落的差別只有 weight，但那是作者腦中最容易混掉的一件事。 */
  setKind(index: number, kind: EventKind): void {
    const current = this.draft.events[index]
    if (!current || kindOf(current) === kind) return
    this.updateEvent(index, { weight: kind === 'entry' ? 8 : 0 })
  }

  updateManifest(patch: Partial<DraftManifest>): void {
    this.draft = { ...this.draft, manifest: { ...this.draft.manifest, ...patch } }
    this.commit()
  }

  setWithCoreTw(withCoreTw: boolean): void {
    this.withCoreTw = withCoreTw
    this.commit(false)
  }

  // ── 匯入／匯出 ─────────────────────────────────────────────

  /** 匯入**不驗證**：壞掉的包要進得來，作者才修得到。驗證由表單即時做。 */
  importText(text: string, label: string): void {
    try {
      this.draft = normalizeDraft(JSON.parse(text))
      this.selected = this.draft.events.length > 0 ? 0 : -1
      this.notice = { kind: 'ok', text: `已載入「${label}」，${this.draft.events.length} 個事件` }
    } catch (error) {
      this.notice = { kind: 'error', text: `不是合法的 JSON：${(error as Error).message}` }
    }
    this.commit()
  }

  async importFile(file: { name: string; text(): Promise<string> }): Promise<void> {
    this.importText(await file.text(), file.name)
  }

  exportText(): string {
    return JSON.stringify(toPackFile(this.draft), null, 2)
  }

  resetDraft(): void {
    this.draft = emptyDraft()
    this.selected = -1
    this.notice = { kind: 'ok', text: '已清空，從一個空包開始' }
    this.commit()
  }

  dismissNotice(): void {
    this.notice = undefined
    this.commit(false)
  }

  // ── 用真正的載入器驗收 ──────────────────────────────────────

  /**
   * §6.4 的 dogfooding：不自己重寫一套「可不可以上線」的判斷，直接把草稿丟進
   * **遊戲真正在用的那個載入器**。checkTrust 的大小與數量上限、engineApi 相容性、
   * 跨包的斷鏈檢查——全部在這一步一次講完。
   */
  async verify(): Promise<void> {
    this.verifyState = { checking: true, ok: undefined, messages: [] }
    this.commit(false)

    const messages: string[] = []
    const result = await loadContentPack(new PasteSource(this.draft.manifest.id, this.exportText()))
    if (!result.ok) {
      for (const issue of result.errors) messages.push(`${issue.section}：${issue.message}（${issue.path.join('.')}）`)
      this.verifyState = { checking: false, ok: false, messages }
      this.commit(false)
      return
    }

    const packs: LoadedContentPack[] = [result.pack]
    if (this.withCoreTw) {
      const core = await loadContentPack(createCoreTwSource())
      if (core.ok) packs.unshift(core.pack)
    }
    const { content } = mergeContentPacks(packs)
    for (const issue of validateMergedContent(content)) messages.push(`${issue.section}：${issue.message}`)

    this.verifyState = { checking: false, ok: messages.length === 0, messages }
    this.commit(false)
  }

  // ── 統計試跑 ───────────────────────────────────────────────

  setTrialOptions(patch: Partial<Pick<TrialState, 'runs' | 'risk'>>): void {
    this.trial = { ...this.trial, ...patch }
    this.commit(false)
  }

  async runTrial(): Promise<void> {
    this.trial = { ...this.trial, running: true, errors: undefined }
    this.commit(false)

    const request: TrialRequest = {
      runs: this.trial.runs,
      packText: this.exportText(),
      withCoreTw: this.withCoreTw,
      risk: this.trial.risk,
    }
    const response = await this.trialRunner.run(request)
    this.trial = response.ok
      ? { ...this.trial, running: false, report: response.report, errors: undefined }
      : { ...this.trial, running: false, errors: response.errors }
    this.commit(false)
  }

  // ── 內部 ───────────────────────────────────────────────────

  private async loadBaseline(): Promise<void> {
    const result = await loadContentPack(createCoreTwSource())
    if (!result.ok) return
    const pack = result.pack
    this.baseline = {
      eventIds: new Set(pack.events.map((event) => event.id)),
      careerNodes: pack.careerGraph.nodes.map((node) => ({ id: node.id, industry: node.industry })),
      opportunityIds: pack.opportunities.map((opportunity) => opportunity.id),
      traitIds: pack.traits.map((trait) => trait.id),
      manifests: [pack.manifest],
    }
    this.commit(false)
  }

  /** 草稿裡已經有的 id + （選了一起載入時）官方包的 id。斷鏈判斷要看這一份。 */
  private knownEventIds(): Set<string> {
    const ids = new Set(this.draft.events.map((event) => event.id).filter((id) => id.length > 0))
    if (this.withCoreTw && this.baseline) {
      for (const id of this.baseline.eventIds) ids.add(id)
    }
    return ids
  }

  private freshId(base: string): string {
    const taken = new Set(this.draft.events.map((event) => event.id))
    if (!taken.has(base)) return base
    for (let n = 2; ; n++) {
      const candidate = `${base}_${n}`
      if (!taken.has(candidate)) return candidate
    }
  }

  private build(): EditorSnapshot {
    return {
      draft: this.draft,
      selected: this.selected,
      withCoreTw: this.withCoreTw,
      baseline: this.baseline,
      validation: validateDraft(this.draft, this.knownEventIds()),
      trial: this.trial,
      verify: this.verifyState,
      notice: this.notice,
    }
  }

  private commit(persist = true): void {
    if (persist) this.write()
    this.snapshot = this.build()
    for (const listener of this.listeners) listener()
  }

  private read(): PackDraft {
    let text: string | null
    try {
      text = this.store?.getItem(DRAFT_KEY) ?? null
    } catch {
      return emptyDraft()
    }
    if (!text) return emptyDraft()
    try {
      return normalizeDraft(JSON.parse(text))
    } catch {
      return emptyDraft()
    }
  }

  private write(): void {
    try {
      this.store?.setItem(DRAFT_KEY, JSON.stringify(toPackFile(this.draft)))
    } catch {
      // 無痕／配額滿：這次還是編輯得下去，只是關掉頁面會掉。匯出鈕就在上面。
    }
  }
}

/** 把指向 `from` 的每一條箭頭改指 `to`。 */
function renameLinks(event: DraftEvent, from: string, to: string): DraftEvent {
  let touched = false
  const branches = { good: event.good, bad: event.bad }

  for (const branch of ['good', 'bad'] as const) {
    const link = branches[branch].next
    if (!link) continue
    const next = { ...link }
    if (next.id === from) {
      next.id = to
      touched = true
    }
    if (next.orElse === from) {
      next.orElse = to
      touched = true
    }
    branches[branch] = { ...branches[branch], next }
  }

  return touched ? { ...event, good: branches.good, bad: branches.bad } : event
}
