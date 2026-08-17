import type { GameState } from '../state/GameState.js'

// §6.1: the only contract mod content is allowed to depend on. GameState's
// internal shape can be freely refactored as long as this mapping is kept
// in sync — mods never see `state.player.age`, only `read(state, 'age')`.

export type FacadePath =
  | 'age'
  | 'year'
  | 'stage'
  | 'capital'
  | 'income'
  | 'savingsRate'
  | 'debt'
  | 'cognition'
  | 'network'
  | 'nerve'
  | 'time'
  | 'career.id'
  | 'career.industry'
  | 'career.rank'
  | 'era.phase'
  | 'era.themes'
  | 'family.status'
  | 'family.kids'
  | 'position.count'
  | 'position.worstDrawdown'
  | `flag.${string}`
  | `counter.${string}`

/**
 * Bump whenever a facade path's meaning changes or a path is removed.
 * Adding a new path is not a breaking change and does not require a bump.
 */
export const FACADE_VERSION = 1

export type FacadeValue = string | number | boolean | readonly string[]

export function readFacade(state: GameState, path: FacadePath): FacadeValue {
  if (path.startsWith('flag.')) {
    return state.flags[path.slice('flag.'.length)] ?? false
  }
  if (path.startsWith('counter.')) {
    return state.counters[path.slice('counter.'.length)] ?? 0
  }

  switch (path) {
    case 'age':
      return state.player.age
    case 'year':
      return state.year
    case 'stage':
      return state.player.stage
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
    case 'career.id':
      return state.career.id
    case 'career.industry':
      return state.career.industry
    case 'career.rank':
      return state.career.rank
    case 'era.phase':
      return state.era.phase
    case 'era.themes':
      return state.era.themes
    case 'family.status':
      return state.player.family.status
    case 'family.kids':
      return state.player.family.kids
    case 'position.count':
      return state.positions.count
    case 'position.worstDrawdown':
      return state.positions.worstDrawdown
    default:
      throw new Error(`Unhandled facade path: ${String(path)}`)
  }
}
