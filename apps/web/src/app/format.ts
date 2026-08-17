/** 顯示用的數字格式。單位一律是「万」（與引擎的 income / capital 同一單位）。 */

const zhTW = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })

export const int = (value: number): string => zhTW.format(Math.round(value))

/** 年份沒有千分位——`2,016 年` 是數字格式套錯地方。 */
export const year = (value: number): string => String(Math.round(value))

export const money = (value: number): string => `${int(value)} 万`

export const percent = (value: number): string => `${Math.round(value)}%`

export const signed = (value: number): string => `${value > 0 ? '+' : value < 0 ? '−' : ''}${int(Math.abs(value))}`

export const STAT_LABELS: Record<string, string> = {
  capital: '本金',
  income: '年收',
  savingsRate: '儲蓄率',
  debt: '負債',
  cognition: '認知',
  network: '人脈',
  nerve: '膽識',
  time: '時間',
}

export const SIZING_LABELS: Record<string, string> = {
  light: '試水溫',
  normal: '正常倉',
  heavy: '重倉',
  leveraged: '槓桿',
}

export const OUTCOME_LABELS: Record<string, string> = {
  financially_free: '財務自由',
  comfortable: '過得不錯',
  getting_by: '勉強過得去',
  scraping_by: '沒攢下什麼',
  in_debt: '負債收場',
}

/** 時代主題（`DEFAULT_THEME_POOL` 的十個字）。暗示但不指名（§2）。 */
export const THEME_LABELS: Record<string, string> = {
  memory: '記憶體',
  internet: '網路',
  property: '房地產',
  biotech: '生技',
  energy: '能源',
  shipping: '航運',
  ai: 'AI',
  finance: '金融',
  consumer: '消費電子',
  crypto: '加密貨幣',
}

export const themeLabel = (theme: string): string => THEME_LABELS[theme] ?? theme

/** 職涯節點的產業（`career.industry`）。 */
export const INDUSTRY_LABELS: Record<string, string> = {
  tech: '科技',
  finance: '金融',
  trade: '貿易',
  public: '公職',
  education: '教育',
  factory: '製造',
  service: '服務',
  own: '自己做',
  none: '無',
}

/** 機會卡上那幾行細節的欄位名。`reveal` 是內部訊號，不給玩家看。 */
export const OFFER_DETAIL_LABELS: Record<string, string> = {
  themes: '主題',
  industry: '產業',
  rank: '職級',
}

/** 把 offer.detail 的一個欄位變成可讀的一行；回傳 undefined 表示不顯示。 */
export function offerDetailLine(key: string, value: unknown): string | undefined {
  const label = OFFER_DETAIL_LABELS[key]
  if (!label) return undefined
  if (key === 'themes' && Array.isArray(value)) return `${label}：${value.map(themeLabel).join('、')}`
  if (key === 'industry') return `${label}：${INDUSTRY_LABELS[String(value)] ?? String(value)}`
  return `${label}：${Array.isArray(value) ? value.join('、') : String(value)}`
}

export const ERA_LABELS: Record<string, string> = {
  crash: '崩盤',
  recession: '衰退',
  recovery: '復甦',
  boom: '繁榮',
  mania: '狂熱',
  unknown: '——',
}

export const DICE_LABELS: Record<string, string> = {
  study: '進修',
  social: '社交',
  work: '工作',
  rest: '休息',
}

export const TRIAL_LABELS: Record<string, string> = {
  hold: '抱住',
  sell: '賣掉',
}
