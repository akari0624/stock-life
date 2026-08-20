import { describe, it, expect } from 'vitest'
import { emptyDraft, newEvent } from '../editor/draft.ts'
import { buildGraph } from '../editor/graph.ts'

describe('故事圖', () => {
  it('入口在最左邊，每條箭頭往右推一欄', () => {
    const draft = emptyDraft()
    const entry = newEvent('entry', 'entry')
    entry.good.next = { id: 'terms' }
    entry.bad.next = { id: 'number' }
    const terms = newEvent('beat', 'terms')
    terms.good.next = { id: 'first_year', afterYears: 1 }
    const number = newEvent('beat', 'number')
    number.good.next = { id: 'first_year', afterYears: 1 }
    draft.events = [entry, terms, number, newEvent('beat', 'first_year')]

    const { nodes } = buildGraph(draft, new Set())
    const col = (id: string) => nodes.find((node) => node.id === id)?.col
    expect(col('entry')).toBe(0)
    expect(col('terms')).toBe(1)
    expect(col('number')).toBe(1)
    // 匯流：兩條線指過來，落在較深的那一欄——匯流不需要特別支援（§6.5.1）
    expect(col('first_year')).toBe(2)
  })

  it('兩種框分得出來，而且不會把入口誤判成孤島', () => {
    const draft = emptyDraft()
    draft.events = [newEvent('entry', 'e'), newEvent('beat', 'orphan')]
    const { nodes } = buildGraph(draft, new Set())
    expect(nodes.find((node) => node.id === 'e')?.kind).toBe('entry')
    expect(nodes.find((node) => node.id === 'e')?.orphan).toBe(false)
    // 權重 0 又沒有人指向它：寫了但玩家永遠看不到
    expect(nodes.find((node) => node.id === 'orphan')?.orphan).toBe(true)
  })

  it('分得出「官方包的事件」與「根本不存在的 id」', () => {
    const draft = emptyDraft()
    const entry = newEvent('entry', 'e')
    entry.good.next = { id: 'core_event' }
    entry.bad.next = { id: 'typo_here' }
    draft.events = [entry]

    const { nodes, edges } = buildGraph(draft, new Set(['core_event']))
    expect(nodes.find((node) => node.id === 'core_event')?.kind).toBe('external')
    expect(nodes.find((node) => node.id === 'typo_here')?.kind).toBe('missing')
    expect(edges.filter((edge) => edge.broken).map((edge) => edge.to)).toEqual(['typo_here'])
  })

  it('迴圈不會讓擺放算不完', () => {
    const draft = emptyDraft()
    const a = newEvent('entry', 'a')
    a.good.next = { id: 'b' }
    const b = newEvent('beat', 'b')
    b.good.next = { id: 'a' }
    draft.events = [a, b]

    const { nodes } = buildGraph(draft, new Set())
    expect(nodes).toHaveLength(2)
    expect(nodes.every((node) => Number.isFinite(node.col))).toBe(true)
  })

  it('orElse 是自己一條邊，虛線畫得出來', () => {
    const draft = emptyDraft()
    const a = newEvent('entry', 'a')
    a.good.next = { id: 'b', afterYears: 5, orElse: 'c' }
    draft.events = [a, newEvent('beat', 'b'), newEvent('beat', 'c')]

    const { edges } = buildGraph(draft, new Set())
    expect(edges).toHaveLength(2)
    expect(edges.map((edge) => edge.kind)).toEqual(['next', 'orElse'])
    expect(edges[0]!.afterYears).toBe(5)
  })
})
