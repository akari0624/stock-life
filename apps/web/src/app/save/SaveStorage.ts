import { createSaveFile, deserializeSave, serializeSave, type Life, type SaveFile } from '@stock-life/engine'

/**
 * 存檔的**存放處**。格式是引擎的事（`createSaveFile` / `parseSaveFile`），
 * 這裡只管把那串字放進 `localStorage` 再拿回來——所以 §5.3 的「引擎不碰
 * localStorage」與「存檔格式只有一份定義」兩件事同時成立。
 *
 * 存的是 `seed + fingerprint + commandLog`（TODO.md #4），不是狀態快照：
 * 之後 GameState 內部怎麼改，舊存檔一樣重播得出來。
 */

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const SAVE_KEY = 'stock-life.save'

export type SaveReadResult =
  | { status: 'empty' }
  | { status: 'ok'; save: SaveFile }
  | { status: 'invalid'; message: string }

/** 無痕視窗連讀 localStorage 都可能丟——沒有存檔不是錯誤，只是沒有存檔。 */
function browserStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage as KeyValueStore | undefined
  } catch {
    return undefined
  }
}

export interface SaveStorageOptions {
  store?: KeyValueStore
  key?: string
  /** 注入時鐘：引擎沒有時鐘（§5.3），`savedAt` 由這一層提供。 */
  now?: () => number
}

export class SaveStorage {
  private readonly store: KeyValueStore | undefined
  private readonly key: string
  private readonly now: () => number

  constructor(options: SaveStorageOptions = {}) {
    this.store = options.store ?? browserStore()
    this.key = options.key ?? SAVE_KEY
    this.now = options.now ?? (() => Date.now())
  }

  read(): SaveReadResult {
    let text: string | null
    try {
      text = this.store?.getItem(this.key) ?? null
    } catch {
      return { status: 'empty' }
    }
    if (!text) return { status: 'empty' }

    const parsed = deserializeSave(text)
    if (!parsed.ok) return { status: 'invalid', message: parsed.error.message }
    return { status: 'ok', save: parsed.save }
  }

  /** 每個 command 之後都會呼叫一次，所以絕不能丟例外把遊戲打斷。 */
  write(life: Life): SaveFile | undefined {
    const save = createSaveFile(life, this.now())
    try {
      this.store?.setItem(this.key, serializeSave(save))
    } catch {
      return undefined // 配額滿或無痕視窗：存不下來，但這局照玩
    }
    return save
  }

  clear(): void {
    try {
      this.store?.removeItem(this.key)
    } catch {
      // 同上
    }
  }
}
