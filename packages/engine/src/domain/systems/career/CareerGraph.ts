import type { Expr } from '../../expr/evaluate.js'

// §3's dependency arrow is `content ──► domain`, so the shape of the data a
// domain system consumes is declared *here*, and content/schema validates
// against it (same trick exprSchema already uses for Expr). Nothing in
// domain/ ever imports from content/.

export interface CareerNode {
  id: string
  industry: string
  rank: number
  /** [min, max] annual income; the actual figure is rolled on entry. */
  income: [number, number]
}

export interface CareerEdge {
  from: string
  to: string
  require: Expr
  /**
   * §7.3 / TODO.md #3: how the transition reaches the player. Only
   * "opportunity" (the system proposes) ships now; "browsable" (the player
   * plans ahead) is a later UI over this exact same graph.
   */
  surfacedAs: 'opportunity'
}

export interface CareerGraph {
  nodes: CareerNode[]
  edges: CareerEdge[]
}

export function findNode(graph: CareerGraph, id: string): CareerNode | undefined {
  return graph.nodes.find((n) => n.id === id)
}

/** Outgoing transitions from a node, in content order (deterministic). */
export function edgesFrom(graph: CareerGraph, nodeId: string): CareerEdge[] {
  return graph.edges.filter((e) => e.from === nodeId)
}
