/**
 * 舞台的判準（PLAN.md S14）：
 * - 引用不存在的 `actor` id → 出現 fallback 色塊，而**不是崩掉**
 * - manifest 塞一張圖進去 → 同一份內容包立刻改用真圖
 *
 * 用 renderToStaticMarkup 驗證輸出的 markup（不需要額外測試依賴）。
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Manifest } from '@stock-life/engine'
import { AssetResolver, mergeAssetManifests } from '../../assets/index.ts'
import { compile } from '../../director/compile.ts'
import { project } from '../../director/StageState.ts'
import { Stage } from '../Stage.tsx'

const manifest = (assets: Manifest['assets']): Manifest => ({
  id: 'test-pack',
  version: '1.0.0',
  engineApi: '^1',
  facadeVersion: 1,
  provides: { events: 0, opportunities: 0, careers: 0, traits: 0, worldGenerators: [] },
  requires: [],
  assets,
})

const plan = compile([
  { type: 'scene.bg', id: 'office_night' },
  { type: 'scene.actor', id: 'colleague_a', at: 'right', emote: 'smug' },
  { type: 'scene.say', actor: 'colleague_a', text: '下季展望很好' },
  { type: 'scene.fx', id: 'crash_red' },
  { type: 'trait.grant', id: 'diamond_hands' },
])

const markupAt = (time: number, resolver: AssetResolver): string =>
  renderToStaticMarkup(
    <Stage
      stage={project(plan, time, { rate: 1, playing: true, finished: false })}
      resolver={resolver}
    />,
  )

describe('Stage', () => {
  it('零素材也演得出來：角色是名字色塊、背景是漸層', () => {
    const markup = markupAt(600, new AssetResolver())

    expect(markup).toContain('stage-actor-chip')
    expect(markup).toContain('CA')
    expect(markup).toContain('stage-bg--fallback')
    expect(markup).not.toContain('<img')
  })

  it('manifest 有圖時同一份內容包改用真圖', () => {
    const resolver = new AssetResolver(
      mergeAssetManifests([
        manifest({
          actors: { colleague_a: '/actors/colleague_a.png' },
          bg: { office_night: '/bg/office_night.jpg' },
          sfx: {},
        }),
      ]),
    )
    const markup = markupAt(600, resolver)

    expect(markup).toContain('<img')
    expect(markup).toContain('/actors/colleague_a.png')
    expect(markup).toContain('url(&quot;/bg/office_night.jpg&quot;)')
    expect(markup).not.toContain('stage-bg--fallback')
    expect(markup).not.toContain('stage-actor-chip')
  })

  it('動態值一律走 --c-* CSS 變數（§10.4），不是 utility class', () => {
    const markup = markupAt(600, new AssetResolver())

    expect(markup).toContain('--c-stage-progress')
    expect(markup).toContain('--c-actor-opacity')
    expect(markup).toContain('--c-actor-hue')
    expect(markup).toContain('--c-say-reveal')
  })

  it('FX 以 CSS 動畫 class 呈現，崩盤是 flash', () => {
    // fx 的視窗在 say 之後
    const time = plan.scenes.find((scene) => scene.kind === 'fx')!.start + 10
    const markup = markupAt(time, new AssetResolver())

    expect(markup).toContain('stage-fx--flash')
  })

  it('badge 會出現在舞台上', () => {
    const badge = plan.scenes.find((scene) => scene.kind === 'badge')!
    const markup = markupAt(badge.start + 10, new AssetResolver())

    expect(markup).toContain('stage-badge')
    expect(markup).toContain('diamond_hands')
  })

  it('空演出不會崩，也不會畫出任何素材', () => {
    const empty = project(compile([]), 0, { rate: 1, playing: false, finished: true })
    const markup = renderToStaticMarkup(<Stage stage={empty} resolver={new AssetResolver()} />)

    expect(markup).toContain('class="stage"')
    // 容器在（版面穩定），但裡面沒有任何角色、對話或背景
    expect(markup).toContain('<div class="stage-actors"></div>')
    expect(markup).not.toContain('stage-actor-chip')
    expect(markup).not.toContain('stage-say')
    expect(markup).not.toContain('stage-bg')
  })
})
