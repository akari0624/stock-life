import type { Manifest } from '@stock-life/engine'

/**
 * 內容包 `assets` 區塊（§6.4）的解析。
 *
 * schema 那邊刻意把值放成 `unknown`——**素材長什麼樣是呈現層的事**，
 * 引擎不該知道有沒有 url、有沒有 sprite offset。這裡是唯一一個把它正規化的地方，
 * S15 的音效 resolver 沿用同一份正規化結果（`sfx`），不要各造一套。
 */

export interface AssetEntry {
  /** 檔案位置。**只有這裡能出現路徑**——其餘程式一律只認 id。 */
  url?: string
  /** 給角色色塊 fallback 用的顯示名（沒填就從 id 推） */
  label?: string
  /** audio sprite：起點與長度（秒）。S15 會用 */
  offset?: number
  duration?: number
  /** 音效節流（§10.7），S15 會用 */
  dedupeMs?: number
}

export type AssetSection = 'actors' | 'bg' | 'sfx'

export type AssetManifest = Record<AssetSection, Record<string, AssetEntry>>

export const EMPTY_ASSET_MANIFEST: AssetManifest = { actors: {}, bg: {}, sfx: {} }

const SECTIONS: readonly AssetSection[] = ['actors', 'bg', 'sfx']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const optionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

/**
 * 一筆素材可以寫成 `"path.png"`（最短寫法）或 `{ url, label, … }`。
 * 看不懂的形狀回傳 `undefined`——結果就是 fallback，不是崩掉。
 */
export function normalizeEntry(value: unknown): AssetEntry | undefined {
  const url = optionalString(value)
  if (url) return { url }
  if (!isRecord(value)) return undefined

  const entry: AssetEntry = {
    url: optionalString(value.url),
    label: optionalString(value.label),
    offset: optionalNumber(value.offset),
    duration: optionalNumber(value.duration),
    dedupeMs: optionalNumber(value.dedupeMs),
  }
  // 全空的物件等於沒這筆
  if (Object.values(entry).every((field) => field === undefined)) return undefined
  return entry
}

/** 後載入的包覆蓋先載入的（與 mergeContentPacks 的順序一致）。 */
export function mergeAssetManifests(manifests: readonly Manifest[]): AssetManifest {
  const merged: AssetManifest = { actors: {}, bg: {}, sfx: {} }

  for (const manifest of manifests) {
    for (const section of SECTIONS) {
      for (const [id, raw] of Object.entries(manifest.assets[section] ?? {})) {
        const entry = normalizeEntry(raw)
        if (entry) merged[section][id] = entry
      }
    }
  }

  return merged
}
