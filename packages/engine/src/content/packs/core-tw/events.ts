// The three trial events referenced by `mem_supercycle_a.trials` are ordinary
// events (§7.1: "trials 走一般事件管線") — PositionSystem triggers them by id,
// the event pipeline renders and resolves them like any other.
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
  {
    id: 'drawdown_50',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    choices: [
      { id: 'safe', label: '減碼一半，先睡得著', odds: '+25', mag: 1 },
      { id: 'normal', label: '不看盤了', odds: '0', mag: 2 },
      { id: 'bold', label: '一股不賣', odds: '-20', mag: 3 },
    ],
    good: { text: '帳面腰斬，你撐住了。', effects: [{ type: 'stat.add', key: 'nerve', value: -5 }] },
    bad: { text: '每天睜眼就是綠的，你開始懷疑自己。', effects: [{ type: 'stat.add', key: 'nerve', value: -15 }] },
    scene: { bg: 'bedroom_night', fx: 'crash_red', sfx: 'heartbeat' },
  },
  {
    id: 'triple_temptation',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    choices: [
      { id: 'safe', label: '獲利了結', odds: '+30', mag: 1 },
      { id: 'normal', label: '賣一半', odds: '0', mag: 2 },
      { id: 'bold', label: '續抱', odds: '-15', mag: 3 },
    ],
    good: { text: '三倍了。你關掉App，繼續過日子。', effects: [{ type: 'stat.add', key: 'cognition', value: 2 }] },
    bad: { text: '三倍了。你整晚在算現在賣掉能買幾坪。', effects: [{ type: 'stat.add', key: 'nerve', value: -10 }] },
    scene: { bg: 'office_night', sfx: 'notification' },
  },
  {
    id: 'family_emergency',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    choices: [
      { id: 'safe', label: '賣掉一部分應急', odds: '+35', mag: 1 },
      { id: 'normal', label: '先借一點', odds: '0', mag: 2 },
      { id: 'bold', label: '想辦法不動到部位', odds: '-20', mag: 3 },
    ],
    good: { text: '錢調度過來了，部位還在。', effects: [{ type: 'stat.add', key: 'network', value: 1 }] },
    bad: { text: '家裡的事等不了，你只能認了。', effects: [{ type: 'stat.add', key: 'nerve', value: -12 }] },
    scene: { bg: 'hospital', sfx: 'phone_ring' },
  },
  {
    // §1.3: the negative chain that only a leveraged wipeout unlocks. Gated
    // on the flag PositionSystem sets, so it is content — not engine code.
    id: 'debt_collector_call',
    require: { all: [{ flag: 'leveraged_wipeout' }, { '>': ['debt', 0] }] },
    weight: 12,
    choices: [
      { id: 'safe', label: '老實說明，談分期', odds: '+20', mag: 1 },
      { id: 'normal', label: '先還一點', odds: '0', mag: 2 },
      { id: 'bold', label: '不接電話', odds: '-25', mag: 3 },
    ],
    good: { text: '對方願意讓你慢慢還。', effects: [{ type: 'stat.add', key: 'nerve', value: -5 }] },
    bad: { text: '家裡的人都知道了。', effects: [{ type: 'stat.add', key: 'nerve', value: -20 }] },
    scene: { bg: 'home_night', sfx: 'phone_ring' },
  },
  {
    id: 'health_scare',
    require: { all: [{ flag: 'leveraged_wipeout' }, { '<=': ['nerve', 40] }] },
    weight: 8,
    choices: [
      { id: 'safe', label: '去看醫生', odds: '+25', mag: 1 },
      { id: 'normal', label: '請幾天假', odds: '0', mag: 2 },
      { id: 'bold', label: '撐著上班', odds: '-30', mag: 3 },
    ],
    good: { text: '只是壓力太大，醫生要你休息。', effects: [{ type: 'stat.add', key: 'nerve', value: 10 }] },
    bad: { text: '身體開始替你做決定。', effects: [{ type: 'stat.add', key: 'time', value: -15 }] },
    scene: { bg: 'hospital', sfx: 'monitor_beep' },
  },
]
