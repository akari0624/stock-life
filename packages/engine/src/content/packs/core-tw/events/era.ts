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
      { id: 'safe', label: '聽聽就算了', odds: '+30', mag: 1, good: '你笑笑沒接話，事後卻順手放了一點進去。這次隔壁桌是對的。', bad: '你說聽聽就算了，手還是慢慢跟了進去。你進的位置，剛好是別人出場的位置。' },
      { id: 'normal', label: '跟著開個戶', odds: '-5', mag: 2, good: '你開了戶，跟著進場。菜市場、計程車、茶水間都在講同一件事——而這次他們是對的。', bad: '你開了戶就進場。當每個人都在講的時候，你進場的位置就是別人出場的位置。' },
      { id: 'bold', label: '把定存解約全押', odds: '-35', mag: 4, good: '你把定存整筆解約押了進去。這一次，跟著大家反而是對的。', bad: '你把定存解約全押。當每個人都在講的時候，你進場的位置就是別人出場的位置。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 1.22 },
        { type: 'stat.add', key: 'rode_the_wave', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '獲利了結一半', odds: '+30', mag: 2, good: '你賣掉一半，落袋為安。之後有半年你都覺得自己賣早了。', bad: '你只留了一半，卻連那一半都沒能守住。「這次不一樣」是史上最貴的五個字。' },
      { id: 'normal', label: '設個停利點', odds: '+5', mag: 2, good: '你設了停利點，指數還在往上的時候就出了。之後有半年你都覺得自己賣早了。', bad: '你設的點，市場一次也沒觸到就直接穿了過去。「這次不一樣」是史上最貴的五個字。' },
      { id: 'bold', label: '這次不一樣', odds: '-35', mag: 4, good: '你一張都沒賣，這次它真的又漲了一段。之後你才發現自己是僥倖。', bad: '你告訴自己這次不一樣。「這次不一樣」是史上最貴的五個字。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 1.1 },
        { type: 'stat.add', key: 'took_profit', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '不看盤，照常上班', odds: '+25', mag: 2, good: '崩盤那年你照常上班，沒去看盤，也沒做傻事。光是這樣，你就贏過一半的人。', bad: '你嘴上說不看，晚上還是打開了。那不是自己的錢，因為那已經不是任何人的錢了。' },
      { id: 'normal', label: '調整部位', odds: '0', mag: 2, good: '崩盤那年你冷靜地把部位調過，該砍的砍了。光是沒做傻事，你就贏過一半的人。', bad: '你越調越亂，每一次動手都在傷口上再劃一刀。那已經不是任何人的錢了。' },
      { id: 'bold', label: '把所有現金投進去', odds: '-25', mag: 4, good: '你在最綠的那幾天把現金全押了進去。事後看，你撿在了地板上。', bad: '你把所有現金投了進去，然後看著它繼續往下。那已經不是任何人的錢了。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: 8 },
        { type: 'stat.add', key: 'survived_crash', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '祝福他', odds: '+30', mag: 1, good: '你只是祝福他，回家卻忍不住買了一點試水溫。那檔真的漲了，你剛好也在。', bad: '你嘴上祝福，轉頭還是偷偷跟了一手。半年後他換了工作，也換了說法。' },
      { id: 'normal', label: '問問他買什麼', odds: '-5', mag: 2, good: '你問清楚了才進場。那檔真的漲了，而你剛好也在。', bad: '你問了，也跟著買了。半年後他換了工作，也換了說法。' },
      { id: 'bold', label: '跟他買一樣的', odds: '-30', mag: 3, good: '你跟他買了一樣的。那檔真的漲了，你也剛好在車上。', bad: '你跟他買了一樣的。半年後他換了工作，也換了說法，只有你還套在裡面。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'capital', value: 25 },
        { type: 'stat.add', key: 'followed_tip', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '先把工作顧好', odds: '+25', mag: 2, good: '你把心思放回工作，偶爾才順手放一點進去。沒有人在談股票的那幾年，才是真正決定結果的那幾年。', bad: '你想著先顧工作，卻在最冷的時候手癢買了一點。那些東西後來真的就一直沒人要。' },
      { id: 'normal', label: '固定小額買進', odds: '+10', mag: 2, good: '你每個月固定丟一點進去，沒特別看。沒有人在談股票的那幾年，才是真正決定結果的那幾年。', bad: '你固定買了好幾年。你買的那些東西，後來真的就一直沒人要。' },
      { id: 'bold', label: '重押在沒人要的東西上', odds: '-25', mag: 4, good: '你重押在沒人要的東西上。沒有人在談股票的那幾年，才是真正決定結果的那幾年。', bad: '你重押進去，賭它有一天會被記起來。你買的那些東西，後來真的就一直沒人要。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 1.12 },
        { type: 'stat.add', key: 'bought_in_silence', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '什麼都不換', odds: '+25', mag: 2, good: '你什麼都沒動，就靜靜看著。匯率往你想的方向走了，這種事一輩子不會發生太多次。', bad: '你說什麼都不換，排隊那天還是換了一些。你在最貴的時候換，在最便宜的時候換回來。' },
      { id: 'normal', label: '換一點外幣', odds: '0', mag: 2, good: '你換了一點放著。匯率往你想的方向走了，這種事一輩子不會發生太多次。', bad: '你換了一點。你在最貴的時候換，在最便宜的時候換回來。' },
      { id: 'bold', label: '整筆換成外幣', odds: '-30', mag: 3, good: '你整筆換了過去。匯率往你想的方向走了，這種事一輩子不會發生太多次。', bad: '你整筆換了過去。你在最貴的時候換，在最便宜的時候換回來。' },
    ],
    good: {
      effects: [{ type: 'capital.mul', value: 1.08 }],
    },
    bad: {
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
      { id: 'safe', label: '自住就好', odds: '+25', mag: 2, good: '你只求自住，房子卻悄悄漲了一大截。那幾年，房子比你的工作還會賺錢。', bad: '你說自住就好，卻在漲勢裡多咬了一間。空租、修繕、房貸，它變成一個每個月都要餵的東西。' },
      { id: 'normal', label: '買一間收租', odds: '0', mag: 3, good: '你買了一間收租，租金穩穩進來。那幾年，房子比你的工作還會賺錢。', bad: '你買了一間收租。空租、修繕、房貸，它變成一個每個月都要餵的東西。' },
      { id: 'bold', label: '貸款買第三間', odds: '-30', mag: 4, good: '你貸款買下第三間。那幾年，房子比你的工作還會賺錢。', bad: '你貸款買了第三間。空租、修繕、房貸，它變成一個每個月都要餵的東西。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 1.18 },
        { type: 'stat.add', key: 'property_bet', value: 1 },
        { type: 'flag.set', key: 'once_property_fever' },
      ],
    },
    bad: {
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
      { id: 'safe', label: '等它成熟再說', odds: '+30', mag: 1, good: '你決定等它成熟，卻也悄悄讀懂了它。你比大多數人早半年看懂那個名詞的意思。', bad: '你說等成熟再說，怕錯過還是先放了一點進去。那個名詞後來沒有人再提起了。' },
      { id: 'normal', label: '花時間搞懂它', odds: '0', mag: 2, good: '你花了時間把它搞懂，才小心地進場。你比大多數人早半年看懂那個名詞的意思。', bad: '你搞懂了它，也押了一點。那個名詞後來沒有人再提起了。' },
      { id: 'bold', label: '現在就進場', odds: '-25', mag: 4, good: '你連它是什麼都還沒說清就進場了，結果押對了。之後你才慢慢懂它的意思。', bad: '你現在就進場了。那個名詞後來沒有人再提起了。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'cognition', value: 3 },
        { type: 'capital.mul', value: 1.12 },
        { type: 'stat.add', key: 'early_adopter', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '照常出貨', odds: '+25', mag: 2, good: '你們照常出貨，量卻自己滿了起來。訂單多到你們開始挑客人，那種日子過得很快。', bad: '你們照常接單，也照常被放鴿子。客戶砍單的通知，比訂單來的時候還快。' },
      { id: 'normal', label: '加開一條線', odds: '0', mag: 2, good: '你加開了一條線，剛好接住了那波量。訂單多到你們開始挑客人，那種日子過得很快。', bad: '你加開的那條線才熱起來。客戶砍單的通知，比訂單來的時候還快。' },
      { id: 'bold', label: '押上全部產能', odds: '-25', mag: 3, good: '你把全部產能都押了上去，接到手軟。訂單多到你們開始挑客人，那種日子過得很快。', bad: '你把全部產能都押了上去。客戶砍單的通知，比訂單來的時候還快。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'income', value: 10 },
        { type: 'stat.add', key: 'capital', value: 15 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '忍過去', odds: '+25', mag: 2, good: '你忍住了，撐過那個冬天。景氣回來時，還在位子上的人不多，你是其中一個。', bad: '你想忍過去。凍薪、無薪假、然後是一封公告。' },
      { id: 'normal', label: '談談看', odds: '0', mag: 2, good: '你去談了。在別人都不敢開口的時候，你替自己爭到了一點。', bad: '你去談了，話還沒說完就懂了。凍薪、無薪假、然後是一封公告。' },
      { id: 'bold', label: '這種時候還敢跳槽', odds: '-30', mag: 3, good: '你在別人不敢動的時候跳了，而且跳對了。', bad: '你在最冷的時候跳了。凍薪、無薪假、然後是一封公告。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'income', value: 8 },
        { type: 'stat.add', key: 'moved_in_winter', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '留在原地', odds: '+20', mag: 1, good: '你沒走，只是把外面的價說給主管聽。景氣回來的第一年，是你唯一一段說話比較大聲的時間。', bad: '你想留在原地，還是探了探口風。你開的價，剛好讓對方想起還有別人可以選。' },
      { id: 'normal', label: '看看外面', odds: '+5', mag: 2, good: '你出去看了看，也真的談成了。景氣回來的第一年，是你唯一一段說話比較大聲的時間。', bad: '你出去看了看。你開的價，剛好讓對方想起還有別人可以選。' },
      { id: 'bold', label: '要求加薪三成', odds: '-25', mag: 3, good: '你直接開口要三成，對方居然點頭了。景氣回來的第一年，你說話最大聲。', bad: '你要求加薪三成。你開的價，剛好讓對方想起還有別人可以選。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'income', value: 7 },
        { type: 'stat.add', key: 'network', value: 2 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '不抽', odds: '+25', mag: 1, good: '你說不抽，圈存截止前還是圈了一張。中籤那天，你算了一下報酬率，笑了出來。', bad: '你說不抽，最後還是手癢圈了一張。掛牌第一天就跌破承銷價。' },
      { id: 'normal', label: '抽一張看看', odds: '0', mag: 2, good: '你抽了一張看看，中了。那天你算了一下報酬率，笑了出來。', bad: '你抽了一張看看。掛牌第一天就跌破承銷價。' },
      { id: 'bold', label: '全家的帳戶一起抽', odds: '-20', mag: 3, good: '你把全家的帳戶都拿去抽，中了好幾張。那天你算了一下報酬率，笑了出來。', bad: '你把全家的帳戶都拿去抽。掛牌第一天就跌破承銷價。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'capital', value: 20 },
        { type: 'stat.add', key: 'gambles', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '守住現在會的', odds: '+20', mag: 1, good: '你守住老本行，反而成了少數還做得動的人，順手也添了點新的。這個島每十年換一次主力產業，這次你剛好還在場上。', bad: '你選擇守住現在會的。你會的東西還在，只是沒有人需要了。' },
      { id: 'normal', label: '學一點新東西', odds: '+5', mag: 2, good: '你利用晚上學了點新的，慢慢接得上。這個島每十年換一次主力產業，這次你跟上了。', bad: '你學了一點新東西，還是慢了半拍。你會的東西還在，只是沒有人需要了。' },
      { id: 'bold', label: '整個轉到新領域', odds: '-30', mag: 3, good: '你整個轉了過去，從頭學起。這個島每十年換一次主力產業，這次你跟上了。', bad: '你整個轉到新領域，錢和時間都砸了進去。你會的東西還在，只是沒有人需要了。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'cognition', value: 4 },
        { type: 'stat.add', key: 'income', value: 5 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '只看公開資訊', odds: '+25', mag: 2, good: '你只信白紙黑字的東西，其餘都放一邊。崩盤的時候，最有價值的不是消息，是能分辨消息的人。', bad: '你想只看公開資訊，那三個版本卻鑽進了腦子。最後你選了最刺激的那個。' },
      { id: 'normal', label: '打幾通電話問問', odds: '0', mag: 2, good: '你打了幾通電話，慢慢對出真的那一版。崩盤的時候，最有價值的不是消息，是能分辨消息的人。', bad: '你打了幾通電話，聽到的每個版本都不一樣，而你選了最刺激的那個。' },
      { id: 'bold', label: '相信最快的那個消息', odds: '-35', mag: 3, good: '你賭了最快傳到你耳裡的那個，居然是真的。崩盤時，你剛好站對了邊。', bad: '你相信了最快的那個消息。三個版本都不一樣，而你選了最刺激的那個。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'cognition', value: 3 },
        { type: 'stat.add', key: 'network', value: 2 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '這把不玩了', odds: '+30', mag: 2, good: '你說這把不玩，最後還是留了一小筆看著它走。這可能是你人生中最後一次多頭，而你剛好準備好了。', bad: '你想收手，臨了還是動了一點。這個年紀輸掉的錢，是沒有時間再賺回來的。' },
      { id: 'normal', label: '小部位參與', odds: '+5', mag: 2, good: '你只放了一小部位進去。這可能是你人生中最後一次多頭，而你剛好準備好了。', bad: '你只放了一小部位，卻連這點都沒守住。這個年紀輸掉的錢，是沒有時間再賺回來的。' },
      { id: 'bold', label: '最後一次全押', odds: '-35', mag: 4, good: '你把能動的都押了進去。這可能是你人生中最後一次多頭，而你剛好準備好了。', bad: '你把能動的都押了進去。這個年紀輸掉的錢，是沒有時間再賺回來的。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 1.2 },
        { type: 'stat.add', key: 'last_dance', value: 1 },
      ],
    },
    bad: {
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
      { id: 'safe', label: '叫他好好念書', odds: '+20', mag: 1, good: '你叫他先把書念好，話說著說著，卻講起那幾次你怎麼撐過來的。他聽進去了。', bad: '你只說了句好好念書。他點點頭，然後去問了 App 上的某個人。' },
      { id: 'normal', label: '講講自己的經驗', odds: '+5', mag: 2, good: '你講的不是明牌，是那幾次你怎麼撐過來的。他聽進去了。', bad: '你講了一堆自己的經驗。他點點頭，然後去問了 App 上的某個人。' },
      { id: 'bold', label: '把帳戶打開給他看', odds: '-20', mag: 3, good: '你把帳戶打開給他看，連虧的那幾頁也沒跳過。他看懂的不是數字，是你怎麼撐過來的。', bad: '你把帳戶都打開給他看了。他點點頭，然後去問了 App 上的某個人。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: 8 },
        { type: 'stat.add', key: 'passed_it_on', value: 1 },
      ],
    },
    bad: {
      effects: [{ type: 'stat.add', key: 'nerve', value: -4 }],
    },
    scene: { bg: 'home', actor: 'child' },
  },
]
