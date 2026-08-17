/** 顯示用的數字格式。單位一律是「万」（與引擎的 income / capital 同一單位）。 */

const zhTW = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })

export const int = (value: number): string => zhTW.format(Math.round(value))

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
