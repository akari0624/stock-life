import type { GameState } from './GameState.js'

// §7.2/§7.5 content writes `{ type: 'stat.add', key: 'income' | 'nerve' | … }`
// for real stats and `{ key: 'panic_sold' }` for behaviour counters — one
// effect type, two destinations. Routing lives here so systems and
// applyStateEffect() can never disagree about where a key lands.

export const STAT_KEYS = [
  'capital',
  'income',
  'savingsRate',
  'debt',
  'cognition',
  'network',
  'nerve',
  'time',
] as const

export type StatKey = (typeof STAT_KEYS)[number]

const STAT_KEY_SET = new Set<string>(STAT_KEYS)

export function isStatKey(key: string): key is StatKey {
  return STAT_KEY_SET.has(key)
}

/** Bounds keep a stat from drifting into nonsense (negative capital, nerve > 100). */
const STAT_BOUNDS: Record<StatKey, { min: number; max: number }> = {
  capital: { min: 0, max: Number.POSITIVE_INFINITY },
  income: { min: 0, max: Number.POSITIVE_INFINITY },
  savingsRate: { min: 0, max: 1 },
  debt: { min: 0, max: Number.POSITIVE_INFINITY },
  cognition: { min: 0, max: Number.POSITIVE_INFINITY },
  network: { min: 0, max: Number.POSITIVE_INFINITY },
  nerve: { min: 0, max: 100 },
  time: { min: 0, max: 100 },
}

function clamp(key: StatKey, value: number): number {
  const { min, max } = STAT_BOUNDS[key]
  return Math.min(max, Math.max(min, value))
}

export function readStat(state: GameState, key: StatKey): number {
  switch (key) {
    case 'capital':
      return state.capitalState.capital
    case 'income':
      return state.capitalState.income
    case 'savingsRate':
      return state.capitalState.savingsRate
    case 'debt':
      return state.capitalState.debt
    case 'cognition':
      return state.capitalState.cognition
    case 'network':
      return state.capitalState.network
    case 'nerve':
      return state.player.nerve
    case 'time':
      return state.player.time
  }
}

function writeStat(state: GameState, key: StatKey, value: number): void {
  const next = clamp(key, value)
  switch (key) {
    case 'capital':
      state.capitalState.capital = next
      return
    case 'income':
      state.capitalState.income = next
      return
    case 'savingsRate':
      state.capitalState.savingsRate = next
      return
    case 'debt':
      state.capitalState.debt = next
      return
    case 'cognition':
      state.capitalState.cognition = next
      return
    case 'network':
      state.capitalState.network = next
      return
    case 'nerve':
      state.player.nerve = next
      return
    case 'time':
      state.player.time = next
      return
  }
}

/**
 * Applies `stat.add` semantics in place: a known stat key moves that stat
 * (clamped), anything else accumulates into `counters.<key>` — the open
 * namespace mods write their own trait conditions against (§7.5).
 * Returns the delta actually applied, which is what the director animates.
 */
export function addStat(state: GameState, key: string, value: number): number {
  if (isStatKey(key)) {
    const before = readStat(state, key)
    writeStat(state, key, before + value)
    return readStat(state, key) - before
  }
  const before = state.counters[key] ?? 0
  state.counters[key] = before + value
  return value
}

/** Sets a stat/counter to an absolute value, returning the delta it took. */
export function setStat(state: GameState, key: string, value: number): number {
  const before = isStatKey(key) ? readStat(state, key) : (state.counters[key] ?? 0)
  return addStat(state, key, value - before)
}
