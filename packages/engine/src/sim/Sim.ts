import { SeededRng } from '../domain/rng/SeededRng.js'
import type { GameState } from '../domain/state/GameState.js'
import type { Command } from '../domain/turn/Command.js'
import { createAdvance, type Advance } from '../domain/turn/advance.js'
import type { SystemRegistry } from '../domain/systems/SystemRegistry.js'
import type { Calendar } from '../domain/Calendar.js'
import type { Effect } from '../domain/expr/effects.js'
import { toPlayerView, type PlayerView } from '../domain/state/playerView.js'

export interface SimOptions {
  seed: string | number
  initialState: GameState
  registry: SystemRegistry
  calendar: Calendar
}

export interface SimSnapshot {
  state: GameState
  version: number
}

/**
 * The engine's outer shell: holds state, dispatches commands through
 * advance(), and keeps the commandLog that makes replay/share-codes work
 * (§4, §5.1). `subscribe`/`getSnapshot` exist so apps/web can bind this
 * with `useSyncExternalStore` (§10.1) without Sim importing React.
 */
export class Sim {
  private state: GameState
  private version = 0
  private readonly commandLog: Command[] = []
  private readonly rng: SeededRng
  private readonly advance: Advance
  private readonly listeners = new Set<() => void>()

  constructor(options: SimOptions) {
    this.state = options.initialState
    this.rng = new SeededRng(options.seed)
    this.advance = createAdvance({ registry: options.registry, calendar: options.calendar })
  }

  dispatch(command: Command): Effect[] {
    const { nextState, effects } = this.advance(this.state, command, this.rng)
    this.state = nextState
    this.commandLog.push(command)
    this.version += 1
    for (const listener of this.listeners) listener()
    return effects
  }

  getSnapshot(): SimSnapshot {
    return { state: this.state, version: this.version }
  }

  /**
   * What presentation is allowed to read: state with every open position's
   * resolved `truth` stripped out (§7.1). The UI and the headless policy both
   * see exactly what a player would.
   */
  getPlayerView(): PlayerView {
    return toPlayerView(this.state)
  }

  getCommandLog(): readonly Command[] {
    return this.commandLog
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
