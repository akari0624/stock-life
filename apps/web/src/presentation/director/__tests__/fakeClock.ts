import type { DirectorOptions } from '../Director.ts'

/**
 * 假時鐘 + 假 rAF：讓演出在測試裡同步跑完，不依賴真實時間。
 */
export class FakeClock {
  time = 0
  private handle = 0
  private queued = new Map<number, () => void>()

  readonly options: Required<Pick<DirectorOptions, 'now' | 'schedule' | 'cancel'>> = {
    now: () => this.time,
    schedule: (callback) => {
      this.handle += 1
      this.queued.set(this.handle, callback)
      return this.handle
    },
    cancel: (handle) => {
      this.queued.delete(handle)
    },
  }

  /** 推進 `ms` 毫秒的**牆上時間**，每 `step` ms 觸發一次 frame。 */
  advance(ms: number, step = 16): void {
    let remaining = ms
    while (remaining > 0) {
      const delta = Math.min(step, remaining)
      this.time += delta
      remaining -= delta
      this.flush()
    }
  }

  /** 一直跑到條件成立或超過上限（避免測試卡死）。 */
  runUntil(done: () => boolean, limitMs = 120_000, step = 16): void {
    let elapsed = 0
    while (!done() && elapsed < limitMs) {
      this.advance(step, step)
      elapsed += step
    }
  }

  private flush(): void {
    const pending = [...this.queued.entries()]
    this.queued.clear()
    for (const [, callback] of pending) callback()
  }
}

/** 只實作 director 用得到的那幾個成員（jsdom 沒有 WAAPI）。 */
export class FakeAnimation {
  playbackRate = 1
  currentTime: number | null = 0
  playCalls = 0
  pauseCalls = 0
  finishCalls = 0

  play(): void {
    this.playCalls += 1
  }

  pause(): void {
    this.pauseCalls += 1
  }

  finish(): void {
    this.finishCalls += 1
    this.currentTime = 1000
  }
}
