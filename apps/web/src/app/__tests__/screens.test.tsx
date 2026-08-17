/**
 * 三個畫面的 render 冒煙測試：不崩、關鍵資訊有出現。
 * 用 renderToStaticMarkup（不需要額外測試依賴，也不需要 WAAPI）。
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Decision } from '@stock-life/engine'
import { AppStore } from '../AppStore.ts'
import { StoreProvider } from '../hooks.ts'
import { TitleScreen } from '../screens/TitleScreen.tsx'
import { GameScreen } from '../screens/GameScreen.tsx'
import { SettlementScreen } from '../screens/SettlementScreen.tsx'
import { PacksScreen } from '../screens/PacksScreen.tsx'
import { Decisions } from '../components/Decisions.tsx'
import { AudioEngine } from '../../presentation/audio/AudioEngine.ts'
import { setAudioEngine } from '../../presentation/audio/playSound.ts'
import { FakeOutput } from '../../presentation/audio/__tests__/fakeOutput.ts'
import type { GameSession } from '../GameSession.ts'

beforeEach(() => {
  setAudioEngine(new AudioEngine({ output: new FakeOutput(), logMissing: false }))
})

const render = (store: AppStore, node: React.ReactNode): string =>
  renderToStaticMarkup(<StoreProvider value={store}>{node}</StoreProvider>)

const startedStore = async (): Promise<{ store: AppStore; session: GameSession }> => {
  const store = new AppStore()
  store.setSettings({ name: '阿明', seedInput: '99' })
  await store.startLife()
  const session = store.getSnapshot().session
  if (!session) throw new Error(store.getSnapshot().error ?? '開始人生失敗')
  return { store, session }
}

describe('畫面', () => {
  it('標題頁有姓名、種子、開始人生', () => {
    const markup = render(new AppStore(), <TitleScreen />)

    expect(markup).toContain('投資人生')
    expect(markup).toContain('開始人生')
    expect(markup).toContain('種子 / 分享碼')
    expect(markup).toContain('隨機世界')
  })

  it('遊戲畫面有資本面板、舞台、決策與時間軸', async () => {
    const { store, session } = await startedStore()
    const markup = render(store, <GameScreen session={session} />)

    expect(markup).toContain('本金')
    expect(markup).toContain('class="stage"')
    expect(markup).toContain('演出')
    // 第一回合就有東西要決定（骰點或機會），或至少有「過下一年」
    expect(markup).toMatch(/這一年的時間怎麼分|一個機會|你要怎麼做|過下一年/)
    session.dispose()
  })

  it('遊戲一開始舞台就有東西，不是一個純黑的方塊', async () => {
    const { store, session } = await startedStore()
    const markup = render(store, <GameScreen session={session} />)

    // 開場的佈景（沒有素材時是 token 漸層的 fallback）
    expect(markup).toContain('stage-bg')
    expect(markup).toContain('data-bg="life_start"')
    session.dispose()
  })

  it('事件決策卡上看得到情境，不是三個動詞加三個百分比（§7.2）', async () => {
    const { store, session } = await startedStore()
    const decision: Decision = {
      kind: 'event',
      eventId: 'overtime_crunch',
      prompt: '晚上九點，主管還在。他剛剛經過你桌邊兩次，什麼都沒說。',
      choices: [
        { id: 'safe', label: '準時下班', chance: 70, mag: 1 },
        { id: 'normal', label: '配合加班', chance: 50, mag: 2 },
        { id: 'bold', label: '拼命表現', chance: 35, mag: 3 },
      ],
    }

    const markup = render(
      store,
      <Decisions
        session={session}
        view={session.getSnapshot().view}
        decision={decision}
        finished={false}
        onSettle={() => {}}
      />,
    )

    expect(markup).toContain('晚上九點，主管還在')
    expect(markup).toContain('準時下班')
    session.dispose()
  })

  it('結算畫面在還沒結束時不會硬要顯示摘要', async () => {
    const { store, session } = await startedStore()
    const markup = render(store, <SettlementScreen session={session} />)

    expect(markup).toContain('這局還沒結束')
    session.dispose()
  })

  it('內容包畫面列出已載入的 core-tw，並提供匯入／匯出入口', async () => {
    const { store, session } = await startedStore()
    const markup = render(store, <PacksScreen />)

    expect(markup).toContain('core-tw')
    expect(markup).toContain('匯入貼上的內容')
    expect(markup).toContain('下載官方 JSON Schema')
    expect(markup).toContain('type="file"')
    session.dispose()
  })

  it('決策區的成功率就是引擎給的那個數字（所見即所得）', async () => {
    const { store, session } = await startedStore()

    let eventDecision: Decision | undefined
    for (let step = 0; step < 2_000 && !eventDecision; step += 1) {
      const snapshot = session.getSnapshot()
      if (snapshot.finished) break
      const decision = snapshot.decision
      if (decision?.kind === 'event') {
        eventDecision = decision
        break
      }
      if (!decision) session.advanceTurn()
      else if (decision.kind === 'dice') session.allocateDice({ [decision.channels[0]]: decision.pool })
      else if (decision.kind === 'trial') session.resolveTrial(decision.positionId, 'hold')
      else session.declineOffer(decision.offer.id)
    }

    expect(eventDecision?.kind).toBe('event')
    const markup = render(store, <GameScreen session={session} />)
    if (eventDecision?.kind === 'event') {
      for (const choice of eventDecision.choices) {
        expect(markup).toContain(choice.label)
        expect(markup).toContain(`${Math.round(choice.chance)}%`)
      }
    }
    session.dispose()
  })
})
