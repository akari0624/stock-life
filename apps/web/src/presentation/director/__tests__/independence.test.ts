/**
 * S13 的核心判準：**演出長度與跳過行為完全不影響任何模擬結果**。
 *
 * 這在架構上是靠 director 根本不認識 sim 達成的（§4：模擬瞬間完成，演出慢慢播）。
 * 但這正是那種「哪天有人為了做進度條把 director 接進 dispatch」就會壞掉的性質，
 * 所以用真的跑一局來守。
 */
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createCoreTwSource,
  createLife,
  runLife,
  type Command,
  type ContentSource,
  type GameState,
} from '@stock-life/engine'
import { compile } from '../compile.ts'
import { Director } from '../Director.ts'
import type { ScenePlan } from '../Scene.ts'
import { FakeClock } from './fakeClock.ts'

const SEED = 'director-s13'
const sources: readonly ContentSource[] = [createCoreTwSource()]

let commandLog: readonly Command[] = []

beforeAll(async () => {
  const outcome = await runLife({ seed: SEED, sources })
  if (!outcome.ok) throw new Error('runLife failed')
  commandLog = outcome.result.commandLog
})

type Mode = 'no-director' | 'play-through' | 'skip'

interface Replay {
  state: GameState
  plans: ScenePlan[]
}

/** 把同一份 commandLog 重播一次，並依 mode 決定演出怎麼播。 */
async function replay(mode: Mode): Promise<Replay> {
  const created = await createLife({ seed: SEED, sources })
  if (!created.ok) throw new Error('createLife failed')

  const clock = new FakeClock()
  const director = mode === 'no-director' ? undefined : new Director(clock.options)
  const plans: ScenePlan[] = []

  for (const command of commandLog) {
    const effects = created.life.sim.dispatch(command)
    const plan = compile(effects)
    plans.push(plan)

    if (!director) continue
    director.load(plan)
    if (mode === 'skip') {
      director.finish()
    } else {
      director.play()
      clock.runUntil(() => director.isFinished())
      expect(director.isFinished()).toBe(true)
    }
  }

  return { state: created.life.sim.getSnapshot().state, plans }
}

describe('演出與模擬互不影響', () => {
  it('commandLog 不是空的（不然這個測試什麼都沒證明）', () => {
    expect(commandLog.length).toBeGreaterThan(50)
  })

  it('跳過 vs 播完 vs 完全不演，最終 state 三者相同', async () => {
    const none = await replay('no-director')
    const played = await replay('play-through')
    const skipped = await replay('skip')

    expect(skipped.state).toEqual(played.state)
    expect(none.state).toEqual(played.state)
    // 真的跑完一局（不是在第一回合就結束）
    expect(played.state.player.age).toBeGreaterThan(60)
  })

  it('同一份 commandLog 重播出同一段演出', async () => {
    const first = await replay('play-through')
    const second = await replay('skip')

    expect(second.plans).toEqual(first.plans)
    expect(first.plans.some((plan) => plan.scenes.length > 0)).toBe(true)
  })

  it('演出總長度加起來是有意義的（演出真的存在）', async () => {
    const { plans } = await replay('no-director')
    const total = plans.reduce((sum, plan) => sum + plan.duration, 0)

    expect(total).toBeGreaterThan(1_000)
  })
})
