// 人生：跟錢沒有直接關係，但決定了你敢不敢押的那些事。
//
// nerve（膽識）在這裡累積也在這裡被消耗。§1.3 的四檔倉位裡，最後決定你選
// 哪一檔的往往不是試算表，是你這幾年過得好不好。
//
// 家庭與健康的負面事件鏈用 `flag.leveraged_wipeout` 解鎖（§1.3）——引擎不
// 硬編碼這條鏈，它只是內容寫在 require 裡的一個 flag。
//
// §7.2：effects 是三個選項共用的一組（由各自的 mag 縮放），good/bad 文案則
// 每個選項各寫一份——所以「推掉」和「揪一整桌」不會再共用同一句只對得上其
// 中一個動作的話。

export const lifeEvents = [
  {
    id: "meet_someone",
    require: {
      all: [
        { ">=": ["age", 24] },
        { "<=": ["age", 40] },
        { not: { flag: "partnered" } },
      ],
    },
    weight: 11,
    prompt: "有個人問你週末有沒有空。你已經很久沒有被這樣問過。",
    choices: [
      { id: "safe", label: "慢慢來", odds: "+20", mag: 1,
        good: "你們沒有急著定義什麼，但每個週末都留了位子給對方。",
        bad: "慢到後來，連你自己也說不清還在等什麼。" },
      { id: "normal", label: "認真交往", odds: "+5", mag: 2,
        good: "有一個人知道你今天過得怎麼樣。這件事比你以為的重要。",
        bad: "你們都很努力，但方向不一樣。" },
      { id: "bold", label: "很快就決定了", odds: "-20", mag: 3,
        good: "決定得很快，但那天之後你沒有後悔過。",
        bad: "太快了。有些話還沒問出口，你們就已經在收拾東西。" },
    ],
    good: {
      effects: [
        { type: "flag.set", key: "partnered" },
        { type: "stat.add", key: "nerve", value: 10 },
      ],
    },
    bad: {
      effects: [{ type: "stat.add", key: "nerve", value: -6 }],
    },
    scene: { bg: "street_night", actor: "partner" },
  },
  {
    id: "have_a_child",
    require: {
      all: [
        { flag: "partnered" },
        { ">=": ["age", 27] },
        { "<=": ["age", 44] },
        { not: { flag: "has_kids" } },
      ],
    },
    weight: 10,
    prompt: "你們在客廳坐到很晚，話題繞來繞去都繞回同一件事。",
    choices: [
      { id: "safe", label: "再等等", odds: "+20", mag: 1,
        good: "你們等到都準備好才點頭。他來的時候，剛好是對的時候。",
        bad: "等著等著，有些決定還是被時間替你們做了。那一年很難。" },
      { id: "normal", label: "順其自然", odds: "0", mag: 2,
        good: "你抱著他的那個晚上，重新算了一次自己的人生。",
        bad: "那一年很難。很多事情都沒有按照計畫。" },
      { id: "bold", label: "現在就要", odds: "-15", mag: 3,
        good: "你們沒有等所謂的準備好——後來才發現，沒有人真的準備得好。",
        bad: "來得又急又猛。那一年，很多事情都沒有按照計畫。" },
    ],
    good: {
      effects: [
        { type: "flag.set", key: "has_kids" },
        { type: "stat.add", key: "nerve", value: 8 },
        { type: "stat.add", key: "savingsRate", value: -0.03 },
      ],
    },
    bad: {
      effects: [
        { type: "flag.set", key: "has_kids" },
        { type: "stat.add", key: "nerve", value: -8 },
        { type: "stat.add", key: "capital", value: -15 },
      ],
    },
    scene: { bg: "hospital", actor: "partner" },
  },
  {
    id: "partner_career_clash",
    require: { all: [{ flag: "partnered" }, { ">=": ["age", 30] }] },
    weight: 8,
    prompt: "兩邊的工作剛好在這一年撞在一起，總得有人退一步。",
    choices: [
      { id: "safe", label: "我退一步", odds: "+15", mag: 2,
        good: "你先讓了。後來你發現，讓的那個不一定是輸的那個。",
        bad: "你退了一步，心裡卻默默記了一筆。那筆帳後來越記越長。" },
      { id: "normal", label: "各自安排", odds: "0", mag: 2,
        good: "你們找到了一個誰都不吃虧的方法。",
        bad: "那次爭執之後，有些話你們再也沒有說出口。" },
      { id: "bold", label: "要求對方配合", odds: "-25", mag: 3,
        good: "你把話講開了。對方沒有反駁，反而像鬆了一口氣。",
        bad: "你贏了那次爭執，卻輸掉了之後很多次的沉默。" },
    ],
    good: {
      effects: [{ type: "stat.add", key: "nerve", value: 6 }],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -8 },
        { type: "stat.add", key: "family_strain", value: 1 },
      ],
    },
    scene: { bg: "home", actor: "partner" },
  },
  {
    id: "old_friends_dinner",
    require: {
      all: [
        { ">=": ["age", 30] },
        { not: { flag: "once_old_friends_dinner" } },
      ],
    },
    weight: 9,
    prompt: "群組突然響起來，說十年沒見了，要不要約。",
    choices: [
      { id: "safe", label: "推掉", odds: "+20", mag: 1,
        good: "你沒去。但有個人單獨私訊你，你們反而聊得比在桌上還深。",
        bad: "你把群組關成靜音，假裝沒看到。那晚你反覆想，是不是又錯過了什麼。" },
      { id: "normal", label: "去坐一下", odds: "+5", mag: 2,
        good: "有人現在做的事，剛好是你想知道的事。",
        bad: "整桌都在比誰過得好。你回家的路上很安靜。" },
      { id: "bold", label: "揪一整桌", odds: "-15", mag: 3,
        good: "你揪成了一整桌。久違地，你覺得自己還屬於某一群人。",
        bad: "你張羅了一整桌，最後卻像個外人，坐在自己辦的局裡。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "network", value: 4 },
        { type: "stat.add", key: "nerve", value: 4 },
        { type: "flag.set", key: "once_old_friends_dinner" },
      ],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -5 },
        { type: "flag.set", key: "once_old_friends_dinner" },
      ],
    },
    scene: { bg: "restaurant", actor: "friend" },
  },
  {
    id: "health_check",
    require: { ">=": ["age", 35] },
    weight: 10,
    prompt: "健檢通知單在桌上放了兩個月，上面的日期快過期了。",
    choices: [
      { id: "safe", label: "每年都做", odds: "+30", mag: 2,
        good: "報告全部正常。你比想像中還健康。",
        bad: "有一項紅字。還好你每年都做，醫生說現在處理還來得及。" },
      { id: "normal", label: "公司安排就做", odds: "0", mag: 2,
        good: "趁著公司安排的那次，順手把自己也檢查了。一切正常。",
        bad: "有一項紅字。醫生說現在處理還來得及。" },
      { id: "bold", label: "沒事不用檢查", odds: "-30", mag: 3,
        good: "你什麼都沒做。這一年，身體也剛好沒來找你麻煩。",
        bad: "拖到身體自己發出訊號，你才進醫院。醫生皺了皺眉。" },
    ],
    good: {
      effects: [{ type: "stat.add", key: "nerve", value: 6 }],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -8 },
        { type: "stat.add", key: "health_debt", value: 1 },
      ],
    },
    scene: { bg: "clinic" },
  },
  {
    id: "exercise_habit",
    require: { ">=": ["age", 25] },
    weight: 8,
    prompt: "爬四層樓要停一次。你以前不會這樣。",
    choices: [
      { id: "safe", label: "走路上下班", odds: "+30", mag: 2,
        good: "只是每天多走幾站，一年後，身體開始還你一些東西。",
        bad: "走了幾週就找藉口搭車。身體沒等你，又往下滑了一點。" },
      { id: "normal", label: "週末動一動", odds: "+10", mag: 2,
        good: "週末流的那些汗，慢慢把你換回一點以前的樣子。",
        bad: "週末總有更要緊的事。一年過去，你只有更喘了。" },
      { id: "bold", label: "報名馬拉松", odds: "-20", mag: 3,
        good: "你真的跑完了。終點線那一刻，你哭得莫名其妙。",
        bad: "你報了馬拉松，練了三個月，然後受傷休息了六個月。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "nerve", value: 8 },
        { type: "stat.add", key: "keeps_fit", value: 1 },
      ],
    },
    bad: {
      effects: [{ type: "stat.add", key: "health_debt", value: 1 }],
    },
    scene: { bg: "park" },
  },
  {
    id: "debt_collector_call",
    require: { flag: "leveraged_wipeout" },
    weight: 16,
    prompt: "一天三通電話，最後一通打到公司總機。",
    choices: [
      { id: "safe", label: "面對它，談分期", odds: "+20", mag: 2,
        good: "你把數字攤在桌上，第一次不再假裝它不存在。",
        bad: "你想談，對方卻不讓你談。電話還是打到了家裡。" },
      { id: "normal", label: "先躲一陣子", odds: "-10", mag: 2,
        good: "躲的那陣子你想清楚了，回頭主動打了那通電話。",
        bad: "躲得了一時。電話打到公司，也打到家裡。" },
      { id: "bold", label: "再借一筆翻本", odds: "-35", mag: 3,
        good: "這次運氣站在你這邊——你補上了洞，發誓這是最後一次。",
        bad: "你借新的還舊的，洞只是換了個地方，變得更深。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "debt", value: -10 },
        { type: "stat.add", key: "faced_the_debt", value: 1 },
      ],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -12 },
        { type: "stat.add", key: "debt", value: 8 },
        { type: "stat.add", key: "family_strain", value: 1 },
      ],
    },
    scene: { bg: "home", sfx: "phone_ring" },
  },
  {
    id: "health_scare",
    require: { all: [{ flag: "leveraged_wipeout" }, { "<=": ["nerve", 55] }] },
    weight: 12,
    prompt: "半夜胸口悶了一下，過幾分鐘就好了。你躺著，沒有再睡著。",
    choices: [
      { id: "safe", label: "立刻停下來休養", odds: "+25", mag: 2,
        good: "你按下了暫停鍵。虛驚一場，但你記住了那個晚上的感覺。",
        bad: "就算停下來，有些帳身體已經先記上了。那台救護車還是來了。" },
      { id: "normal", label: "減量但不停", odds: "-5", mag: 2,
        good: "你放慢了，沒有放手。這一次，身體放過了你。",
        bad: "減了一半的量，換來的只是慢一點的崩潰。" },
      { id: "bold", label: "什麼都不改", odds: "-35", mag: 3,
        good: "你什麼都沒改，這次僥倖過關。但你自己也知道，那是僥倖。",
        bad: "救護車的聲音，是從你家樓下開始的。" },
    ],
    good: {
      effects: [{ type: "stat.add", key: "nerve", value: 6 }],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -15 },
        { type: "stat.add", key: "capital", value: -20 },
        { type: "stat.add", key: "health_debt", value: 2 },
      ],
    },
    scene: { bg: "hospital", sfx: "siren" },
  },
  {
    id: "family_blames_you",
    require: {
      all: [{ ">=": ["counter.family_strain", 2] }, { ">=": ["age", 35] }],
    },
    weight: 11,
    prompt: "過年的桌上，有人把當初那件事又提了一次，這次沒有笑。",
    choices: [
      { id: "safe", label: "道歉並改變", odds: "+20", mag: 2,
        good: "你低了頭，也真的改了。你們沒有和好如初，但至少又開始講話了。",
        bad: "你道了歉，對方卻覺得太遲了。那一年過年，桌上少了兩個人。" },
      { id: "normal", label: "解釋當初的理由", odds: "-5", mag: 2,
        good: "你把當初的難處講清楚，有人終於願意聽你把話說完。",
        bad: "你越解釋，聽起來越像藉口。那頓飯沒有吃完。" },
      { id: "bold", label: "堅持自己沒錯", odds: "-35", mag: 3,
        good: "你沒有退讓。這一次，他們反而尊重你的坦白。",
        bad: "你堅持你是對的。那一年過年，桌上少了兩個人。" },
    ],
    good: {
      effects: [{ type: "stat.add", key: "nerve", value: 10 }],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -12 },
        { type: "stat.add", key: "family_strain", value: 1 },
      ],
    },
    scene: { bg: "family_home", actor: "family" },
  },
  {
    id: "volunteer",
    require: { all: [{ ">=": ["age", 30] }, { ">=": ["nerve", 55] }] },
    weight: 6,
    prompt: "社區在募志工，時段剛好是你每週唯一空著的那個晚上。",
    choices: [
      { id: "safe", label: "捐點錢", odds: "+30", mag: 2,
        good: "你出了錢沒出時間，但那筆錢確實幫上了忙。",
        bad: "捐了錢就當交代過去，心裡那點空還是空著。" },
      { id: "normal", label: "偶爾去幫忙", odds: "+5", mag: 2,
        good: "你偶爾去。在那裡認識的人，跟你的工作完全沒有關係。這是好事。",
        bad: "你答應了偶爾，卻連偶爾都排不進行事曆。" },
      { id: "bold", label: "固定每週去", odds: "-20", mag: 3,
        good: "每週那個晚上，成了你一週裡最不像自己、卻也最像自己的時候。",
        bad: "你答應了太多事，最後兩邊都做不好。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "network", value: 3 },
        { type: "stat.add", key: "nerve", value: 6 },
        { type: "stat.add", key: "helped_others", value: 1 },
      ],
    },
    bad: {
      effects: [{ type: "stat.add", key: "nerve", value: -5 }],
    },
    scene: { bg: "community_center" },
  },
  {
    id: "hobby_years",
    require: { ">=": ["age", 26] },
    weight: 7,
    prompt: "你在櫃子深處翻到一樣東西，是很多年前你很喜歡的。",
    choices: [
      { id: "safe", label: "沒空", odds: "+15", mag: 1,
        good: "你嘴上說沒空，卻還是在睡前偷偷摸了幾回。有一件事你做的時候不會想到錢。",
        bad: "你想著沒空，卻先把裝備買了，想逼自己開始。它們在櫃子裡積了三年的灰。" },
      { id: "normal", label: "一週留兩小時", odds: "+10", mag: 2,
        good: "一週兩小時，剛好夠你想起自己為什麼曾經那麼喜歡它。",
        bad: "兩小時的約定，很快變成三週一次、一季一次。裝備買齊了，放著。" },
      { id: "bold", label: "認真投入", odds: "-15", mag: 3,
        good: "你一頭栽了進去。有一件事你做的時候，完全不會想到錢。",
        bad: "你買齊了所有裝備，熱情卻只撐了一個月。它們在櫃子裡放了三年。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "nerve", value: 8 },
        { type: "stat.add", key: "has_hobby", value: 1 },
      ],
    },
    bad: {
      effects: [{ type: "stat.add", key: "capital", value: -6 }],
    },
    scene: { bg: "home" },
  },
  {
    id: "move_back_home",
    require: { all: [{ ">=": ["age", 45] }, { "<=": ["capital", 150] }] },
    weight: 8,
    prompt: "房租又要漲了。老家那間空房其實一直留著。",
    choices: [
      { id: "safe", label: "搬回去住", odds: "+25", mag: 2,
        good: "你搬了回去。少了一些面子，多了一些現金，還有久違的一頓熱飯。",
        bad: "搬回去才發現，有些距離拉近了，反而更難。" },
      { id: "normal", label: "換小一點的房子", odds: "+5", mag: 2,
        good: "房子小了，日子卻鬆了。你睡得比以前踏實。",
        bad: "換了小房子，省下的錢卻補不上心裡那塊縮小的感覺。" },
      { id: "bold", label: "硬撐現在的生活", odds: "-30", mag: 3,
        good: "你賭這一年會好轉——結果真的等到一筆意外的進帳，撐住了門面。",
        bad: "你維持著別人看得見的那部分，代價是看不見的那部分。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "capital", value: 25 },
        { type: "stat.add", key: "savingsRate", value: 0.03 },
      ],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "capital", value: -15 },
        { type: "stat.add", key: "nerve", value: -6 },
      ],
    },
    scene: { bg: "family_home" },
  },
  {
    id: "funeral",
    require: { ">=": ["age", 44] },
    weight: 8,
    prompt: "訃聞來得突然。名字你認得，只是很多年沒見了。",
    choices: [
      { id: "safe", label: "到場致意", odds: "+20", mag: 1,
        good: "你只是去站了一會兒，卻在那天想清楚了一些一直想不清楚的事。",
        bad: "到了才發現沒人張羅，你默默墊了不少。回程路上，你想不起自己有沒有真的難過。" },
      { id: "normal", label: "幫忙處理後事", odds: "0", mag: 2,
        good: "你幫著跑前跑後，反而在忙亂裡想通了幾件事。",
        bad: "事情辦完之後，你才發現自己一直沒有真的難過過。" },
      { id: "bold", label: "全部一肩扛起", odds: "-20", mag: 3,
        good: "你把一切扛了下來。送走他的那天，你也和某個舊的自己告了別。",
        bad: "你把一切扛了下來，連帳單一起。事後你才發現，自己一直沒有真的難過過。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "nerve", value: 6 },
        { type: "stat.add", key: "cognition", value: 2 },
      ],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -10 },
        { type: "stat.add", key: "capital", value: -12 },
      ],
    },
    scene: { bg: "temple" },
  },
  {
    id: "sleepless_year",
    require: { all: [{ "<=": ["nerve", 60] }, { ">=": ["age", 30] }] },
    weight: 9,
    prompt: "躺下之後腦袋開始算數字。天亮的時候你還在算。",
    choices: [
      { id: "safe", label: "看醫生", odds: "+25", mag: 2,
        good: "醫生給的不只是藥。你重新睡得著了，世界的顏色回來了一點。",
        bad: "藥吃了，數字還在。半夜三點，你在手機上看著別人的帳戶截圖。" },
      { id: "normal", label: "換個作息", odds: "+5", mag: 2,
        good: "你把手機關在客廳。慢慢地，你重新睡得著了。",
        bad: "作息換了幾天就打回原形。半夜三點，你還在看別人的帳戶截圖。" },
      { id: "bold", label: "靠意志力撐", odds: "-30", mag: 3,
        good: "你硬撐著，某天竟然也就撐了過去，重新睡著了。",
        bad: "意志力撐不過凌晨三點。你又滑開手機，看著別人的帳戶截圖。" },
    ],
    good: {
      effects: [{ type: "stat.add", key: "nerve", value: 12 }],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -8 },
        { type: "stat.add", key: "insomnia", value: 1 },
      ],
    },
    scene: { bg: "bedroom_night" },
  },
  {
    id: "someone_else_made_it",
    require: { all: [{ ">=": ["age", 33] }, { ">=": ["network", 18] }] },
    weight: 10,
    prompt: "同期的那個人上了雜誌。你把整篇看完了。",
    choices: [
      { id: "safe", label: "真心替他高興", odds: "+20", mag: 2,
        good: "你是真心的。那份不酸的祝福，反而讓你看清了自己要的是什麼。",
        bad: "那句恭喜你說得心虛。後來你還是偷偷照著他的路砸了一筆——然後賠了。" },
      { id: "normal", label: "問他怎麼做到的", odds: "+5", mag: 2,
        good: "他講的東西你聽懂了，而且知道那不是運氣。",
        bad: "你問到了方法，卻學了個半調子就下場。那一筆學費不便宜。" },
      { id: "bold", label: "照他的路再走一次", odds: "-30", mag: 3,
        good: "你照著他的路重走了一遍，這次換你走通了。",
        bad: "你照做了，但那班車已經開走了。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "cognition", value: 3 },
        { type: "stat.add", key: "network", value: 2 },
      ],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "capital", value: -18 },
        { type: "stat.add", key: "nerve", value: -6 },
      ],
    },
    scene: { bg: "cafe", actor: "friend" },
  },
  {
    id: "retirement_math",
    require: { ">=": ["age", 52] },
    weight: 11,
    prompt: "你打開試算表，把剩下的年份、支出、和帳戶餘額打進去。",
    choices: [
      { id: "safe", label: "保守估算", odds: "+30", mag: 2,
        good: "你用最保守的假設算，數字竟然還是夠的。你關掉試算表，睡了個好覺。",
        bad: "連最省的活法都算不平。你把試算表關掉，卻關不掉那個數字。" },
      { id: "normal", label: "認真算一次", odds: "+5", mag: 2,
        good: "數字是夠的。你把試算表關掉，去睡了一個好覺。",
        bad: "你算了三次，三次的答案都是「不夠」。" },
      { id: "bold", label: "賭最後幾年翻倍", odds: "-35", mag: 4,
        good: "你賭最後幾年再衝一把——這次賭對了，帳面翻紅。",
        bad: "你把退休金押上去賭翻倍，結果替本來就不夠的數字，又挖了一個洞。" },
    ],
    good: {
      effects: [
        { type: "stat.add", key: "nerve", value: 10 },
        { type: "stat.add", key: "planned_ahead", value: 1 },
      ],
    },
    bad: {
      effects: [
        { type: "stat.add", key: "nerve", value: -10 },
        { type: "stat.add", key: "capital", value: -10 },
      ],
    },
    scene: { bg: "home_desk" },
  },
];
