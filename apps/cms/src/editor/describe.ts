import { isStatKey, STAT_KEYS, type StateEffect } from '@stock-life/engine'
import type { DraftLink } from './draft.ts'

/**
 * 效果 → 人話。作者要看的是「本金 ×0.7、認知 +4」，不是一段 JSON。
 *
 * ⚠️ **只有 `stat.add` 會被 `mag` 縮放**（`applyContentEffects`），`capital.mul`
 * 不會。這是最容易誤會的一件事：作者以為「大膽 mag 3」會讓 ×0.7 變得更兇，
 * 其實三個選項的本金倍數完全一樣。預覽必須把這件事講出來，不然作者是在對著
 * 一個他以為的規則調數字。
 */

export const STAT_LABELS: Record<string, string> = {
  capital: '本金',
  income: '年收入',
  savingsRate: '儲蓄率',
  debt: '負債',
  cognition: '認知',
  network: '人脈',
  nerve: '心性',
  time: '時間',
}

export const EDITABLE_STAT_KEYS = STAT_KEYS

const SIZING_LABELS: Record<string, string> = {
  light: '輕倉',
  normal: '正常',
  heavy: '重倉',
  leveraged: '融資',
}

/**
 * 這個效果編輯器提不提供？
 *
 * `stat.add` 落在計數器（不是 STAT_KEYS）與 `flag.set` 都是 §6.5.1 說的編譯產物，
 * 不進 UI——但**原樣保留**，顯示成唯讀的一列。
 */
export function isAdvanced(effect: StateEffect): boolean {
  if (effect.type === 'flag.set') return true
  if (effect.type === 'stat.add') return !isStatKey(effect.key)
  return false
}

const signed = (value: number): string => (value >= 0 ? `+${value}` : `${value}`)

export function describeEffect(effect: StateEffect, scale = 1): string {
  switch (effect.type) {
    case 'stat.add': {
      const scaled = effect.value * scale
      const label = STAT_LABELS[effect.key] ?? effect.key
      const suffix = isStatKey(effect.key) ? '' : '（計數器）'
      return `${label}${suffix} ${signed(scaled)}`
    }
    case 'capital.mul':
      return `本金 ×${effect.value}`
    case 'flag.set':
      return `旗標 ${effect.key}（進階）`
    case 'trait.grant':
      return `獲得特性「${effect.id}」`
    case 'position.open':
      return `開倉「${effect.opportunityId}」（${SIZING_LABELS[effect.sizing] ?? effect.sizing}）`
  }
}

export function describeEffects(effects: readonly StateEffect[], scale = 1): string {
  if (effects.length === 0) return '（沒有任何變化）'
  return effects.map((effect) => describeEffect(effect, scale)).join('、')
}

/** §6.5.1 的第一、二列：作者說的是「A 之後接 B」「過幾年才 B」。 */
export function describeLink(link: DraftLink | undefined): string {
  if (!link || link.id.length === 0) return '故事在這裡結束'
  const when = link.afterYears && link.afterYears > 0 ? `${link.afterYears} 年後` : '同一年馬上'
  const orElse = link.orElse ? `；到期時演不成就改演「${link.orElse}」` : ''
  return `${when}接「${link.id}」${orElse}`
}

/** 選項的成功率：`successChance` 的顯示版，跟真正擲骰的是同一個數字（§7.2）。 */
export function describeOdds(odds: string): string {
  const offset = Number.parseInt(odds, 10)
  if (!Number.isFinite(offset)) return '？'
  return `${Math.min(100, Math.max(0, 50 + offset))}%`
}
