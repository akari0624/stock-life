import { useEffect, useState } from 'react'
import { audioEngine, isAudioLocked, unlockAudio, type PersistedBus } from '../../presentation/audio/index.ts'
import { BUTTON } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 音效控制。**bgm 與 sfx 分開**（§10.7），呼叫 S15 提供的 API。
 *
 * `AudioContext` 還是 `suspended` 時要**明確顯示「點一下開啟音效」**，
 * 不要假裝在播——那個 bug 開發時看不到（你點過畫面），只有新訪客會中。
 */

const BUS_LABELS: Record<PersistedBus, string> = { bgm: '音樂', sfx: '音效' }

export function AudioControls() {
  const engine = audioEngine()
  const [locked, setLocked] = useState(() => isAudioLocked())
  const [, force] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setLocked(isAudioLocked()), 1_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {locked && (
        <button
          type="button"
          className={cn(BUTTON, 'border-at-warn text-at-warn')}
          onClick={() => {
            void unlockAudio().then(() => setLocked(isAudioLocked()))
          }}
        >
          🔇 點一下開啟音效
        </button>
      )}

      {(['bgm', 'sfx'] as const).map((bus) => {
        const settings = engine.settings(bus)
        return (
          <span key={bus} className="flex items-center gap-1.5">
            <button
              type="button"
              className={BUTTON}
              onClick={() => {
                engine.toggleMuted(bus)
                force((n) => n + 1)
              }}
              aria-label={`${BUS_LABELS[bus]}${settings.muted ? '取消靜音' : '靜音'}`}
            >
              {settings.muted ? '🔇' : '🔊'} {BUS_LABELS[bus]}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.volume * 100)}
              onChange={(event) => {
                engine.setVolume(bus, Number(event.target.value) / 100)
                force((n) => n + 1)
              }}
              className="w-16 accent-at-accent-default"
              aria-label={`${BUS_LABELS[bus]}音量`}
            />
          </span>
        )
      })}
    </div>
  )
}
