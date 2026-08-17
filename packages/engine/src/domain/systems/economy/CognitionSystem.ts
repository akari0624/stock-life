import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import { addStat } from '../../state/stats.js'

// §1.1 cognition: accumulated from study (dice), from experience (here), and
// from getting burned (content effects). It decides what you can *see* —
// which signal tier an opportunity shows you (§1.2) — not what you can bet.

export const COGNITION_SYSTEM_ID = 'cognition'
export const COGNITION_SYSTEM_ORDER = 40

/** Chance that a year on the job teaches you something, per rank held. */
export const EXPERIENCE_CHANCE = 0.5
export const COUNTER_EXPERIENCE_YEARS = 'experience_years'

export function createCognitionSystem(): GameSystem {
  return {
    id: COGNITION_SYSTEM_ID,
    order: COGNITION_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase !== 'mid') return
      if (ctx.state.career.rank <= 0) return

      addStat(ctx.state, COUNTER_EXPERIENCE_YEARS, 1)
      ctx.emit({ type: 'stat.add', key: COUNTER_EXPERIENCE_YEARS, value: 1 })

      if (!ctx.rng.chance(EXPERIENCE_CHANCE)) return
      const gained = addStat(ctx.state, 'cognition', 1)
      if (gained !== 0) ctx.emit({ type: 'stat.add', key: 'cognition', value: gained })
    },
  }
}
