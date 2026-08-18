import {
  EMPTY_ASSET_MANIFEST,
  mergeAssetManifests,
  type AssetEntry,
  type AssetManifest,
} from './AssetManifest.ts'
import { withBase } from '../basePath.ts'
import type { Manifest } from '@stock-life/engine'

/**
 * AssetResolver —— id → 素材（DESIGN.md §6.3、§10.4；TODO.md #5a）。
 *
 * 兩條紀律：
 * 1. **所有視覺資源只透過 id 引用**，路徑只能來自內容包 manifest。
 * 2. **每種型別都有 fallback**：角色→名字色塊、背景→漸層、FX→CSS 動畫。
 *    所以現在零素材也能演出，日後把檔案填進 manifest 就變成真圖，`domain/` 一行都不用改。
 *
 * fallback 的變化（色相、動畫選哪個）由 **id 的雜湊**決定，不從 `SeededRng` 取值——
 * 演出用亂數會讓同種子跑出不同人生（§10.7 的同一條原則，視覺這邊也適用）。
 */

export type AssetSource = 'manifest' | 'fallback'

export interface ActorAsset {
  kind: 'actor'
  id: string
  source: AssetSource
  /** manifest 有圖時才有 */
  url?: string
  /** 色塊上的字（fallback 用，manifest 也可覆寫） */
  label: string
  /** 0–359，色塊的色相偏移 */
  hue: number
}

export interface BgAsset {
  kind: 'bg'
  id: string
  source: AssetSource
  url?: string
  hue: number
}

export interface FxAsset {
  kind: 'fx'
  id: string
  /** FX 一律是 CSS 動畫，沒有檔案（§6.4 的 assets 也沒有 fx 區塊） */
  source: 'fallback'
  animation: FxAnimation
}

export type FxAnimation = (typeof FX_ANIMATIONS)[number]

/** stage.css 裡實際存在的動畫。新增一個就自動進入輪替。 */
export const FX_ANIMATIONS = ['flash', 'shake', 'pulse', 'sparkle'] as const

/**
 * 少數官方 fx 的「演出方向」提示：崩盤不該放彩帶。
 * 這是美術指導，不是路徑硬編碼——查不到就退回雜湊輪替，所以 mod 自創的 id 一樣能用。
 */
const FX_HINTS: Record<string, FxAnimation> = {
  crash_red: 'flash',
  trait_unlock: 'sparkle',
  trait_unlock_bad: 'shake',
}

/** 32-bit FNV-1a。要的只是「同 id 同結果」，不是密碼學強度。 */
export function hashId(id: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** `colleague_a` → `CA`；中文 id → 前兩個字。 */
export function labelFor(id: string): string {
  const words = id.split(/[_\-.\s]+/).filter(Boolean)
  if (words.length === 0) return '？'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export class AssetResolver {
  private readonly manifest: AssetManifest

  constructor(manifest: AssetManifest = EMPTY_ASSET_MANIFEST) {
    this.manifest = manifest
  }

  /** 從已載入的內容包建 resolver（S16 的組裝點會用這條）。 */
  static fromManifests(manifests: readonly Manifest[]): AssetResolver {
    return new AssetResolver(mergeAssetManifests(manifests))
  }

  actor(id: string | undefined): ActorAsset | undefined {
    if (!id) return undefined
    const entry = this.manifest.actors[id]
    const source = entry?.url ? 'manifest' : 'fallback'
    this.record('actors', id, source)
    return {
      kind: 'actor',
      id,
      source,
      url: entry?.url ? withBase(entry.url) : undefined,
      label: entry?.label ?? labelFor(id),
      hue: hashId(id) % 360,
    }
  }

  bg(id: string | undefined): BgAsset | undefined {
    if (!id) return undefined
    const entry = this.manifest.bg[id]
    const source = entry?.url ? 'manifest' : 'fallback'
    this.record('bg', id, source)
    return {
      kind: 'bg',
      id,
      source,
      url: entry?.url ? withBase(entry.url) : undefined,
      hue: hashId(id) % 360,
    }
  }

  fx(id: string | undefined): FxAsset | undefined {
    if (!id) return undefined
    return {
      kind: 'fx',
      id,
      source: 'fallback',
      animation: FX_HINTS[id] ?? FX_ANIMATIONS[hashId(id) % FX_ANIMATIONS.length],
    }
  }

  /** S15 的 AudioResolver 會吃這個（同一份 manifest，不重複解析）。 */
  sfx(id: string | undefined): AssetEntry | undefined {
    if (!id) return undefined
    return this.manifest.sfx[id]
  }

  /**
   * dev 用：目前哪些 id 是靠 fallback 撐著（被問過、但 manifest 沒有）。
   * 玩過一輪之後，這份清單就是美術需求清單（與 §10.7 的 would-play 同一招）。
   */
  missing(): { section: MissingSection; id: string }[] {
    return [...this.fellBack].map((key) => {
      const separator = key.indexOf(':')
      return { section: key.slice(0, separator) as MissingSection, id: key.slice(separator + 1) }
    })
  }

  private record(section: MissingSection, id: string, source: AssetSource): void {
    if (source === 'fallback') this.fellBack.add(`${section}:${id}`)
  }

  private readonly fellBack = new Set<string>()
}

type MissingSection = 'actors' | 'bg'
