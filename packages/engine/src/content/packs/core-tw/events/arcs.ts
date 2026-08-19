// 連續事件（§7.2 的故事圖）：用 outcome 的 `next` 串起來的多段劇情。
//
// 跟前面五個主題檔的差別只有一個——這裡的事件**彼此知道對方存在**。
// 入口事件照常抽籤（`weight > 0`），後面每一段都是 `weight: 0`，只走箭頭。
//
// 這一疊示範了三件事，都是 §7.2 的欄位：
//   - 同一年立刻接上（`next` 不寫 afterYears）：飯局講完，當場就接下一個鏡頭
//   - 幾年後才接（`afterYears`）：第一年燒錢與五年後的結果之間，本來就該留白
//   - 到期時條件不成立就換一段演（`orElse`）：五年後公司到底有沒有做起來，
//     是看玩家這五年真的過成什麼樣，不是看作者當初怎麼想

export const arcEvents = [
  {
    // 入口。weight 落在 core-tw 現有的區間上緣，條件是二十幾歲就摸得到的門檻。
    id: 'cofounder_pitch',
    require: { all: [{ '>=': ['age', 26] }, { '>=': ['network', 12] }] },
    weight: 14,
    once: true,
    prompt: '大學同學找你吃飯，講到一半才說：「我想自己出來做。」',
    choices: [
      { id: 'safe', label: '我幫你看帳就好', odds: '+25', mag: 1, good: '你說帳我幫你看，人我不進去。他點頭，那頓飯後來各付各的。', bad: '你說只幫忙看帳，話卻越講越多。散場時你才發現自己答應了什麼。' },
      { id: 'normal', label: '出一點錢，不管事', odds: '0', mag: 2, good: '你說錢我出一點，事你自己決定。他把杯子舉起來，沒有再多說。', bad: '你說出一點就好。他問多少，你報了一個自己都嚇一跳的數字。' },
      { id: 'bold', label: '我跟你一起做', odds: '-20', mag: 3, good: '你說我跟你做。他愣了三秒，然後把整桌的菜都點了一輪。', bad: '你當場說我跟你做。回家路上才想起房貸還有十八年。' },
    ],
    good: {
      effects: [{ type: 'stat.add', key: 'network', value: 3 }],
      next: { id: 'cofounder_terms' },
    },
    bad: {
      effects: [{ type: 'stat.add', key: 'nerve', value: -5 }],
      next: { id: 'cofounder_the_number' },
    },
    scene: { bg: 'restaurant', actor: 'classmate', sfx: 'chatter' },
  },
  {
    // good 那條：談得成，所以下一格是談條件
    id: 'cofounder_terms',
    require: { '>=': ['age', 0] },
    weight: 0,
    once: true,
    prompt: '合約攤在桌上，股份那一欄是空的，他等你先開口。',
    choices: [
      { id: 'safe', label: '照出資比例就好', odds: '+25', mag: 1, good: '你說照錢算就好。乾淨、不用吵，日後你沒有一次後悔過這個決定。', bad: '你說照錢算。簽完才知道他把另一份合約給了別人。' },
      { id: 'normal', label: '我要三成', odds: '0', mag: 2, good: '你開了三成。他想了一下，說好。那個「好」你記了很多年。', bad: '你開三成，他還到一成五。你簽了，但那頓飯吃得很安靜。' },
      { id: 'bold', label: '三成，加一個董事席次', odds: '-25', mag: 3, good: '你連席次一起要。他笑說你果然是懂錢的，然後兩個都給了。', bad: '你要得太滿。他什麼都沒說，只是後來的會議你常常最後一個知道。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 0.7 },
        { type: 'stat.add', key: 'cognition', value: 4 },
        { type: 'stat.add', key: 'cofounded', value: 1 },
      ],
      next: { id: 'cofounder_first_year', afterYears: 1 },
    },
    bad: {
      effects: [
        { type: 'capital.mul', value: 0.7 },
        { type: 'stat.add', key: 'nerve', value: -4 },
        { type: 'stat.add', key: 'cofounded', value: 1 },
      ],
      next: { id: 'cofounder_first_year', afterYears: 1 },
    },
    scene: { bg: 'meeting_room', actor: 'classmate', sfx: 'page_turn' },
  },
  {
    // bad 那條：話講太滿，所以下一格是看到真正的數字
    id: 'cofounder_the_number',
    require: { '>=': ['age', 0] },
    weight: 0,
    once: true,
    prompt: '他傳來試算表。第一年要燒的數字，剛好是你全部的存款。',
    choices: [
      { id: 'safe', label: '只出三成', odds: '+30', mag: 1, good: '你只出三成，其餘留著。那筆留下來的錢後來救了你自己。', bad: '你說只出三成，最後還是被那頁試算表說服了。' },
      { id: 'normal', label: '照他說的出', odds: '0', mag: 2, good: '你照數字匯了過去。存摺剩下四位數，但你睡得著。', bad: '你照數字匯了過去。存摺剩下四位數，那個月你半夜醒來好幾次。' },
      { id: 'bold', label: '再加一筆', odds: '-30', mag: 3, good: '你不只照出，還多押了一筆。他愣了一下，說那我更不能搞砸。', bad: '你多押了一筆，想著要嘛就做大的。沒有人問你確定嗎。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 0.6 },
        { type: 'stat.add', key: 'cofounded', value: 1 },
      ],
      next: { id: 'cofounder_first_year', afterYears: 1 },
    },
    bad: {
      effects: [
        { type: 'capital.mul', value: 0.45 },
        { type: 'stat.add', key: 'nerve', value: -6 },
        { type: 'stat.add', key: 'cofounded', value: 1 },
      ],
      next: { id: 'cofounder_first_year', afterYears: 1 },
    },
    scene: { bg: 'commute', sfx: 'notification' },
  },
  {
    // 兩條線在這裡匯流——匯流不需要特別支援，兩邊都指過來就成立
    id: 'cofounder_first_year',
    require: { '>=': ['age', 0] },
    weight: 0,
    once: true,
    prompt: '第一年結束。帳上比試算表少了一位數，他說再撐半年。',
    choices: [
      { id: 'safe', label: '我先抽手', odds: '+30', mag: 1, good: '你退出了。拿回一部分，也弄丟了一點什麼，你自己知道是什麼。', bad: '你說要退，卻在他開口之前先軟了。錢沒拿回來，話也收不回去。' },
      { id: 'normal', label: '再撐半年', odds: '0', mag: 2, good: '你說好。那半年你們兩個都瘦了，但東西真的做出來了。', bad: '你說好。那半年過完，帳上又少了一位數。' },
      { id: 'bold', label: '我再拿一筆出來', odds: '-25', mag: 3, good: '你又匯了一筆。這一次的錢，是後來所有事情的起點。', bad: '你又匯了一筆。這一次沒有人說謝謝，也沒有人說對不起。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'cognition', value: 6 },
        { type: 'stat.add', key: 'income', value: 4 },
        { type: 'stat.add', key: 'stayed_in', value: 1 },
      ],
      // 五年後才知道結果。到期時如果錢沒真的做起來，就演另一段。
      next: { id: 'cofounder_years_later', afterYears: 5, orElse: 'cofounder_quiet_end' },
    },
    bad: {
      effects: [{ type: 'stat.add', key: 'nerve', value: -10 }],
      next: { id: 'cofounder_quiet_end', afterYears: 3 },
    },
    scene: { bg: 'startup_office', actor: 'classmate' },
  },
  {
    // 只有這五年真的把身家做起來的人，才會走到這一格。
    // 250 是實測出來的：三十四歲的本金中位數是 152、p90 是 254，所以這道門
    // 大約落在同齡的前一成——夠稀有到值得寫，又不是永遠碰不到（碰不到的內容
    // 等於沒寫）。碰不到的人走 orElse，不會卡住。
    id: 'cofounder_years_later',
    require: { '>=': ['capital', 250] },
    weight: 0,
    once: true,
    prompt: '五年後那家公司上了新聞。你手上還有當初那份股份。',
    choices: [
      { id: 'safe', label: '先賣一半', odds: '+30', mag: 2, good: '你賣了一半，剩下的放著。落袋的那一半讓你之後每一個決定都從容。', bad: '你賣了一半。剩下那一半後來漲得讓你不太想提起這件事。' },
      { id: 'normal', label: '全部留著', odds: '0', mag: 2, good: '你一股都沒動。當年那頓飯的帳單，現在看起來便宜得可笑。', bad: '你全部留著。新聞熱度過了以後，它就再也沒有回到那個價格。' },
      { id: 'bold', label: '加碼買回他的股份', odds: '-30', mag: 3, good: '你把他手上的也接了過來。他說反正給你我最放心。', bad: '你出價要接他的股份。他沒答應，而那句沒答應你想了很久。' },
    ],
    good: {
      effects: [
        { type: 'capital.mul', value: 1.8 },
        { type: 'stat.add', key: 'stayed_in', value: 1 },
      ],
    },
    bad: {
      effects: [
        { type: 'capital.mul', value: 0.9 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'city_skyline', sfx: 'crowd' },
  },
  {
    // orElse 的落點，也是 bad 那條的終點
    id: 'cofounder_quiet_end',
    require: { '>=': ['age', 0] },
    weight: 0,
    once: true,
    prompt: '你在超商結帳時聽到他的名字。你付了錢，沒有回頭。',
    choices: [
      { id: 'safe', label: '沒有回頭', odds: '+30', mag: 1, good: '你沒有回頭。有些合夥就是這樣結束的——沒有翻臉，只是各自走遠。', bad: '你沒有回頭，卻在停車場坐了二十分鐘才發動車子。' },
      { id: 'normal', label: '傳個訊息', odds: '0', mag: 2, good: '你傳了一句「看到你了」。他隔天才回，回了三個字：謝謝你。', bad: '你傳了訊息過去。已讀停在那裡，停了很久。' },
      { id: 'bold', label: '打給他', odds: '-30', mag: 3, good: '你打了。他接了，兩個人在電話裡笑得像那年還沒開始的時候。', bad: '你打了。響到底沒人接，你也沒有再打第二次。' },
    ],
    good: {
      effects: [
        { type: 'stat.add', key: 'nerve', value: 6 },
        { type: 'stat.add', key: 'let_it_go', value: 1 },
      ],
    },
    bad: {
      effects: [{ type: 'stat.add', key: 'nerve', value: -6 }],
    },
    scene: { bg: 'street_night', sfx: 'door_bell' },
  },
]
