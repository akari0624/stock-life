import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import type { FacadeField } from '../../facade/FacadeField.js'
import type { EraSnapshot, Timeline } from './Timeline.js'
import { ERA_PHASES, eraAt } from './Timeline.js'

// The Timeline is generated once per session and lives here, not in
// GameState: it is derived data (seed + generator id + options reproduce it
// exactly), and keeping it out of state keeps save files at "seed +
// commandLog" size (§5.1, TODO.md #4).

export const ERA_SYSTEM_ID = 'era'

/** Runs before everything else so the rest of the turn sees a fresh era. */
export const ERA_SYSTEM_ORDER = 10

export interface EraSystemOptions {
  timeline: Timeline
}

/** The era slice for a given year — used to seed a fresh GameState (S11/S16). */
export function eraStateFor(timeline: Timeline, year: number): EraSnapshot {
  return eraAt(timeline, year)
}

const ERA_FACADE_FIELDS: readonly FacadeField[] = [
  {
    path: 'era.phase',
    label: 'Era: macro phase',
    type: 'enum',
    // Contributed by the system rather than hardcoded in the static list, so
    // a mod's own WorldGenerator phase vocabulary would arrive the same way.
    enum: ERA_PHASES,
  },
  { path: 'era.themes', label: 'Era: active themes', type: 'string[]' },
]

/**
 * Projects the Timeline onto the current year (§7.4). It syncs on both
 * `turn.start` (so the turn about to be played sees its own era) and
 * `turn.end` (which runs after the calendar rolls over, so state handed back
 * to the UI is never a year stale).
 */
export function createEraSystem(options: EraSystemOptions): GameSystem {
  const { timeline } = options

  const sync = (ctx: SystemCtx): void => {
    const era = eraAt(timeline, ctx.state.year)
    ctx.state.era.phase = era.phase
    ctx.state.era.themes = era.themes
  }

  return {
    id: ERA_SYSTEM_ID,
    order: ERA_SYSTEM_ORDER,
    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase === 'turn.start' || phase === 'turn.end') sync(ctx)
    },
    facadeFields(): FacadeField[] {
      return [...ERA_FACADE_FIELDS]
    },
  }
}
