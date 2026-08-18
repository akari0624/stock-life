/**
 * Scene ids the engine emits on its own, without any content asking for them.
 *
 * They exist because a `SceneHint` id is otherwise always written by content
 * (§6.3) — these two are the exceptions, and if they were left as string
 * literals at their use sites the asset requirement list (`collectRequiredAssets`)
 * would silently be short by two entries.
 */

/** Who is speaking when an event's `scene.actor` is empty. */
export const NARRATOR_ACTOR = 'narrator'

/**
 * The curtain: dressed before the first event of a life is presented, so the
 * player never looks at an empty stage. Emitted by the host (apps/web's
 * `GameSession`), which is why it is a shared constant and not a literal there.
 */
export const OPENING_BG = 'life_start'

/** Grouped the way `SceneRef` names its fields, for the asset collector. */
export const BUILTIN_SCENE_IDS = {
  bg: [OPENING_BG],
  actor: [NARRATOR_ACTOR],
  sfx: [],
  fx: [],
} as const satisfies Record<'bg' | 'actor' | 'sfx' | 'fx', readonly string[]>
