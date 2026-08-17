import type { Sizing } from '../expr/effects.js'

// §4.2: player-decision granularity. Mouse moves, panel toggles, animation
// progress — none of that is a Command, none of it goes in the log.

export type Command =
  | { type: 'allocateDice'; assignment: Record<string, number> }
  | { type: 'resolveEvent'; choice: 'safe' | 'normal' | 'bold' }
  | { type: 'takeOpportunity'; id: string; sizing: Sizing }
  | { type: 'declineOpportunity'; id: string }
  | { type: 'resolveTrial'; positionId: string; choice: string }
  | { type: 'advanceTurn' }
