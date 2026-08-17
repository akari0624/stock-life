import { useEffect, useState } from 'react'
import type { Effect } from '@stock-life/engine'
import { compile } from '../presentation/director/compile.ts'
import { Director } from '../presentation/director/Director.ts'
import {
  audioEngine,
  bindDirectorAudio,
  contentSfx,
  playSound,
  uiActionIds,
} from '../presentation/audio/index.ts'
import { cn } from '../styles/cn.ts'
import { BUTTON, BUTTON_ACTIVE, CARD } from '../app/ui.ts'

/**
 * S15 的音效測試頁：列出所有已註冊 id、逐一觸發、可調 rate 觀察策略差異，
 * 以及看 would-play 清單長出來——**那份清單就是音效需求清單**（§10.7）。
 *
 * 現在一個音檔都沒有，所以「有沒有聲音」看的是 console 的 `[audio] would play: …`。
 */

const DEMO_EFFECTS: Effect[] = [
  { type: 'scene.bgm', id: 'bgm_boom', fadeMs: 800 },
  { type: 'scene.sfx', id: 'phone_ring' },
  { type: 'scene.say', actor: 'colleague_a', text: '下季展望很好，你要不要看一下' },
  { type: 'stat.add', key: 'capital', value: -300 },
  { type: 'scene.sfx', id: 'keyboard' },
  { type: 'scene.fx', id: 'crash_red' },
  { type: 'scene.sfx', id: 'alert', priority: 'high' },
  { type: 'trait.grant', id: 'diamond_hands' },
]

export function AudioLab() {
  const engine = audioEngine()
  const [rate, setRate] = useState(1)
  const [wouldPlay, setWouldPlay] = useState<{ id: string; count: number }[]>([])
  const [director] = useState(() => new Director())

  useEffect(() => bindDirectorAudio(director, engine), [director, engine])

  useEffect(() => {
    const timer = setInterval(() => setWouldPlay(engine.wouldPlay()), 500)
    return () => clearInterval(timer)
  }, [engine])

  return (
    <section className={cn(CARD, 'p-6')}>
      <h2 className="text-title mb-1 text-at-text-primary">Audio lab</h2>
      <p className="text-caption mb-4 text-at-text-muted">
        現在沒有任何音檔：打開 console 看 <code>[audio] would play: …</code>。
      </p>

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
            className={cn(BUTTON, value === rate && BUTTON_ACTIVE)}
          >
            {value}×
          </button>
        ))}
        <button
          type="button"
          className={BUTTON}
          onClick={() => {
            director.load(compile(DEMO_EFFECTS))
            director.rate(rate)
            director.play()
          }}
        >
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
