import type { AudioOutput, Bus, PlayHandle, PlayRequest } from '../types.ts'
import type { StorageLike } from '../AudioBus.ts'

/**
 * 假的 AudioOutput：jsdom 沒有 Web Audio，而政策層（去重、併發、跳過取消）
 * 本來就不需要真的發聲才能測。
 *
 * 它刻意**沒有任何改變速率的 API**——engine 想改音高也改不了（§10.7）。
 */
export class FakeOutput implements AudioOutput {
  /** 直接推這個欄位，或在建構時接一個外部時鐘（與 director 共用同一條時間軸） */
  time = 0
  private readonly nowSource: (() => number) | undefined
  locked = true
  unlockCalls = 0
  readonly played: PlayRequest[] = []
  readonly stopped: string[] = []
  readonly gains = new Map<Bus, number>()

  /** 沒有列在這裡的 url 就當成「缺音檔」→ play() 回 undefined */
  readonly available = new Set<string>()
  /** 假設每個音效多長（ms） */
  soundMs = 1_000

  constructor(nowSource?: () => number) {
    this.nowSource = nowSource
  }

  nowMs(): number {
    return this.nowSource ? this.nowSource() : this.time
  }

  isLocked(): boolean {
    return this.locked
  }

  async unlock(): Promise<void> {
    this.unlockCalls += 1
    this.locked = false
  }

  setGain(bus: Bus, value: number): void {
    this.gains.set(bus, value)
  }

  async load(urls: readonly string[]): Promise<void> {
    for (const url of urls) this.available.add(url)
  }

  play(request: PlayRequest): PlayHandle | undefined {
    if (!this.available.has(request.url)) return undefined
    this.played.push(request)
    let stopped = false
    return {
      endsAt: this.time + request.delayMs + this.soundMs,
      stop: () => {
        if (stopped) return
        stopped = true
        this.stopped.push(request.id)
      },
    }
  }

  /** 目前還在發聲的（播了、還沒被停掉） */
  sounding(): string[] {
    const stopped = [...this.stopped]
    return this.played
      .map((request) => request.id)
      .filter((id) => {
        const index = stopped.indexOf(id)
        if (index === -1) return true
        stopped.splice(index, 1)
        return false
      })
  }
}

export class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>()

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
}
