/**
 * Scene —— 演出的最小單位（DESIGN.md §4）。
 *
 * `Effect[]` 是 domain 一次算完的結果；`Scene[]` 是同一批資訊排在**邏輯時間軸**上的樣子。
 * 兩者刻意分離：`StateEffect` 決定「哪個數字跳了多少」，`SceneHint` 決定「怎麼演」（§6.3）。
 *
 * 時間單位一律是**邏輯毫秒**。實際播多快由 director 的 `rate` 決定，
 * 而演出多長、有沒有被跳過，對模擬結果零影響。
 */

export interface SceneBase {
  /** 在邏輯時間軸上的起點（ms） */
  start: number
  /** 這個 scene 持續多久（ms）。0 = 瞬間事件（音效之類） */
  duration: number
}

export type Scene =
  | (SceneBase & { kind: 'bg'; id: string })
  | (SceneBase & { kind: 'actor'; id: string; emote?: string; at: 'left' | 'right' })
  | (SceneBase & { kind: 'say'; actor: string; text: string })
  | (SceneBase & { kind: 'fx'; id: string })
  | (SceneBase & { kind: 'sfx'; id: string; priority: 'high' | 'normal'; dedupeMs?: number })
  | (SceneBase & { kind: 'bgm'; id: string; fadeMs?: number })
  | (SceneBase & { kind: 'stat'; key: string; delta: number })
  | (SceneBase & { kind: 'multiply'; factor: number })
  | (SceneBase & { kind: 'badge'; badge: BadgeKind; id: string })

export type SceneKind = Scene['kind']
export type BadgeKind = 'trait' | 'position' | 'flag' | 'event'

/** 一段編譯好的演出。`duration` 是最後一個 scene 的結束時間。 */
export interface ScenePlan {
  scenes: Scene[]
  duration: number
}

export const EMPTY_PLAN: ScenePlan = { scenes: [], duration: 0 }

/**
 * 每種 scene 的節奏。
 *
 * `duration` = 這個 scene 自己演多久；
 * `advance`  = 演完它之後時間軸游標往前多少（0 = 與前一個同時發生）。
 *
 * 全部集中在這裡，調演出節奏不需要碰編譯邏輯。
 */
export interface Beat {
  duration: number
  advance: number
}

export const SCENE_BEATS = {
  bg: { duration: 420, advance: 200 },
  actor: { duration: 320, advance: 160 },
  fx: { duration: 720, advance: 260 },
  sfx: { duration: 0, advance: 0 },
  bgm: { duration: 0, advance: 0 },
  stat: { duration: 520, advance: 220 },
  multiply: { duration: 760, advance: 320 },
} as const satisfies Record<string, Beat>

/** badge 依種類分：拿到人格是大事，設個內部 flag 不是。 */
export const BADGE_BEATS = {
  trait: { duration: 900, advance: 380 },
  position: { duration: 620, advance: 300 },
  flag: { duration: 300, advance: 0 },
  event: { duration: 0, advance: 0 },
} as const satisfies Record<BadgeKind, Beat>

/** 對話：逐字顯示，長度隨字數增加（中文一個字算一個 char）。 */
export const SAY_BASE_MS = 520
export const SAY_MS_PER_CHAR = 45
export const SAY_MAX_MS = 6000

export const sayDuration = (text: string): number =>
  Math.min(SAY_MAX_MS, SAY_BASE_MS + text.length * SAY_MS_PER_CHAR)

export const sceneEnd = (scene: Scene): number => scene.start + scene.duration

/**
 * 0–1 的進度。duration 為 0 的瞬間事件：到了就是 1。
 */
export const progressAt = (scene: Scene, time: number): number => {
  if (time <= scene.start) return time < scene.start ? 0 : scene.duration === 0 ? 1 : 0
  if (scene.duration === 0) return 1
  return Math.min(1, (time - scene.start) / scene.duration)
}
