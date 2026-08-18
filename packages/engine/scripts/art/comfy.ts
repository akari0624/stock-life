// ComfyUI 批次生圖：把 ART.md 那 71 條 prompt 灌進 ComfyUI 的 HTTP API。
//
//   pnpm --filter engine run art:gen                          # 全部
//   pnpm --filter engine run art:gen -- --only office,bank    # 只重跑這幾張
//   pnpm --filter engine run art:gen -- --kind actor          # 只跑角色
//   pnpm --filter engine run art:gen -- --style ink --seed 7
//   pnpm --filter engine run art:gen -- --dry-run             # 只印要跑什麼
//
// 產出放在 `art-out/<style>/<id>.png`（不進 git）。滿意之後才轉 webp、
// 填進內容包的 manifest.assets。
//
// **每一張的 seed 是 id 的雜湊 + --seed 偏移**，所以重跑 `office` 會拿到
// 同一張圖；要換就把 --seed 加一。批次之間可重現，這跟遊戲本身的種子紀律是同一件事。

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SERVER = process.env.COMFY_URL ?? 'http://127.0.0.1:8188'

export interface GenOptions {
  ckpt: string
  vae: string
  steps: number
  cfg: number
  sampler: string
  scheduler: string
  width: number
  height: number
}

export const BG_SIZE = { width: 1344, height: 768 }
export const ACTOR_SIZE = { width: 896, height: 1152 }

export const DEFAULTS: GenOptions = {
  ckpt: 'sd_xl_base_1.0.safetensors',
  vae: 'sdxl_vae.safetensors',
  steps: 30,
  cfg: 6.5,
  sampler: 'dpmpp_2m',
  scheduler: 'karras',
  ...BG_SIZE,
}

/** 32-bit FNV-1a，跟 AssetResolver 用的同一個：同 id 同 seed。 */
export function seedFor(id: string, offset: number): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return ((hash >>> 0) + offset) % 0xffffffff
}

export function workflow(id: string, positive: string, negative: string, seed: number, o: GenOptions) {
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: o.ckpt } },
    '10': { class_type: 'VAELoader', inputs: { vae_name: o.vae } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: o.width, height: o.height, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: positive, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['4', 1] } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: o.steps,
        cfg: o.cfg,
        sampler_name: o.sampler,
        scheduler: o.scheduler,
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['10', 0] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: `stock-life/${id}`, images: ['8', 0] } },
  }
}

interface HistoryImage {
  filename: string
  subfolder: string
  type: string
}

export async function serverAlive(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER}/system_stats`, { signal: AbortSignal.timeout(3000) })
    return response.ok
  } catch {
    return false
  }
}

/** 送一張，等它跑完，把圖抓回來寫進 outDir。回傳寫出的路徑。 */
export async function render(
  id: string,
  positive: string,
  negative: string,
  seed: number,
  options: GenOptions,
  outDir: string,
): Promise<string> {
  const body = JSON.stringify({ prompt: workflow(id, positive, negative, seed, options) })
  const queued = await fetch(`${SERVER}/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
  if (!queued.ok) throw new Error(`${id}: ComfyUI 回 ${queued.status} — ${await queued.text()}`)
  const { prompt_id: promptId } = (await queued.json()) as { prompt_id: string }

  const images = await waitFor(promptId)
  if (images.length === 0) throw new Error(`${id}: 跑完了但沒有輸出`)

  const image = images[0]
  const query = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder,
    type: image.type,
  })
  const file = await fetch(`${SERVER}/view?${query.toString()}`)
  if (!file.ok) throw new Error(`${id}: 抓不回圖（${file.status}）`)

  await mkdir(outDir, { recursive: true })
  const out = path.join(outDir, `${id}.png`)
  await writeFile(out, Buffer.from(await file.arrayBuffer()))
  return out
}

async function waitFor(promptId: string): Promise<HistoryImage[]> {
  // ComfyUI 沒有 blocking API，只能問 history。一張 SDXL 大約十秒，兩秒問一次夠了。
  for (let attempt = 0; attempt < 900; attempt += 1) {
    const response = await fetch(`${SERVER}/history/${promptId}`)
    const history = (await response.json()) as Record<string, { outputs?: Record<string, { images?: HistoryImage[] }> }>
    const entry = history[promptId]
    if (entry?.outputs) {
      return Object.values(entry.outputs).flatMap((output) => output.images ?? [])
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error(`${promptId}: 等了三十分鐘還沒好`)
}
