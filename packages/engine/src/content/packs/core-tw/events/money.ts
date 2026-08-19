// 錢：不是投資，是「錢從你手上經過的那些時刻」。
//
// §1 的公式裡，本金是唯一你能自己決定的一項。這一疊事件就是本金的日常來源
// 與日常漏洞——房子、車子、保險、父母、稅、以及那些說不出口的支出。

export const moneyEvents = [
  {
    id: 'first_apartment',
    require: { all: [{ '>=': ['age', 28] }, { '>=': ['capital', 120] }, { not: { flag: 'once_first_apartment' } }] },
    weight: 9,
    prompt: '仲介的鑰匙圈上掛著十幾把。這一間採光不錯，總價是你全部的積蓄。',
    choices: [
      { id: 'safe', label: '繼續租', odds: '+25', mag: 1, good: '你沒簽。租金照繳，但頭期款那筆錢後來替你賺回了一間房。', bad: '你想著再等等，最後還是簽了那間。頭期款掏空了你，房貸接著掏空接下來的二十年。' },
      { id: 'normal', label: '買個小的', odds: '0', mag: 2, good: '簽約那天你在空屋裡站了很久。之後那間房漲了。', bad: '頭期款掏空了你，房貸接著掏空接下來的二十年。' },
      { id: 'bold', label: '一次到位買大的', odds: '-25', mag: 3, good: '你一次到位。站在大得有點空的客廳裡，之後那間房漲了。', bad: '房子夠大了，頭期款卻掏空了你，房貸接著掏空接下來的二十年。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 1.1 },
        { type: 'stat.add', key: 'owns_home', value: 1 },
        { type: 'flag.set', key: 'once_first_apartment' },
      ],
    },
    bad: {
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
    prompt: '同期的都換車了。你的通勤是四十分鐘捷運加十分鐘的路。',
    choices: [
      { id: 'safe', label: '搭捷運就好', odds: '+30', mag: 2, good: '你繼續搭捷運。那筆沒花掉的錢留了下來，後來變成別的東西。', bad: '捷運搭著搭著，你還是牽了一台回來。車貸、保養、停車位，每個月都在提醒你。' },
      { id: 'normal', label: '買台二手的', odds: '0', mag: 2, good: '你把那筆錢留下來了，它後來變成別的東西。', bad: '車貸、保養、停車位。它每個月都在提醒你。' },
      { id: 'bold', label: '買想要的那台', odds: '-25', mag: 3, good: '你買了想要的那台，卻很少開它。省下的油錢後來變成別的東西。', bad: '你買了想要的那台。車貸、保養、停車位，它每個月都在提醒你。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'capital', value: 6 },
        { type: 'stat.add', key: 'frugal', value: 1 },
        { type: 'flag.set', key: 'once_car_or_not' },
      ],
    },
    bad: {
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
    prompt: '做保險的朋友攤開一張表，上面每一格都寫著你沒想過的事。',
    choices: [
      { id: 'safe', label: '只保醫療險', odds: '+30', mag: 2, good: '只保了醫療。很多年後真的用到了，那天你想起簽名的那個下午。', bad: '朋友加減幫你搭了個儲蓄型。繳了十年才發現，那個報酬率連定存都不如。' },
      { id: 'normal', label: '買個儲蓄型', odds: '-5', mag: 2, good: '很多年後真的用到了，那天你想起簽名的那個下午。', bad: '繳了十年才發現，那個報酬率連定存都不如。' },
      { id: 'bold', label: '買一整套', odds: '-25', mag: 3, good: '你把整套都保了。很多年後真的用到了，那天你想起簽名的那個下午。', bad: '一整套繳下來，十年後才發現，那個報酬率連定存都不如。' },
    ],
    good: {
      effects: [{ type: 'stat.add', key: 'insured', value: 1 }, { type: 'flag.set', key: 'once_insurance_pitch' }],
    },
    bad: {
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
    prompt: '媽在電話裡講了二十分鐘的鄰居近況，最後才說：「你爸的藥有點貴。」',
    choices: [
      { id: 'safe', label: '量力而為', odds: '+20', mag: 1, good: '你給了能給的。他們沒說什麼，但你知道他們跟鄰居講過這件事。', bad: '藥錢比你想的重。你的存款曲線在那幾年是平的。' },
      { id: 'normal', label: '每月固定給', odds: '0', mag: 2, good: '他們沒說什麼，但你知道他們跟鄰居講過這件事。', bad: '你的存款曲線在那幾年是平的。' },
      { id: 'bold', label: '全部我來', odds: '-20', mag: 3, good: '你把爸的藥全接了下來。他們沒說什麼，但你知道他們跟鄰居講過這件事。', bad: '你全接了下來。你的存款曲線在那幾年是平的。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: 6 },
        { type: 'stat.add', key: 'family_first', value: 1 },
      ],
    },
    bad: {
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
    prompt: '報稅季。今年多了幾張你不太確定該不該附上去的單據。',
    choices: [
      { id: 'safe', label: '照實申報', odds: '+30', mag: 1, good: '你照實申報，該附的都附了。合法的範圍內，你還是少繳了一些。', bad: '照實申報也躲不掉。補稅通知單上的金額，比你省下來的多一個零。' },
      { id: 'normal', label: '找會計師看看', odds: '+5', mag: 2, good: '合法的範圍內，你少繳了一些。', bad: '補稅通知單上的金額，比你省下來的多一個零。' },
      { id: 'bold', label: '能省的都省', odds: '-30', mag: 3, good: '能省的你都省了，合法的範圍內壓到了底。', bad: '那幾張單據還是附了上去。補稅通知單上的金額，比你省下來的多一個零。' },
    ],
    good: {
      effects: [{ type: 'stat.add', key: 'capital', value: 10 }],
    },
    bad: {
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
    prompt: '兩家人坐在同一張桌子前，開始討論要辦幾桌。',
    choices: [
      { id: 'safe', label: '公證就好', odds: '+30', mag: 2, good: '你們只去公證。沒花什麼錢，而且那天真的很好。', bad: '公證完，兩家人還是為了要不要補請，吵了三個月。' },
      { id: 'normal', label: '辦個小的', odds: '0', mag: 2, good: '禮金剛好打平，而且那天真的很好。', bad: '為了那一天的排場，你們吵了三個月。' },
      { id: 'bold', label: '風風光光辦一場', odds: '-25', mag: 3, good: '你們風風光光辦了一場。禮金剛好打平，而且那天真的很好。', bad: '為了那一天的排場，你們吵了三個月，帳單也超支了一大截。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'network', value: 5 },
        { type: 'stat.add', key: 'nerve', value: 6 },
        { type: 'flag.set', key: 'once_wedding_budget' },
      ],
    },
    bad: {
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
    prompt: '頭獎累積到十億。便利商店門口排了十幾個人。',
    choices: [
      { id: 'safe', label: '不買', odds: '+40', mag: 1, good: '你本來不打算買，找的零錢還是換了一張。中了小獎，那種心情比獎金貴。', bad: '你排在後面的人中了。你的號碼，一次都沒對過。' },
      { id: 'normal', label: '買一張', odds: '0', mag: 2, good: '中了小獎。那種心情比獎金貴。', bad: '一整年的號碼，一次都沒對過。' },
      { id: 'bold', label: '每期都買', odds: '-40', mag: 3, good: '你每期都買。某一期中了小獎，那種心情比獎金貴。', bad: '你每期都買。一整年的號碼，一次都沒對過。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'capital', value: 5 },
        { type: 'stat.add', key: 'gambles', value: 1 },
      ],
    },
    bad: {
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
    prompt: '後事辦完，律師拿出一份你不知道存在的文件。',
    choices: [
      { id: 'safe', label: '存起來不動', odds: '+30', mag: 2, good: '你原封不動存了下來。這筆錢來得突然，也來得剛好——你這輩子第一次，本金追上了眼光。', bad: '你想先放著不動，錢卻還沒到手就分完了，親戚之間多了幾條裂縫。' },
      { id: 'normal', label: '一部分拿去投資', odds: '0', mag: 2, good: '這筆錢來得突然，也來得剛好——你這輩子第一次，本金追上了眼光。', bad: '錢還沒到手就分完了，親戚之間多了幾條裂縫。' },
      { id: 'bold', label: '全部投進去', odds: '-25', mag: 4, good: '你全投了進去。這筆錢來得突然，也來得剛好——你這輩子第一次，本金追上了眼光。', bad: '你想全投進去，錢卻還沒到手就分完了，親戚之間多了幾條裂縫。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'capital', value: 120 },
        { type: 'stat.add', key: 'windfall', value: 1 },
        { type: 'flag.set', key: 'once_inheritance' },
      ],
    },
    bad: {
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
    prompt: '公司給了兩個選項：留下來，或是拿一筆錢走人。今天要回覆。',
    choices: [
      { id: 'safe', label: '存進定存', odds: '+30', mag: 2, good: '你把資遣費鎖進定存。它在你手上，慢慢變成了別的東西。', bad: '定存也擋不住開銷。錢在找到下一份工作之前就用完了。' },
      { id: 'normal', label: '撐到找到下一份', odds: '0', mag: 2, good: '那筆資遣費在你手上變成了別的東西。', bad: '錢在找到下一份工作之前就用完了。' },
      { id: 'bold', label: '拿去創業', odds: '-30', mag: 4, good: '你拿它去創業。那筆資遣費在你手上變成了別的東西。', bad: '你拿去創業。錢在做出成績之前就用完了。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'capital', value: 60 },
        { type: 'stat.add', key: 'windfall', value: 1 },
        { type: 'flag.set', key: 'once_severance_package' },
      ],
    },
    bad: {
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
    prompt: '對帳單上，利息跑得比本金還快。',
    choices: [
      { id: 'safe', label: '優先還債', odds: '+30', mag: 2, good: '你先把債壓下去。數字終於開始往下走了。', bad: '你埋頭還，利息卻像水位一樣漲，你游得再快也只是原地。' },
      { id: 'normal', label: '一邊還一邊投資', odds: '0', mag: 2, good: '數字終於開始往下走了。', bad: '利息像水位一樣，你游得再快也只是原地。' },
      { id: 'bold', label: '借新還舊拚翻身', odds: '-35', mag: 3, good: '你借新的還舊的，一度賭對了。數字終於開始往下走了。', bad: '你借新還舊，債卻越滾越大。利息像水位一樣，你游得再快也只是原地。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'debt', value: -15 },
        { type: 'stat.add', key: 'paid_down_debt', value: 1 },
      ],
    },
    bad: {
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
    prompt: '安親班、才藝班、補習班。你算了一下一年要多少。',
    choices: [
      { id: 'safe', label: '公立就好', odds: '+25', mag: 2, good: '你選了公立。孩子長成了他自己的樣子，跟錢沒什麼關係。', bad: '就算只讀公立，補習還是一項項加了上來。教育帳單是唯一一種你不敢殺價的帳單。' },
      { id: 'normal', label: '補習補一點', odds: '0', mag: 2, good: '孩子長成了他自己的樣子，跟錢沒什麼關係。', bad: '教育帳單是唯一一種你不敢殺價的帳單。' },
      { id: 'bold', label: '全部都給最好的', odds: '-25', mag: 3, good: '你給了他最好的。孩子還是長成了他自己的樣子，跟錢沒什麼關係。', bad: '你什麼都給最好的。教育帳單是唯一一種你不敢殺價的帳單。' },
    ],
    good: {
      effects: [{ type: 'stat.add', key: 'nerve', value: 5 }],
    },
    bad: {
      effects: [{ type: 'stat.add', key: 'capital', value: -28 }],
    },
    scene: { bg: 'school_gate', actor: 'child' },
  },
  {
    id: 'medical_bill',
    require: { all: [{ '>=': ['age', 40] }, { '>=': ['counter.health_debt', 2] }] },
    weight: 12,
    prompt: '報告上有一項紅字，醫生說要再做進一步檢查。',
    choices: [
      { id: 'safe', label: '早點就醫', odds: '+25', mag: 2, good: '你早早去做了進一步檢查。出來沒什麼大事，醫生要你少喝一點。', bad: '就算早點就醫，那幾天你還是住進了病房，第一次認真算了一下自己還剩多少年。' },
      { id: 'normal', label: '吃藥撐著', odds: '-5', mag: 2, good: '檢查出來沒什麼大事，醫生要你少喝一點。', bad: '住院那幾天，你第一次認真算了一下自己還剩多少年。' },
      { id: 'bold', label: '沒空，先工作', odds: '-30', mag: 3, good: '你想著沒空，還是抽空回去補了檢查。出來沒什麼大事，醫生要你少喝一點。', bad: '你說沒空，把它拖了下去。住院那幾天，你第一次認真算了一下自己還剩多少年。' },
    ],
    good: {
      effects: [{ type: 'stat.add', key: 'nerve', value: 8 }],
    },
    bad: {
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
    prompt: '你把去年的帳單攤開，一半的品項已經想不起來買了什麼。',
    choices: [
      { id: 'safe', label: '正常過', odds: '+25', mag: 1, good: '你沒特別省，卻自然停了手。你發現想要的東西比你以為的少很多。', bad: '你想著正常過就好，年底的一個晚上，卻把攢下的錢全花掉了。' },
      { id: 'normal', label: '砍掉一半娛樂', odds: '0', mag: 2, good: '你發現想要的東西比你以為的少很多。', bad: '省下來的錢，在年底的一個晚上全部花掉了。' },
      { id: 'bold', label: '一整年不買任何非必需品', odds: '-25', mag: 3, good: '你撐了一整年，什麼非必需品都沒買。你發現想要的東西比你以為的少很多。', bad: '你憋了一整年。省下來的錢，在年底的一個晚上全部花掉了。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'savingsRate', value: 0.05 },
        { type: 'stat.add', key: 'frugal', value: 1 },
      ],
    },
    bad: {
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
    prompt: '電話那頭自稱是檢察官，語速很快，而且知道你的名字和地址。',
    choices: [
      { id: 'safe', label: '直接掛掉', odds: '+40', mag: 1, good: '你直接掛掉，回頭把家人的號碼也設成拒接。', bad: '你掛掉了，過幾天他換個號碼又打來。匯出去的時候你完全相信自己在做對的事。' },
      { id: 'normal', label: '聽他講完', odds: '0', mag: 2, good: '你聽完，還是掛掉了電話，回頭把家人的號碼也設成拒接。', bad: '匯出去的時候你完全相信自己在做對的事。' },
      { id: 'bold', label: '照他說的去操作', odds: '-45', mag: 3, good: '你照著操作到一半才驚醒，掛掉電話，回頭把家人的號碼也設成拒接。', bad: '你照他說的一步步做。匯出去的時候你完全相信自己在做對的事。' },
    ],
    good: {
      effects: [{ type: 'stat.add', key: 'cognition', value: 1 }],
    },
    bad: {
      effects: [
        { type: 'stat.add', key: 'capital', value: -35 },
        { type: 'stat.add', key: 'nerve', value: -8 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'phone', sfx: 'phone_ring' },
  },
]
