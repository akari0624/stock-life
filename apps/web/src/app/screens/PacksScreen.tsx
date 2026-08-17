import { useRef, useState } from 'react'
import { exportContentJSONSchemas, FileSource, PasteSource } from '@stock-life/engine'
import { useApp, useStore } from '../hooks.ts'
import { downloadText } from '../packs/download.ts'
import { BUTTON, BUTTON_ACTIVE, CARD, INPUT } from '../ui.ts'
import { cn } from '../../styles/cn.ts'

/**
 * 內容包管理（S18）：已載入清單、啟用／停用、匯入、匯出、驗證錯誤顯示。
 *
 * **純前端**：檔案不上傳到任何地方，匯出就是瀏覽器下載（沒有後端、沒有市集）。
 * 匯入的兩種方式（檔案／貼上）在這裡各自建一個 `ContentSource`，之後就走同一條路。
 */
export function PacksScreen() {
  const store = useStore()
  const { packs, library, packMessage, session } = useApp()
  const [pasted, setPasted] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const importFiles = async (files: FileList | null): Promise<void> => {
    for (const file of [...(files ?? [])]) await store.importPack(new FileSource(file))
    if (fileInput.current) fileInput.current.value = ''
  }

  const importPasted = async (): Promise<void> => {
    if (!pasted.trim()) return
    const ok = await store.importPack(new PasteSource('貼上的內容', pasted))
    if (ok) setPasted('')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-display text-at-text-primary">內容包</h1>
        <button type="button" className={BUTTON} onClick={() => store.goto(session ? 'game' : 'title')}>
          回去
        </button>
      </header>

      {packMessage && (
        <p
          className="text-caption rounded border border-at-border-strong bg-at-surface-overlay p-3 text-at-text-secondary"
          role="alert"
          onClick={() => store.dismissPackMessage()}
        >
          {packMessage}
        </p>
      )}

      <section className={cn(CARD, 'flex flex-col gap-3 p-4')}>
        <h2 className="text-title text-at-text-primary">匯入</h2>
        <p className="text-caption text-at-text-muted">
          內容包是一個 JSON 檔：<code>manifest</code> 加上 <code>events</code> / <code>opportunities</code> /{' '}
          <code>careerGraph</code> / <code>traits</code>（沒寫的區塊當空的）。匯入後下一局開始生效，
          而且分享碼的指紋會跟著改變——同種子在不同內容組合下本來就不是同一段人生（§5.1）。
        </p>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          multiple
          className={cn(INPUT, 'text-caption')}
          onChange={(event) => void importFiles(event.target.files)}
        />

        <textarea
          className={cn(INPUT, 'h-28 font-mono')}
          placeholder="…或把整包 JSON 貼在這裡"
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BUTTON} disabled={!pasted.trim()} onClick={() => void importPasted()}>
            匯入貼上的內容
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => downloadText('stock-life.schema.json', JSON.stringify(exportContentJSONSchemas(), null, 2))}
          >
            下載官方 JSON Schema
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title text-at-text-primary">已安裝</h2>

        <div className={cn(CARD, 'p-4')}>
          <h3 className="text-body text-at-text-primary">
            core-tw <span className="text-caption text-at-text-muted">內建</span>
          </h3>
          <p className="text-caption mt-1 text-at-text-muted">
            官方內容包走跟 mod 完全一樣的載入器與 schema（§6.4），所以 mod 做得到的事官方也不會多一分特權。
          </p>
        </div>

        {library.length === 0 ? (
          <p className="text-caption text-at-text-muted">還沒裝任何第三方內容包。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {library.map((pack) => (
              <li key={pack.id} className={cn(CARD, 'flex flex-col gap-2 p-4')}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-body text-at-text-primary">
                    {pack.id} <span className="text-numeric text-at-text-muted">v{pack.version}</span>
                  </h3>
                  <span className="text-caption text-at-text-muted">{pack.label}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(BUTTON, pack.enabled && BUTTON_ACTIVE)}
                    onClick={() => store.setPackEnabled(pack.id, !pack.enabled)}
                  >
                    {pack.enabled ? '已啟用' : '已停用'}
                  </button>
                  <button
                    type="button"
                    className={BUTTON}
                    onClick={() => downloadText(`${pack.id}-${pack.version}.json`, store.exportPack(pack.id) ?? '')}
                  >
                    匯出
                  </button>
                  <button type="button" className={BUTTON} onClick={() => store.removePack(pack.id)}>
                    移除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-title text-at-text-primary">這一局實際載入的</h2>
        {packs.length === 0 ? (
          <p className="text-caption text-at-text-muted">還沒開始過人生，所以還沒載入任何內容包。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {packs.map((manifest) => (
              <li key={manifest.id} className={cn(CARD, 'p-4')}>
                <h3 className="text-body text-at-text-primary">
                  {manifest.id} <span className="text-numeric text-at-text-muted">v{manifest.version}</span>
                </h3>
                <p className="text-caption mt-1 text-at-text-muted">
                  事件 {manifest.provides.events} · 機會 {manifest.provides.opportunities} · 職涯{' '}
                  {manifest.provides.careers} · 特性 {manifest.provides.traits}
                </p>
                <p className="text-caption text-at-text-muted">
                  engineApi {manifest.engineApi} · facade v{manifest.facadeVersion}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
