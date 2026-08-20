import { eventSchema, manifestSchema } from '@stock-life/engine'
import { toPackFile, type DraftEvent, type PackDraft } from './draft.ts'

/**
 * §6.5.3 #3：即時驗證，**用同一套 zod schema，不另寫一份**。
 *
 * 錯誤訊息本來就是中文的（schema 裡就寫好了），所以這裡不翻譯、不改寫——
 * 只做一件事：把 zod 的結構路徑對映回「哪一格的哪一欄」，讓表單畫得出紅框。
 *
 * 另外補兩件 zod 一個包一個包看的時候看不到的事：
 * - **重複 id**。`mergeContentPacks` 是純 flatMap，完全沒有防撞（§6.5.4）。
 *   引擎補上之前，編輯器至少不要讓作者在自己的包裡撞到自己。
 * - **斷鏈**。載入器會擋（§7.2），但那要等到匯出；作者打字的當下就該知道。
 */

export interface FieldIssue {
  /** zod 的結構路徑，已經去掉最前面的事件索引 */
  path: (string | number)[]
  message: string
}

export interface BrokenLink {
  eventId: string
  branch: 'good' | 'bad'
  field: 'id' | 'orElse'
  target: string
}

export interface ValidationReport {
  /** 事件索引 → 那一格的錯誤 */
  byEvent: Map<number, FieldIssue[]>
  /** manifest 與整包層級的錯誤 */
  pack: FieldIssue[]
  brokenLinks: BrokenLink[]
  duplicateIds: string[]
  ok: boolean
}

/** 表單用：把路徑壓成一個好查的 key。 */
export function issueKey(path: (string | number)[]): string {
  return path.join('.')
}

export function validateDraft(draft: PackDraft, knownEventIds: ReadonlySet<string>): ValidationReport {
  const byEvent = new Map<number, FieldIssue[]>()
  const pack: FieldIssue[] = []

  const file = toPackFile(draft)
  const manifest = manifestSchema.safeParse(file.manifest)
  if (!manifest.success) {
    for (const issue of manifest.error.issues) {
      pack.push({ path: ['manifest', ...(issue.path as (string | number)[])], message: issue.message })
    }
  }

  const events = file.events as unknown[]
  events.forEach((event, index) => {
    const result = eventSchema.safeParse(event)
    if (result.success) return
    byEvent.set(
      index,
      result.error.issues.map((issue) => ({
        path: issue.path as (string | number)[],
        message: issue.message,
      })),
    )
  })

  // 重複 id：兩格都標紅，因為作者不知道哪一格才是他想留的那一格
  const seen = new Map<string, number[]>()
  draft.events.forEach((event, index) => {
    const at = seen.get(event.id)
    if (at) at.push(index)
    else seen.set(event.id, [index])
  })
  const duplicateIds: string[] = []
  for (const [id, indexes] of seen) {
    if (id.length === 0 || indexes.length < 2) continue
    duplicateIds.push(id)
    for (const index of indexes) {
      const issues = byEvent.get(index) ?? []
      issues.push({ path: ['id'], message: `id「${id}」在這個包裡出現了 ${indexes.length} 次；同 id 會讓抽籤池有兩份、但內容只認最後一個` })
      byEvent.set(index, issues)
    }
  }

  const brokenLinks = findBrokenLinks(draft.events, knownEventIds)
  for (const link of brokenLinks) {
    const index = draft.events.findIndex((event) => event.id === link.eventId)
    if (index < 0) continue
    const issues = byEvent.get(index) ?? []
    issues.push({
      path: [link.branch, 'next', link.field],
      message: `指向不存在的事件「${link.target}」`,
    })
    byEvent.set(index, issues)
  }

  return {
    byEvent,
    pack,
    brokenLinks,
    duplicateIds,
    ok: pack.length === 0 && byEvent.size === 0,
  }
}

/** 草稿裡所有指不到人的箭頭。`knownEventIds` 要含一起載入的官方包，跨包接故事是合法的（§7.2）。 */
export function findBrokenLinks(
  events: readonly DraftEvent[],
  knownEventIds: ReadonlySet<string>,
): BrokenLink[] {
  const broken: BrokenLink[] = []
  for (const event of events) {
    for (const branch of ['good', 'bad'] as const) {
      const link = event[branch].next
      if (!link) continue
      if (link.id.length > 0 && !knownEventIds.has(link.id)) {
        broken.push({ eventId: event.id, branch, field: 'id', target: link.id })
      }
      if (link.orElse !== undefined && link.orElse.length > 0 && !knownEventIds.has(link.orElse)) {
        broken.push({ eventId: event.id, branch, field: 'orElse', target: link.orElse })
      }
    }
  }
  return broken
}
