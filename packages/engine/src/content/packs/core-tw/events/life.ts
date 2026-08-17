// 人生：跟錢沒有直接關係，但決定了你敢不敢押的那些事。
//
// nerve（膽識）在這裡累積也在這裡被消耗。§1.3 的四檔倉位裡，最後決定你選
// 哪一檔的往往不是試算表，是你這幾年過得好不好。
//
// 家庭與健康的負面事件鏈用 `flag.leveraged_wipeout` 解鎖（§1.3）——引擎不
// 硬編碼這條鏈，它只是內容寫在 require 裡的一個 flag。

export const lifeEvents = [
  {
    id: 'meet_someone',
    require: { all: [{ '>=': ['age', 24] }, { '<=': ['age', 40] }, { not: { flag: 'partnered' } }] },
    weight: 11,
    prompt: '有個人問你週末有沒有空。你已經很久沒有被這樣問過。',
    choices: [
      { id: 'safe', label: '慢慢來', odds: '+20', mag: 1 },
      { id: 'normal', label: '認真交往', odds: '+5', mag: 2 },
      { id: 'bold', label: '很快就決定了', odds: '-20', mag: 3 },
    ],
    good: {
      text: '有一個人知道你今天過得怎麼樣。這件事比你以為的重要。',
      effects: [
        { type: 'flag.set', key: 'partnered' },
        { type: 'stat.add', key: 'nerve', value: 10 },
      ],
    },
    bad: {
      text: '你們都很努力，但方向不一樣。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -6 }],
    },
    scene: { bg: 'street_night', actor: 'partner' },
  },
  {
    id: 'have_a_child',
    require: { all: [{ flag: 'partnered' }, { '>=': ['age', 27] }, { '<=': ['age', 44] }, { not: { flag: 'has_kids' } }] },
    weight: 10,
    prompt: '你們在客廳坐到很晚，話題繞來繞去都繞回同一件事。',
    choices: [
      { id: 'safe', label: '再等等', odds: '+20', mag: 1 },
      { id: 'normal', label: '順其自然', odds: '0', mag: 2 },
      { id: 'bold', label: '現在就要', odds: '-15', mag: 3 },
    ],
    good: {
      text: '你抱著他的那個晚上，重新算了一次自己的人生。',
      effects: [
        { type: 'flag.set', key: 'has_kids' },
        { type: 'stat.add', key: 'nerve', value: 8 },
        { type: 'stat.add', key: 'savingsRate', value: -0.03 },
      ],
    },
    bad: {
      text: '那一年很難。很多事情都沒有按照計畫。',
      effects: [
        { type: 'flag.set', key: 'has_kids' },
        { type: 'stat.add', key: 'nerve', value: -8 },
        { type: 'stat.add', key: 'capital', value: -15 },
      ],
    },
    scene: { bg: 'hospital', actor: 'partner' },
  },
  {
    id: 'partner_career_clash',
    require: { all: [{ flag: 'partnered' }, { '>=': ['age', 30] }] },
    weight: 8,
    prompt: '兩邊的工作剛好在這一年撞在一起，總得有人退一步。',
    choices: [
      { id: 'safe', label: '我退一步', odds: '+15', mag: 2 },
      { id: 'normal', label: '各自安排', odds: '0', mag: 2 },
      { id: 'bold', label: '要求對方配合', odds: '-25', mag: 3 },
    ],
    good: {
      text: '你們找到了一個誰都不吃虧的方法。',
      effects: [{ type: 'stat.add', key: 'nerve', value: 6 }],
    },
    bad: {
      text: '那次爭執之後，有些話你們再也沒有說出口。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -8 },
        { type: 'stat.add', key: 'family_strain', value: 1 },
      ],
    },
    scene: { bg: 'home', actor: 'partner' },
  },
  {
    id: 'old_friends_dinner',
    require: { all: [{ '>=': ['age', 30] }, { not: { flag: 'once_old_friends_dinner' } }] },
    weight: 9,
    prompt: '群組突然響起來，說十年沒見了，要不要約。',
    choices: [
      { id: 'safe', label: '推掉', odds: '+20', mag: 1 },
      { id: 'normal', label: '去坐一下', odds: '+5', mag: 2 },
      { id: 'bold', label: '揪一整桌', odds: '-15', mag: 3 },
    ],
    good: {
      text: '有人現在做的事，剛好是你想知道的事。',
      effects: [
        { type: 'stat.add', key: 'network', value: 4 },
        { type: 'stat.add', key: 'nerve', value: 4 },
        { type: 'flag.set', key: 'once_old_friends_dinner' },
      ],
    },
    bad: {
      text: '整桌都在比誰過得好。你回家的路上很安靜。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -5 }, { type: 'flag.set', key: 'once_old_friends_dinner' }],
    },
    scene: { bg: 'restaurant', actor: 'friend' },
  },
  {
    id: 'health_check',
    require: { '>=': ['age', 35] },
    weight: 10,
    prompt: '健檢通知單在桌上放了兩個月，上面的日期快過期了。',
    choices: [
      { id: 'safe', label: '每年都做', odds: '+30', mag: 2 },
      { id: 'normal', label: '公司安排就做', odds: '0', mag: 2 },
      { id: 'bold', label: '沒事不用檢查', odds: '-30', mag: 3 },
    ],
    good: {
      text: '報告全部正常。你比想像中還健康。',
      effects: [{ type: 'stat.add', key: 'nerve', value: 6 }],
    },
    bad: {
      text: '有一項紅字。醫生說現在處理還來得及。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -8 },
        { type: 'stat.add', key: 'health_debt', value: 1 },
      ],
    },
    scene: { bg: 'clinic' },
  },
  {
    id: 'exercise_habit',
    require: { '>=': ['age', 25] },
    weight: 8,
    prompt: '爬四層樓要停一次。你以前不會這樣。',
    choices: [
      { id: 'safe', label: '走路上下班', odds: '+30', mag: 2 },
      { id: 'normal', label: '週末動一動', odds: '+10', mag: 2 },
      { id: 'bold', label: '報名馬拉松', odds: '-20', mag: 3 },
    ],
    good: {
      text: '身體開始還你一些東西。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 8 },
        { type: 'stat.add', key: 'keeps_fit', value: 1 },
      ],
    },
    bad: {
      text: '運動了三個月，受傷休息了六個月。',
      effects: [{ type: 'stat.add', key: 'health_debt', value: 1 }],
    },
    scene: { bg: 'park' },
  },
  {
    id: 'debt_collector_call',
    require: { flag: 'leveraged_wipeout' },
    weight: 16,
    prompt: '一天三通電話，最後一通打到公司總機。',
    choices: [
      { id: 'safe', label: '面對它，談分期', odds: '+20', mag: 2 },
      { id: 'normal', label: '先躲一陣子', odds: '-10', mag: 2 },
      { id: 'bold', label: '再借一筆翻本', odds: '-35', mag: 3 },
    ],
    good: {
      text: '你把數字攤在桌上，第一次不再假裝它不存在。',
      effects: [
        { type: 'stat.add', key: 'debt', value: -10 },
        { type: 'stat.add', key: 'faced_the_debt', value: 1 },
      ],
    },
    bad: {
      text: '電話打到公司，也打到家裡。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -12 },
        { type: 'stat.add', key: 'debt', value: 8 },
        { type: 'stat.add', key: 'family_strain', value: 1 },
      ],
    },
    scene: { bg: 'home', sfx: 'phone_ring' },
  },
  {
    id: 'health_scare',
    require: { all: [{ flag: 'leveraged_wipeout' }, { '<=': ['nerve', 55] }] },
    weight: 12,
    prompt: '半夜胸口悶了一下，過幾分鐘就好了。你躺著，沒有再睡著。',
    choices: [
      { id: 'safe', label: '立刻停下來休養', odds: '+25', mag: 2 },
      { id: 'normal', label: '減量但不停', odds: '-5', mag: 2 },
      { id: 'bold', label: '什麼都不改', odds: '-35', mag: 3 },
    ],
    good: {
      text: '虛驚一場。但你記住了那個晚上的感覺。',
      effects: [{ type: 'stat.add', key: 'nerve', value: 6 }],
    },
    bad: {
      text: '救護車的聲音是從你家樓下開始的。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -15 },
        { type: 'stat.add', key: 'capital', value: -20 },
        { type: 'stat.add', key: 'health_debt', value: 2 },
      ],
    },
    scene: { bg: 'hospital', sfx: 'siren' },
  },
  {
    id: 'family_blames_you',
    require: { all: [{ '>=': ['counter.family_strain', 2] }, { '>=': ['age', 35] }] },
    weight: 11,
    prompt: '過年的桌上，有人把當初那件事又提了一次，這次沒有笑。',
    choices: [
      { id: 'safe', label: '道歉並改變', odds: '+20', mag: 2 },
      { id: 'normal', label: '解釋當初的理由', odds: '-5', mag: 2 },
      { id: 'bold', label: '堅持自己沒錯', odds: '-35', mag: 3 },
    ],
    good: {
      text: '你們沒有和好如初，但至少又開始講話了。',
      effects: [{ type: 'stat.add', key: 'nerve', value: 10 }],
    },
    bad: {
      text: '那一年過年，桌上少了兩個人。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -12 },
        { type: 'stat.add', key: 'family_strain', value: 1 },
      ],
    },
    scene: { bg: 'family_home', actor: 'family' },
  },
  {
    id: 'volunteer',
    require: { all: [{ '>=': ['age', 30] }, { '>=': ['nerve', 55] }] },
    weight: 6,
    prompt: '社區在募志工，時段剛好是你每週唯一空著的那個晚上。',
    choices: [
      { id: 'safe', label: '捐點錢', odds: '+30', mag: 2 },
      { id: 'normal', label: '偶爾去幫忙', odds: '+5', mag: 2 },
      { id: 'bold', label: '固定每週去', odds: '-20', mag: 3 },
    ],
    good: {
      text: '你在那裡認識的人，跟你的工作完全沒有關係。這是好事。',
      effects: [
        { type: 'stat.add', key: 'network', value: 3 },
        { type: 'stat.add', key: 'nerve', value: 6 },
        { type: 'stat.add', key: 'helped_others', value: 1 },
      ],
    },
    bad: {
      text: '你答應了太多事，最後兩邊都做不好。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -5 }],
    },
    scene: { bg: 'community_center' },
  },
  {
    id: 'hobby_years',
    require: { '>=': ['age', 26] },
    weight: 7,
    prompt: '你在櫃子深處翻到一樣東西，是很多年前你很喜歡的。',
    choices: [
      { id: 'safe', label: '沒空', odds: '+15', mag: 1 },
      { id: 'normal', label: '一週留兩小時', odds: '+10', mag: 2 },
      { id: 'bold', label: '認真投入', odds: '-15', mag: 3 },
    ],
    good: {
      text: '有一件事你做的時候不會想到錢。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 8 },
        { type: 'stat.add', key: 'has_hobby', value: 1 },
      ],
    },
    bad: {
      text: '裝備買齊了，然後放在櫃子裡三年。',
      effects: [{ type: 'stat.add', key: 'capital', value: -6 }],
    },
    scene: { bg: 'home' },
  },
  {
    id: 'move_back_home',
    require: { all: [{ '>=': ['age', 45] }, { '<=': ['capital', 150] }] },
    weight: 8,
    prompt: '房租又要漲了。老家那間空房其實一直留著。',
    choices: [
      { id: 'safe', label: '搬回去住', odds: '+25', mag: 2 },
      { id: 'normal', label: '換小一點的房子', odds: '+5', mag: 2 },
      { id: 'bold', label: '硬撐現在的生活', odds: '-30', mag: 3 },
    ],
    good: {
      text: '少了一些面子，多了一些現金。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 25 },
        { type: 'stat.add', key: 'savingsRate', value: 0.03 },
      ],
    },
    bad: {
      text: '你維持著別人看得見的那部分，代價是看不見的那部分。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -15 },
        { type: 'stat.add', key: 'nerve', value: -6 },
      ],
    },
    scene: { bg: 'family_home' },
  },
  {
    id: 'funeral',
    require: { '>=': ['age', 44] },
    weight: 8,
    prompt: '訃聞來得突然。名字你認得，只是很多年沒見了。',
    choices: [
      { id: 'safe', label: '到場致意', odds: '+20', mag: 1 },
      { id: 'normal', label: '幫忙處理後事', odds: '0', mag: 2 },
      { id: 'bold', label: '全部一肩扛起', odds: '-20', mag: 3 },
    ],
    good: {
      text: '你在那天想清楚了一些一直想不清楚的事。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 6 },
        { type: 'stat.add', key: 'cognition', value: 2 },
      ],
    },
    bad: {
      text: '事情辦完之後，你才發現自己一直沒有真的難過過。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -10 },
        { type: 'stat.add', key: 'capital', value: -12 },
      ],
    },
    scene: { bg: 'temple' },
  },
  {
    id: 'sleepless_year',
    require: { all: [{ '<=': ['nerve', 60] }, { '>=': ['age', 30] }] },
    weight: 9,
    prompt: '躺下之後腦袋開始算數字。天亮的時候你還在算。',
    choices: [
      { id: 'safe', label: '看醫生', odds: '+25', mag: 2 },
      { id: 'normal', label: '換個作息', odds: '+5', mag: 2 },
      { id: 'bold', label: '靠意志力撐', odds: '-30', mag: 3 },
    ],
    good: {
      text: '你重新睡得著了。世界的顏色回來了一點。',
      effects: [{ type: 'stat.add', key: 'nerve', value: 12 }],
    },
    bad: {
      text: '半夜三點，你在手機上看著別人的帳戶截圖。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -8 },
        { type: 'stat.add', key: 'insomnia', value: 1 },
      ],
    },
    scene: { bg: 'bedroom_night' },
  },
  {
    id: 'someone_else_made_it',
    require: { all: [{ '>=': ['age', 33] }, { '>=': ['network', 18] }] },
    weight: 10,
    prompt: '同期的那個人上了雜誌。你把整篇看完了。',
    choices: [
      { id: 'safe', label: '真心替他高興', odds: '+20', mag: 2 },
      { id: 'normal', label: '問他怎麼做到的', odds: '+5', mag: 2 },
      { id: 'bold', label: '照他的路再走一次', odds: '-30', mag: 3 },
    ],
    good: {
      text: '他講的東西你聽懂了，而且知道那不是運氣。',
      effects: [
        { type: 'stat.add', key: 'cognition', value: 3 },
        { type: 'stat.add', key: 'network', value: 2 },
      ],
    },
    bad: {
      text: '你照做了，但那班車已經開走了。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -18 },
        { type: 'stat.add', key: 'nerve', value: -6 },
      ],
    },
    scene: { bg: 'cafe', actor: 'friend' },
  },
  {
    id: 'retirement_math',
    require: { '>=': ['age', 52] },
    weight: 11,
    prompt: '你打開試算表，把剩下的年份、支出、和帳戶餘額打進去。',
    choices: [
      { id: 'safe', label: '保守估算', odds: '+30', mag: 2 },
      { id: 'normal', label: '認真算一次', odds: '+5', mag: 2 },
      { id: 'bold', label: '賭最後幾年翻倍', odds: '-35', mag: 4 },
    ],
    good: {
      text: '數字是夠的。你把試算表關掉，去睡了一個好覺。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 10 },
        { type: 'stat.add', key: 'planned_ahead', value: 1 },
      ],
    },
    bad: {
      text: '你算了三次，三次的答案都是「不夠」。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: -10 },
        { type: 'stat.add', key: 'capital', value: -10 },
      ],
    },
    scene: { bg: 'home_desk' },
  },
]
