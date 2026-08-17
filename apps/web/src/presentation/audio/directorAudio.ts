import type { Director } from '../director/Director.ts'
import type { AudioEngine } from './AudioEngine.ts'
import { audioEngine } from './playSound.ts'
import { contentSfx } from './uiSounds.ts'

/**
 * director ↔ 音效的唯一接縫。
 *
 * **為什麼不預先排程整段演出**：director 的 cue 是在**真實時間**跨過 scene 起點時
 * 才發的，也就是說 cue 抵達的那一刻就是該發聲的那一刻（倍率已經被 director 吃掉了）。
 * 於是 §10.7 表格裡的兩條規則自然成立：
 *
 * - `rate(n)`：cue 變 n 倍密 → **leading-edge debounce 自然稀釋**，
 *   不需要任何「按倍率過濾」的分類表
 * - `finish()` / 跳過：剩下的 cue 一次湧入且帶 `skipped: true`
 *   → `normal` 直接不播、`high` 存活，**不會有一陣噪音**
 *
 * `when` 仍然完整實作（`AudioEngine` 那邊），給「結算完 200ms 後的定音」這類
 * 真的需要延遲的呼叫者用；那種音效才是 `cancelScheduled()` 要清掉的對象。
 *
 * ⚠️ 這裡不碰 `ui` bus——互動音效根本不經過 director（§10.7）。
 */
export function bindDirectorAudio(director: Director, engine: AudioEngine = audioEngine()): () => void {
  return director.onCue(({ scene, skipped }) => {
    if (scene.kind === 'sfx') {
      if (skipped) {
        // 跳過：先把排程中的 normal 清掉（idempotent，第二次呼叫就沒東西可清了）
        engine.cancelScheduled('normal')
        if (scene.priority !== 'high') return
      }
      engine.playSound(contentSfx(scene.id), {
        bus: 'sfx',
        priority: scene.priority,
        dedupeMs: scene.dedupeMs,
      })
      return
    }

    if (scene.kind === 'bgm') {
      // BGM 不受跳過影響（它是氣氛不是一次性音效），也永遠正常速度、不變調
      engine.playSound(contentSfx(scene.id), { bus: 'bgm', fadeMs: scene.fadeMs })
    }
  })
}
