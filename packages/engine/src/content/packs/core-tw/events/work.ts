// 職場：一整年裡真正發生的事，多半不是投資，是工作。
//
// 這一疊事件的共同結構：safe 保住現狀、normal 是多數人的選擇、bold 用時間或
// 人情換一個可能。效果值刻意小（一年一次、mag 最多 3），累積四十年才有份量。

export const workEvents = [
  {
    id: 'overtime_crunch',
    require: { '==': ['career.industry', 'tech'] },
    weight: 10,
    prompt: '晚上九點，主管還在。他剛剛經過你桌邊兩次，什麼都沒說。',
    choices: [
      { id: 'safe', label: '準時下班', odds: '+20', mag: 1 },
      { id: 'normal', label: '配合加班', odds: '0', mag: 2 },
      { id: 'bold', label: '拼命表現', odds: '-15', mag: 3 },
    ],
    good: { text: '主管注意到你的產出，加薪有望。', effects: [{ type: 'stat.add', key: 'income', value: 2 }] },
    bad: { text: '你累壞了，體力所剩無幾。', effects: [{ type: 'stat.add', key: 'nerve', value: -4 }] },
    scene: { bg: 'office', sfx: 'keyboard' },
  },
  {
    id: 'night_shift_study',
    require: { all: [{ '>=': ['age', 20] }, { '<=': ['age', 35] }] },
    weight: 8,
    choices: [
      { id: 'safe', label: '下班就是下班', odds: '+25', mag: 1 },
      { id: 'normal', label: '每週兩晚進修', odds: '0', mag: 2 },
      { id: 'bold', label: '報名夜間部', odds: '-20', mag: 3 },
    ],
    good: {
      text: '課本上的東西第一次跟工作對上，你開始看得懂別人在做什麼。',
      effects: [
        { type: 'stat.add', key: 'cognition', value: 2 },
        { type: 'stat.add', key: 'night_study', value: 1 },
      ],
    },
    bad: {
      text: '兩頭燒了一整年，課沒上完，人也空了。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -6 }],
    },
    scene: { bg: 'night_classroom', sfx: 'page_turn' },
  },
  {
    id: 'headhunter_call',
    require: { all: [{ '>=': ['age', 26] }, { '>=': ['network', 15] }] },
    weight: 7,
    choices: [
      { id: 'safe', label: '禮貌婉拒', odds: '+30', mag: 1 },
      { id: 'normal', label: '去聊聊看', odds: '0', mag: 2 },
      { id: 'bold', label: '直接談待遇', odds: '-10', mag: 3 },
    ],
    good: {
      text: '你手上多了一張紙，就算不跳，談薪水的底氣也不一樣了。',
      effects: [
        { type: 'stat.add', key: 'income', value: 3 },
        { type: 'stat.add', key: 'network', value: 2 },
      ],
    },
    bad: {
      text: '消息傳回公司，接下來半年你做什麼都被多看兩眼。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -5 }],
    },
    scene: { bg: 'cafe', actor: 'headhunter', sfx: 'phone_ring' },
  },
  {
    id: 'take_the_blame',
    require: { '>=': ['career.rank', 2] },
    weight: 7,
    choices: [
      { id: 'safe', label: '照實說明', odds: '+15', mag: 1 },
      { id: 'normal', label: '一起扛', odds: '0', mag: 2 },
      { id: 'bold', label: '全部我來擔', odds: '-25', mag: 3 },
    ],
    good: {
      text: '你替團隊擋了下來。從那天起，他們願意為你做任何事。',
      effects: [
        { type: 'stat.add', key: 'network', value: 4 },
        { type: 'stat.add', key: 'took_the_blame', value: 1 },
      ],
    },
    bad: {
      text: '責任落在你頭上，年底考績說明了一切。',
      effects: [{ type: 'stat.add', key: 'income', value: -3 }],
    },
    scene: { bg: 'meeting_room', actor: 'boss' },
  },
  {
    id: 'mentor_a_junior',
    require: { '>=': ['career.rank', 2] },
    weight: 6,
    choices: [
      { id: 'safe', label: '公事公辦', odds: '+20', mag: 1 },
      { id: 'normal', label: '順手帶一下', odds: '0', mag: 2 },
      { id: 'bold', label: '當成自己的事在帶', odds: '-10', mag: 3 },
    ],
    good: {
      text: '很多年後，那個新人成了你在別家公司的眼線。',
      effects: [
        { type: 'stat.add', key: 'network', value: 3 },
        { type: 'stat.add', key: 'mentored', value: 1 },
      ],
    },
    bad: {
      text: '你花的時間沒有換到什麼，自己的事反而被拖住。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -3 }],
    },
    scene: { bg: 'office', actor: 'junior' },
  },
  {
    id: 'factory_line_stop',
    require: { '==': ['career.industry', 'factory'] },
    weight: 8,
    choices: [
      { id: 'safe', label: '按流程回報', odds: '+25', mag: 1 },
      { id: 'normal', label: '自己先排除', odds: '0', mag: 2 },
      { id: 'bold', label: '通宵搶修', odds: '-20', mag: 3 },
    ],
    good: {
      text: '產線在天亮前回來了，廠長記住了你的名字。',
      effects: [
        { type: 'stat.add', key: 'income', value: 3 },
        { type: 'stat.add', key: 'network', value: 2 },
      ],
    },
    bad: {
      text: '停機的損失最後算在誰頭上，大家心裡都有數。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -6 }],
    },
    scene: { bg: 'factory', sfx: 'alarm' },
  },
  {
    id: 'public_exam_prep',
    require: { all: [{ '==': ['career.industry', 'public'] }, { '<=': ['age', 45] }] },
    weight: 6,
    choices: [
      { id: 'safe', label: '穩穩做事', odds: '+30', mag: 1 },
      { id: 'normal', label: '準備升等考', odds: '0', mag: 2 },
      { id: 'bold', label: '報考更高一級', odds: '-20', mag: 3 },
    ],
    good: {
      text: '放榜那天，你在辦公室外面站了一會兒才進去。',
      effects: [
        { type: 'stat.add', key: 'income', value: 3 },
        { type: 'stat.add', key: 'cognition', value: 1 },
      ],
    },
    bad: { text: '差幾分，明年再來。', effects: [{ type: 'stat.add', key: 'nerve', value: -4 }] },
    scene: { bg: 'study_room', sfx: 'page_turn' },
  },
  {
    id: 'class_of_forty',
    require: { '==': ['career.industry', 'education'] },
    weight: 7,
    choices: [
      { id: 'safe', label: '照課本進度', odds: '+25', mag: 1 },
      { id: 'normal', label: '多留半小時', odds: '0', mag: 2 },
      { id: 'bold', label: '自己編一套教材', odds: '-15', mag: 3 },
    ],
    good: {
      text: '有個學生二十年後寫信給你，說那一年改變了他。',
      effects: [
        { type: 'stat.add', key: 'network', value: 2 },
        { type: 'stat.add', key: 'taught_well', value: 1 },
      ],
    },
    bad: { text: '你熬夜做的東西，沒有人打開過。', effects: [{ type: 'stat.add', key: 'nerve', value: -4 }] },
    scene: { bg: 'classroom' },
  },
  {
    id: 'client_dinner',
    require: { in: ['career.industry', ['trade', 'finance', 'own']] },
    weight: 9,
    choices: [
      { id: 'safe', label: '喝茶就好', odds: '+20', mag: 1 },
      { id: 'normal', label: '陪一輪', odds: '0', mag: 2 },
      { id: 'bold', label: '喝到對方點頭', odds: '-20', mag: 3 },
    ],
    good: {
      text: '單子簽了。回程的計程車上你想著這算不算能力。',
      effects: [
        { type: 'stat.add', key: 'income', value: 4 },
        { type: 'stat.add', key: 'network', value: 3 },
      ],
    },
    bad: {
      text: '隔天你什麼都不記得，只記得胃很痛。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -5 },
        { type: 'stat.add', key: 'health_debt', value: 1 },
      ],
    },
    scene: { bg: 'restaurant', actor: 'client', sfx: 'glass' },
  },
  {
    id: 'restructuring',
    require: { all: [{ '>=': ['age', 35] }, { in: ['era.phase', ['crash', 'recession']] }] },
    weight: 9,
    choices: [
      { id: 'safe', label: '低調做事', odds: '+15', mag: 1 },
      { id: 'normal', label: '爭取留下', odds: '0', mag: 2 },
      { id: 'bold', label: '自請優退拿一筆', odds: '-15', mag: 3 },
    ],
    good: {
      text: '名單公布的那天，你的名字不在上面——或者說，在你想要的那一邊。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 25 },
        { type: 'stat.add', key: 'survived_layoff', value: 1 },
      ],
    },
    bad: {
      text: '你收到一封制式的信，還有一個紙箱。',
      effects: [
        { type: 'stat.add', key: 'income', value: -8 },
        { type: 'stat.add', key: 'nerve', value: -8 },
      ],
    },
    scene: { bg: 'office', actor: 'hr', sfx: 'door' },
  },
  {
    id: 'side_project',
    require: { all: [{ '>=': ['age', 24] }, { '>=': ['nerve', 40] }] },
    weight: 8,
    choices: [
      { id: 'safe', label: '想想就好', odds: '+25', mag: 1 },
      { id: 'normal', label: '週末做一點', odds: '0', mag: 2 },
      { id: 'bold', label: '認真接案', odds: '-15', mag: 3 },
    ],
    good: {
      text: '第一筆入帳不多，但那是第一次有人為你的東西付錢。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 8 },
        { type: 'stat.add', key: 'side_hustle', value: 1 },
      ],
    },
    bad: {
      text: '案子拖了半年，錢沒收到，本業也被影響。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -5 }],
    },
    scene: { bg: 'home_desk', sfx: 'keyboard' },
  },
  {
    id: 'industry_conference',
    require: { '>=': ['career.rank', 2] },
    weight: 7,
    choices: [
      { id: 'safe', label: '聽完就走', odds: '+25', mag: 1 },
      { id: 'normal', label: '交換幾張名片', odds: '0', mag: 2 },
      { id: 'bold', label: '上台講一場', odds: '-20', mag: 3 },
    ],
    good: {
      text: '會後有三個人來加你，其中一個五年後打電話給你。',
      effects: [
        { type: 'stat.add', key: 'network', value: 5 },
        { type: 'stat.add', key: 'cognition', value: 1 },
      ],
    },
    bad: { text: '台下三十個人，二十個在看手機。', effects: [{ type: 'stat.add', key: 'nerve', value: -4 }] },
    scene: { bg: 'conference', sfx: 'crowd' },
  },
  {
    id: 'boss_asks_favour',
    require: { all: [{ '>=': ['career.rank', 1] }, { '>=': ['age', 25] }] },
    weight: 7,
    choices: [
      { id: 'safe', label: '婉轉推掉', odds: '+20', mag: 1 },
      { id: 'normal', label: '幫這一次', odds: '0', mag: 2 },
      { id: 'bold', label: '順便提條件', odds: '-25', mag: 3 },
    ],
    good: {
      text: '他記得這件事。三年後升遷名單上有你。',
      effects: [
        { type: 'stat.add', key: 'income', value: 4 },
        { type: 'stat.add', key: 'network', value: 2 },
      ],
    },
    bad: {
      text: '他不記得這件事。你倒是記得很久。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -4 }],
    },
    scene: { bg: 'office', actor: 'boss' },
  },
  {
    id: 'burnout_warning',
    require: { '<=': ['nerve', 45] },
    weight: 12,
    choices: [
      { id: 'safe', label: '請長假', odds: '+35', mag: 2 },
      { id: 'normal', label: '減少加班', odds: '+5', mag: 2 },
      { id: 'bold', label: '撐過這一季', odds: '-30', mag: 3 },
    ],
    good: {
      text: '你停下來了。世界沒有因此少一塊。',
      effects: [{ type: 'stat.add', key: 'nerve', value: 12 }],
    },
    bad: {
      text: '你在通勤的路上突然不知道自己要去哪裡。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -10 },
        { type: 'stat.add', key: 'burnout', value: 1 },
      ],
    },
    scene: { bg: 'commute', fx: 'blur' },
  },
  {
    id: 'trade_secret_offer',
    require: { all: [{ '>=': ['career.rank', 2] }, { '>=': ['age', 30] }, { not: { flag: 'once_trade_secret_offer' } }] },
    weight: 4,
    choices: [
      { id: 'safe', label: '當場拒絕', odds: '+35', mag: 1 },
      { id: 'normal', label: '裝作沒聽懂', odds: '+5', mag: 2 },
      { id: 'bold', label: '收下那個信封', odds: '-35', mag: 4 },
    ],
    good: {
      text: '錢是真的。只是你從此看每個同事都覺得他們知道。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 30 },
        { type: 'stat.add', key: 'crossed_the_line', value: 1 },
        { type: 'flag.set', key: 'once_trade_secret_offer' },
      ],
    },
    bad: {
      text: '事情爆開來，你連辯解的機會都沒有。',
      effects: [
        { type: 'stat.add', key: 'income', value: -12 },
        { type: 'stat.add', key: 'network', value: -8 },
        { type: 'stat.add', key: 'nerve', value: -10 },
        { type: 'flag.set', key: 'once_trade_secret_offer' },
      ],
    },
    scene: { bg: 'parking_lot', actor: 'stranger', sfx: 'envelope' },
  },
  {
    id: 'company_stock_options',
    require: { all: [{ '==': ['career.industry', 'tech'] }, { '>=': ['career.rank', 2] }, { not: { flag: 'once_company_stock_options' } }] },
    weight: 7,
    choices: [
      { id: 'safe', label: '一拿到就賣', odds: '+30', mag: 1 },
      { id: 'normal', label: '賣一半', odds: '0', mag: 2 },
      { id: 'bold', label: '全部抱著', odds: '-25', mag: 4 },
    ],
    good: {
      text: '你的員工配股變成一筆你自己都嚇一跳的數字。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 40 },
        { type: 'stat.add', key: 'held_own_stock', value: 1 },
        { type: 'flag.set', key: 'once_company_stock_options' },
      ],
    },
    bad: {
      text: '解鎖那天股價已經回到你入職時的位置。',
      effects: [{ type: 'stat.add', key: 'capital', value: -6 }, { type: 'flag.set', key: 'once_company_stock_options' }],
    },
    scene: { bg: 'office', fx: 'ticker' },
  },
  {
    id: 'union_or_not',
    require: { all: [{ in: ['career.industry', ['factory', 'service', 'education']] }, { not: { flag: 'once_union_or_not' } }] },
    weight: 5,
    choices: [
      { id: 'safe', label: '不表態', odds: '+25', mag: 1 },
      { id: 'normal', label: '簽名支持', odds: '0', mag: 2 },
      { id: 'bold', label: '站到前面去', odds: '-25', mag: 3 },
    ],
    good: {
      text: '談判桌上多了幾條字，那幾條字後來保護了很多人。',
      effects: [
        { type: 'stat.add', key: 'network', value: 4 },
        { type: 'stat.add', key: 'stood_up', value: 1 },
        { type: 'flag.set', key: 'once_union_or_not' },
      ],
    },
    bad: {
      text: '你被調到一個沒有人會經過的位置。',
      effects: [{ type: 'stat.add', key: 'income', value: -4 }, { type: 'flag.set', key: 'once_union_or_not' }],
    },
    scene: { bg: 'factory_gate', sfx: 'crowd' },
  },
  {
    id: 'first_paycheck',
    require: { all: [{ '<=': ['age', 24] }, { '>=': ['career.rank', 1] }, { not: { flag: 'once_first_paycheck' } }] },
    weight: 9,
    choices: [
      { id: 'safe', label: '全部存起來', odds: '+30', mag: 2 },
      { id: 'normal', label: '請家人吃一頓', odds: '+10', mag: 2 },
      { id: 'bold', label: '買下想很久的東西', odds: '-20', mag: 3 },
    ],
    good: {
      text: '你記得那個晚上比記得那筆錢還久。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 6 },
        { type: 'stat.add', key: 'family_first', value: 1 },
        { type: 'flag.set', key: 'once_first_paycheck' },
      ],
    },
    bad: {
      text: '月底你發現，原來薪水是這樣不見的。',
      effects: [{ type: 'stat.add', key: 'capital', value: -4 }, { type: 'flag.set', key: 'once_first_paycheck' }],
    },
    scene: { bg: 'home', actor: 'family' },
  },
  {
    id: 'relocation_offer',
    require: { all: [{ '>=': ['age', 28] }, { '>=': ['career.rank', 2] }, { '>=': ['nerve', 45] }, { not: { flag: 'once_relocation_offer' } }] },
    weight: 6,
    choices: [
      { id: 'safe', label: '留在原地', odds: '+25', mag: 1 },
      { id: 'normal', label: '去一年看看', odds: '0', mag: 2 },
      { id: 'bold', label: '整個家搬過去', odds: '-20', mag: 3 },
    ],
    good: {
      text: '外派加給讓你第一次覺得存錢是有可能的。',
      effects: [
        { type: 'stat.add', key: 'income', value: 8 },
        { type: 'stat.add', key: 'network', value: 3 },
        { type: 'flag.set', key: 'once_relocation_offer' },
      ],
    },
    bad: {
      text: '你在一個沒有人認識你的城市待了兩年。',
      effects: [
        { type: 'stat.add', key: 'network', value: -5 },
        { type: 'stat.add', key: 'nerve', value: -6 },
        { type: 'flag.set', key: 'once_relocation_offer' },
      ],
    },
    scene: { bg: 'airport', sfx: 'announcement' },
  },
  {
    id: 'late_career_squeeze',
    require: { all: [{ '>=': ['age', 48] }, { '>=': ['career.rank', 1] }] },
    weight: 8,
    choices: [
      { id: 'safe', label: '守住位置', odds: '+20', mag: 1 },
      { id: 'normal', label: '轉做顧問性質', odds: '0', mag: 2 },
      { id: 'bold', label: '跟年輕人搶專案', odds: '-25', mag: 3 },
    ],
    good: {
      text: '你證明了經驗還有用，至少對這間公司還有。',
      effects: [{ type: 'stat.add', key: 'income', value: 5 }],
    },
    bad: {
      text: '會議室裡的話題你插不上話，那種感覺比減薪還難受。',
      effects: [
        { type: 'stat.add', key: 'income', value: -6 },
        { type: 'stat.add', key: 'nerve', value: -5 },
      ],
    },
    scene: { bg: 'meeting_room' },
  },
]
