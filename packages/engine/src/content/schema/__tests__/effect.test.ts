import { describe, it, expect } from 'vitest'
import { stateEffectSchema, sceneHintSchema } from '../effect.js'

describe('stateEffectSchema', () => {
  it('accepts each of the five known StateEffect types', () => {
    const effects = [
      { type: 'stat.add', key: 'x', value: 1 },
      { type: 'capital.mul', value: 1.1 },
      { type: 'flag.set', key: 'x' },
      { type: 'trait.grant', id: 'diamond_hands' },
      { type: 'position.open', opportunityId: 'op-1', sizing: 'normal' },
    ]
    for (const e of effects) {
      expect(stateEffectSchema.safeParse(e).success).toBe(true)
    }
  })

  it('拒絕內容自己寫 event.trigger——接續是 outcome 的 `next`（§7.2）', () => {
    const result = stateEffectSchema.safeParse({ type: 'event.trigger', eventId: 'ev-1' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown effect name/type (TODO.md #1 boundary)', () => {
    const result = stateEffectSchema.safeParse({ type: 'hack.exploit', value: 1 })
    expect(result.success).toBe(false)
  })

  it('rejects a known type missing a required field', () => {
    const result = stateEffectSchema.safeParse({ type: 'stat.add', key: 'x' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid sizing value on position.open', () => {
    const result = stateEffectSchema.safeParse({
      type: 'position.open',
      opportunityId: 'op-1',
      sizing: 'yolo',
    })
    expect(result.success).toBe(false)
  })
})

describe('sceneHintSchema', () => {
  it('accepts each of the seven known SceneHint types', () => {
    const hints = [
      { type: 'scene.bg', id: 'bg-1' },
      { type: 'scene.actor', id: 'actor-1', emote: 'smile', at: 'left' },
      { type: 'scene.say', actor: 'actor-1', text: 'hi' },
      { type: 'scene.sfx', id: 'sfx-1', priority: 'high', dedupeMs: 200 },
      { type: 'scene.bgm', id: 'bgm-1', fadeMs: 500 },
      { type: 'scene.fx', id: 'fx-1' },
      { type: 'event.trigger', eventId: 'ev-1' },
    ]
    for (const h of hints) {
      expect(sceneHintSchema.safeParse(h).success).toBe(true)
    }
  })

  it('rejects an unknown scene hint type', () => {
    expect(sceneHintSchema.safeParse({ type: 'scene.explosion', id: 'x' }).success).toBe(false)
  })
})
