import type { ContentSource } from '../content/loader/ContentSource.js'
import type { ContentValidationIssue } from '../content/loader/loadContentPack.js'
import { createLife, type Life } from './createLife.js'
import { defaultPolicy, type DefaultPolicyOptions, type Policy } from './policy.js'

// DESIGN.md §6.5.3 第一優先：**沒有試跑，作者是閉著眼睛在寫**。
//
// balance.ts 回報的是「一輩子最後過得怎樣」；這裡回報的是「我寫的那一格到底
// 有沒有出現」——§6.5.2 要的那兩個數字（約 X% 的人生會遇到、平均 N 歲）就是
// 這支函式算出來的。放在 engine 而不是編輯器裡，是因為它整段都是無頭模擬：
// 沒有 DOM、沒有 React，跟 balance.ts 同一層（§3.1）。

/** 跟 headless.ts 同一個護欄：policy 一直提不出改變狀態的決策時不要卡死。 */
const MAX_DECISIONS_PER_TURN = 32

export interface EventProbe {
  id: string
  weight: number
  /**
   * `weight > 0` = 入口事件，要跟其他事件搶那一年唯一的抽籤位；
   * `weight === 0` = 劇情段落，只走箭頭進來（§6.5.2）。
   * 兩者的數字要用完全不同的方式讀：入場是機率的，鏈接是精確的。
   */
  entry: boolean
  /** 幾局人生至少演到一次 */
  lives: number
  /** 演到的比例。入口事件的這個數字就是 §6.5.2 那個 29% 的來源 */
  reachRate: number
  /** 所有局加總演了幾次 */
  occurrences: number
  /** 每局平均演幾次（含完全沒遇到的局） */
  perLife: number
  /** 只算演到的那些局，平均演幾次 */
  perLifeWhenSeen: number
  /** 演到的局裡，**第一次**出現的平均年齡。從沒演到就是 undefined */
  firstAge?: number
  /** 所有出現次數的平均年齡 */
  averageAge?: number
}

export interface ProbeReport {
  runs: number
  /** 載入到的每一個事件，照內容順序——包含出現率 0 的，那才是作者最需要看到的 */
  events: EventProbe[]
}

export interface ProbeOptions {
  runs: number
  /**
   * 每一局都要一組新的 source（跟 balance.ts 同樣的理由：source 可能是一次性的）。
   */
  sources: () => readonly ContentSource[]
  seedPrefix?: string
  policy?: DefaultPolicyOptions
  worldGeneratorId?: string
  startYear?: number
  startAge?: number
  endAge?: number
}

export type ProbeResult =
  | { ok: true; report: ProbeReport }
  | { ok: false; errors: ContentValidationIssue[] }

interface Tally {
  lives: number
  occurrences: number
  ageSum: number
  firstAgeSum: number
}

/**
 * 跑完一局，回報「哪一格在幾歲演出」。
 *
 * ⚠️ 年齡取樣的時機是這支函式唯一的難處。`mid` 跑在日曆換年**之前**
 * （advance.ts），所以抽到的事件屬於換年前那個年紀——如果換年後才取樣，
 * 每一個抽籤來的事件都會被記成大一歲。
 *
 * 「哪些是新演出的」用 pending 佇列的**多重集合差集**判斷，而不是物件identity：
 * `cloneGameState` 每次 dispatch 都會重建 pending 的物件，identity 撐不過一次
 * dispatch。present() 只 push、resolve() 只移除，所以「現在有、之前沒有」剛好
 * 等於這段期間新演出的那些。
 */
function observeLife(life: Life, policy: Policy): Map<string, number[]> {
  const ages = new Map<string, number[]>()
  let previous: string[] = []

  const harvest = (age: number): void => {
    const pending = life.sim.getSnapshot().state.events.pending
    const left = new Map<string, number>()
    for (const id of previous) left.set(id, (left.get(id) ?? 0) + 1)

    for (const entry of pending) {
      const remaining = left.get(entry.eventId) ?? 0
      if (remaining > 0) {
        left.set(entry.eventId, remaining - 1)
        continue
      }
      const seen = ages.get(entry.eventId)
      if (seen) seen.push(age)
      else ages.set(entry.eventId, [age])
    }

    previous = pending.map((entry) => entry.eventId)
  }

  for (let turn = 0; turn < life.totalTurns; turn++) {
    for (let step = 0; step < MAX_DECISIONS_PER_TURN; step++) {
      const command = policy({ view: life.sim.getPlayerView(), turn })
      if (!command || command.type === 'advanceTurn') break
      life.sim.dispatch(command)
      // 同一個 command 裡被 next 串上來的段落（drainQueue）：現在就是它演出的年份
      harvest(life.sim.getSnapshot().state.player.age)
    }

    const age = life.sim.getSnapshot().state.player.age
    life.sim.dispatch({ type: 'advanceTurn' })
    harvest(age)
  }

  return ages
}

/**
 * 跑 N 局，回報每一個事件的出現率、平均年齡與平均出現次數。
 *
 * 載入失敗回傳 `{ ok: false, errors }` 而不是 throw：編輯器要把錯誤畫在表單上，
 * 而作者手上的內容包**本來就經常是壞的**——那是編輯器存在的理由。
 */
export async function probeEvents(options: ProbeOptions): Promise<ProbeResult> {
  const prefix = options.seedPrefix ?? 'probe'
  const policy = defaultPolicy(options.policy)
  const tally = new Map<string, Tally>()
  let events: Life['content']['events'] = []

  for (let run = 0; run < options.runs; run++) {
    const created = await createLife({
      seed: `${prefix}-${run}`,
      sources: options.sources(),
      ...(options.worldGeneratorId === undefined ? {} : { worldGeneratorId: options.worldGeneratorId }),
      ...(options.startYear === undefined ? {} : { startYear: options.startYear }),
      ...(options.startAge === undefined ? {} : { startAge: options.startAge }),
      ...(options.endAge === undefined ? {} : { endAge: options.endAge }),
    })
    if (!created.ok) return { ok: false, errors: created.errors }

    events = created.life.content.events
    for (const [id, seenAges] of observeLife(created.life, policy)) {
      const entry = tally.get(id) ?? { lives: 0, occurrences: 0, ageSum: 0, firstAgeSum: 0 }
      entry.lives += 1
      entry.occurrences += seenAges.length
      entry.ageSum += seenAges.reduce((sum, age) => sum + age, 0)
      entry.firstAgeSum += seenAges[0] as number
      tally.set(id, entry)
    }
  }

  const runs = Math.max(1, options.runs)
  return {
    ok: true,
    report: {
      runs: options.runs,
      events: events.map((event): EventProbe => {
        const seen = tally.get(event.id)
        const lives = seen?.lives ?? 0
        const occurrences = seen?.occurrences ?? 0
        return {
          id: event.id,
          weight: event.weight,
          entry: event.weight > 0,
          lives,
          reachRate: lives / runs,
          occurrences,
          perLife: occurrences / runs,
          perLifeWhenSeen: lives > 0 ? occurrences / lives : 0,
          ...(lives > 0 ? { firstAge: (seen as Tally).firstAgeSum / lives } : {}),
          ...(occurrences > 0 ? { averageAge: (seen as Tally).ageSum / occurrences } : {}),
        }
      }),
    },
  }
}
