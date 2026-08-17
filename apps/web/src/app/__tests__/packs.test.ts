/**
 * S18 的判準：
 *
 * 1. 匯入一個第三方內容包後，其事件/機會/特性**真的會出現在遊戲裡**
 * 2. 匯入格式錯誤的包時，顯示可讀錯誤且**不破壞既有狀態**
 * 3. 載入內容包後，分享碼的指紋隨之改變
 * 4. 新增來源是新增實作，不改呼叫端（FileSource / PasteSource 走同一個 `importPack`）
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { FileSource, PasteSource } from '@stock-life/engine'
import { AppStore } from '../AppStore.ts'
import { PackLibrary, PACKS_KEY } from '../packs/PackLibrary.ts'
import { SaveStorage, type KeyValueStore } from '../save/SaveStorage.ts'
import { AudioEngine } from '../../presentation/audio/AudioEngine.ts'
import { setAudioEngine } from '../../presentation/audio/playSound.ts'
import { FakeOutput } from '../../presentation/audio/__tests__/fakeOutput.ts'

class MemoryStore implements KeyValueStore {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

beforeEach(() => {
  setAudioEngine(new AudioEngine({ output: new FakeOutput(), logMissing: false }))
})

/** 一個真的第三方包：只有一個事件，連職涯圖都沒有（fragment 也算合法的包）。 */
const friendPack = (id = 'friend-pack', version = '1.0.0') =>
  JSON.stringify({
    manifest: {
      id,
      version,
      engineApi: '^1',
      facadeVersion: 1,
      provides: { events: 1, opportunities: 0, careers: 0, traits: 1, worldGenerators: [] },
      requires: [],
      assets: { actors: {}, bg: {}, sfx: {} },
    },
    events: [
      {
        id: 'friend_event',
        require: { '>=': ['age', 18] },
        weight: 999, // 蓋過官方事件，讓它在測試裡幾乎一定被抽到
        choices: [
          { id: 'safe', label: '朋友的選項 A', odds: '+10', mag: 1 },
          { id: 'normal', label: '朋友的選項 B', odds: '0', mag: 2 },
          { id: 'bold', label: '朋友的選項 C', odds: '-20', mag: 3 },
        ],
        good: { text: '朋友的內容包生效了。', effects: [] },
        bad: { text: '朋友的內容包也生效了。', effects: [] },
        scene: {},
      },
    ],
    traits: [
      {
        id: 'friend_trait',
        name: '朋友的人格',
        tone: 'neutral',
        text: '這個人格來自第三方內容包。',
        checkOn: ['turn.end'],
        require: { '>=': ['age', 19] },
        exclude: [],
        grants: [],
        scene: {},
      },
    ],
  })

const newApp = (store: MemoryStore) =>
  new AppStore({
    library: new PackLibrary({ store }),
    storage: new SaveStorage({ store, key: 'stock-life.save.test', now: () => 1 }),
    search: '?s=20260817',
    syncUrl: false,
  })

