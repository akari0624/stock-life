import { createCoreTwSource, PasteSource, probeEvents, type ContentSource } from '@stock-life/engine'
import type { TrialRequest, TrialResponse } from './protocol.ts'

/**
 * 統計試跑跑在 Worker 裡（§6.5.3 #1）。
 *
 * 200 局大約是幾秒的 CPU——放在主執行緒上，作者按下「試跑」之後整個表單會凍住，
 * 而這是他最可能連續按好幾次的按鈕。engine 是無頭的（§3.1），所以它本來就能在
 * Worker 裡跑，一行都不用改。
 */

self.onmessage = (event: MessageEvent<TrialRequest>): void => {
  const request = event.data
  const sources = (): ContentSource[] => [
    ...(request.withCoreTw ? [createCoreTwSource()] : []),
    new PasteSource('編輯中的內容包', request.packText),
  ]

  probeEvents({
    runs: request.runs,
    sources,
    ...(request.seedPrefix === undefined ? {} : { seedPrefix: request.seedPrefix }),
    ...(request.worldGeneratorId === undefined ? {} : { worldGeneratorId: request.worldGeneratorId }),
    ...(request.startYear === undefined ? {} : { startYear: request.startYear }),
    ...(request.risk === undefined ? {} : { policy: { risk: request.risk } }),
  })
    .then((result) => {
      const response: TrialResponse = result.ok
        ? { ok: true, report: result.report }
        : { ok: false, errors: result.errors.map((issue) => `${issue.section}：${issue.message}`) }
      self.postMessage(response)
    })
    .catch((error: unknown) => {
      const response: TrialResponse = { ok: false, errors: [(error as Error).message] }
      self.postMessage(response)
    })
}
