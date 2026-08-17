// 市場：不是機會（機會是 §7.1 的物件），是「你在市場旁邊做的那些小動作」。
//
// 這一疊事件負責養出 §7.5 的人格：聽明牌、追高、逆勢、只買不賣、看年報。
// 它們動的錢不多，動的是 counter——四十年後那些 counter 才是你這個人。

export const marketEvents = [
  {
    id: 'market_selloff',
    // 手上真的有部位才談得上「抱不抱得住」——這條 require 是 diamond_hands
    // 與 retail_leek 兩個人格能不能說得通的關鍵。
    require: { '>=': ['position.count', 1] },
    weight: 10,
    prompt: '手上的部位一週跌掉三成。你打開帳戶又關掉，一天七次。',
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
    id: 'hot_tip_from_colleague',
    require: { all: [{ '>=': ['age', 22] }, { '>=': ['capital', 20] }] },
    weight: 9,
    prompt: '茶水間有人壓低聲音跟你講一檔，說他表哥就在裡面做。',
    choices: [
      { id: 'safe', label: '笑一笑就好', odds: '+35', mag: 1 },
      { id: 'normal', label: '買一點點', odds: '-5', mag: 2 },
      { id: 'bold', label: '照他說的押', odds: '-30', mag: 4 },
    ],
    good: {
      text: '這次真的漲了。你開始相信自己有門路。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 12 },
        { type: 'stat.add', key: 'followed_tip', value: 1 },
      ],
    },
    bad: {
      text: '你進場那天就是最高點。他後來換了部門。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -10 },
        { type: 'stat.add', key: 'followed_tip', value: 1 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'pantry', actor: 'colleague_a' },
  },
  {
    id: 'read_the_annual_report',
    require: { '>=': ['age', 23] },
    weight: 9,
    prompt: '年報下載下來兩百多頁。你翻到第三頁就開始想別的事。',
    choices: [
      { id: 'safe', label: '看標題就好', odds: '+25', mag: 1 },
      { id: 'normal', label: '翻一翻財報', odds: '0', mag: 2 },
      { id: 'bold', label: '把附註全部讀完', odds: '-20', mag: 3 },
    ],
    good: {
      text: '你在附註裡看到一句話，那句話後來救了你一次。',
      effects: [
        { type: 'stat.add', key: 'cognition', value: 3 },
        { type: 'stat.add', key: 'did_homework', value: 1 },
      ],
    },
    bad: {
      text: '你讀了兩百頁，什麼也沒看出來，只是很累。',
      effects: [{ type: 'stat.add', key: 'nerve', value: -3 }],
    },
    scene: { bg: 'home_desk', sfx: 'page_turn' },
  },
  {
    id: 'buy_the_dip',
    require: { all: [{ in: ['era.phase', ['crash', 'recession']] }, { '>=': ['capital', 40] }] },
    weight: 12,
    prompt: '跌了一整年。你認識的人有一半已經不看盤了，而你手上還有現金。',
    choices: [
      { id: 'safe', label: '現金為王', odds: '+30', mag: 1 },
      { id: 'normal', label: '分批進場', odds: '+5', mag: 2 },
      { id: 'bold', label: '別人恐懼我貪婪', odds: '-15', mag: 4 },
    ],
    good: {
      text: '所有人都在賣的時候你在買。三年後你才知道那是什麼意思。',
      effects: [
        { type: 'capital.mul', value: 1.12 },
        { type: 'stat.add', key: 'contrarian', value: 1 },
      ],
    },
    bad: {
      text: '你以為那是底。底下面還有底。',
      effects: [
        { type: 'capital.mul', value: 0.92 },
        { type: 'stat.add', key: 'contrarian', value: 1 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'trading_floor', fx: 'red_screen' },
  },
  {
    id: 'chase_the_top',
    require: { all: [{ in: ['era.phase', ['boom', 'mania']] }, { '>=': ['capital', 30] }] },
    weight: 12,
    prompt: '你看很久的那一檔，這個月又漲了四成。現在追，還是等回檔。',
    choices: [
      { id: 'safe', label: '這種價格我不追', odds: '+30', mag: 1 },
      { id: 'normal', label: '小買一些跟上', odds: '-5', mag: 2 },
      { id: 'bold', label: '全部買進去', odds: '-30', mag: 4 },
    ],
    good: {
      text: '狂熱又多撐了一年，你在裡面。',
      effects: [
        { type: 'capital.mul', value: 1.15 },
        { type: 'stat.add', key: 'chased_top', value: 1 },
      ],
    },
    bad: {
      text: '你買在最後一根長紅棒上。',
      effects: [
        { type: 'capital.mul', value: 0.88 },
        { type: 'stat.add', key: 'chased_top', value: 1 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'trading_floor', fx: 'green_screen' },
  },
  {
    id: 'margin_call_temptation',
    require: { all: [{ '>=': ['capital', 80] }, { '>=': ['nerve', 50] }, { in: ['era.phase', ['boom', 'mania']] }] },
    weight: 7,
    prompt: '營業員說你的額度可以開到兩倍，「反正現在行情這麼好」。',
    choices: [
      { id: 'safe', label: '不碰融資', odds: '+35', mag: 1 },
      { id: 'normal', label: '開個戶備著', odds: '0', mag: 2 },
      { id: 'bold', label: '融資買滿', odds: '-35', mag: 4 },
    ],
    good: {
      text: '槓桿放大了那一年的獲利，你覺得自己終於學會了。',
      effects: [
        { type: 'capital.mul', value: 1.2 },
        { type: 'stat.add', key: 'used_leverage', value: 1 },
      ],
    },
    bad: {
      text: '維持率的簡訊在早上九點二十分傳來。',
      effects: [
        { type: 'capital.mul', value: 0.7 },
        { type: 'stat.add', key: 'used_leverage', value: 1 },
        { type: 'stat.add', key: 'debt', value: 15 },
      ],
    },
    scene: { bg: 'phone', sfx: 'notification' },
  },
  {
    id: 'dividend_habit',
    require: { all: [{ '>=': ['age', 28] }, { '>=': ['capital', 50] }] },
    weight: 9,
    prompt: '除息公告出來了。你可以領現金，也可以讓它自己滾下去。',
    choices: [
      { id: 'safe', label: '領息就好', odds: '+30', mag: 2 },
      { id: 'normal', label: '股息再投入', odds: '+10', mag: 2 },
      { id: 'bold', label: '借錢買高股息', odds: '-30', mag: 3 },
    ],
    good: {
      text: '一年一次的入帳不多，但它從來沒有缺席過。',
      effects: [
        { type: 'capital.mul', value: 1.05 },
        { type: 'stat.add', key: 'dividend_years', value: 1 },
      ],
    },
    bad: {
      text: '填不了息，你才發現那筆錢本來就是你的。',
      effects: [{ type: 'capital.mul', value: 0.97 }],
    },
    scene: { bg: 'home_desk' },
  },
  {
    id: 'friend_wants_to_borrow',
    require: { all: [{ '>=': ['capital', 60] }, { '>=': ['network', 15] }] },
    weight: 8,
    prompt: '很久沒聯絡的朋友約你吃飯，坐下來十分鐘就講到週轉。',
    choices: [
      { id: 'safe', label: '說自己也沒錢', odds: '+30', mag: 1 },
      { id: 'normal', label: '借一小筆', odds: '-5', mag: 2 },
      { id: 'bold', label: '他要多少給多少', odds: '-30', mag: 3 },
    ],
    good: {
      text: '他還了。而且從此把你當自己人。',
      effects: [
        { type: 'stat.add', key: 'network', value: 5 },
        { type: 'stat.add', key: 'lent_money', value: 1 },
      ],
    },
    bad: {
      text: '錢沒了，朋友也沒了。你不確定哪個比較難受。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -18 },
        { type: 'stat.add', key: 'network', value: -4 },
        { type: 'stat.add', key: 'lent_money', value: 1 },
      ],
    },
    scene: { bg: 'cafe', actor: 'friend' },
  },
  {
    id: 'investment_seminar',
    require: { all: [{ '>=': ['age', 25] }, { '<=': ['cognition', 40] }] },
    weight: 8,
    prompt: '傳單上寫「三堂課學會看懂財報」，前兩個小時免費。',
    choices: [
      { id: 'safe', label: '不去', odds: '+30', mag: 1 },
      { id: 'normal', label: '去聽免費場', odds: '0', mag: 2 },
      { id: 'bold', label: '報名進階課程', odds: '-25', mag: 3 },
    ],
    good: {
      text: '講的東西不新，但有一句話你記了很久。',
      effects: [{ type: 'stat.add', key: 'cognition', value: 3 }],
    },
    bad: {
      text: '課程費用比你那年賺到的還多，講師後來不見了。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -10 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'seminar_hall', actor: 'speaker' },
  },
  {
    id: 'account_untouched',
    require: { all: [{ '>=': ['age', 30] }, { '>=': ['capital', 100] }] },
    weight: 7,
    prompt: '這一年你什麼都沒做。帳戶就在那裡，看不看隨你。',
    choices: [
      { id: 'safe', label: '一整年不看盤', odds: '+35', mag: 2 },
      { id: 'normal', label: '每月看一次', odds: '+5', mag: 2 },
      { id: 'bold', label: '每天都在調整', odds: '-30', mag: 3 },
    ],
    good: {
      text: '你什麼都沒做，帳戶自己長大了一點。',
      effects: [
        { type: 'capital.mul', value: 1.06 },
        { type: 'stat.add', key: 'did_nothing', value: 1 },
      ],
    },
    bad: {
      text: '手續費、稅、還有那些「早知道」，加起來剛好是你的獲利。',
      effects: [{ type: 'capital.mul', value: 0.95 }],
    },
    scene: { bg: 'home' },
  },
  {
    id: 'insider_rumour',
    require: { all: [{ '>=': ['network', 30] }, { '>=': ['capital', 60] }] },
    weight: 4,
    prompt: '飯局上有人講了一件還沒公告的事，講完自己愣了一下。',
    choices: [
      { id: 'safe', label: '當作沒聽到', odds: '+35', mag: 1 },
      { id: 'normal', label: '查證再說', odds: '+5', mag: 2 },
      { id: 'bold', label: '趁還沒公告先買', odds: '-30', mag: 4 },
    ],
    good: {
      text: '公告出來那天，你已經在裡面很久了。',
      effects: [
        { type: 'stat.add', key: 'capital', value: 45 },
        { type: 'stat.add', key: 'crossed_the_line', value: 1 },
      ],
    },
    bad: {
      text: '消息是真的，時間點是假的。錢卡在裡面兩年。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -25 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'parking_lot', actor: 'stranger' },
  },
  {
    id: 'the_one_that_got_away',
    require: { all: [{ '>=': ['counter.opportunities_declined', 1] }, { '>=': ['age', 30] }] },
    weight: 9,
    prompt: '你當初放掉的那個今天上了新聞，標題是它翻了幾倍。',
    choices: [
      { id: 'safe', label: '不去想它', odds: '+25', mag: 1 },
      { id: 'normal', label: '看看現在多少', odds: '-5', mag: 2 },
      { id: 'bold', label: '現在追進去', odds: '-30', mag: 3 },
    ],
    good: {
      text: '你放下了。錯過本來就是這場遊戲的一部分。',
      effects: [
        { type: 'stat.add', key: 'nerve', value: 8 },
        { type: 'stat.add', key: 'let_it_go', value: 1 },
      ],
    },
    bad: {
      text: '你在它漲了五倍之後買進，然後它腰斬。',
      effects: [
        { type: 'stat.add', key: 'capital', value: -20 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'phone', fx: 'ticker' },
  },
  {
    id: 'savings_rate_decision',
    require: { '>=': ['age', 24] },
    weight: 10,
    prompt: '銀行 App 把你這一年的支出畫成一張圓餅圖。你看了很久。',
    choices: [
      { id: 'safe', label: '維持現在的存法', odds: '+25', mag: 1 },
      { id: 'normal', label: '每個月多存一點', odds: '0', mag: 2 },
      { id: 'bold', label: '極限省下一半薪水', odds: '-25', mag: 3 },
    ],
    good: {
      text: '你把存錢變成一件不用想的事。',
      effects: [
        { type: 'stat.add', key: 'savingsRate', value: 0.04 },
        { type: 'stat.add', key: 'frugal', value: 1 },
      ],
    },
    bad: {
      text: '省了三個月，第四個月一次補回來。',
      effects: [{ type: 'stat.add', key: 'savingsRate', value: -0.02 }],
    },
    scene: { bg: 'home_desk' },
  },
  {
    id: 'crypto_curiosity',
    require: { all: [{ '>=': ['age', 25] }, { '>=': ['capital', 30] }, { '>=': ['cognition', 15] }] },
    weight: 7,
    prompt: '朋友傳來一個網址，說「這個你不懂就會錯過」。你確實不懂。',
    choices: [
      { id: 'safe', label: '看不懂就不碰', odds: '+30', mag: 1 },
      { id: 'normal', label: '買一點當學費', odds: '-10', mag: 2 },
      { id: 'bold', label: '整筆換過去', odds: '-35', mag: 4 },
    ],
    good: {
      text: '你在別人還在笑的時候就進去了。',
      effects: [
        { type: 'capital.mul', value: 1.25 },
        { type: 'stat.add', key: 'early_adopter', value: 1 },
      ],
    },
    bad: {
      text: '交易所在某個週末就不見了，客服也是。',
      effects: [
        { type: 'capital.mul', value: 0.78 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'phone', sfx: 'notification' },
  },
  {
    id: 'sell_everything_fear',
    require: { all: [{ '==': ['era.phase', 'crash'] }, { '>=': ['capital', 50] }] },
    weight: 11,
    prompt: '開盤十分鐘，你手上每一檔都是綠的。手機一直在震。',
    choices: [
      { id: 'safe', label: '全部換現金', odds: '+20', mag: 2 },
      { id: 'normal', label: '減碼一半', odds: '+5', mag: 2 },
      { id: 'bold', label: '一股都不賣', odds: '-10', mag: 3 },
    ],
    good: {
      text: '你做的決定，後來的自己感謝了很多年。',
      effects: [
        { type: 'capital.mul', value: 1.08 },
        { type: 'stat.add', key: 'nerve', value: 5 },
      ],
    },
    bad: {
      text: '你賣在最低點附近，然後看著它漲回去。',
      effects: [
        { type: 'capital.mul', value: 0.9 },
        { type: 'stat.add', key: 'panic_sold', value: 1 },
        { type: 'stat.add', key: 'nerve', value: -6 },
      ],
    },
    scene: { bg: 'trading_floor', sfx: 'alert', fx: 'red_screen' },
  },
  {
    id: 'teach_someone_to_invest',
    require: { all: [{ '>=': ['cognition', 35] }, { '>=': ['age', 35] }] },
    weight: 6,
    prompt: '有人問你「該買什麼」。他今年剛開始工作。',
    choices: [
      { id: 'safe', label: '叫他去買定存', odds: '+30', mag: 1 },
      { id: 'normal', label: '講一些原則', odds: '+5', mag: 2 },
      { id: 'bold', label: '幫他操作', odds: '-30', mag: 3 },
    ],
    good: {
      text: '他照做了，而且沒有問你明牌。',
      effects: [
        { type: 'stat.add', key: 'network', value: 4 },
        { type: 'stat.add', key: 'taught_investing', value: 1 },
      ],
    },
    bad: {
      text: '賠錢的是他，怪罪的對象是你。',
      effects: [
        { type: 'stat.add', key: 'network', value: -5 },
        { type: 'stat.add', key: 'nerve', value: -5 },
      ],
    },
    scene: { bg: 'cafe', actor: 'friend' },
  },
  {
    id: 'company_gone_bad',
    require: { all: [{ '>=': ['capital', 80] }, { '>=': ['age', 30] }] },
    weight: 6,
    prompt: '你持有的那家公司發了重訊，說明會排在三天後。',
    choices: [
      { id: 'safe', label: '第一時間出清', odds: '+25', mag: 2 },
      { id: 'normal', label: '等等看說明會', odds: '-5', mag: 2 },
      { id: 'bold', label: '相信經營層', odds: '-30', mag: 3 },
    ],
    good: {
      text: '公司撐過來了，你的持股也是。',
      effects: [{ type: 'capital.mul', value: 1.1 }],
    },
    bad: {
      text: '停牌那天你才知道，財報的字是可以那樣寫的。',
      effects: [
        { type: 'capital.mul', value: 0.82 },
        { type: 'stat.add', key: 'market_lessons', value: 1 },
      ],
    },
    scene: { bg: 'trading_floor', sfx: 'alert' },
  },
  {
    id: 'long_term_conviction',
    require: { all: [{ '>=': ['age', 40] }, { '>=': ['counter.did_homework', 3] }] },
    weight: 7,
    prompt: '你追了二十年的那個產業，現在你比誰都清楚它值多少。',
    choices: [
      { id: 'safe', label: '分散再分散', odds: '+30', mag: 2 },
      { id: 'normal', label: '集中在懂的幾檔', odds: '0', mag: 2 },
      { id: 'bold', label: '押在最懂的那一檔', odds: '-25', mag: 4 },
    ],
    good: {
      text: '你花了二十年才敢這樣做，而它值得。',
      effects: [
        { type: 'capital.mul', value: 1.18 },
        { type: 'stat.add', key: 'conviction', value: 1 },
      ],
    },
    bad: {
      text: '你懂的那一檔，這一次真的錯了。',
      effects: [{ type: 'capital.mul', value: 0.86 }],
    },
    scene: { bg: 'home_desk' },
  },
]
