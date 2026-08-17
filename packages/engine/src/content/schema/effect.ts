import { z } from 'zod'

// §6.3: content embeds StateEffect objects directly (see the JSON examples
// in §7.1/§7.2/§7.5) — z.discriminatedUnion on `type` is what rejects an
// unknown effect name (TODO.md #1's "未知效果名" case) at load time.

export const sizingSchema = z.enum(['light', 'normal', 'heavy', 'leveraged'])

export const stateEffectSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('stat.add'), key: z.string().min(1), value: z.number() }),
  z.strictObject({ type: z.literal('capital.mul'), value: z.number() }),
  z.strictObject({ type: z.literal('flag.set'), key: z.string().min(1) }),
  z.strictObject({ type: z.literal('trait.grant'), id: z.string().min(1) }),
  z.strictObject({
    type: z.literal('position.open'),
    opportunityId: z.string().min(1),
    sizing: sizingSchema,
  }),
  z.strictObject({ type: z.literal('event.trigger'), eventId: z.string().min(1) }),
])

export const sceneHintSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('scene.bg'), id: z.string().min(1) }),
  z.strictObject({
    type: z.literal('scene.actor'),
    id: z.string().min(1),
    emote: z.string().optional(),
    at: z.enum(['left', 'right']).optional(),
  }),
  z.strictObject({ type: z.literal('scene.say'), actor: z.string().min(1), text: z.string().min(1) }),
  z.strictObject({
    type: z.literal('scene.sfx'),
    id: z.string().min(1),
    priority: z.enum(['high', 'normal']).optional(),
    dedupeMs: z.number().nonnegative().optional(),
  }),
  z.strictObject({
    type: z.literal('scene.bgm'),
    id: z.string().min(1),
    fadeMs: z.number().nonnegative().optional(),
  }),
  z.strictObject({ type: z.literal('scene.fx'), id: z.string().min(1) }),
])

/**
 * `scene` blocks on Opportunity/Event/Trait content are a loose bag of
 * optional SceneHint-style references (bg/actor/sfx id strings) — kept
 * permissive since AssetResolver (S14) defines the real fallback contract.
 */
export const sceneRefSchema = z
  .object({
    bg: z.string().optional(),
    actor: z.string().optional(),
    sfx: z.string().optional(),
    fx: z.string().optional(),
  })
  .partial()
