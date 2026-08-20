import { describe, it, expect } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import App from '../App.tsx'
import { EditorStore } from '../editor/EditorStore.ts'
import { newEvent } from '../editor/draft.ts'

/**
 * 冒煙測試：整個編輯器真的掛得起來，而且畫得出事件。
 * 跟 apps/web 的 `mount.test.tsx` 同一個目的——版面壞掉要在 CI 就知道。
 */

function memoryStore() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

describe('掛載', () => {
  it('空草稿也畫得起來', async () => {
    const store = new EditorStore({ store: memoryStore(), loadBaseline: false })
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<App store={store} />)
    })

    expect(container.textContent).toContain('事件編輯器')
    expect(container.textContent).toContain('入口事件')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('有事件時畫得出表單與預覽，而且兩種框的說明不一樣（§6.5.2）', async () => {
    const store = new EditorStore({ store: memoryStore(), loadBaseline: false })
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    store.addEvent('entry')
    store.updateEvent(0, { ...newEvent('entry', 'cofounder_pitch'), prompt: '大學同學找你吃飯' })

    await act(async () => {
      root.render(<App store={store} />)
    })

    const text = container.textContent ?? ''
    expect(text).toContain('cofounder_pitch')
    expect(text).toContain('大學同學找你吃飯')
    // 入口事件必須看到「入場是機率的」那句警告
    expect(text).toContain('入場是機率的')

    await act(async () => {
      store.setKind(0, 'beat')
    })
    expect(container.textContent).toContain('鏈接是精確的')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('AI 對話框打得開，而且提示詞裡真的有 schema（§6.5.6）', async () => {
    const store = new EditorStore({ store: memoryStore(), loadBaseline: false })
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<App store={store} />)
    })

    const open = [...container.querySelectorAll('button')].find((button) =>
      (button.textContent ?? '').includes('AI 產事件'),
    )
    expect(open).toBeDefined()

    await act(async () => {
      open?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // 對話框走 portal，所以要看整份 document
    const text = document.body.textContent ?? ''
    expect(text).toContain('只輸出 JSON')
    expect(text).toContain('"id": "safe"')
    expect(text).toContain('把 AI 回你的 JSON 貼回來')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
