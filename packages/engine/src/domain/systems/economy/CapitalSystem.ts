import type { GameSystem, Phase, SystemCtx } from '../GameSystem.js'
import { addStat } from '../../state/stats.js'

// §1.1 capital: what income you earn, what share of it you keep, and what
// debt does to you while you're not looking. This is the only system that
// turns time into money — everything else moves the multiplier.

export const CAPITAL_SYSTEM_ID = 'capital'
export const CAPITAL_SYSTEM_ORDER = 30

/** Annual interest charged on outstanding debt (a `leveraged` bet gone wrong, §1.3). */
export const DEBT_INTEREST_RATE = 0.05
/** Share of remaining debt repaid each year, funded from capital. */
export const DEBT_REPAYMENT_RATE = 0.2

export const COUNTER_YEARS_IN_DEBT = 'years_in_debt'

/**
 * Settles the year's money at `end`, after events and career moves have had
 * their say about income.
 */
export function createCapitalSystem(): GameSystem {
  return {
    id: CAPITAL_SYSTEM_ID,
    order: CAPITAL_SYSTEM_ORDER,

    onPhase(phase: Phase, ctx: SystemCtx): void {
      if (phase !== 'end') return
      const { state, emit } = ctx

      const saved = state.capitalState.income * state.capitalState.savingsRate
      if (saved > 0) {
        const delta = addStat(state, 'capital', saved)
        emit({ type: 'stat.add', key: 'capital', value: delta })
      }

      if (state.capitalState.debt <= 0) return

      const interest = addStat(state, 'debt', state.capitalState.debt * DEBT_INTEREST_RATE)
      emit({ type: 'stat.add', key: 'debt', value: interest })

      const payment = Math.min(state.capitalState.capital, state.capitalState.debt * DEBT_REPAYMENT_RATE)
      if (payment > 0) {
        const fromCapital = addStat(state, 'capital', -payment)
        const offDebt = addStat(state, 'debt', -payment)
        emit({ type: 'stat.add', key: 'capital', value: fromCapital })
        emit({ type: 'stat.add', key: 'debt', value: offDebt })
      }

      // Behaviour counter: how long you lived under debt is exactly the kind
      // of thing a trait wants to key off (§7.5).
      addStat(state, COUNTER_YEARS_IN_DEBT, 1)
      emit({ type: 'stat.add', key: COUNTER_YEARS_IN_DEBT, value: 1 })
    },
  }
}
