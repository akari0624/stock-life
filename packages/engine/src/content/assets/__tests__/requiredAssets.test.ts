import { describe, it, expect } from 'vitest'
import {
  assetManifestSkeleton,
  collectRequiredAssets,
  hasAssetFile,
  missingAssets,
} from '../requiredAssets.js'
import { loadContentPack } from '../../loader/loadContentPack.js'
import { mergeContentPacks } from '../../loader/merge.js'
import { createCoreTwSource } from '../../packs/core-tw/index.js'
import { NARRATOR_ACTOR, OPENING_BG } from '../../../domain/expr/sceneIds.js'
import type { MergedContent } from '../../loader/merge.js'

const manifest = (assets: Record<string, Record<string, unknown>>) =>
  ({
    id: 'test',
    version: '1.0.0',
    engineApi: '^1',
    facadeVersion: 1,
    provides: { events: 0, opportunities: 0, careers: 0, traits: 0, worldGenerators: [] },
    requires: [],
    assets: { actors: {}, bg: {}, sfx: {}, ...assets },
  }) as MergedContent['manifests'][number]

const content = (over: Partial<MergedContent> = {}): MergedContent => ({
  opportunities: [],
  events: [],
  careerGraph: { nodes: [], edges: [] },
  traits: [],
  manifests: [],
  ...over,
})

const scened = (id: string, scene: Record<string, string>) => ({ id, scene }) as never

describe('collectRequiredAssets', () => {
  it('把同一個 id 的用處合起來數，最常用的排前面', () => {
    const required = collectRequiredAssets(
      content({
        events: [scened('e1', { bg: 'office' }), scened('e2', { bg: 'office' }), scened('e3', { bg: 'cafe' })],
      }),
      { builtins: false },
    )

    expect(required.bg.map((usage) => usage.id)).toEqual(['office', 'cafe'])
    expect(required.bg[0]).toMatchObject({ count: 2, usedBy: ['e1', 'e2'], provided: false })
  })

  it('三種內容都算：事件、機會、特性', () => {
    const required = collectRequiredAssets(
      content({
        events: [scened('e1', { sfx: 'chime' })],
        opportunities: [scened('o1', { sfx: 'chime' })],
        traits: [scened('t1', { sfx: 'chime' })],
      }),
      { builtins: false },
    )

    expect(required.sfx[0]).toMatchObject({ id: 'chime', count: 3, usedBy: ['e1', 'o1', 't1'] })
  })

  it('引擎自己會發的開場佈景要算進去，否則清單天生短一筆', () => {
    const required = collectRequiredAssets(content())
    expect(required.bg.map((usage) => usage.id)).toContain(OPENING_BG)
  })

  it('旁白不算素材：它是對話框的名字，不是舞台上的角色', () => {
    const required = collectRequiredAssets(content())
    expect(required.actor.map((usage) => usage.id)).not.toContain(NARRATOR_ACTOR)
  })

  it('manifest 給了檔案才算 provided——只有 label 仍然是色塊', () => {
    const required = collectRequiredAssets(
      content({
        events: [scened('e1', { bg: 'office', actor: 'boss' })],
        manifests: [manifest({ bg: { office: '/bg/office.webp' }, actors: { boss: { label: '老王' } } })],
      }),
      { builtins: false },
    )

    expect(required.bg[0].provided).toBe(true)
    expect(required.actor[0].provided).toBe(false)
    expect(missingAssets(required).map((usage) => usage.id)).toEqual(['boss'])
  })

  it('fx 永遠不是 provided：§6.4 的 assets 沒有 fx 這一區', () => {
    const required = collectRequiredAssets(content({ events: [scened('e1', { fx: 'crash_red' })] }), {
      builtins: false,
    })
    expect(required.fx[0]).toMatchObject({ id: 'crash_red', provided: false })
  })

  it('skeleton 是可以直接貼進 manifest.assets 的形狀，且不含 fx', () => {
    const required = collectRequiredAssets(
      content({ events: [scened('e1', { bg: 'office', actor: 'boss', sfx: 'chime', fx: 'crash_red' })] }),
      { builtins: false },
    )

    expect(assetManifestSkeleton(required)).toEqual({
      bg: { office: '' },
      actors: { boss: '' },
      sfx: { chime: '' },
    })
  })
})

describe('hasAssetFile', () => {
  it('字串捷徑與 { url } 都算，空的與只有 label 的不算', () => {
    expect(hasAssetFile('/bg/office.webp')).toBe(true)
    expect(hasAssetFile({ url: '/bg/office.webp' })).toBe(true)
    expect(hasAssetFile('')).toBe(false)
    expect(hasAssetFile({ label: '老王' })).toBe(false)
    expect(hasAssetFile(undefined)).toBe(false)
  })
})

describe('core-tw 的素材需求', () => {
  it('每個事件都指定了背景——不然那一幕玩家看到的是上一幕留下的景', async () => {
    const result = await loadContentPack(createCoreTwSource())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const withoutBg = result.pack.events.filter((event) => !event.scene.bg)
    expect(withoutBg.map((event) => event.id)).toEqual([])
  })

  it('清單數得出來，而且視覺素材已經全部有檔案', async () => {
    const result = await loadContentPack(createCoreTwSource())
    if (!result.ok) throw new Error('core-tw failed to load')

    const { content: merged } = mergeContentPacks([result.pack])
    const required = collectRequiredAssets(merged)

    expect(required.bg.length).toBeGreaterThan(40)
    expect(required.actor.length).toBeGreaterThan(15)
    expect(required.sfx.length).toBeGreaterThan(15)

    // 每個被用到的背景與角色都對照得到檔案。少畫一張這裡就會指名它。
    const uncovered = missingAssets(required).filter((usage) => usage.kind === 'bg' || usage.kind === 'actor')
    expect(uncovered.map((usage) => `${usage.kind}:${usage.id}`)).toEqual([])

    // 音效還沒有素材（TODO #5b），fx 永遠是 CSS 動畫——這兩類仍然是「缺」
    expect(missingAssets(required)).toHaveLength(required.sfx.length + required.fx.length)
  })
})
