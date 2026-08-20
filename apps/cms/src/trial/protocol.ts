import type { EventChoiceId, ProbeReport } from '@stock-life/engine'

/** 主執行緒 ↔ 試跑 Worker 之間的訊息。兩邊共用一份定義，不會漂掉。 */

export interface TrialRequest {
  runs: number
  /** 編輯中的內容包，序列化成 PasteSource 吃的那種 JSON */
  packText: string
  /**
   * 是否一起載入官方包。**預設要開**：入口事件的出現率是「跟其他八十幾個事件搶
   * 那一年唯一的抽籤位」的結果（§6.5.2）。只載自己的包，你的事件是池子裡唯一
   * 的一個，出現率會漂亮得毫無意義。
   */
  withCoreTw: boolean
  seedPrefix?: string
  worldGeneratorId?: string
  startYear?: number
  /** 代打玩家的風險偏好——同一份內容在保守與大膽玩家手上走的分支不一樣 */
  risk?: EventChoiceId
}

export type TrialResponse =
  | { ok: true; report: ProbeReport }
  | { ok: false; errors: string[] }
