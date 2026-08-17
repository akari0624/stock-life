// 錢：不是投資，是「錢從你手上經過的那些時刻」。
//
// §1 的公式裡，本金是唯一你能自己決定的一項。這一疊事件就是本金的日常來源
// 與日常漏洞——房子、車子、保險、父母、稅、以及那些說不出口的支出。

export const moneyEvents = [
  {
    id: 'first_apartment',
    require: { all: [{ '>=': ['age', 28] }, { '>=': ['capital', 120] }, { not: { flag: 'once_first_apartment' } }] },
    weight: 9,
    choices: [
      { id: 'safe', label: '繼續租', odds: '+25', mag: 1 },
      { id: 'normal', label: '買個小的', odds: '0', mag: 2 },
      { id: 'bold', label: '一次到位買大的', odds: '-25', mag: 3 },
    ],
    good: {
      text: '簽約那天你在空屋裡站了很久。之後那間房漲了。',
      effects: [
        { type: 'capital.mul', value: 1.1 },
        { type: 'stat.add', key: 'owns_home', value: 1 },
        { type: 'flag.set', key: 'once_first_apartment' },
      ],
    },
    bad: {
      text: '頭期款掏空了你，房貸接著掏空接下來的二十年。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -40 },
        { type: 'stat.add', key: 'savingsRate', value: -0.05 },
        { type: 'stat.add', key: 'owns_home', value: 1 },
        { type: 'flag.set', key: 'once_first_apartment' },
      ],
    },
    scene: { bg: 'empty_apartment' },
  },
  {
    id: 'car_or_not',
    require: { all: [{ '>=': ['age', 26] }, { '>=': ['capital', 40] }, { not: { flag: 'once_car_or_not' } }] },
    weight: 8,
    choices: [
      { id: 'safe', label: '搭捷運就好', odds: '+30', mag: 2 },
      { id: 'normal', label: '買台二手的', odds: '0', mag: 2 },
      { id: 'bold', label: '買想要的那台', odds: '-25', mag: 3 },
    ],
    good: {
      text: '你把那筆錢留下來了，它後來變成別的東西。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 6 },
        { type: 'stat.add', key: 'frugal', value: 1 },
        { type: 'flag.set', key: 'once_car_or_not' },
      ],
    },
    bad: {
      text: '車貸、保養、停車位。它每個月都在提醒你。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -25 },
        { type: 'stat.add', key: 'splurge', value: 1 },
        { type: 'flag.set', key: 'once_car_or_not' },
      ],
    },
    scene: { bg: 'car_dealer', actor: 'salesman' },
  },
  {
    id: 'insurance_pitch',
    require: { all: [{ '>=': ['age', 25] }, { '>=': ['network', 10] }, { not: { flag: 'once_insurance_pitch' } }] },
    weight: 8,
    choices: [
      { id: 'safe', label: '只保醫療險', odds: '+30', mag: 2 },
      { id: 'normal', label: '買個儲蓄型', odds: '-5', mag: 2 },
      { id: 'bold', label: '買一整套', odds: '-25', mag: 3 },
    ],
    good: {
      text: '很多年後真的用到了，那天你想起簽名的那個下午。',
      effects: [{ type: 'stat.add', key: 'insured', value: 1 }, { type: 'flag.set', key: 'once_insurance_pitch' }],
    },
    bad: {
      text: '繳了十年才發現，那個報酬率連定存都不如。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -12 },
        { type: 'stat.add', key: 'savingsRate', value: -0.02 },
        { type: 'flag.set', key: 'once_insurance_pitch' },
      ],
    },
    scene: { bg: 'cafe', actor: 'agent' },
  },
  {
    id: 'parents_need_help',
    require: { '>=': ['age', 32] },
    weight: 11,
    choices: [
      { id: 'safe', label: '量力而為', odds: '+20', mag: 1 },
      { id: 'normal', label: '每月固定給', odds: '0', mag: 2 },
      { id: 'bold', label: '全部我來', odds: '-20', mag: 3 },
    ],
    good: {
      text: '他們沒說什麼，但你知道他們跟鄰居講過這件事。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 6 },
        { type: 'stat.add', key: 'family_first', value: 1 },
      ],
    },
    bad: {
      text: '你的存款曲線在那幾年是平的。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -20 },
        { type: 'stat.add', key: 'family_first', value: 1 },
      ],
    },
    scene: { bg: 'family_home', actor: 'parent' },
  },
  {
    id: 'tax_season',
    require: { '>=': ['income', 60] },
    weight: 7,
    choices: [
      { id: 'safe', label: '照實申報', odds: '+30', mag: 1 },
      { id: 'normal', label: '找會計師看看', odds: '+5', mag: 2 },
      { id: 'bold', label: '能省的都省', odds: '-30', mag: 3 },
    ],
    good: {
      text: '合法的範圍內，你少繳了一些。',
      effects: [{ type: 'stat.add', key: 'capital', value: 10 }],
    },
    bad: {
      text: '補稅通知單上的金額，比你省下來的多一個零。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -18 },
        { type: 'stat.add', key: 'nerve', value: -4 },
      ],
    },
    scene: { bg: 'home_desk' },
  },
  {
    id: 'wedding_budget',
    require: { all: [{ '>=': ['age', 27] }, { '<=': ['age', 42] }, { '>=': ['network', 12] }, { not: { flag: 'once_wedding_budget' } }] },
    weight: 8,
    choices: [
      { id: 'safe', label: '公證就好', odds: '+30', mag: 2 },
      { id: 'normal', label: '辦個小的', odds: '0', mag: 2 },
      { id: 'bold', label: '風風光光辦一場', odds: '-25', mag: 3 },
    ],
    good: {
      text: '禮金剛好打平，而且那天真的很好。',
      effects: [
        { type: 'stat.add', key: 'network', value: 5 },
        { type: 'stat.add', key: 'nerve', value: 6 },
        { type: 'flag.set', key: 'once_wedding_budget' },
      ],
    },
    bad: {
      text: '為了那一天的排場，你們吵了三個月。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -30 },
        { type: 'stat.add', key: 'nerve', value: -5 },
        { type: 'flag.set', key: 'once_wedding_budget' },
      ],
    },
    scene: { bg: 'banquet', sfx: 'crowd' },
  },
  {
    id: 'lottery_ticket',
    require: { '>=': ['age', 20] },
    weight: 6,
    choices: [
      { id: 'safe', label: '不買', odds: '+40', mag: 1 },
      { id: 'normal', label: '買一張', odds: '0', mag: 2 },
      { id: 'bold', label: '每期都買', odds: '-40', mag: 3 },
    ],
    good: {
      text: '中了小獎。那種心情比獎金貴。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 5 },
        { type: 'stat.add', key: 'gambles', value: 1 },
      ],
    },
    bad: {
      text: '一整年的號碼，一次都沒對過。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -3 },
        { type: 'stat.add', key: 'gambles', value: 1 },
      ],
    },
    scene: { bg: 'street', sfx: 'coin' },
  },
  {
    id: 'inheritance',
    require: { all: [{ '>=': ['age', 42] }, { chance: 0.35 }, { not: { flag: 'once_inheritance' } }] },
    weight: 6,
    choices: [
      { id: 'safe', label: '存起來不動', odds: '+30', mag: 2 },
      { id: 'normal', label: '一部分拿去投資', odds: '0', mag: 2 },
      { id: 'bold', label: '全部投進去', odds: '-25', mag: 4 },
    ],
    good: {
      text: '這筆錢來得突然，也來得剛好——你這輩子第一次，本金追上了眼光。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 120 },
        { type: 'stat.add', key: 'windfall', value: 1 },
        { type: 'flag.set', key: 'once_inheritance' },
      ],
    },
    bad: {
      text: '錢還沒到手就分完了，親戚之間多了幾條裂縫。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 30 },
        { type: 'stat.add', key: 'network', value: -6 },
        { type: 'stat.add', key: 'windfall', value: 1 },
        { type: 'flag.set', key: 'once_inheritance' },
      ],
    },
    scene: { bg: 'family_home', actor: 'relative' },
  },
  {
    id: 'severance_package',
    require: { all: [{ '>=': ['age', 38] }, { in: ['era.phase', ['crash', 'recession']] }, { '>=': ['career.rank', 2] }, { not: { flag: 'once_severance_package' } }] },
    weight: 7,
    choices: [
      { id: 'safe', label: '存進定存', odds: '+30', mag: 2 },
      { id: 'normal', label: '撐到找到下一份', odds: '0', mag: 2 },
      { id: 'bold', label: '拿去創業', odds: '-30', mag: 4 },
    ],
    good: {
      text: '那筆資遣費在你手上變成了別的東西。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 60 },
        { type: 'stat.add', key: 'windfall', value: 1 },
        { type: 'flag.set', key: 'once_severance_package' },
      ],
    },
    bad: {
      text: '錢在找到下一份工作之前就用完了。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -10 },
        { type: 'stat.add', key: 'nerve', value: -8 },
        { type: 'flag.set', key: 'once_severance_package' },
      ],
    },
    scene: { bg: 'office', actor: 'hr' },
  },
  {
    id: 'debt_snowball',
    require: { '>=': ['debt', 20] },
    weight: 14,
    choices: [
      { id: 'safe', label: '優先還債', odds: '+30', mag: 2 },
      { id: 'normal', label: '一邊還一邊投資', odds: '0', mag: 2 },
      { id: 'bold', label: '借新還舊拚翻身', odds: '-35', mag: 3 },
    ],
    good: {
      text: '數字終於開始往下走了。',
      effects: [
        { type: 'stat.add', key: 'debt', value: -15 },
        { type: 'stat.add', key: 'paid_down_debt', value: 1 },
      ],
    },
    bad: {
      text: '利息像水位一樣，你游得再快也只是原地。',
      effects: [
        { type: 'stat.add', key: 'debt', value: 12 },
        { type: 'stat.add', key: 'nerve', value: -6 },
      ],
    },
    scene: { bg: 'bank', sfx: 'stamp' },
  },
  {
    id: 'kids_tuition',
    require: { all: [{ '>=': ['age', 38] }, { flag: 'has_kids' }] },
    weight: 10,
    choices: [
      { id: 'safe', label: '公立就好', odds: '+25', mag: 2 },
      { id: 'normal', label: '補習補一點', odds: '0', mag: 2 },
      { id: 'bold', label: '全部都給最好的', odds: '-25', mag: 3 },
    ],
    good: {
      text: '孩子長成了他自己的樣子，跟錢沒什麼關係。',
      effects: [{ type: 'stat.add', key: 'nerve', value: 5 }],
    },
    bad: {
      text: '教育帳單是唯一一種你不敢殺價的帳單。',
      effects: [{ type: 'stat.add', key: 'capital', value: -28 }],
    },
    scene: { bg: 'school_gate', actor: 'child' },
  },
  {
    id: 'medical_bill',
    require: { all: [{ '>=': ['age', 40] }, { '>=': ['counter.health_debt', 2] }] },
    weight: 12,
    choices: [
      { id: 'safe', label: '早點就醫', odds: '+25', mag: 2 },
      { id: 'normal', label: '吃藥撐著', odds: '-5', mag: 2 },
      { id: 'bold', label: '沒空，先工作', odds: '-30', mag: 3 },
    ],
    good: {
      text: '檢查出來沒什麼大事，醫生要你少喝一點。',
      effects: [{ type: 'stat.add', key: 'nerve', value: 8 }],
    },
    bad: {
      text: '住院那幾天，你第一次認真算了一下自己還剩多少年。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -25 },
        { type: 'stat.add', key: 'nerve', value: -10 },
        { type: 'stat.add', key: 'health_debt', value: 1 },
      ],
    },
    scene: { bg: 'hospital', sfx: 'monitor' },
  },
  {
    id: 'no_spend_year',
    require: { all: [{ '>=': ['age', 25] }, { '>=': ['counter.frugal', 1] }] },
    weight: 7,
    choices: [
      { id: 'safe', label: '正常過', odds: '+25', mag: 1 },
      { id: 'normal', label: '砍掉一半娛樂', odds: '0', mag: 2 },
      { id: 'bold', label: '一整年不買任何非必需品', odds: '-25', mag: 3 },
    ],
    good: {
      text: '你發現想要的東西比你以為的少很多。',
      effects: [
        { type: 'stat.add', key: 'savingsRate', value: 0.05 },
        { type: 'stat.add', key: 'frugal', value: 1 },
      ],
    },
    bad: {
      text: '省下來的錢，在年底的一個晚上全部花掉了。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -6 },
        { type: 'stat.add', key: 'splurge', value: 1 },
      ],
    },
    scene: { bg: 'home' },
  },
  {
    id: 'scam_call',
    require: { all: [{ '>=': ['age', 30] }, { '<=': ['cognition', 45] }] },
    weight: 7,
    choices: [
      { id: 'safe', label: '直接掛掉', odds: '+40', mag: 1 },
      { id: 'normal', label: '聽他講完', odds: '0', mag: 2 },
      { id: 'bold', label: '照他說的去操作', odds: '-45', mag: 3 },
    ],
    good: {
      text: '你掛掉電話，回頭把家人的號碼也設成拒接。',
      effects: [{ type: 'stat.add', key: 'cognition', value: 1 }],
    },
    bad: {
      text: '匯出去的時候你完全相信自己在做對的事。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -35 },
        { type: 'stat.add', key: 'nerve', value: -8 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'phone', sfx: 'phone_ring' },
  },
]
