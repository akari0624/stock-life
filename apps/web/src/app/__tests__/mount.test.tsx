/**
 * 真的把 app 掛進 DOM 跑一次：useSyncExternalStore、effect、rAF 全部都會動。
 * 這比 SSR markup 更接近「開得起來」——按下「開始人生」要真的進到遊戲畫面。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Root_ from '../Root.tsx'
import { AudioEngine } from '../../presentation/audio/AudioEngine.ts'
import { setAudioEngine } from '../../presentation/audio/playSound.ts'
import { FakeOutput } from '../../presentation/audio/__tests__/fakeOutput.ts'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  setAudioEngine(new AudioEngine({ output: new FakeOutput(), logMissing: false }))
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  container.remove()
})

const click = async (text: string): Promise<void> => {
  const button = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) throw new Error(`找不到按鈕「${text}」，畫面上有：${[...container.querySelectorAll('button')].map((b) => b.textContent?.trim()).join(' / ')}`)
  await act(async () => {
    button.click()
  })
}

describe('掛進 DOM', () => {
  it('開得起來，按「開始人生」就進遊戲畫面', async () => {
    await act(async () => {
      root.render(<Root_ />)
    })

    expect(container.textContent).toContain('投資人生')

    await click('開始人生')

    // createLife 是 async 的，等一個 microtask 讓它跑完
    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toContain('本金')
    expect(container.querySelector('.stage')).not.toBeNull()
    expect(container.textContent).toContain('演出')
  })

  it('主題切換會改 data-theme（整頁換色）', async () => {
    await act(async () => {
      root.render(<Root_ />)
    })

    await click('scoreboard')
    expect(document.documentElement.dataset.theme).toBe('scoreboard')

    await click('default')
    expect(document.documentElement.dataset.theme).toBe('default')
  })

  it('未解鎖音效時畫面上有明確提示', async () => {
    await act(async () => {
      root.render(<Root_ />)
    })

    // FakeOutput 一開始是 locked → 提示必須出現，不能假裝在播（§10.7）
    expect(container.textContent).toContain('點一下開啟音效')
  })
})
