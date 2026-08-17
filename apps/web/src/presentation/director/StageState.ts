import { progressAt, sceneEnd, type BadgeKind, type Scene, type ScenePlan } from './Scene.ts'

/**
 * Director 當前狀態的投影——UI 只是這個東西的函數（DESIGN.md §4）。
 *
 * 這裡沒有任何 DOM、也沒有任何樣式決定；舞台把它換成 CSS 變數（§10.4，見 stageVars.ts）。
 */

export interface ActorSlot {
  id: string
  emote?: string
  at: 'left' | 'right'
  progress: number
}

export interface SayLine {
  actor: string
  text: string
  /** 0–1，逐字顯示的進度 */
  reveal: number
  done: boolean
}

export interface FxSlot {
  id: string
  progress: number
}

export interface BadgeSlot {
  badge: BadgeKind
  id: string
  progress: number
}

export interface StatTick {
  key: string
  delta: number
  progress: number
}

export interface StageState {
  time: number
  duration: number
  rate: number
  playing: boolean
  finished: boolean
  bg?: string
  bgProgress: number
  actors: ActorSlot[]
  say?: SayLine
  fx: FxSlot[]
  badges: BadgeSlot[]
  /** 正在跳的數字（給高亮用） */
  ticking: StatTick[]
  /**
   * **還沒演到的變化量**。sim 的 state 早就是最終值了，所以呈現值是
   * `最終值 - pendingStats[key]`；演完時每一項都會歸零。
   */
  pendingStats: Record<string, number>
  /** 同上，但給 `capital.mul`：呈現值 = 最終值 / pendingCapitalFactor */
  pendingCapitalFactor: number
}

export interface StageMeta {
  rate: number
  playing: boolean
  finished: boolean
}

const isActive = (scene: Scene, time: number): boolean =>
  scene.duration > 0 && time >= scene.start && time <= sceneEnd(scene)

export function project(plan: ScenePlan, time: number, meta: StageMeta): StageState {
  const stage: StageState = {
    time,
    duration: plan.duration,
    rate: meta.rate,
    playing: meta.playing,
    finished: meta.finished,
    bgProgress: 0,
    actors: [],
    fx: [],
    badges: [],
    ticking: [],
    pendingStats: {},
    pendingCapitalFactor: 1,
  }

  const actorSlots = new Map<'left' | 'right', ActorSlot>()
  let lastSay: Scene | undefined

  for (const scene of plan.scenes) {
    const started = time >= scene.start

    switch (scene.kind) {
      case 'bg':
        if (started) {
          stage.bg = scene.id
          stage.bgProgress = progressAt(scene, time)
        }
        break

      case 'actor':
        if (started) {
          actorSlots.set(scene.at, {
            id: scene.id,
            emote: scene.emote,
            at: scene.at,
            progress: progressAt(scene, time),
          })
        }
        break

      case 'say':
        // 說過的話留在畫面上直到下一句（reveal 到 1）
        if (started) lastSay = scene
        break

      case 'fx':
        if (isActive(scene, time)) stage.fx.push({ id: scene.id, progress: progressAt(scene, time) })
        break

      case 'badge':
        if (isActive(scene, time)) {
          stage.badges.push({ badge: scene.badge, id: scene.id, progress: progressAt(scene, time) })
        }
        break

      case 'stat': {
        // 未演到的部分要從最終值扣回去——所以未來的 scene 也要算進來
        const progress = progressAt(scene, time)
        const remaining = scene.delta * (1 - progress)
        if (remaining !== 0) {
          stage.pendingStats[scene.key] = (stage.pendingStats[scene.key] ?? 0) + remaining
        }
        if (progress > 0 && progress < 1) {
          stage.ticking.push({ key: scene.key, delta: scene.delta, progress })
        }
        break
      }

      case 'multiply': {
        const progress = progressAt(scene, time)
        if (progress < 1) stage.pendingCapitalFactor *= scene.factor ** (1 - progress)
        break
      }

      case 'sfx':
      case 'bgm':
        // 瞬間 cue，不進投影——由 director 的 onCue 發出去（S15）
        break
    }
  }

  stage.actors = [...actorSlots.values()]

  if (lastSay?.kind === 'say') {
    const reveal = progressAt(lastSay, time)
    stage.say = { actor: lastSay.actor, text: lastSay.text, reveal, done: reveal >= 1 }
  }

  return stage
}
