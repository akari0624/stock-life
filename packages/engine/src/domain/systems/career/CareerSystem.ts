import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import type { Command } from '../../turn/Command.js'
import type { Offer } from '../../state/Offer.js'
import { addStat, setStat } from '../../state/stats.js'
import { isSatisfied } from '../../expr/evaluate.js'
import { edgesFrom, findNode, type CareerGraph, type CareerNode } from './CareerGraph.js'

// §7.3: the career is a directed graph and this system walks it. Every edge
// with `surfacedAs: "opportunity"` whose condition holds becomes an Offer —
// exactly the "event-driven career" of §2. The day someone builds the
// browsable planning UI (TODO.md #3), this file does not change: the graph
// is already the whole model.

export const CAREER_SYSTEM_ID = 'career'
export const CAREER_SYSTEM_ORDER = 60

export const COUNTER_CAREER_MOVES = 'career_moves'
export const COUNTER_CAREER_DECLINED = 'career_declined'

export interface CareerSystemOptions {
  graph: CareerGraph
  /** Where a fresh character enters the graph. */
  startNodeId: string
}

const offerIdFor = (nodeId: string): string => `career:${nodeId}`

export function createCareerSystem(options: CareerSystemOptions): GameSystem {
  const { graph, startNodeId } = options
  if (!findNode(graph, startNodeId)) {
    throw new Error(`CareerSystem: start node "${startNodeId}" is not in the career graph`)
  }

  const enter = (ctx: SystemCtx, node: CareerNode): void => {
    const { state, emit } = ctx
    state.career.id = node.id
    state.career.industry = node.industry
    state.career.rank = node.rank

    const income = ctx.rng.int(node.income[0], node.income[1])
    const delta = setStat(state, 'income', income)
    if (delta !== 0) emit({ type: 'stat.add', key: 'income', value: delta })
  }

  const clearOffers = (ctx: SystemCtx): void => {
    ctx.state.offers = ctx.state.offers.filter((o) => o.source !== 'career')
  }

  return {
    id: CAREER_SYSTEM_ID,
    order: CAREER_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase === 'turn.start') {
        // Entering the graph is idempotent: it only fires while the player
        // is standing somewhere the graph doesn't know about (a fresh life).
        if (!findNode(graph, ctx.state.career.id)) {
          enter(ctx, findNode(graph, startNodeId) as CareerNode)
        }
        return
      }

      if (phase !== 'pre') return

      clearOffers(ctx)
      for (const edge of edgesFrom(graph, ctx.state.career.id)) {
        if (edge.surfacedAs !== 'opportunity') continue
        const target = findNode(graph, edge.to)
        if (!target) continue
        if (!isSatisfied(edge.require, { state: ctx.state, rng: ctx.rng })) continue

        const offer: Offer = {
          id: offerIdFor(target.id),
          source: 'career',
          ref: target.id,
          // No display-name field exists on a career node yet; the node id is
          // the handle the UI localises (§7.3's shape is normative).
          label: target.id,
          // A job move is take-it-or-leave-it — position sizing (§1.3) is for
          // investments, so the single allowed size is the neutral one.
          sizing: ['normal'],
          detail: { industry: target.industry, rank: target.rank },
        }
        ctx.state.offers.push(offer)
      }
    },

    onCommand(command: Command, ctx: SystemCtx): void {
      if (command.type !== 'takeOpportunity' && command.type !== 'declineOpportunity') return

      const offer = ctx.state.offers.find((o) => o.id === command.id && o.source === 'career')
      if (!offer) return

      if (command.type === 'declineOpportunity') {
        ctx.state.offers = ctx.state.offers.filter((o) => o.id !== offer.id)
        addStat(ctx.state, COUNTER_CAREER_DECLINED, 1)
        ctx.emit({ type: 'stat.add', key: COUNTER_CAREER_DECLINED, value: 1 })
        return
      }

      const target = findNode(graph, offer.ref)
      if (!target) return
      enter(ctx, target)
      clearOffers(ctx)
      addStat(ctx.state, COUNTER_CAREER_MOVES, 1)
      ctx.emit({ type: 'stat.add', key: COUNTER_CAREER_MOVES, value: 1 })
    },
  }
}
