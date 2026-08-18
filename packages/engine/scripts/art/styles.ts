// 風格是**一個變數**，不是七十一段各自寫死的形容詞。
//
// 想換整套畫風就換 `--style`，或直接改下面某個 preset 的欄位——
// 七十一張圖的 prompt 會一起變。如果風格散在每一條 subject 裡，
// 你就永遠對不齊，那正是 AI 生圖最常失敗的地方。

export interface ArtStyle {
  id: string
  /** 給人看的說明 */
  label: string
  /** 媒材與筆觸 */
  look: string
  /** 色彩 */
  palette: string
  /** 光線 */
  light: string
  /** 額外的負向詞（會接在共用負向詞後面） */
  negative?: string
}

/**
 * 所有風格都必須遵守的三條，跟畫風無關，是**這個遊戲的舞台**決定的：
 *
 * 1. 舞台把背景壓到 0.35–1 的不透明度，對話框壓在底部——**低對比、別塞細節**。
 * 2. 角色是另外一層貼上去的，所以**背景裡不要有醒目的人**。
 * 3. §2 的鐵則：暗示但不指名。**畫面上不能有看得懂的字、商標、可辨識的企業。**
 */
export const COMMON_RULES =
  'blank unlettered signs, Taiwan, era-neutral between 1985 and 2027'

export const COMMON_NEGATIVE =
  '(text:1.5), (letters:1.5), (words:1.5), (signage:1.4), logo, brand name, watermark, signature, ' +
  'harsh contrast, oversaturated, cluttered lower third, ' +
  // SDXL 對「台灣」的先驗很弱，不擋的話夜市會長成日本、街景會長成古中國
  'Japanese architecture, kimono, sakura, pagoda, ancient Chinese village, ' +
  'deformed hands, extra limbs, blurry, low quality'

export const STYLES: ArtStyle[] = [
  {
    id: 'dusk',
    label: '柔和電影感水粉（預設）——最不挑題材，文字壓上去也讀得清楚',
    look: 'soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges',
    palette: 'muted desaturated palette, warm amber against cool slate, restrained contrast',
    light: 'diffused overcast light with one warm source, long soft shadows, slight atmospheric haze',
  },
  {
    id: 'ink',
    label: '鋼筆線稿＋淡彩——安靜、成本低、放大也不糊',
    look: 'clean ink line art with light watercolour washes, visible paper grain, economical linework',
    palette: 'limited palette of ink black, warm grey and two accent washes',
    light: 'flat even light, shadows implied by wash density rather than value',
    negative: 'heavy rendering, 3d, glossy',
  },
  {
    id: 'film',
    label: '底片攝影感——最寫實，但同一批要對齊最難',
    look: 'photographic still, 35mm film grain, shallow depth of field, natural imperfection',
    palette: 'faded film colour, slightly green shadows, warm highlights',
    light: 'available light only, practical lamps in frame, soft falloff',
    negative: 'illustration, painting, cartoon, cgi',
  },
  {
    id: 'pixel',
    label: '16-bit 像素——最容易統一，也最便宜；但年代感會蓋過台灣感',
    look: '16-bit pixel art, crisp pixel grid, dithered gradients, no anti-aliasing',
    palette: 'limited 32 colour palette, muted tones',
    light: 'two-tone lighting, hard shadow shapes',
    negative: 'smooth gradients, blur, photorealism, high resolution detail',
  },
]

export const DEFAULT_STYLE = 'dusk'

export function findStyle(id: string): ArtStyle | undefined {
  return STYLES.find((style) => style.id === id)
}

/** 兩種素材的取景規則。這一段是**舞台的形狀**決定的，不隨風格變。 */
export const FRAMING = {
  // 短句，而且**不含否定**：SD 的正向 prompt 表達不了「沒有」，
  // 「deserted」這種正面說法才有用，「no people」要放負向。
  bg: 'wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted',
  // 族裔必須寫在**題材之前**：擺在後面 SDXL 會整段忽略，
  // 第一批 20 張角色沒有一個是東亞人。
  actor:
    'portrait of a contemporary Taiwanese person, East Asian features, black hair, ' +
    'single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing',
} as const

/** 兩種素材各自要擋的東西。 */
export const KIND_NEGATIVE = {
  // 加權：像 night_market 這種詞本身就自帶人，不加權趕不走
  bg: '(people:1.4), (person:1.4), (crowd:1.4), figures, portrait, close-up',
  actor: 'busy background, scenery, multiple people',
} as const

/** 建議輸出尺寸（SDXL 原生比例桶，之後再放大）。 */
export const SIZE = { bg: '1344×768', actor: '896×1152' } as const
