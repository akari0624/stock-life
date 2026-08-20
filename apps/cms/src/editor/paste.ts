import { normalizeDraft, normalizeEvent, renameLinks, type DraftEvent, type PackDraft } from './draft.ts'

/**
 * §6.5.6 第二格：**把 AI 回的那一坨吃下去**。
 *
 * AI 不會乖乖只回 JSON。它會包一層 markdown 圍籬、會在前面加一句「以下是您要的
 * 內容：」、會回一整包／只回 `{ "events": [...] }`／回一個裸陣列／只回一個事件、
 * 會留一個結尾逗號。這幾種一律吃得下——認不出來才報錯。
 *
 * ⚠️ **這裡不驗證內容**（跟匯入檔案同一個決定）：缺欄位由 `normalizeEvent()` 補成
 * 表單改得動的形狀，壞掉的地方由 §6.5.3 #3 的即時驗證標紅。AI 產的事件本來就會有
 * 幾格是壞的，擋在門外的話作者連看都看不到。
 */

export type PastedKind = 'pack' | 'events' | 'event'

export const PASTED_KIND_LABELS: Record<PastedKind, string> = {
  pack: '一整包內容包',
  events: '一批事件',
  event: '一個事件',
}

export interface PastedContent {
  kind: PastedKind
  events: DraftEvent[]
  /** 只有 `kind === 'pack'` 時才有：連 manifest 與機會／職涯／特質一起 */
  pack?: PackDraft
}

export type ParseResult = { ok: true; value: PastedContent } | { ok: false; problem: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** 有沒有一點事件的樣子。寬鬆是刻意的：只寫了 id 跟 prompt 的半成品也要進得來。 */
function looksLikeEvent(value: unknown): boolean {
  if (!isRecord(value)) return false
  return ['id', 'prompt', 'choices', 'require', 'weight'].some((key) => key in value)
}

/** 把 AI 的客套話與 markdown 圍籬剝掉，留下中間那段 JSON。 */
export function extractJson(text: string): string {
  const trimmed = text.trim()
  const fenced = /```[a-z0-9]*\s*\r?\n([\s\S]*?)```/i.exec(trimmed)
  const body = (fenced?.[1] ?? trimmed).trim()

  const start = firstOf(body, ['{', '['])
  const end = lastOf(body, ['}', ']'])
  if (start < 0 || end <= start) return body
  return body.slice(start, end + 1)
}

function firstOf(text: string, chars: string[]): number {
  const found = chars.map((char) => text.indexOf(char)).filter((at) => at >= 0)
  return found.length > 0 ? Math.min(...found) : -1
}

function lastOf(text: string, chars: string[]): number {
  return Math.max(...chars.map((char) => text.lastIndexOf(char)))
}

/**
 * 嚴格解析一次；失敗才退一步把結尾逗號拿掉再試。
 *
 * 順序是重點：那條 regex 有可能誤傷字串裡的 `,}`，所以它只在「反正已經壞了」
 * 的情況下出手。
 */
function parseJson(source: string): { ok: true; value: unknown } | { ok: false; problem: string } {
  try {
    return { ok: true, value: JSON.parse(source) }
  } catch (error) {
    try {
      return { ok: true, value: JSON.parse(source.replace(/,(\s*[}\]])/g, '$1')) }
    } catch {
      return { ok: false, problem: `不是合法的 JSON：${(error as Error).message}` }
    }
  }
}

export function parsePasted(text: string): ParseResult {
  if (text.trim().length === 0) return { ok: false, problem: '還沒貼東西進來' }

  const parsed = parseJson(extractJson(text))
  if (!parsed.ok) return { ok: false, problem: parsed.problem }
  const value = parsed.value

  if (Array.isArray(value)) {
    if (value.length === 0) return { ok: false, problem: '貼進來的是一個空陣列，裡面沒有事件' }
    if (!value.some(looksLikeEvent)) return { ok: false, problem: '這個陣列裡面看起來不是事件' }
    return { ok: true, value: { kind: 'events', events: value.map(normalizeEvent) } }
  }

  if (isRecord(value)) {
    if (Array.isArray(value.events)) {
      const events = value.events.map(normalizeEvent)
      // 有 manifest 就是一整包：機會／職涯／特質也要一起收下，作者的東西不能被吃掉
      if (isRecord(value.manifest)) {
        return { ok: true, value: { kind: 'pack', events, pack: normalizeDraft(value) } }
      }
      if (events.length === 0) return { ok: false, problem: '`events` 是空的，裡面沒有事件' }
      return { ok: true, value: { kind: 'events', events } }
    }
    if (looksLikeEvent(value)) {
      return { ok: true, value: { kind: 'event', events: [normalizeEvent(value)] } }
    }
  }

  return {
    ok: false,
    problem: '認不出這是什麼。要的是一整包、`{ "events": [ … ] }`、事件陣列，或單獨一個事件物件',
  }
}

export interface MergeResult {
  events: DraftEvent[]
  /** 撞到 id 而被改名的：舊 id → 新 id。UI 要講出來，不然作者會以為 AI 寫錯了 */
  renamed: { from: string; to: string }[]
}

/**
 * 把貼進來的一批接在現有事件後面。
 *
 * 撞 id 時改的是**新來的那一批**（現有草稿是作者已經在改的東西，不能動），
 * 而且**同步改掉那一批內部指向它的箭頭**——AI 產的一串連續事件不可以因為改名
 * 就斷成散裝的幾格。
 */
export function mergeEvents(existing: readonly DraftEvent[], incoming: readonly DraftEvent[]): MergeResult {
  const existingIds = new Set(existing.map((event) => event.id).filter((id) => id.length > 0))
  // 新 id 要避開兩邊所有的 id，包含這一批裡還沒輪到的那幾格
  const taken = new Set([...existingIds, ...incoming.map((event) => event.id)])

  const renames = new Map<string, string>()
  for (const event of incoming) {
    if (event.id.length === 0 || !existingIds.has(event.id) || renames.has(event.id)) continue
    const to = freshId(event.id, taken)
    taken.add(to)
    renames.set(event.id, to)
  }

  const batch = incoming.map((event) => {
    let next = renames.has(event.id) ? { ...event, id: renames.get(event.id) as string } : event
    for (const [from, to] of renames) next = renameLinks(next, from, to)
    return next
  })

  return {
    events: [...existing, ...batch],
    renamed: [...renames].map(([from, to]) => ({ from, to })),
  }
}

function freshId(base: string, taken: ReadonlySet<string>): string {
  for (let n = 2; ; n++) {
    const candidate = `${base}_${n}`
    if (!taken.has(candidate)) return candidate
  }
}
