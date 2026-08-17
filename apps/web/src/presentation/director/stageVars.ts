import type { ActorSlot, BadgeSlot, FxSlot, SayLine, StageState } from './StageState.ts'

/**
 * §10.4：舞台的視覺值是執行期算出來的，utility class 表達不了動態值，
 * 所以一律走 **CSS 自訂屬性 + inline style 注入**。
 *
 * director 只寫變數，CSS 決定怎麼呈現——換美術素材或換演出風格都不必動 TypeScript。
 * 這些 helper 只負責「算出數字」；真正怎麼用（位移幾 px、透明度曲線）是 S14 的 stage CSS 的事。
 */

export type StageVars = Record<`--c-${string}`, string | number>

export const stageVars = (stage: StageState): StageVars => ({
  '--c-stage-progress': stage.duration > 0 ? stage.time / stage.duration : 1,
  '--c-stage-rate': stage.rate,
  '--c-stage-playing': stage.playing ? 1 : 0,
})

export const actorVars = (actor: ActorSlot): StageVars => ({
  '--c-actor-progress': actor.progress,
  '--c-actor-opacity': actor.progress,
  // 從舞台外側滑入：left 從 -1 進到 0，right 從 +1 進到 0（單位由 CSS 決定）
  '--c-actor-offset': (actor.at === 'left' ? -1 : 1) * (1 - actor.progress),
})

export const sayVars = (say: SayLine): StageVars => ({
  '--c-say-reveal': say.reveal,
  // 逐字顯示交給 CSS：字數 × reveal = 目前該露出幾個字
  '--c-say-chars': Math.round(say.text.length * say.reveal),
})

export const fxVars = (fx: FxSlot): StageVars => ({
  '--c-fx-progress': fx.progress,
})

export const badgeVars = (badge: BadgeSlot): StageVars => ({
  '--c-badge-progress': badge.progress,
})
