import { describe, expect, it } from 'vitest'
import { createCoreTwSource, loadContentPack, mergeContentPacks } from '@stock-life/engine'
import { mergeAssetManifests } from '../../assets/AssetManifest.ts'
import { checkContentSfx, referencedSfxIds } from '../contentSfxIds.ts'

const load = async () => {
  const loaded = await loadContentPack(createCoreTwSource())
  if (!loaded.ok) throw new Error('core-tw failed to load')
  return mergeContentPacks([loaded.pack]).content
}

describe('載入時的 sfx 檢查', () => {
  it('列出內容引用到的所有 sfx id', async () => {
    const ids = referencedSfxIds(await load())

    expect(ids.length).toBeGreaterThan(0)
    expect(ids).toContain('phone_ring')
    // 排序過 → 穩定輸出
    expect([...ids].sort()).toEqual(ids)
  })

  it('未知 id 只警告不拒載（core-tw 現在一個音檔都沒有）', async () => {
    const content = await load()
    const warnings = checkContentSfx(content, mergeAssetManifests(content.manifests))

    expect(warnings.length).toBe(referencedSfxIds(content).length)
    expect(warnings.every((warning) => warning.reason === 'missing')).toBe(true)
  })

  it('內容包想覆寫介面音會被標出來', async () => {
    const warnings = checkContentSfx(await load(), {
      ui_click: { url: '/mod/click.webm' },
      phone_ring: { url: '/mod/ring.webm' },
    })

    expect(warnings).toContainEqual({ id: 'ui_click', reason: 'ui_override' })
    // 有音檔的就不再是 missing
    expect(warnings).not.toContainEqual({ id: 'phone_ring', reason: 'missing' })
  })
})
