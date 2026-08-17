import type { MergedContent } from '@stock-life/engine'
import type { AssetManifest } from '../assets/AssetManifest.ts'
import { isUiActionId } from './uiSounds.ts'

/**
 * 載入時的 sfx id 檢查（§10.7）：內容包的 id 沒辦法靜態檢查，
 * 所以在載入時比對——**未知 id 只警告不拒載**，音效缺失不該讓內容包整包失效。
 */

/** 內容裡所有被引用到的 sfx id。 */
export function referencedSfxIds(content: MergedContent): string[] {
  const ids = new Set<string>()
  const add = (id: string | undefined): void => {
    if (id) ids.add(id)
  }

  for (const event of content.events) add(event.scene.sfx)
  for (const opportunity of content.opportunities) add(opportunity.scene.sfx)
  for (const trait of content.traits) add(trait.scene.sfx)

  return [...ids].sort()
}

export interface SfxWarning {
  id: string
  reason: 'missing' | 'ui_override'
}

/**
 * `missing`：內容引用了 manifest 裡沒有的 sfx id → 會靜音（would-play 會記下來）。
 * `ui_override`：內容包想覆寫介面音 → 忽略（介面音不屬於遊戲內容）。
 */
export function checkContentSfx(content: MergedContent, sfx: AssetManifest['sfx']): SfxWarning[] {
  const warnings: SfxWarning[] = []

  for (const id of referencedSfxIds(content)) {
    if (!sfx[id]?.url) warnings.push({ id, reason: 'missing' })
  }
  for (const id of Object.keys(sfx)) {
    if (isUiActionId(id)) warnings.push({ id, reason: 'ui_override' })
  }

  return warnings
}
