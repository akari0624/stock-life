import type { TrialRequest, TrialResponse } from './protocol.ts'

/**
 * 呼叫試跑 Worker。一次只跑一份：作者連按時舊的直接終止，
 * 不要讓兩份結果互相蓋掉（後回來的不一定是後送出的）。
 */
export class TrialRunner {
  private worker: Worker | undefined

  run(request: TrialRequest): Promise<TrialResponse> {
    this.cancel()
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    this.worker = worker

    return new Promise<TrialResponse>((resolve) => {
      worker.onmessage = (event: MessageEvent<TrialResponse>) => {
        resolve(event.data)
        this.cancel()
      }
      worker.onerror = (event) => {
        resolve({ ok: false, errors: [event.message || '試跑失敗'] })
        this.cancel()
      }
      worker.postMessage(request)
    })
  }

  cancel(): void {
    this.worker?.terminate()
    this.worker = undefined
  }
}
