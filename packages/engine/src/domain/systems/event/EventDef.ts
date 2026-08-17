import type { Expr } from '../../expr/evaluate.js'
import type { SceneRef, StateEffect } from '../../expr/effects.js'

// §7.2: yakyulife's three-tier risk structure, with conditions and effects
// swapped for condition trees. Shape declared here (domain), validated by
// content/schema — the §3 arrow points content ──► domain.

export type EventChoiceId = 'safe' | 'normal' | 'bold'

export interface EventChoice {
  id: EventChoiceId
  label: string
  /** Signed integer string offset from the base success rate, e.g. "+20". */
  odds: string
  /** Outcome magnitude: bold risks more and pays more. */
  mag: number
}

export interface EventOutcome {
  text: string
  effects: StateEffect[]
}

export interface EventDef {
  id: string
  require: Expr
  /** 0 means "never drawn at random" — only reachable via `event.trigger`. */
  weight: number
  choices: EventChoice[]
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
