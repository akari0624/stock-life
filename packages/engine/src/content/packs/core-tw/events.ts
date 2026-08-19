import { workEvents } from './events/work.js'
import { marketEvents } from './events/market.js'
import { moneyEvents } from './events/money.js'
import { lifeEvents } from './events/life.js'
import { eraEvents } from './events/era.js'
import { trialEvents } from './events/trials.js'
import { arcEvents } from './events/arcs.js'

// §7.2 的事件庫。分檔只是為了讀得下去，載入器看到的是一個陣列。
//
// 六個主題各自負責一種張力：
//   work   工作         —— 收入從哪裡來，時間往哪裡去
//   market 市場旁邊     —— 養出 §7.5 那些人格的日常動作
//   money  錢的日常     —— 房子、車子、父母、稅、債
//   life   人生         —— nerve 在這裡累積，也在這裡被消耗
//   era    時代         —— 條件寫在 era.phase 上，兩種世界模式都成立
//   trials 持倉考驗     —— weight: 0，只被 PositionSystem 排進佇列
//   arcs   連續事件     —— 用 outcome 的 `next` 串起來的多段劇情（§7.2）

export const coreTwEvents = [
  ...workEvents,
  ...marketEvents,
  ...moneyEvents,
  ...lifeEvents,
  ...eraEvents,
  ...trialEvents,
  ...arcEvents,
]

/** 考驗事件的 id 清單——機會的 `trials` 欄位從這裡挑。 */
export const coreTwTrialIds = trialEvents.map((event) => event.id)
