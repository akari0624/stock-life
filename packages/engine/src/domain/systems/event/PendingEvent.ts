import type { EventChoiceId } from './EventDef.js'

// What the player is actually shown for a pending decision. `chance` is the
// value `successChance()` returned — the same number the roll will use
// (§7.2's "所見即所得").

export interface PendingChoiceView {
  id: EventChoiceId
  label: string
  /** Percent. Displayed and rolled against — one number, one source. */
  chance: number
  mag: number
}

export interface PendingEvent {
  eventId: string
  /** The situation (§7.2). The stage says it too; the decision panel keeps it in view. */
  prompt?: string
  choices: PendingChoiceView[]
}
