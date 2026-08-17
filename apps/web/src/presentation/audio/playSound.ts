import { AudioBus } from './AudioBus.ts'
import { AudioEngine } from './AudioEngine.ts'
import { WebAudioOutput } from './WebAudioOutput.ts'
import type { ActionId } from './uiSounds.ts'
import type { PlayOptions } from './types.ts'

/**
 * `playSound(actionId, opts?)` —— **全專案唯一的音效入口**（§10.7）。
 *
 *   playSound('ui_click')                                   立即播、ui bus
 *   playSound(contentSfx('crash'), { bus: 'sfx', when: 200 }) 排程播、可被跳過取消
 *
 * 打錯字是**編譯期錯誤**：`playSound('clik')` 不通過型別檢查。
 *
 * 這裡是模組級單例（音效不該靠 prop 傳遍整棵樹）。`AudioContext` 是**延遲建立**的，
 * 所以在使用者手勢之前不會有任何事情發生，而 `isAudioLocked()` 也就永遠是 true。
 */

let engine: AudioEngine | undefined

export function audioEngine(): AudioEngine {
  if (!engine) {
    const bus = new AudioBus()
    engine = new AudioEngine({ output: new WebAudioOutput(bus), bus })
  }
  return engine
}

/** 測試／dev 用：換掉單例。 */
export function setAudioEngine(next: AudioEngine | undefined): void {
  engine = next
}

export function playSound(actionId: ActionId, options?: PlayOptions): void {
  audioEngine().playSound(actionId, options)
}

/** 首次使用者手勢時呼叫（S16 綁在「開始人生」按鈕上）。 */
export function unlockAudio(): Promise<void> {
  return audioEngine().unlock()
}

/** `true` 時 UI 要明確顯示「點一下開啟音效」，不要假裝在播（§10.7）。 */
export function isAudioLocked(): boolean {
  return audioEngine().isLocked()
}
