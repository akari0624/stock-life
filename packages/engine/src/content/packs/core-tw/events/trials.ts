// 持倉考驗（§7.1）：`weight: 0` ＝ 永遠不進隨機池，只能被 `event.trigger` 叫到。
//
// 它們是**普通事件**，走的是跟其他八十幾個事件一模一樣的管線——這正是 §7.1
// 說「trials 走一般事件管線」的意思。真正決定部位存亡的是另一個 command
// （`resolveTrial` 的抱住／賣掉），這裡處理的是那一年你心裡發生的事。

export const trialEvents = [
  {
    id: 'drawdown_50',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    prompt: '你抱著的那個部位，帳面只剩一半。今天又跌了。',
    choices: [
      { id: 'safe', label: '關掉 App，去睡覺', odds: '+25', mag: 1, good: '你把手機關了，睡了一覺。醒來它還在腰斬，但你也還在。', bad: '你把 App 關了，卻整夜沒睡。腦子裡那個綠色數字，怎麼關都關不掉。' },
      { id: 'normal', label: '每天看一次就好', odds: '0', mag: 2, good: '帳面腰斬。你撐住了——雖然那個月你瘦了三公斤。', bad: '每天睜眼就是綠的。你開始懷疑自己是不是根本不懂。' },
      { id: 'bold', label: '盯著它，一分鐘都不移開', odds: '-25', mag: 3, good: '你一整天沒移開視線。帳面腰斬，但你眼睜睜看它撐住了。', bad: '你盯了它一整天。每一次跳動都在心上刮一下，你開始懷疑自己是不是根本不懂。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: -4 },
        { type: 'stat.add', key: 'stared_into_it', value: 1 },
      ],
    },
    bad: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: -14 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'bedroom_night', fx: 'crash_red', sfx: 'heartbeat' },
  },
  {
    id: 'triple_temptation',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    prompt: '三倍了。手機上那個數字你看了整個晚上。',
    choices: [
      { id: 'safe', label: '算一次帳就好', odds: '+30', mag: 1, good: '你把帳算了一遍，記下來，就把 App 關掉了。三倍歸三倍，日子照過。', bad: '你說只算一次，卻算了整晚。三倍能換幾坪，你一直按著計算機。' },
      { id: 'normal', label: '跟家人講一聲', odds: '0', mag: 2, good: '三倍了。你把 App 關掉，繼續過原本的日子。', bad: '三倍了。你整晚在算現在賣掉能買幾坪。' },
      { id: 'bold', label: '開始看房子', odds: '-25', mag: 3, good: '你點開了房仲的頁面，看了幾間，又默默關掉。三倍還沒落袋，你提醒自己。', bad: '你開始看房子。愈看愈心癢，整晚在算現在賣掉能買幾坪。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'cognition', value: 2 },
        { type: 'stat.add', key: 'kept_cool', value: 1 },
      ],
    },
    bad: {
      effects: [{ type: 'stat.add', key: 'nerve', value: -10 }],
    },
    scene: { bg: 'office_night', sfx: 'notification' },
  },
  {
    id: 'family_emergency',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    prompt: '家裡臨時要一筆錢，而你的錢全部在那個部位裡。',
    choices: [
      { id: 'safe', label: '先跟親戚周轉', odds: '+30', mag: 1, good: '你開口跟親戚借了。錢調度過來，部位還在。你欠了一個人情。', bad: '你打了幾通電話，話到嘴邊又吞回去。家裡的事等不了，最後還是動了部位。' },
      { id: 'normal', label: '動用其他存款', odds: '0', mag: 2, good: '錢調度過來了，部位還在。你欠了一個人情。', bad: '家裡的事等不了。有些選擇根本不是選擇。' },
      { id: 'bold', label: '想辦法不動到部位', odds: '-25', mag: 3, good: '你東拼西湊，找人先墊了一筆。部位保住了，代價是欠下一個人情。', bad: '你想盡辦法要保住部位。家裡的事等不了，有些選擇根本不是選擇。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'network', value: 2 },
        { type: 'stat.add', key: 'held_the_line', value: 1 },
      ],
    },
    bad: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: -12 },
        { type: 'stat.add', key: 'family_strain', value: 1 },
      ],
    },
    scene: { bg: 'hospital', sfx: 'phone_ring' },
  },
  {
    id: 'rumour_of_fraud',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    prompt: '有人在論壇上說那家公司帳做假，附了幾張你看不太懂的截圖。',
    choices: [
      { id: 'safe', label: '查證公開資訊', odds: '+25', mag: 2, good: '你把財報一頁一頁翻過。謠言就是謠言，你查完之後反而更確定了。', bad: '你查了一整晚，數字看不出所以然。你不知道該相信誰，那一年你睡不好。' },
      { id: 'normal', label: '問問業內的朋友', odds: '0', mag: 2, good: '謠言就是謠言。你查完之後反而更確定了。', bad: '你不知道該相信誰。那一年你睡不好。' },
      { id: 'bold', label: '不理會任何雜音', odds: '-25', mag: 3, good: '你嘴上說不理會，還是偷偷去對過一遍。謠言就是謠言，你反而更確定了。', bad: '你告訴自己別理那些截圖，卻愈不看愈心慌。那一年你睡不好。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'cognition', value: 3 },
        { type: 'stat.add', key: 'did_homework', value: 1 },
      ],
    },
    bad: {
      effects: [{ type: 'stat.add', key: 'nerve', value: -10 }],
    },
    scene: { bg: 'phone', sfx: 'notification' },
  },
  {
    id: 'everyone_says_sell',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    prompt: '認識的人一個一個勸你出場，理由都不太一樣。',
    choices: [
      { id: 'safe', label: '聽聽他們的理由', odds: '+25', mag: 2, good: '你一個一個聽完，發現他們講的其實都是同一個來源。', bad: '你聽了一輪，愈聽愈亂。一個人對著全世界說「你們都錯了」，是很累的事。' },
      { id: 'normal', label: '禮貌地不回應', odds: '0', mag: 2, good: '你發現他們講的其實都是同一個來源。', bad: '一個人對著全世界說「你們都錯了」，是很累的事。' },
      { id: 'bold', label: '跟他們吵一架', odds: '-30', mag: 3, good: '你據理力爭。吵完才發現，他們講的其實都是同一個來源。', bad: '你跟他們吵翻了。事後想想，一個人對著全世界說「你們都錯了」，是很累的事——而且那幾個朋友，後來就淡了。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'cognition', value: 2 },
        { type: 'stat.add', key: 'kept_cool', value: 1 },
      ],
    },
    bad: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: -9 },
        { type: 'stat.add', key: 'network', value: -2 },
      ],
    },
    scene: { bg: 'restaurant', actor: 'friend' },
  },
  {
    id: 'better_offer_elsewhere',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    prompt: '另一個機會擺在眼前，但你的錢還在原來那裡。',
    choices: [
      { id: 'safe', label: '維持原本的計畫', odds: '+30', mag: 2, good: '你沒有動，看著那個機會走遠。專注這件事，比看起來難得多。', bad: '你嘴上說維持計畫，眼睛卻一直飄向另一邊。兩邊的最好一段，都錯過了。' },
      { id: 'normal', label: '兩邊都放一點', odds: '0', mag: 2, good: '你沒有動。專注這件事，比看起來難得多。', bad: '你在兩個之間換來換去，兩邊的最好一段都錯過了。' },
      { id: 'bold', label: '換到新的那個', odds: '-30', mag: 3, good: '你換了過去，然後就守著它，不再回頭看。專注一件事，比看起來難得多。', bad: '你換過去，沒多久又想換回來。你在兩個之間來回，兩邊的最好一段都錯過了。' },
    ],
    good: {
      effects: [{ type: 'stat.add', key: 'kept_cool', value: 1 }],
    },
    bad: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: -6 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'home_desk', fx: 'ticker' },
  },
  {
    id: 'lockup_years',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    prompt: '合約寫得很清楚：這筆錢三年內動不了。',
    choices: [
      { id: 'safe', label: '把它當作不存在', odds: '+30', mag: 2, good: '你把那筆錢當作不存在。被綁住的那幾年，你反而把心思放回工作上。', bad: '你以為當作不存在就好。真的需要用錢那天，那筆錢剛好動不了。' },
      { id: 'normal', label: '每季看一次', odds: '0', mag: 2, good: '錢被綁住的那幾年，你反而把心思放回工作上。', bad: '你需要用錢的時候，那筆錢剛好動不了。' },
      { id: 'bold', label: '想辦法提前變現', odds: '-30', mag: 3, good: '你打聽了半天，發現真的動不了，只好作罷。那幾年，你反而把心思放回工作上。', bad: '你到處找門路想提前解套，白費了不少工夫。你需要用錢的時候，那筆錢還是動不了。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'income', value: 3 },
        { type: 'stat.add', key: 'held_the_line', value: 1 },
      ],
    },
    bad: {
      effects: [{ type: 'stat.add', key: 'nerve', value: -8 }],
    },
    scene: { bg: 'bank' },
  },
  {
    id: 'paper_gains_tax',
    require: { '>=': ['position.count', 1] },
    weight: 0,
    prompt: '會計師看了你的持倉，問你這部分的稅有沒有準備。',
    choices: [
      { id: 'safe', label: '先預留稅金', odds: '+30', mag: 2, good: '你先把該留的一筆一筆留好了。真到要繳的時候，數字沒有嚇到你。', bad: '你以為留夠了，帳單來了才知道差一截。帳面上的獲利，也是要繳錢的。' },
      { id: 'normal', label: '請人幫忙算', odds: '0', mag: 2, good: '你把該留的留好了，數字沒有嚇到你。', bad: '帳面上的獲利，也是要繳錢的。這件事沒有人提醒過你。' },
      { id: 'bold', label: '等賣掉再說', odds: '-25', mag: 3, good: '你想著等賣掉再說，還好那時手頭剛好夠。數字沒有嚇到你。', bad: '你想著等賣掉再說，就沒去理它。帳面上的獲利也是要繳錢的，這件事沒有人提醒過你。' },
    ],
    good: {
      effects: [{ type: 'stat.add', key: 'planned_ahead', value: 1 }],
    },
    bad: {
      effects: [
        { type: 'stat.add', key: 'capital', value: -12 },
        { type: 'stat.add', key: 'nerve', value: -5 },
      ],
    },
    scene: { bg: 'home_desk' },
  },
]