describe('匯入第三方內容包', () => {
  it('匯入之後，那個包的內容真的進到遊戲裡', async () => {
    const store = new MemoryStore()
    const app = newApp(store)

    expect(await app.importPack(new PasteSource('friend-pack.json', friendPack()))).toBe(true)
    expect(app.getSnapshot().library.map((pack) => pack.id)).toEqual(['friend-pack'])

    await app.startLife()
    const session = app.getSnapshot().session
    if (!session) throw new Error(app.getSnapshot().error)

    // 引擎眼中的內容，以及畫面上「這一局載入了什麼」，兩邊都看得到它
    expect(session.life.content.events.map((event) => event.id)).toContain('friend_event')
    expect(session.life.content.traits.map((trait) => trait.id)).toContain('friend_trait')
    expect(app.getSnapshot().packs.map((manifest) => manifest.id)).toEqual(['core-tw', 'friend-pack'])
    session.dispose()
  })

  it('分享碼的指紋跟著內容組合改變', async () => {
    const store = new MemoryStore()

    const before = newApp(store)
    const plain = await before.startLife().then(() => before.getSnapshot().session)
    if (!plain) throw new Error('開局失敗')
    const plainCode = plain.shareCode
    plain.dispose()

    const after = newApp(store)
    await after.importPack(new PasteSource('friend-pack.json', friendPack()))
    await after.startLife()
    const modded = after.getSnapshot().session
    if (!modded) throw new Error('開局失敗')

    // 種子相同、指紋不同 → 分享碼不同（§5.1：同種子不同內容 ≠ 同人生）
    expect(modded.seed).toBe(plain.seed)
    expect(modded.shareCode).not.toBe(plainCode)
    modded.dispose()
  })

  it('停用之後就不再進遊戲，重新啟用又回來', async () => {
    const store = new MemoryStore()
    const app = newApp(store)
    await app.importPack(new PasteSource('friend-pack.json', friendPack()))

    app.setPackEnabled('friend-pack', false)
    await app.startLife()
    const off = app.getSnapshot().session
    if (!off) throw new Error('開局失敗')
    expect(off.life.content.events.map((event) => event.id)).not.toContain('friend_event')
    off.dispose()

    app.setPackEnabled('friend-pack', true)
    await app.startLife()
    const on = app.getSnapshot().session
    if (!on) throw new Error('開局失敗')
    expect(on.life.content.events.map((event) => event.id)).toContain('friend_event')
    on.dispose()
  })

  it('重開瀏覽器之後裝好的包還在（localStorage）', async () => {
    const store = new MemoryStore()
    const app = newApp(store)
    await app.importPack(new PasteSource('friend-pack.json', friendPack()))
    expect(store.getItem(PACKS_KEY)).toContain('friend-pack')

    const reopened = newApp(store)
    expect(reopened.getSnapshot().library.map((pack) => pack.id)).toEqual(['friend-pack'])

    await reopened.startLife()
    const session = reopened.getSnapshot().session
    if (!session) throw new Error('開局失敗')
    expect(session.life.content.events.map((event) => event.id)).toContain('friend_event')
    session.dispose()
  })

  it('同 id 再匯入是升級，不是裝兩份', async () => {
    const store = new MemoryStore()
    const app = newApp(store)
    await app.importPack(new PasteSource('a.json', friendPack('friend-pack', '1.0.0')))
    await app.importPack(new PasteSource('b.json', friendPack('friend-pack', '1.1.0')))

    expect(app.getSnapshot().library).toHaveLength(1)
    expect(app.getSnapshot().library[0].version).toBe('1.1.0')
  })

  it('檔案與貼上走的是同一個呼叫端（新增來源＝新增實作）', async () => {
    const store = new MemoryStore()
    const app = newApp(store)

    // 一個「檔案」——結構上滿足 ReadableFile 就行，不需要真的 File
    const file = { name: 'from-disk.json', text: () => Promise.resolve(friendPack('disk-pack')) }
    expect(await app.importPack(new FileSource(file))).toBe(true)
    expect(app.getSnapshot().library.map((pack) => pack.label)).toEqual(['from-disk.json'])
  })
})

describe('匯入壞掉的內容包', () => {
  it('顯示可讀錯誤，而且不動既有狀態', async () => {
    const store = new MemoryStore()
    const app = newApp(store)
    await app.importPack(new PasteSource('good.json', friendPack()))
    const before = app.getSnapshot().library

    expect(await app.importPack(new PasteSource('broken.json', '{ 這不是 JSON'))).toBe(false)
    expect(app.getSnapshot().packMessage).toContain('broken.json')
    expect(app.getSnapshot().library).toEqual(before)

    // schema 不合的包也一樣：說得出哪裡不對
    const badVersion = friendPack('bad-pack').replace('"1.0.0"', '"v1"')
    expect(await app.importPack(new PasteSource('bad-version.json', badVersion))).toBe(false)
    expect(app.getSnapshot().packMessage).toContain('semver')
    expect(app.getSnapshot().library).toEqual(before)

    // 而且遊戲照樣開得起來，用的是先前那組內容
    await app.startLife()
    const session = app.getSnapshot().session
    if (!session) throw new Error(app.getSnapshot().error)
    expect(session.life.content.events.map((event) => event.id)).toContain('friend_event')
    session.dispose()
  })

  it('移除之後遊戲回到原本的內容', async () => {
    const store = new MemoryStore()
    const app = newApp(store)
    await app.importPack(new PasteSource('friend-pack.json', friendPack()))
    app.removePack('friend-pack')

    expect(app.getSnapshot().library).toEqual([])
    await app.startLife()
    const session = app.getSnapshot().session
    if (!session) throw new Error('開局失敗')
    expect(session.life.content.events.map((event) => event.id)).not.toContain('friend_event')
    session.dispose()
  })
})

describe('匯出', () => {
  it('匯出的文字可以原樣再匯入（往返）', async () => {
    const store = new MemoryStore()
    const app = newApp(store)
    await app.importPack(new PasteSource('friend-pack.json', friendPack()))

    const exported = app.exportPack('friend-pack')
    expect(exported).toBeTruthy()

    const elsewhere = newApp(new MemoryStore())
    expect(await elsewhere.importPack(new PasteSource('re-imported.json', exported ?? ''))).toBe(true)
    expect(elsewhere.getSnapshot().library[0].id).toBe('friend-pack')
  })
})
