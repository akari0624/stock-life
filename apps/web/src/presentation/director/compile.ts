import type { Effect } from '@stock-life/engine'
import {
  BADGE_BEATS,
  SCENE_BEATS,
  sayDuration,
  sceneEnd,
  type BadgeKind,
  type Beat,
  type Scene,
  type ScenePlan,
} from './Scene.ts'

/**
 * `Effect[]` → `Scene[]`（DESIGN.md §4 的 presentation.compile）。
 *
 * 純函式、不碰 DOM、不碰 sim：同一批 effects 永遠編譯出同一段演出，
 * 所以「同一份 commandLog 重播出同一段演出」是結構上成立的，不需要另存演出紀錄。
 */

const BADGE_FOR = {
  'trait.grant': 'trait',
  'position.open': 'position',
  'flag.set': 'flag',
  'event.trigger': 'event',
} as const satisfies Record<string, BadgeKind>

export interface CompileOptions {
  /** 接在既有時間軸後面（S16 一次 dispatch 可能要串起好幾批 effects） */
  startAt?: number
}

export function compile(effects: readonly Effect[], options: CompileOptions = {}): ScenePlan {
  const scenes: Scene[] = []
  let cursor = options.startAt ?? 0

  /** 把 scene 排在游標處，然後依 beat.advance 推進游標。 */
  const place = (scene: Scene, beat: Beat): void => {
    scenes.push(scene)
    cursor += beat.advance
  }

  for (const effect of effects) {
    switch (effect.type) {
      // ── SceneHint：純演出，對 state 零影響（§6.3） ──
      case 'scene.bg':
        place({ kind: 'bg', start: cursor, duration: SCENE_BEATS.bg.duration, id: effect.id }, SCENE_BEATS.bg)
        break

      case 'scene.actor':
        place(
          {
            kind: 'actor',
            start: cursor,
            duration: SCENE_BEATS.actor.duration,
            id: effect.id,
            emote: effect.emote,
            at: effect.at ?? 'left',
          },
          SCENE_BEATS.actor,
        )
        break

      case 'scene.say': {
        // 對話會擋住時間軸——下一個 scene 要等說完
        const duration = sayDuration(effect.text)
        place(
          { kind: 'say', start: cursor, duration, actor: effect.actor, text: effect.text },
          { duration, advance: duration },
        )
        break
      }

      case 'scene.fx':
        place({ kind: 'fx', start: cursor, duration: SCENE_BEATS.fx.duration, id: effect.id }, SCENE_BEATS.fx)
        break

      case 'scene.sfx':
        // 音效是瞬間 cue，不佔時間軸（S15 會用 priority / dedupeMs）
        place(
          {
            kind: 'sfx',
            start: cursor,
            duration: 0,
            id: effect.id,
            priority: effect.priority ?? 'normal',
            dedupeMs: effect.dedupeMs,
          },
          SCENE_BEATS.sfx,
        )
        break

      case 'scene.bgm':
        place(
          { kind: 'bgm', start: cursor, duration: 0, id: effect.id, fadeMs: effect.fadeMs },
          SCENE_BEATS.bgm,
        )
        break

      // ── StateEffect：數字怎麼跳（§6.3） ──
      case 'stat.add':
        place(
          { kind: 'stat', start: cursor, duration: SCENE_BEATS.stat.duration, key: effect.key, delta: effect.value },
          SCENE_BEATS.stat,
        )
        break

      case 'capital.mul':
        place(
          { kind: 'multiply', start: cursor, duration: SCENE_BEATS.multiply.duration, factor: effect.value },
          SCENE_BEATS.multiply,
        )
        break

      case 'trait.grant':
      case 'position.open':
      case 'flag.set':
      case 'event.trigger': {
        const badge = BADGE_FOR[effect.type]
        const beat = BADGE_BEATS[badge]
        const id =
          effect.type === 'trait.grant'
            ? effect.id
            : effect.type === 'position.open'
              ? effect.opportunityId
              : effect.type === 'flag.set'
                ? effect.key
                : effect.eventId
        place({ kind: 'badge', start: cursor, duration: beat.duration, badge, id }, beat)
        break
      }
    }
  }

  // 游標停在「最後一次 advance 之後」，但實際演出要等最後一個 scene 演完
  const duration = scenes.reduce((max, scene) => Math.max(max, sceneEnd(scene)), options.startAt ?? 0)

  return { scenes, duration }
}
