import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createCoreTwSource, loadContentPack, type Manifest } from '@stock-life/engine'
import { AssetResolver, FX_ANIMATIONS, hashId, labelFor } from '../AssetResolver.ts'
import { mergeAssetManifests, normalizeEntry } from '../AssetManifest.ts'

const manifestWith = (assets: Manifest['assets']): Manifest => ({
  id: 'test-pack',
  version: '1.0.0',
  engineApi: '^1',
  facadeVersion: 1,
  provides: { events: 0, opportunities: 0, careers: 0, traits: 0, worldGenerators: [] },
  requires: [],
  assets,
})

describe('manifest 解析', () => {
  it('一筆素材可以是字串或物件', () => {
    expect(normalizeEntry('a/b.png')).toEqual({ url: 'a/b.png' })
    expect(normalizeEntry({ url: 'a.png', label: '同事' })).toMatchObject({ url: 'a.png', label: '同事' })
  })

  it('看不懂的形狀等於沒這筆（不是丟例外）', () => {
    expect(normalizeEntry(42)).toBeUndefined()
    expect(normalizeEntry(null)).toBeUndefined()
    expect(normalizeEntry({})).toBeUndefined()
    expect(normalizeEntry({ nonsense: true })).toBeUndefined()
  })

  it('後載入的包覆蓋先載入的', () => {
    const merged = mergeAssetManifests([
      manifestWith({ actors: { colleague_a: 'first.png' }, bg: {}, sfx: {} }),
      manifestWith({ actors: { colleague_a: 'second.png' }, bg: {}, sfx: {} }),
    ])

    expect(merged.actors.colleague_a).toEqual({ url: 'second.png' })
  })
})

describe('fallback', () => {
  const resolver = new AssetResolver()

  it('不存在的 actor id 拿到名字色塊，不是 undefined、也不丟例外', () => {
    const actor = resolver.actor('colleague_a')

    expect(actor).toMatchObject({ kind: 'actor', source: 'fallback', label: 'CA' })
    expect(actor?.url).toBeUndefined()
  })

  it('不存在的 bg id 拿到漸層（色相由 id 決定）', () => {
    const bg = resolver.bg('office_night')

    expect(bg).toMatchObject({ kind: 'bg', source: 'fallback' })
    expect(bg?.hue).toBe(hashId('office_night') % 360)
  })

  it('FX 一律是 CSS 動畫，沒有檔案', () => {
    const fx = resolver.fx('some_mod_fx')

    expect(fx?.source).toBe('fallback')
    expect(FX_ANIMATIONS).toContain(fx?.animation)
  })

  it('官方 fx 的演出方向有提示：崩盤是紅光不是彩帶', () => {
    expect(resolver.fx('crash_red')?.animation).toBe('flash')
    expect(resolver.fx('trait_unlock')?.animation).toBe('sparkle')
  })

  it('同一個 id 永遠得到同一個 fallback（不從 rng 取值）', () => {
    const a = new AssetResolver().fx('mod_fx_x')
    const b = new AssetResolver().fx('mod_fx_x')

    expect(a).toEqual(b)
    expect(new AssetResolver().actor('x')).toEqual(new AssetResolver().actor('x'))
  })

  it('id 是 undefined 就什麼都不回（沒有 scene.bg 的事件不該長出背景）', () => {
    expect(resolver.actor(undefined)).toBeUndefined()
    expect(resolver.bg(undefined)).toBeUndefined()
    expect(resolver.fx(undefined)).toBeUndefined()
  })

  it('labelFor：底線分詞取首字，單字取前兩字', () => {
    expect(labelFor('colleague_a')).toBe('CA')
    expect(labelFor('narrator')).toBe('NA')
    expect(labelFor('老同事')).toBe('老同')
    expect(labelFor('')).toBe('？')
  })
})

describe('塞一張圖進 manifest', () => {
  it('同一份內容包立刻改用真圖', () => {
    const withImage = new AssetResolver(
      mergeAssetManifests([
        manifestWith({
          actors: { colleague_a: { url: '/actors/colleague_a.png', label: '同事' } },
          bg: { office_night: '/bg/office_night.jpg' },
          sfx: {},
        }),
      ]),
    )

    expect(withImage.actor('colleague_a')).toMatchObject({
      source: 'manifest',
      url: '/actors/colleague_a.png',
      label: '同事',
    })
    expect(withImage.bg('office_night')).toMatchObject({ source: 'manifest', url: '/bg/office_night.jpg' })
    // 沒填的仍然 fallback，兩者可以並存
    expect(withImage.actor('boss')?.source).toBe('fallback')
  })
})

describe('官方內容包（零素材）', () => {
  it('core-tw 的背景與角色都解析到真的檔案，fx 仍然是 CSS 動畫', async () => {
    const loaded = await loadContentPack(createCoreTwSource())
    if (!loaded.ok) throw new Error('core-tw failed to load')

    const resolver = AssetResolver.fromManifests([loaded.pack.manifest])
    const ids = [
      ...loaded.pack.events.map((event) => event.scene),
      ...loaded.pack.opportunities.map((opportunity) => opportunity.scene),
      ...loaded.pack.traits.map((trait) => trait.scene),
    ]

    expect(ids.length).toBeGreaterThan(0)
    for (const scene of ids) {
      if (scene.bg) {
        expect(resolver.bg(scene.bg)?.source).toBe('manifest')
        expect(resolver.bg(scene.bg)?.url).toMatch(/^\/art\/bg\/.+\.webp$/)
      }
      if (scene.actor) {
        expect(resolver.actor(scene.actor)?.source).toBe('manifest')
        expect(resolver.actor(scene.actor)?.url).toMatch(/^\/art\/actors\/.+\.webp$/)
      }
      if (scene.fx) expect(FX_ANIMATIONS).toContain(resolver.fx(scene.fx)?.animation)
    }

    // 素材補齊了，dev 的需求清單就該是空的——少畫一張它會立刻指名
    expect(resolver.missing()).toEqual([])
  })
})

// manifest 裡的路徑是**字串**，型別檢查不到，測試也很容易只驗到「有值」。
// 真正會出事的是路徑拼錯或檔案沒 commit——那在瀏覽器上是靜默的破圖。
describe('manifest 宣告的每個檔案都真的存在', () => {
  it('core-tw 的 assets 全部對得到 public/ 裡的檔案', async () => {
    const loaded = await loadContentPack(createCoreTwSource())
    if (!loaded.ok) throw new Error('core-tw failed to load')

    const publicDir = path.resolve(import.meta.dirname, '../../../../public')
    const urls = [
      ...Object.values(loaded.pack.manifest.assets.bg),
      ...Object.values(loaded.pack.manifest.assets.actors),
    ].filter((value): value is string => typeof value === 'string' && value.length > 0)

    expect(urls.length).toBeGreaterThan(60)
    const missing = urls.filter((url) => !existsSync(path.join(publicDir, url)))
    expect(missing).toEqual([])
  })
})
