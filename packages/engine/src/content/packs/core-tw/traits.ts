export const coreTwTraits = [
  {
    id: 'diamond_hands',
    name: '鑽石手',
    tone: 'gold',
    require: {
      all: [{ '>=': ['counter.held_through_drawdown', 3] }, { '<=': ['counter.panic_sold', 0] }],
    },
    exclude: ['paper_hands'],
    grants: [{ type: 'stat.add', key: 'nerve', value: 10 }],
    text: '帳面腰斬三次，你一股都沒賣。市場的噪音再也動不了你——持倉考驗的失敗率大幅降低。',
    scene: { fx: 'trait_unlock', sfx: 'chime' },
    checkOn: ['turn.end', 'position.close'],
  },
]
