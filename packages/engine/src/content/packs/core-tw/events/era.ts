// 時代：條件寫在 `era.phase` 上，不寫年份。
//
// 這是刻意的——同一批事件在「台股歷史」與「隨機世界」兩種模式下都成立，
// 因為兩個產生器產出的是同一種 Timeline（§7.4）。1990 年的萬點與某個隨機
// 世界第三次狂熱，對玩家來說是同一種空氣。
//
// §2：標的一律**暗示但不指名**。

export const eraEvents = [
  {
    id: 'everyone_is_talking_stocks',
    require: { all: [{ '==': ['era.phase', 'mania'] }, { '>=': ['age', 20] }] },
    weight: 14,
    prompt: '早餐店的電視在報收盤，隔壁桌兩個人在比誰賺得多。',
    choices: [
      { id: 'safe', label: '聽聽就算了', odds: '+30', mag: 1 },
      { id: 'normal', label: '跟著開個戶', odds: '-5', mag: 2 },
      { id: 'bold', label: '把定存解約全押', odds: '-35', mag: 4 },
    ],
    good: {
      text: '菜市場、計程車、公司茶水間，每個人都在講同一件事——而這次他們是對的。',
      effects: [
        { type: 'capital.mul', value: 1.22 },
        { type: 'stat.add', key: 'rode_the_wave', value: 1 },
      ],
    },
    bad: {
      text: '當每個人都在講的時候，你進場的位置就是別人出場的位置。',
      effects: [
        { type: 'capital.mul', value: 0.82 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'market_street', sfx: 'crowd', fx: 'green_screen' },
  },
  {
    id: 'index_at_the_ceiling',
    require: { all: [{ '==': ['era.phase', 'mania'] }, { '>=': ['capital', 60] }] },
    weight: 11,
    prompt: '指數又創新高。帳戶上的數字大到你自己都覺得不真實。',
    choices: [
      { id: 'safe', label: '獲利了結一半', odds: '+30', mag: 2 },
      { id: 'normal', label: '設個停利點', odds: '+5', mag: 2 },
      { id: 'bold', label: '這次不一樣', odds: '-35', mag: 4 },
    ],
    good: {
      text: '你在指數還在往上的時候按下賣出。之後有半年你都覺得自己賣早了。',
      effects: [
        { type: 'capital.mul', value: 1.1 },
        { type: 'stat.add', key: 'took_profit', value: 1 },
      ],
    },
    bad: {
      text: '「這次不一樣」是史上最貴的五個字。',
      effects: [
        { type: 'capital.mul', value: 0.75 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'trading_floor', fx: 'ticker' },
  },
  {
    id: 'the_crash_year',
    require: { '==': ['era.phase', 'crash'] },
    weight: 16,
    prompt: '一開盤就是一片綠。新聞用的字是「崩」。',
    choices: [
      { id: 'safe', label: '不看盤，照常上班', odds: '+25', mag: 2 },
      { id: 'normal', label: '調整部位', odds: '0', mag: 2 },
      { id: 'bold', label: '把所有現金投進去', odds: '-25', mag: 4 },
    ],
    good: {
      text: '崩盤那年你沒有做傻事。光是這樣，你就贏過一半的人。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 8 },
        { type: 'stat.add', key: 'survived_crash', value: 1 },
      ],
    },
    bad: {
      text: '你看著帳戶的數字，覺得那不是自己的錢，因為那已經不是任何人的錢了。',
      effects: [
        { type: 'capital.mul', value: 0.85 },
        { type: 'stat.add', key: 'nerve', value: -12 },
        { type: 'stat.add', key: 'survived_crash', value: 1 },
      ],
    },
    scene: { bg: 'trading_floor', sfx: 'alert', fx: 'red_screen' },
  },
  {
    id: 'neighbour_jumped_in',
    require: { all: [{ in: ['era.phase', ['boom', 'mania']] }, { '>=': ['network', 12] }] },
    weight: 10,
    prompt: '鄰居換了車，說最近運氣好，順便告訴你他買了什麼。',
    choices: [
      { id: 'safe', label: '祝福他', odds: '+30', mag: 1 },
      { id: 'normal', label: '問問他買什麼', odds: '-5', mag: 2 },
      { id: 'bold', label: '跟他買一樣的', odds: '-30', mag: 3 },
    ],
    good: {
      text: '他那檔真的漲了，而你剛好也在。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 25 },
        { type: 'stat.add', key: 'followed_tip', value: 1 },
      ],
    },
    bad: {
      text: '半年後他換了工作，也換了說法。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -20 },
        { type: 'stat.add', key: 'followed_tip', value: 1 },
      ],
    },
    scene: { bg: 'street', actor: 'neighbour' },
  },
  {
    id: 'the_quiet_bottom',
    require: { all: [{ '==': ['era.phase', 'recession'] }, { '>=': ['age', 25] }] },
    weight: 12,
    prompt: '已經沒有人在講股票了。財經版縮到三分之一頁。',
    choices: [
      { id: 'safe', label: '先把工作顧好', odds: '+25', mag: 2 },
      { id: 'normal', label: '固定小額買進', odds: '+10', mag: 2 },
      { id: 'bold', label: '重押在沒人要的東西上', odds: '-25', mag: 4 },
    ],
    good: {
      text: '沒有人在談股票的那幾年，才是真正決定結果的那幾年。',
      effects: [
        { type: 'capital.mul', value: 1.12 },
        { type: 'stat.add', key: 'bought_in_silence', value: 1 },
      ],
    },
    bad: {
      text: '你買的那些東西，後來真的就一直沒人要。',
      effects: [{ type: 'capital.mul', value: 0.93 }],
    },
    scene: { bg: 'empty_office' },
  },
  {
    id: 'currency_shock',
    require: { all: [{ in: ['era.phase', ['crash', 'recession']] }, { '>=': ['capital', 60] }] },
    weight: 9,
    prompt: '匯率一週跳了三塊。銀行門口排起了隊。',
    choices: [
      { id: 'safe', label: '什麼都不換', odds: '+25', mag: 2 },
      { id: 'normal', label: '換一點外幣', odds: '0', mag: 2 },
      { id: 'bold', label: '整筆換成外幣', odds: '-30', mag: 3 },
    ],
    good: {
      text: '匯率往你想的方向走了。這種事一輩子不會發生太多次。',
      effects: [{ type: 'capital.mul', value: 1.08 }],
    },
    bad: {
      text: '你在最貴的時候換，在最便宜的時候換回來。',
      effects: [{ type: 'capital.mul', value: 0.94 }],
    },
    scene: { bg: 'bank' },
  },
  {
    id: 'property_fever',
    require: { all: [{ in: ['era.phase', ['boom', 'mania']] }, { '>=': ['age', 30] }, { '>=': ['capital', 150] }, { not: { flag: 'once_property_fever' } }] },
    weight: 9,
    prompt: '同一個社區，去年開的價和今年開的價差了兩成。',
    choices: [
      { id: 'safe', label: '自住就好', odds: '+25', mag: 2 },
      { id: 'normal', label: '買一間收租', odds: '0', mag: 3 },
      { id: 'bold', label: '貸款買第三間', odds: '-30', mag: 4 },
    ],
    good: {
      text: '那幾年，房子比你的工作還會賺錢。',
      effects: [
        { type: 'capital.mul', value: 1.18 },
        { type: 'stat.add', key: 'property_bet', value: 1 },
        { type: 'flag.set', key: 'once_property_fever' },
      ],
    },
    bad: {
      text: '空租、修繕、房貸。它變成一個每個月都要餵的東西。',
      effects: [
        { type: 'stat.add', key: 'debt', value: 40 },
        { type: 'stat.add', key: 'property_bet', value: 1 },
        { type: 'flag.set', key: 'once_property_fever' },
      ],
    },
    scene: { bg: 'apartment_block' },
  },
  {
    id: 'new_industry_hype',
    require: { all: [{ '==': ['era.phase', 'boom'] }, { '>=': ['cognition', 20] }] },
    weight: 11,
    prompt: '每一場說明會都在講同一個名詞，而你還說不清楚它是什麼。',
    choices: [
      { id: 'safe', label: '等它成熟再說', odds: '+30', mag: 1 },
      { id: 'normal', label: '花時間搞懂它', odds: '0', mag: 2 },
      { id: 'bold', label: '現在就進場', odds: '-25', mag: 4 },
    ],
    good: {
      text: '你比大多數人早半年看懂那個名詞的意思。',
      effects: [
        { type: 'stat.add', key: 'cognition', value: 3 },
        { type: 'capital.mul', value: 1.12 },
        { type: 'stat.add', key: 'early_adopter', value: 1 },
      ],
    },
    bad: {
      text: '那個名詞後來沒有人再提起了。',
      effects: [{ type: 'capital.mul', value: 0.9 }],
    },
    scene: { bg: 'conference', fx: 'ticker' },
  },
  {
    id: 'export_orders_boom',
    require: { all: [{ '==': ['era.phase', 'boom'] }, { in: ['career.industry', ['factory', 'trade', 'tech']] }] },
    weight: 10,
    prompt: '客戶把明年的量先押下來了，問你們接不接得完。',
    choices: [
      { id: 'safe', label: '照常出貨', odds: '+25', mag: 2 },
      { id: 'normal', label: '加開一條線', odds: '0', mag: 2 },
      { id: 'bold', label: '押上全部產能', odds: '-25', mag: 3 },
    ],
    good: {
      text: '訂單多到你們開始挑客人。那種日子過得很快。',
      effects: [
        { type: 'stat.add', key: 'income', value: 10 },
        { type: 'stat.add', key: 'capital', value: 15 },
      ],
    },
    bad: {
      text: '客戶砍單的通知，比訂單來的時候還快。',
      effects: [
        { type: 'stat.add', key: 'income', value: -6 },
        { type: 'stat.add', key: 'nerve', value: -6 },
      ],
    },
    scene: { bg: 'factory', sfx: 'machine' },
  },
  {
    id: 'salary_frozen',
    require: { all: [{ in: ['era.phase', ['recession', 'crash']] }, { '>=': ['career.rank', 1] }] },
    weight: 13,
    prompt: '公告貼在茶水間：今年調薪凍結，年終看下半年。',
    choices: [
      { id: 'safe', label: '忍過去', odds: '+25', mag: 2 },
      { id: 'normal', label: '談談看', odds: '0', mag: 2 },
      { id: 'bold', label: '這種時候還敢跳槽', odds: '-30', mag: 3 },
    ],
    good: {
      text: '你在別人不敢動的時候動了，而且動對了。',
      effects: [
        { type: 'stat.add', key: 'income', value: 8 },
        { type: 'stat.add', key: 'moved_in_winter', value: 1 },
      ],
    },
    bad: {
      text: '凍薪、無薪假、然後是一封公告。',
      effects: [
        { type: 'stat.add', key: 'income', value: -7 },
        { type: 'stat.add', key: 'nerve', value: -6 },
      ],
    },
    scene: { bg: 'office', actor: 'hr' },
  },
  {
    id: 'recovery_hiring',
    require: { all: [{ '==': ['era.phase', 'recovery'] }, { '>=': ['career.rank', 1] }] },
    weight: 11,
    prompt: '獵人頭又開始打電話了，開的價比去年高。',
    choices: [
      { id: 'safe', label: '留在原地', odds: '+20', mag: 1 },
      { id: 'normal', label: '看看外面', odds: '+5', mag: 2 },
      { id: 'bold', label: '要求加薪三成', odds: '-25', mag: 3 },
    ],
    good: {
      text: '景氣回來的第一年，是唯一一段你說話比較大聲的時間。',
      effects: [
        { type: 'stat.add', key: 'income', value: 7 },
        { type: 'stat.add', key: 'network', value: 2 },
      ],
    },
    bad: {
      text: '你開的價，剛好讓對方想起還有別人可以選。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -5 }],
    },
    scene: { bg: 'office' },
  },
  {
    id: 'the_ipo_queue',
    require: { all: [{ in: ['era.phase', ['boom', 'mania']] }, { '>=': ['capital', 50] }] },
    weight: 9,
    prompt: '承銷公告出來了，抽籤要在三天內圈存。',
    choices: [
      { id: 'safe', label: '不抽', odds: '+25', mag: 1 },
      { id: 'normal', label: '抽一張看看', odds: '0', mag: 2 },
      { id: 'bold', label: '全家的帳戶一起抽', odds: '-20', mag: 3 },
    ],
    good: {
      text: '中籤那天，你算了一下報酬率，笑了出來。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 20 },
        { type: 'stat.add', key: 'gambles', value: 1 },
      ],
    },
    bad: {
      text: '掛牌第一天就跌破承銷價。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -8 },
        { type: 'stat.add', key: 'gambles', value: 1 },
      ],
    },
    scene: { bg: 'bank', sfx: 'stamp' },
  },
  {
    id: 'the_island_moves_on',
    require: { all: [{ '>=': ['age', 40] }, { '==': ['era.phase', 'recovery'] }] },
    weight: 8,
    prompt: '你做了二十年的東西，現在被歸在「傳統產業」那一欄。',
    choices: [
      { id: 'safe', label: '守住現在會的', odds: '+20', mag: 1 },
      { id: 'normal', label: '學一點新東西', odds: '+5', mag: 2 },
      { id: 'bold', label: '整個轉到新領域', odds: '-30', mag: 3 },
    ],
    good: {
      text: '這個島每十年換一次主力產業。這次你跟上了。',
      effects: [
        { type: 'stat.add', key: 'cognition', value: 4 },
        { type: 'stat.add', key: 'income', value: 5 },
      ],
    },
    bad: {
      text: '你會的東西還在，只是沒有人需要了。',
      effects: [
        { type: 'stat.add', key: 'income', value: -8 },
        { type: 'stat.add', key: 'nerve', value: -5 },
      ],
    },
    scene: { bg: 'city_skyline' },
  },
  {
    id: 'blackout_of_information',
    require: { all: [{ '==': ['era.phase', 'crash'] }, { '>=': ['network', 20] }] },
    weight: 8,
    prompt: '同一件事你聽到三個版本，每個講的人都拍胸脯。',
    choices: [
      { id: 'safe', label: '只看公開資訊', odds: '+25', mag: 2 },
      { id: 'normal', label: '打幾通電話問問', odds: '0', mag: 2 },
      { id: 'bold', label: '相信最快的那個消息', odds: '-35', mag: 3 },
    ],
    good: {
      text: '崩盤的時候，最有價值的不是消息，是能分辨消息的人。',
      effects: [
        { type: 'stat.add', key: 'cognition', value: 3 },
        { type: 'stat.add', key: 'network', value: 2 },
      ],
    },
    bad: {
      text: '你聽到的每一個版本都不一樣，而你選了最刺激的那個。',
      effects: [
        { type: 'capital.mul', value: 0.9 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'phone', sfx: 'phone_ring' },
  },
  {
    id: 'the_last_bull',
    require: { all: [{ '>=': ['age', 55] }, { in: ['era.phase', ['boom', 'mania']] }] },
    weight: 10,
    prompt: '這一波你看得很清楚。你也清楚自己還剩幾年可以再來一次。',
    choices: [
      { id: 'safe', label: '這把不玩了', odds: '+30', mag: 2 },
      { id: 'normal', label: '小部位參與', odds: '+5', mag: 2 },
      { id: 'bold', label: '最後一次全押', odds: '-35', mag: 4 },
    ],
    good: {
      text: '你知道這可能是你人生中最後一次多頭，而你剛好準備好了。',
      effects: [
        { type: 'capital.mul', value: 1.2 },
        { type: 'stat.add', key: 'last_dance', value: 1 },
      ],
    },
    bad: {
      text: '這個年紀輸掉的錢，是沒有時間再賺回來的。',
      effects: [
        { type: 'capital.mul', value: 0.78 },
        { type: 'stat.add', key: 'nerve', value: -12 },
      ],
    },
    scene: { bg: 'trading_floor', fx: 'ticker' },
  },
  {
    id: 'kids_ask_about_money',
    require: { all: [{ flag: 'has_kids' }, { '>=': ['age', 45] }] },
    weight: 8,
    prompt: '孩子問你「我們家算有錢嗎」，接著問「那要怎麼變有錢」。',
    choices: [
      { id: 'safe', label: '叫他好好念書', odds: '+20', mag: 1 },
      { id: 'normal', label: '講講自己的經驗', odds: '+5', mag: 2 },
      { id: 'bold', label: '把帳戶打開給他看', odds: '-20', mag: 3 },
    ],
    good: {
      text: '你講的不是明牌，是那幾次你怎麼撐過來的。他聽進去了。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 8 },
        { type: 'stat.add', key: 'passed_it_on', value: 1 },
      ],
    },
    bad: {
      text: '他點點頭，然後去問了 App 上的某個人。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -4 }],
    },
    scene: { bg: 'home', actor: 'child' },
  },
]
