export const coreTwOpportunities = [
  {
    id: 'mem_supercycle_a',
    tier: 'life',
    window: { eraPhase: ['boom', 'mania'], themes: ['memory'] },
    require: { all: [{ '>=': ['cognition', 30] }] },
    sourcedBy: ['colleague', 'broker', 'forum'],
    truth: { multiple: [6, 12], years: [2, 4], ruinChance: 15 },
    signal: {
      low: { text: '同事說這檔穩賺，他表哥在裡面做', reveal: [] },
      mid: { text: '做記憶體的，聽說產業要回溫了', reveal: ['theme'] },
      high: {
        text: '營收連三月雙位數成長、外資連買、本益比 12 倍，但客戶集中度偏高',
        reveal: ['theme', 'valuation', 'risk'],
      },
    },
    sizing: ['light', 'normal', 'heavy', 'leveraged'],
    trials: ['drawdown_50', 'triple_temptation', 'family_emergency'],
    scene: { bg: 'office_night', actor: 'colleague_a', sfx: 'phone_ring' },
  },
]
