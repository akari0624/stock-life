import { describe, it, expect } from 'vitest'
import { EditorStore } from '../editor/EditorStore.ts'

function memoryStore() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    map,
  }
}

const fresh = () => new EditorStore({ store: memoryStore(), loadBaseline: false })

describe('EditorStore', () => {
  it('改 id 連帶改掉所有指向它的箭頭', () => {
    const store = fresh()
    store.addEvent('entry')
    store.addEvent('beat')
    store.updateEvent(0, { id: 'entry' })
    store.updateEvent(1, { id: 'beat' })
    store.updateEvent(0, { good: { effects: [], next: { id: 'beat', afterYears: 2, orElse: 'beat' } } })

    store.updateEvent(1, { id: 'renamed_beat' })

    const { draft, validation } = store.getSnapshot()
    expect(draft.events[0]!.good.next).toEqual({ id: 'renamed_beat', afterYears: 2, orElse: 'renamed_beat' })
    // 改名沒有製造出斷鏈——那正是這個行為存在的理由
    expect(validation.brokenLinks).toEqual([])
  })

  it('入口 ↔ 段落只改 weight，別的都不動', () => {
    const store = fresh()
    store.addEvent('entry')
    store.updateEvent(0, { prompt: '情境' })
    expect(store.getSnapshot().draft.events[0]!.weight).toBeGreaterThan(0)

    store.setKind(0, 'beat')
    expect(store.getSnapshot().draft.events[0]!.weight).toBe(0)
    expect(store.getSnapshot().draft.events[0]!.prompt).toBe('情境')
  })

  it('新增時自動避開已經用掉的 id', () => {
    const store = fresh()
    store.addEvent('entry')
    store.addEvent('entry')
    const ids = store.getSnapshot().draft.events.map((event) => event.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('複製一格會拿到新 id，不會製造重複', () => {
    const store = fresh()
    store.addEvent('entry')
    store.duplicateEvent(0)
    const { draft, validation } = store.getSnapshot()
    expect(draft.events).toHaveLength(2)
    expect(validation.duplicateIds).toEqual([])
  })

  it('匯入壞掉的 JSON 不會弄壞現有的草稿', () => {
    const store = fresh()
    store.addEvent('entry')
    store.importText('{ this is not json', 'bad.json')
    const snapshot = store.getSnapshot()
    expect(snapshot.notice?.kind).toBe('error')
    expect(snapshot.draft.events).toHaveLength(1)
  })

  it('草稿寫進 localStorage，重開頁面回得來', () => {
    const backing = memoryStore()
    const first = new EditorStore({ store: backing, loadBaseline: false })
    first.addEvent('entry')
    first.updateEvent(0, { id: 'kept', prompt: '記得我' })

    const second = new EditorStore({ store: backing, loadBaseline: false })
    expect(second.getSnapshot().draft.events[0]).toMatchObject({ id: 'kept', prompt: '記得我' })
  })

  it('驗收走的是遊戲真正的載入器（§6.4 dogfooding）', async () => {
    const store = fresh()
    store.addEvent('entry')
    store.setWithCoreTw(false)
    await store.verify()
    const { verify } = store.getSnapshot()
    // 空的 prompt／label 會被同一套 schema 擋下來，訊息就是 schema 裡那句中文
    expect(verify.ok).toBe(false)
    expect(verify.messages.join('\n')).toContain('prompt')
  })
})
