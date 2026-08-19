import type { Expr } from '../../expr/evaluate.js'
import type { SceneRef, StateEffect } from '../../expr/effects.js'

// §7.2: yakyulife's three-tier risk structure, with conditions and effects
// swapped for condition trees. Shape declared here (domain), validated by
// content/schema — the §3 arrow points content ──► domain.

export type EventChoiceId = 'safe' | 'normal' | 'bold'

/**
 * One edge of the story graph (§7.2): "after this outcome, play that event".
 *
 * Declared as a field rather than buried in `effects` because it *is* an edge
 * — an editor has to draw it, and the loader has to be able to prove it points
 * somewhere real. A dangling id is caught at load time, not silently dropped
 * at runtime.
 */
export interface EventLink {
  id: string
  /**
   * 0 / omitted — play it later the same year, straight after this one, and
   * **skip the target's `require`**: the scene the author just wrote is still
   * on screen, nothing has had a chance to change.
   *
   * >= 1 — schedule it that many years out, and **do check `require` when it
   * comes due**. Three years is long enough for the player to have divorced,
   * gone broke or changed careers; playing "your second date with her"
   * regardless would be worse than playing nothing.
   */
  afterYears?: number
  /** Played instead when a due link cannot fire (require failed, or `once` already spent). */
  orElse?: string
}

/**
 * The success / failure branch of an event. Only the **effects** live here:
 * they are shared by all three choices (each choice's `mag` scales them, §7.2).
 * The *wording* lives on the choice instead — see {@link EventChoice.good} —
 * so "推掉" (declining) and "揪一整桌" (going all in) never share one line that
 * only fits one of them.
 */
export interface EventOutcome {
  effects: StateEffect[]
  /**
   * Where the story goes from here (§7.2). Lives on the *outcome*, not on the
   * event, so success and failure can lead somewhere different — that split is
   * the only branching an event has, since the three choices share one pair of
   * outcomes.
   */
  next?: EventLink
}

export interface EventChoice {
  id: EventChoiceId
  label: string
  /** Signed integer string offset from the base success rate, e.g. "+20". */
  odds: string
  /** Outcome magnitude: bold risks more and pays more (scales shared effects). */
  mag: number
  /**
   * What this choice reads when the roll succeeds / fails (§7.2).
   *
   * The effects are shared (see {@link EventDef.good}); only the sentence is
   * per-choice, so the story always matches the action the player took.
   */
  good: string
  bad: string
}

export interface EventDef {
  id: string
  require: Expr
  /** 0 means "never drawn at random" — only reachable as some outcome's `next`. */
  weight: number
  /**
   * Play at most once per life, however it turned out (§7.2).
   *
   * Distinct from the "retry until it lands" shape, which stays a `require` +
   * `flag.set` on the good branch only — `meet_someone` comes back every year
   * until you actually partner up, and should.
   */
  once?: boolean
  /**
   * The situation, shown **before** the player chooses (§7.2).
   *
   * Without it a decision is three verbs and three percentages — the outcome
   * text cannot stand in for it, because the outcome is what you read *after*
   * choosing.
   *
   * Optional on the **type** (an event object built in a test or by an older
   * tool may not have one, and the UI falls back to a generic header), but
   * required by the **schema** — no loaded content can be missing it.
   */
  prompt?: string
  choices: EventChoice[]
  /** Shared effects applied when the roll succeeds / fails (scaled by `mag`). */
  good: EventOutcome
  bad: EventOutcome
  scene: SceneRef
}

/** Success rate before any choice offset is applied. */
export const BASE_SUCCESS_CHANCE = 50

/**
 * ⭐ The single source of truth for "how likely is this to go well".
 * The number shown to the player and the number rolled against are the same
 * call to this function — the yakyulife detail worth copying is precisely
 * that they can never drift apart.
 */
export function successChance(choice: EventChoice): number {
  const offset = Number.parseInt(choice.odds, 10)
  const raw = BASE_SUCCESS_CHANCE + (Number.isFinite(offset) ? offset : 0)
  return Math.min(100, Math.max(0, raw))
}

export function findChoice(event: EventDef, id: string): EventChoice | undefined {
  return event.choices.find((c) => c.id === id)
}
