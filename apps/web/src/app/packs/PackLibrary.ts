import {
  createCoreTwSource,
  loadContentPack,
  PasteSource,
  serializePackFile,
  type ContentSource,
  type ContentValidationIssue,
} from '@stock-life/engine'
import type { KeyValueStore } from '../save/SaveStorage.ts'

/**
 * 玩家裝了哪些內容包（S18）。
 *
 * **匯入的唯一入口是 `install(source)`，而且它只認 `ContentSource`。**
 * 檔案、貼上、日後的 URL／市集都是「多一個實作」，這個函式一個字都不用改
 * ——這正是 TODO.md #2 要求的那條邊界。
 *
 * 存的是**驗證過後再序列化**的內容包：進得來的東西必定通過同一套 schema，
 * 所以下次開頁不會突然冒出一個當初沒檢查過的形狀。
 */

export interface InstalledPack {
  id: string
  version: string
  /** 匯入時的來源標籤（檔名／「貼上的內容」），只給人看 */
  label: string
  /** 內容包本體（JSON 字串），匯出就是把它吐回去 */
  text: string
  enabled: boolean
}

export const PACKS_KEY = 'stock-life.packs'
export const PACKS_SCHEMA_VERSION = 1

export type InstallResult =
  | { ok: true; pack: InstalledPack; replaced: boolean }
  | { ok: false; errors: ContentValidationIssue[] }

interface PacksFile {
  schemaVersion: number
  packs: InstalledPack[]
}

export interface PackLibraryOptions {
  store?: KeyValueStore
  key?: string
}

function browserStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage as KeyValueStore | undefined
  } catch {
    return undefined
  }
}

export class PackLibrary {
  private readonly store: KeyValueStore | undefined
  private readonly key: string
  private packs: InstalledPack[]

  constructor(options: PackLibraryOptions = {}) {
    this.store = options.store ?? browserStore()
    this.key = options.key ?? PACKS_KEY
    this.packs = this.read()
  }

  list(): readonly InstalledPack[] {
    return this.packs
  }

  /** 官方包永遠在，且走跟 mod 完全一樣的載入器（§6.4 dogfooding）。 */
  sources(): ContentSource[] {
    return [
      createCoreTwSource(),
      ...this.packs.filter((pack) => pack.enabled).map((pack) => new PasteSource(pack.label, pack.text)),
    ]
  }

  /**
   * 驗證 → 通過才寫進清單。**驗不過就完全不動既有狀態**：
   * 匯入一個壞掉的包不該把已經裝好的東西弄壞。
   */
  async install(source: ContentSource): Promise<InstallResult> {
    const result = await loadContentPack(source)
    if (!result.ok) return { ok: false, errors: result.errors }

    const { manifest, opportunities, events, careerGraph, traits } = result.pack
    const pack: InstalledPack = {
      id: manifest.id,
      version: manifest.version,
      label: source.label,
      text: serializePackFile({ manifest, opportunities, events, careerGraph, traits }),
      enabled: true,
    }

    const index = this.packs.findIndex((installed) => installed.id === pack.id)
    const replaced = index >= 0
    // 同 id 視為升級：換版本而不是裝兩份（指紋只認 id@version）
    this.packs = replaced
      ? this.packs.map((installed, at) => (at === index ? { ...pack, enabled: installed.enabled } : installed))
      : [...this.packs, pack]
    this.write()

    return { ok: true, pack, replaced }
  }

  setEnabled(id: string, enabled: boolean): void {
    this.packs = this.packs.map((pack) => (pack.id === id ? { ...pack, enabled } : pack))
    this.write()
  }

  remove(id: string): void {
    this.packs = this.packs.filter((pack) => pack.id !== id)
    this.write()
  }

  /** 匯出：把當初存起來的那份 JSON 原樣吐回去。 */
  exportText(id: string): string | undefined {
    return this.packs.find((pack) => pack.id === id)?.text
  }

  private read(): InstalledPack[] {
    let text: string | null
    try {
      text = this.store?.getItem(this.key) ?? null
    } catch {
      return []
    }
    if (!text) return []

    try {
      const parsed = JSON.parse(text) as PacksFile
      if (!parsed || !Array.isArray(parsed.packs)) return []
      // 壞掉的清單就是空清單——它只是快取，重新匯入就好，不值得讓遊戲開不起來
      return parsed.packs.filter(
        (pack): pack is InstalledPack =>
          typeof pack?.id === 'string' && typeof pack?.text === 'string' && typeof pack?.version === 'string',
      )
    } catch {
      return []
    }
  }

  private write(): void {
    const file: PacksFile = { schemaVersion: PACKS_SCHEMA_VERSION, packs: this.packs }
    try {
      this.store?.setItem(this.key, JSON.stringify(file))
    } catch {
      // 存不下來（無痕／配額）：這次還是裝得起來，只是下次開頁要重新匯入
    }
  }
}
