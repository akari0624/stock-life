import { useEffect, useState } from 'react'
import { compile } from '../presentation/director/compile.ts'
import { Director } from '../presentation/director/Director.ts'
import {
  audioEngine,
  bindDirectorAudio,
  contentSfx,
  isAudioLocked,
  playSound,
  uiActionIds,
  unlockAudio,
  type PersistedBus,
} from '../presentation/audio/index.ts'
import type { Effect } from '@stock-life/engine'
import { cn } from '../styles/cn.ts'

/**
 * S15 的開發用測試頁（S16 會刪掉它）。
 *
 * 用途：列出所有已註冊的 action id、逐一觸發、調倍率觀察策略差異，
 * 以及看 would-play 清單長出來——**那份清單就是音效需求清單**（§10.7）。
 *
 * 現在一個音檔都沒有，所以「有沒有聲音」看的是 console 的 `[audio] would play: …`。
 */

const DEMO_EFFECTS: Effect[] = [
  { type: 'scene.bgm', id: 'bgm_boom', fadeMs: 800 },
  { type: 'scene.sfx', id: 'phone_ring' },
  { type: 'scene.say', actor: 'colleague_a', text: '下季展望很好，你要不要看一下' },
  { type: 'stat.add', key: 'capital', value: -300_000 },
  { type: 'scene.sfx', id: 'keyboard' },
  { type: 'scene.fx', id: 'crash_red' },
  { type: 'scene.sfx', id: 'alert', priority: 'high' },
  { type: 'trait.grant', id: 'diamond_hands' },
]

const BUTTON = 'text-caption rounded border border-at-border-strong px-2.5 py-1.5 text-at-text-secondary hover:border-at-accent-default hover:text-at-accent-default'

export function AudioLab() {
  const engine = audioEngine()
  const [locked, setLocked] = useState(true)
  const [rate, setRate] = useState(1)
  const [wouldPlay, setWouldPlay] = useState<{ id: string; count: number }[]>([])
  const [director] = useState(() => new Director())

  useEffect(() => bindDirectorAudio(director, engine), [director, engine])

  useEffect(() => {
    const timer = setInterval(() => {
      setLocked(isAudioLocked())
      setWouldPlay(engine.wouldPlay())
    }, 500)
    return () => clearInterval(timer)
  }, [engine])

  const play = (): void => {
    director.load(compile(DEMO_EFFECTS))
    director.rate(rate)
    director.play()
  }

  const setBus = (bus: PersistedBus, muted: boolean): void => {
    engine.setMuted(bus, muted)
    playSound('ui_toggle')
  }

  return (
    <section className="rounded-lg border border-at-border-subtle bg-at-surface-raised p-6">
      <h2 className="text-title mb-1 text-at-text-primary">Audio lab（S15 開發頁）</h2>
      <p className="text-caption mb-4 text-at-text-muted">
        現在沒有任何音檔：打開 console 看 <code>[audio] would play: …</code>。
      </p>

      {locked && (
        <button
          type="button"
          onClick={() => {
            void unlockAudio().then(() => setLocked(isAudioLocked()))
          }}
          className={cn(BUTTON, 'mb-4 border-at-warn text-at-warn')}
        >
          🔇 點一下開啟音效（AudioContext 還是 suspended）
        </button>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {uiActionIds().map((id) => (
          <button key={id} type="button" className={BUTTON} onClick={() => playSound(id)}>
            {id}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-caption text-at-text-muted">演出：</span>
        {[1, 2, 4, 8].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRate(value)}
            className={cn(BUTTON, value === rate && 'border-at-accent-default text-at-accent-default')}
          >
            {value}×
          </button>
        ))}
        <button type="button" className={BUTTON} onClick={play}>
          ▶ 播一段
        </button>
        <button type="button" className={BUTTON} onClick={() => director.finish()}>
          ⏭ 跳過（normal 取消、high 存活）
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() => {
            for (let i = 0; i < 20; i += 1) playSound(contentSfx(`flood_${i}`))
          }}
        >
          💥 20 個不同 id（測併發上限 8）
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['bgm', 'sfx'] as const).map((bus) => (
          <button
            key={bus}
            type="button"
            className={BUTTON}
            onClick={() => setBus(bus, !engine.settings(bus).muted)}
          >
            {engine.settings(bus).muted ? '🔇' : '🔊'} {bus}
          </button>
        ))}
      </div>

      <h3 className="text-caption mb-1 text-at-text-secondary">would-play（＝音效需求清單）</h3>
      {wouldPlay.length === 0 ? (
        <p className="text-caption text-at-text-muted">還沒有任何 id 在等音檔。</p>
      ) : (
        <ul className="text-caption grid grid-cols-2 gap-x-4 text-at-text-muted sm:grid-cols-3">
          {wouldPlay.map(({ id, count }) => (
            <li key={id}>
              <code>{id}</code> <span className="text-numeric">×{count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
