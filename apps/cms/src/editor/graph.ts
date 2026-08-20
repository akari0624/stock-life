import { kindOf, type PackDraft } from './draft.ts'

/**
 * 故事圖的資料（§6.5.1：作者看到的是框和箭頭）。
 *
 * 純資料、沒有 React——擺放規則要能被測試，而不是只能用眼睛看畫出來對不對。
 */

export type NodeKind = 'entry' | 'beat' | 'external' | 'missing'

export interface GraphNode {
  id: string
  kind: NodeKind
  /** 草稿裡的索引，外部／不存在的目標是 -1 */
  index: number
  weight: number
  once: boolean
  /** 沒有任何箭頭指向它，而且它自己也不抽籤——寫了但進不去的一格 */
  orphan: boolean
  col: number
  row: number
}

export interface GraphEdge {
  from: string
  to: string
  branch: 'good' | 'bad'
  kind: 'next' | 'orElse'
  afterYears: number
  broken: boolean
}

/**
 * 分層擺放：入口在最左邊，每條箭頭往右推一欄。
 * 有迴圈的圖不會爆掉——傳遞次數上限就是節點數。
 */
export function buildGraph(draft: PackDraft, externalIds: ReadonlySet<string>): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  draft.events.forEach((event, index) => {
    if (event.id.length === 0) return
    nodes.set(event.id, {
      id: event.id,
      kind: kindOf(event) === 'entry' ? 'entry' : 'beat',
      index,
      weight: event.weight,
      once: event.once,
      orphan: false,
      col: 0,
      row: 0,
    })
  })

  const ensure = (id: string): void => {
    if (nodes.has(id)) return
    nodes.set(id, {
      id,
      kind: externalIds.has(id) ? 'external' : 'missing',
      index: -1,
      weight: 0,
      once: false,
      orphan: false,
      col: 0,
      row: 0,
    })
  }

  for (const event of draft.events) {
    if (event.id.length === 0) continue
    for (const branch of ['good', 'bad'] as const) {
      const link = event[branch].next
      if (!link || link.id.length === 0) continue
      ensure(link.id)
      edges.push({
        from: event.id,
        to: link.id,
        branch,
        kind: 'next',
        afterYears: link.afterYears ?? 0,
        broken: nodes.get(link.id)?.kind === 'missing',
      })
      if (link.orElse && link.orElse.length > 0) {
        ensure(link.orElse)
        edges.push({
          from: event.id,
          to: link.orElse,
          branch,
          kind: 'orElse',
          afterYears: link.afterYears ?? 0,
          broken: nodes.get(link.orElse)?.kind === 'missing',
        })
      }
    }
  }

  const incoming = new Set(edges.map((edge) => edge.to))
  for (const node of nodes.values()) {
    node.orphan = node.kind === 'beat' && !incoming.has(node.id)
  }

  // 每一條邊把目標往右推一欄，跑到不動為止（上限＝節點數，擋掉迴圈）
  for (let pass = 0; pass < nodes.size; pass++) {
    let moved = false
    for (const edge of edges) {
      const from = nodes.get(edge.from)
      const to = nodes.get(edge.to)
      if (!from || !to || to === from) continue
      if (to.col < from.col + 1) {
        to.col = from.col + 1
        moved = true
      }
    }
    if (!moved) break
  }

  const perCol = new Map<number, number>()
  for (const node of [...nodes.values()].sort((a, b) => a.col - b.col || a.index - b.index)) {
    const row = perCol.get(node.col) ?? 0
    node.row = row
    perCol.set(node.col, row + 1)
  }

  return { nodes: [...nodes.values()], edges }
}
