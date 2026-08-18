import { withBase } from '../basePath.ts'
import type { AssetManifest } from '../assets/AssetManifest.ts'
import { UI_SOUNDS, isUiActionId, type SoundEntry } from './uiSounds.ts'
import type { Bus, Priority } from './types.ts'

/**
 * AudioResolver —— `AssetResolver` 的孿生（§10.7）：id → 要播哪個檔案的哪一段。
 *
 * 兩個來源、同一個 resolver：
 * - 互動音效 → app 靜態 manifest（`UI_SOUNDS`），**mod 不可覆寫**
 * - 演出音效 → 內容包 `assets.sfx`（S14 已經正規化過，這裡直接吃那份結果）
 *
 * 找不到 id → 回 `undefined`，呼叫端「什麼都不做」。
 * dev 模式把它記進 would-play 清單——**那份清單就是音效需求清單**。
 */

export interface ResolvedSound {
  id: string
  url: string
  offset?: number
  duration?: number
  dedupeMs?: number
  bus?: Bus
  priority?: Priority
}

export interface AudioResolverOptions {
  /** 內容包的 sfx（來自 S14 的 mergeAssetManifests） */
  contentSfx?: AssetManifest['sfx']
}

export class AudioResolver {
  private content: AssetManifest['sfx'] = {}
  private readonly wouldPlayCounts = new Map<string, number>()
  private overrideAttempts: string[] = []

  constructor(options: AudioResolverOptions = {}) {
    this.useContentSfx(options.contentSfx ?? {})
  }

  /**
   * 換一組內容包的 sfx（載入／停用內容包時呼叫）。
   * would-play 的統計刻意保留——它是跨內容包的需求清單。
   */
  useContentSfx(contentSfx: AssetManifest['sfx']): void {
    const content = { ...contentSfx }
    this.overrideAttempts = []
    // 介面音不屬於遊戲內容：內容包想覆寫 ui_* 就直接忽略（只記錄，不拒載）
    for (const id of Object.keys(content)) {
      if (isUiActionId(id)) {
        this.overrideAttempts.push(id)
        delete content[id]
      }
    }
    this.content = content
  }

  resolve(id: string): ResolvedSound | undefined {
    const entry: SoundEntry | undefined = isUiActionId(id) ? UI_SOUNDS[id] : this.contentEntry(id)
    if (!entry?.url) return undefined
    // 音檔跟圖一樣要接 base，否則子路徑部署時抓不到（見 basePath.ts）
    return { id, ...entry, url: withBase(entry.url) }
  }

  /** 已知的 id（dev 測試頁列表用）。 */
  knownIds(): string[] {
    return [...Object.keys(UI_SOUNDS), ...Object.keys(this.content)]
  }

  /** 內容包試圖覆寫的介面音 id（載入時警告用）。 */
  blockedOverrides(): readonly string[] {
    return this.overrideAttempts
  }

  recordWouldPlay(id: string): void {
    this.wouldPlayCounts.set(id, (this.wouldPlayCounts.get(id) ?? 0) + 1)
  }

  /** 匯出：這就是音效需求清單（§10.7 的副產品）。 */
  wouldPlay(): { id: string; count: number }[] {
    return [...this.wouldPlayCounts.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
  }

  private contentEntry(id: string): SoundEntry | undefined {
    const entry = this.content[id]
    if (!entry?.url) return undefined
    return {
      url: entry.url,
      offset: entry.offset,
      duration: entry.duration,
      dedupeMs: entry.dedupeMs,
      bus: 'sfx',
    }
  }
}
