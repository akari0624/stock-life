import { describe, it, expect } from 'vitest'
import { mergeEvents, parsePasted } from '../editor/paste.ts'
import { newEvent, type DraftEvent } from '../editor/draft.ts'

/** AI 回一批事件時最常見的那個形狀。 */
const eventsJson = `{
  "events": [
    { "id": "a", "require": { ">=": ["age", 28] }, "weight": 8, "once": true, "prompt": "情境",
      "choices": [
        { "id": "safe", "label": "推掉", "odds": "+20", "mag": 1, "good": "g", "bad": "b" },
        { "id": "normal", "label": "答應", "odds": "0", "mag": 2, "good": "g", "bad": "b" },
        { "id": "bold", "label": "全押", "odds": "-20", "mag": 3, "good": "g", "bad": "b" }
      ],
      "good": { "effects": [], "next": { "id": "b" } }, "bad": { "effects": [] }, "scene": {} },
    { "id": "b", "require": { ">=": ["age", 0] }, "weight": 0, "once": true, "prompt": "續集",
      "choices": [], "good": { "effects": [] }, "bad": { "effects": [] }, "scene": {} }
  ]
}`

describe('吃下 AI 回的那一坨（§6.5.6）', () => {
  it('markdown 圍籬與前後的客套話都剝得掉', () => {
    const result = parsePasted(`好的，以下是您要的內容：\n\n\`\`\`json\n${eventsJson}\n\`\`\`\n\n需要我再加幾個嗎？`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.kind).toBe('events')
    expect(result.value.events.map((event) => event.id)).toEqual(['a', 'b'])
  })

  it('裸陣列、單一個事件、一整包都認得出來', () => {
    const array = parsePasted(`[${JSON.stringify({ id: 'solo', prompt: '情境' })}]`)
    expect(array.ok && array.value.kind).toBe('events')

    const single = parsePasted(JSON.stringify({ id: 'solo', prompt: '情境', weight: 8 }))
    expect(single.ok && single.value.kind).toBe('event')

    const pack = parsePasted(
      JSON.stringify({ manifest: { id: 'from-ai', version: '2.0.0' }, events: [{ id: 'x' }], traits: [{ id: 't' }] }),
    )
    expect(pack.ok && pack.value.kind).toBe('pack')
    // 一整包要連 manifest 與特質一起收下，不能只挑事件走
    expect(pack.ok && pack.value.pack?.manifest.version).toBe('2.0.0')
    expect(pack.ok && pack.value.pack?.traits).toEqual([{ id: 't' }])
  })

  it('結尾多一個逗號還是進得來——那是 AI 最常犯的一種壞', () => {
    const result = parsePasted('{ "events": [ { "id": "a", "prompt": "情境" }, ] }')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.events).toHaveLength(1)
  })

  it('缺欄位不擋：補成表單改得動的形狀（§6.5.6 的「貼進來壞掉是正常的」）', () => {
    const result = parsePasted('{ "events": [ { "id": "half" } ] }')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const event = result.value.events[0] as DraftEvent
    expect(event.prompt).toBe('')
    expect(event.choices.map((choice) => choice.id)).toEqual(['safe', 'normal', 'bold'])
  })

  it('認不出來的東西才報錯，而且講得出是哪一種壞', () => {
    expect(parsePasted('')).toMatchObject({ ok: false })
    expect(parsePasted('我不知道你在說什麼')).toMatchObject({ ok: false })
    const notEvents = parsePasted('{ "hello": "world" }')
    expect(notEvents.ok).toBe(false)
    if (notEvents.ok) return
    expect(notEvents.problem).toContain('events')
  })
})

describe('附加一批進來（mergeEvents）', () => {
  const withId = (id: string, next?: string): DraftEvent => {
    const event = newEvent('entry', id)
    if (next) event.good.next = { id: next }
    return event
  }

  it('撞到 id 時改新來的那一批，而且那一批內部的箭頭跟著改', () => {
    const existing = [withId('arc_1')]
    const incoming = [withId('arc_1', 'arc_2'), withId('arc_2')]

    const merged = mergeEvents(existing, incoming)

    expect(merged.events.map((event) => event.id)).toEqual(['arc_1', 'arc_1_2', 'arc_2'])
    expect(merged.renamed).toEqual([{ from: 'arc_1', to: 'arc_1_2' }])
    // 改名不可以把 AI 產的那一串故事接點弄斷
    expect(merged.events[1]?.good.next).toEqual({ id: 'arc_2' })
  })

  it('新 id 也避開這一批裡還沒輪到的那幾格', () => {
    const merged = mergeEvents([withId('a')], [withId('a'), withId('a_2')])
    const ids = merged.events.map((event) => event.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('沒撞到就原封不動', () => {
    const merged = mergeEvents([withId('a')], [withId('b', 'a')])
    expect(merged.renamed).toEqual([])
    // 跨批指向現有事件是合法的接法，不可以被當成撞名改掉
    expect(merged.events[1]?.good.next).toEqual({ id: 'a' })
  })
})
