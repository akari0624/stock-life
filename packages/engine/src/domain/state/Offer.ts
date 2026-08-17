import type { Sizing } from '../expr/effects.js'

// §2: the player never picks a target — the system proposes. An Offer is one
// such proposal sitting in state, waiting for a takeOpportunity /
// declineOpportunity command that references it by id.
//
// ⚠️ An Offer is player-visible data. Nothing derived from an opportunity's
// `truth` may ever be put on one (§7.1, enforced by a test in S9).

export type OfferSource = 'career' | 'opportunity'

export interface Offer {
  /** Stable within the turn it was raised; what commands reference. */
  id: string
  /** Which system raised it — and therefore which system resolves it. */
  source: OfferSource
  /** The system's own handle: a career node id, an opportunity id. */
  ref: string
  /** What the player is shown: a job title, or the signal text for their cognition tier. */
  label: string
  /** Position sizes the player may pick from (§1.3). Career moves are a single yes/no. */
  sizing: Sizing[]
  /** Extra player-visible fields the signal chose to reveal (§1.2). */
  detail?: Record<string, string | number | readonly string[]>
}

export function cloneOffer(offer: Offer): Offer {
  const copy: Offer = {
    id: offer.id,
    source: offer.source,
    ref: offer.ref,
    label: offer.label,
    sizing: [...offer.sizing],
  }
  if (offer.detail) copy.detail = { ...offer.detail }
  return copy
}
