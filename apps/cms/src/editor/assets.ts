import { collectRequiredAssets, type AssetKind, type Manifest } from '@stock-life/engine'
import type { DraftEvent, PackDraft } from './draft.ts'

/**
 * §6.5.3 #5：資產選擇器。**從清單選，不要讓人打字。**
 *
 * 打錯只會靜靜 fallback 成色塊（§6.3），作者不會發現自己打錯了——這是這個
 * 選擇器唯一的存在理由，所以每一個選項都要標「有圖」還是「佔位」。
 *
 * 清單本身用引擎的 `collectRequiredAssets()` 算，不自己掃一遍：需求側（誰引用了
 * 什麼）與供給側（manifest 有什麼檔案）在那裡已經對好了（§6.4）。
 */

export interface AssetOption {
  id: string
  /** manifest 有對到檔案。false = 遊戲裡會是由 id 雜湊決定的佔位色塊 */
  provided: boolean
  /** 幾筆內容引用它——常用的排前面，作者八成想用同一個場景 */
  count: number
}

export type AssetCatalogue = Record<AssetKind, AssetOption[]>

export function assetCatalogue(draft: PackDraft, extraManifests: readonly Manifest[]): AssetCatalogue {
  const manifests: Manifest[] = [
    ...extraManifests,
    // 草稿的 manifest 也算供給側：作者自己填的圖也該顯示成「有圖」
    {
      ...draft.manifest,
      provides: { events: 0, opportunities: 0, careers: 0, traits: 0, worldGenerators: [] },
    } as unknown as Manifest,
  ]

  const requirements = collectRequiredAssets({
    events: draft.events as unknown as never[],
    opportunities: [],
    traits: [],
    careerGraph: { nodes: [], edges: [] },
    manifests,
  })

  const catalogue = { bg: [], actor: [], sfx: [], fx: [] } as AssetCatalogue
  for (const kind of ['bg', 'actor', 'sfx', 'fx'] as const) {
    catalogue[kind] = requirements[kind].map((usage) => ({
      id: usage.id,
      provided: usage.provided,
      count: usage.count,
    }))
  }

  // manifest 有檔案但還沒有人用的 id 也要出現在選單裡——那正是作者接下來想挑的
  for (const [kind, section] of [['bg', 'bg'], ['actor', 'actors'], ['sfx', 'sfx']] as const) {
    const known = new Set(catalogue[kind].map((option) => option.id))
    for (const manifest of manifests) {
      for (const id of Object.keys(manifest.assets?.[section] ?? {})) {
        if (known.has(id)) continue
        known.add(id)
        catalogue[kind].push({ id, provided: true, count: 0 })
      }
    }
    catalogue[kind].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
  }

  return catalogue
}

/** 這一格用到的 id 有沒有真的對到檔案。預覽面板用它提醒作者。 */
export function sceneStatus(event: DraftEvent, catalogue: AssetCatalogue): { kind: AssetKind; id: string; provided: boolean }[] {
  const pairs: { kind: AssetKind; id: string | undefined }[] = [
    { kind: 'bg', id: event.scene.bg },
    { kind: 'actor', id: event.scene.actor },
    { kind: 'sfx', id: event.scene.sfx },
    { kind: 'fx', id: event.scene.fx },
  ]
  return pairs
    .filter((pair): pair is { kind: AssetKind; id: string } => typeof pair.id === 'string' && pair.id.length > 0)
    .map((pair) => ({
      kind: pair.kind,
      id: pair.id,
      provided: catalogue[pair.kind].find((option) => option.id === pair.id)?.provided ?? false,
    }))
}

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  bg: '背景',
  actor: '角色',
  sfx: '音效',
  fx: '特效',
}
