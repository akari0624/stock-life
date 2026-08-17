export const coreTwEvents = [
  {
    id: 'overtime_crunch',
    require: { '==': ['career.industry', 'tech'] },
    weight: 10,
    choices: [
      { id: 'safe', label: '準時下班', odds: '+20', mag: 1 },
      { id: 'normal', label: '配合加班', odds: '0', mag: 2 },
      { id: 'bold', label: '拼命表現', odds: '-15', mag: 3 },
    ],
    good: { text: '主管注意到你的產出，加薪有望。', effects: [{ type: 'stat.add', key: 'income', value: 2 }] },
    bad: { text: '你累壞了，體力所剩無幾。', effects: [{ type: 'stat.add', key: 'time', value: -2 }] },
    scene: { bg: 'office', sfx: 'keyboard' },
  },
  {
    id: 'market_selloff',
    require: { '>=': ['position.count', 0] },
    weight: 8,
    choices: [
      { id: 'safe', label: '停損出場', odds: '+30', mag: 1 },
      { id: 'normal', label: '再觀察看看', odds: '0', mag: 2 },
      { id: 'bold', label: '逢低加碼', odds: '-25', mag: 3 },
    ],
    good: {
      text: '你撐過了帳面波動，之後市場回穩。',
      effects: [{ type: 'stat.add', key: 'held_through_drawdown', value: 1 }],
    },
    bad: { text: '你受不了心理壓力，認賠出場。', effects: [{ type: 'stat.add', key: 'panic_sold', value: 1 }] },
    scene: { bg: 'trading_floor', sfx: 'alert' },
  },
  {
    id: 'networking_night',
    require: { '>=': ['age', 22] },
    weight: 6,
    choices: [
      { id: 'safe', label: '早點回家', odds: '+15', mag: 1 },
      { id: 'normal', label: '交流一下', odds: '0', mag: 2 },
      { id: 'bold', label: '積極認識新朋友', odds: '-10', mag: 3 },
    ],
    good: { text: '你認識了一位業界前輩。', effects: [{ type: 'stat.add', key: 'network', value: 3 }] },
    bad: { text: '整晚都在尬聊，什麼收穫都沒有。', effects: [{ type: 'stat.add', key: 'time', value: -1 }] },
    scene: { bg: 'bar', sfx: 'chatter' },
  },
]
