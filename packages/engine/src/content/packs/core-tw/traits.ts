// §7.5 投資人格：全部建立在引擎的官方計數器上（counter.*），
// 所以 mod 作者看得到同一組數字，寫得出自己的第四種人格。
export const coreTwTraits = [
  {
    id: 'diamond_hands',
    name: '鑽石手',
    tone: 'gold',
    require: {
      all: [{ '>=': ['counter.held_through_drawdown', 3] }, { '<=': ['counter.panic_sold', 0] }],
    },
    exclude: ['retail_leek'],
    grants: [{ type: 'stat.add', key: 'nerve', value: 10 }],
    text: '帳面腰斬三次，你一股都沒賣。市場的噪音再也動不了你——持倉考驗的失敗率大幅降低。',
    scene: { fx: 'trait_unlock', sfx: 'chime' },
    checkOn: ['turn.end', 'position.close'],
  },
  {
    id: 'retail_leek',
    name: '韭菜',
    tone: 'bad',
    require: { '>=': ['counter.panic_sold', 2] },
    exclude: ['diamond_hands'],
    grants: [{ type: 'stat.add', key: 'nerve', value: -5 }],
    text: '每次跌破你就出場，每次出場之後它就漲回去。你開始懷疑市場裝了鏡頭。',
    scene: { fx: 'trait_unlock_bad', sfx: 'thud' },
    checkOn: ['position.close'],
  },
  {
    id: 'leverage_gambler',
    name: '槓桿賭徒',
    tone: 'bad',
    require: { flag: 'leveraged_wipeout' },
    exclude: [],
    grants: [{ type: 'stat.add', key: 'cognition', value: 3 }],
    text: '你借了錢去賭一把，然後學會了一件只有付過學費的人才懂的事。',
    scene: { fx: 'trait_unlock_bad', sfx: 'thud' },
    checkOn: ['position.close', 'turn.end'],
  },
]
