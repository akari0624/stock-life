# 投資人生 · 架構設計

> 這份文件是實作的唯一依據。任何與它衝突的程式碼都算 bug。
> 修改設計請改這份文件，不要只改程式碼。

---

## 0. 一句話

一個文字擲骰的人生模擬器：你在一個有景氣循環的時代裡工作、累積本金與認知，
一輩子會遇到少數幾個真正改變命運的投資機會——而**你當時並不知道那是機會**。

參考來源：yakyulife（回合結構、隱藏特性、種子分享）、光榮三國志／太閤立志傳（時代大勢 +
小人物爬升）、大富翁（機會/命運卡、事件演出）。

---

## 1. 核心設計公式

```
結果 = 機會倍數 × 當時本金 × 你抱得住多久
```

這條乘法是整個遊戲的戲劇引擎。它天生會產生**錯位**：

- 22 歲遇到 10 倍機會，但只有 5 萬本金
- 45 歲有 800 萬本金，但遇到的只有 1.3 倍

玩家一輩子都在追這個錯位。「繼承遺產／中樂透／被裁員拿到一筆資遣費」之所以好玩，
因為它們是**唯一能瞬間修正錯位的外力**——這就是大富翁的機會/命運。

### 1.1 三種資本

一輩子只有少數幾次關鍵操作，所以其餘 40 個回合必須明確地在累積三種資本，
每一種在關鍵時刻決定一件事：

| 資本 | 由什麼累積 | 在關鍵時刻決定 |
|---|---|---|
| **本金** `capital` | 職業、收入、儲蓄率、運氣暴擊 | 你**能押多少** |
| **認知** `cognition` | 研究、經驗、被套牢的教訓 | 你**看得懂什麼**（見 1.2） |
| **人脈/資訊源** `network` | 同事、營業員、產業朋友、社群 | 機會**會不會找上你** |

沒有這三條，「系統主動提案」就退化成純抽卡。

### 1.2 認知門檻：真實倍數固定，訊號品質是能力的函數

**機會的真實結果由種子與時代決定並固定；玩家看到的描述取決於他的認知與人脈。**

同一個機會，三種玩家看到：

- 低認知：「同事說這檔穩賺，他表哥在裡面做」（雜訊極大，可能是地雷或詐騙）
- 中認知：「這家在做記憶體，聽說產業要回溫了」
- 高認知：「營收連三月雙位數成長、外資連買、本益比 12 倍，但客戶集中度偏高」

這一招同時解決三件事：讓「認知」成為可玩的機制而非一個數字；讓詐騙股成為對低認知
玩家的有效懲罰；讓同一份機會資料服務所有能力等級，內容量不用乘以三。

### 1.3 入場決策是倉位，不是 yes/no

若一輩子 5 次決策都是二元，決策空間只有 2⁵ = 32 種人生，太薄。
真正的旋鈕是**押幾成**——這也對應真實投資裡唯一重要的技能（position sizing）。

| 倉位 | 說明 |
|---|---|
| `light` | 一成本金，試水溫 |
| `normal` | 三成 |
| `heavy` | 幾乎全押 |
| `leveraged` | 借錢／融資，賠掉會傷及人生（負債、家庭事件） |

**已定案。** 入場決策為四檔倉位，不是 yes/no。

`leveraged` 是唯一會把損失外溢到人生層的選項：賠掉不只是本金歸零，還會產生負債、
並解鎖家庭與健康的負面事件鏈。這讓「全力一搏」在數學上與情感上都真的有代價。

---

## 2. 已定案的產品決策

| 項目 | 決定 |
|---|---|
| 核心迴圈 | 季初擲骰配點到能力；投資透過事件卡與機會提案處理 |
| 標的選擇 | **玩家不選標的**，系統主動提案 |
| 入場決策 | **四檔倉位** `light` / `normal` / `heavy` / `leveraged`，非 yes/no |
| 價格 | 無真實價格序列，只有相對倍數與時間窗 |
| 持倉 | **混合**：多數機會一次結算；`tier: "life"` 的機會進入逐年考驗流程 |
| 時代 | **兩種世界並存**：真實歷史模式 + 隨機生成模式，同一 `WorldGenerator` 介面 |
| 局長度 | **先做短局**（一年一回合，18→65 歲約 47 回合，10–20 分鐘），架構留長局 |
| 職業 | **事件驅動**（系統在你符合條件時把轉職當機會提案），保留進化到主動規劃 |
| UGC 表達力 | **宣告式條件樹**（and/or/not + 比較式），非沙箱腳本 |
| 認知訊號 | **三版選填**，只填一版時其他層級 fallback |
| 填空編輯器 | **現在不做**，但內容格式為它而設計；見 TODO.md |
| 內容包流通 | **純前端**匯入匯出；但邊界必須做到位，日後可進化成市集；見 TODO.md |
| 美術素材 | 現在無素材，全部走 `AssetResolver` + fallback 渲染 |
| 後端 | 現階段零後端，可部署為靜態站 |

---

## 3. 分層與依賴方向

依賴方向**嚴格單向**，箭頭不得反向，也不得跳層反向：

```
content ──► domain ◄── sim ──► presentation ──► ui ──► app
                │
                └─ domain 不 import 任何上層。零 React、零 DOM、零 IO。
```

實際落地為 pnpm workspace（見 §10.2），分層與套件邊界對齊：

```
packages/engine/            ← 零 react。dependencies 只有 zod。node 可獨立執行
  src/
    domain/                 純規則
      state/                GameState —— 內部結構，可自由重構
      facade/               ModStateView —— 對 UGC 的公開契約，有版本號
      rng/                  SeededRng —— 可注入的實例，非全域單例
      expr/                 條件樹求值器 + 效果套用器
      systems/              可插拔的規則系統
      turn/                 advance(state, command, rng) → { state, effects[] }
    content/
      schema/               zod schema（單一真相）→ 可匯出 JSON Schema
      loader/               解析、驗證、合併、指紋計算
      packs/core-tw/        官方內容包（走跟 mod 完全一樣的載入器）
    sim/                    引擎外殼：turn 排程、系統註冊表、無頭執行器

apps/web/                   ← React + Tailwind
  src/
    presentation/
      director/             演出時間軸播放器（skip / speed / replay）
      stage/                場景渲染（現在 CSS/文字，日後貼圖）
      assets/               AssetResolver（id → 素材，缺就 fallback）
      audio/                AudioBus + AudioResolver（無音檔亦可運作，見 §10.7）
    ui/                     React 元件，只讀 view model
    styles/                 globals.css 匯入 token（見 §10.3）+ cn()
    app/                    組裝、存檔、畫面狀態機
```

### 3.1 為什麼 domain 必須零依賴

yakyulife 的 `flow/phases.js` 直接 `import { card, choose, board } from '../ui/dom.js'`。
這一行讓它**不能無頭測試、不能批次跑平衡、不能重播、不能跳過動畫**。
我們絕不重複這個錯誤。這是本專案最重要的一條紀律。

---

## 4. 核心資料流

```
玩家輸入 (Command)
      │
      ▼
sim.dispatch(command)
      │
      ▼
domain.advance(state, command, rng) ──► { nextState, effects: Effect[] }
      │                                         │        純函式・同步・一次算完
      ├──► commandLog（存檔／重播）              │
      │                                         ▼
      │                        presentation.compile(effects) ──► Scene[]
      │                                         │
      │                                         ▼
      │                            director 依時間軸播放（可 skip / 加速）
      │                                         │
      └────────────────────────────────────────►▼
                                         ui 只是 director 當前狀態的投影
```

**關鍵：模擬瞬間完成，演出慢慢播。**

這一條同時免費給你四樣東西：

1. **事件動畫** —— 演出層完全獨立於邏輯層
2. **跳過／加速／自動播放** —— director 上的旋鈕，邏輯層不知情
3. **無頭批次模擬** —— 不載入 presentation，跑一萬局調平衡
4. **完整重播** —— `seed + contentFingerprint + commandLog` 三件套

對照 yakyulife：它的遊戲進度存在 UI 的 `onclick` callback 裡（`stepQ` + continuation
passing），所以上面四件事它一件都做不到。

### 4.1 這不是 Redux

`advance()` 是一個**純粹的可重播推進函式**，不是 Redux reducer。差異是實質的：

| | Redux | 本專案 |
|---|---|---|
| 目的 | React re-render 優化、devtools time-travel、middleware 生態 | 決定論重播、演出解耦、無頭跑分 |
| dispatch 結構 | 單一巨型 `switch` | 交給 `SystemRegistry`，各 system 處理自己關心的 command |
| Action 顆粒度 | UI 事件級 | **玩家決策級**（見 §4.2） |
| 狀態更新 | immutable | clone-then-mutate（見 §4.3） |
| undo / redo | 核心賣點 | **刻意不做**——不可逆是本遊戲的張力來源 |

Redux 那一套我們一項都不需要，別把它的包袱一起搬進來。

### 4.2 Command 顆粒度：玩家決策級

Command 只記錄**玩家做過的選擇**，不記錄 UI 互動：

```ts
type Command =
  | { type: 'allocateDice';    assignment: Record<string, number> }
  | { type: 'resolveEvent';    choice: 'safe' | 'normal' | 'bold' }
  | { type: 'takeOpportunity'; id: string; sizing: Sizing }
  | { type: 'declineOpportunity'; id: string }
  | { type: 'resolveTrial';    positionId: string; choice: string }
  | { type: 'advanceTurn' }
```

一局約 47 回合 × 每回合 2–4 個決策 ≈ **100–200 個 command**。
log 極小，重播成本可忽略。而且這個顆粒度**剛好等於分享碼要記錄的東西**。

滑鼠移動、面板展開、動畫播放進度——這些都不是 command，不進 log。

### 4.3 我們需要的純度只在函式邊界

**Redux 的 immutability 主要是為了 React 的引用相等（讓 memo 生效），不是為了正確性。**
本專案的 UI 是 director 的投影、整批更新，靠 `useSyncExternalStore` + 一個版本號就夠，
不需要細粒度引用相等。

所以純度只需要做在函式邊界：

```ts
function advance(state, command, rng) {
  const next = structuredClone(state)   // 邊界處複製一次
  // 內部直接 mutate next —— 好寫得多，不必手寫巢狀 spread
  return { nextState: next, effects }
}
```

- 「同輸入必產同輸出」成立 → 重播與 golden test 完全有效
- 一局 100–200 次 clone，state 又不大，效能不是問題
- 省掉 immer 依賴，也省掉手寫巢狀 immutable 更新的痛苦

**紀律**：`advance()` 內部可以 mutate `next`，但**絕不可 mutate 傳入的 `state`**。
這條要有測試守著（傳入前後做深度比較）。

---

## 5. 決定論

### 5.1 種子必須綁內容指紋

UGC 一開放，「同種子＝同人生」就會壞：A 傳種子給 B，B 多載入 50 張卡，抽卡序列就不同。

```
分享碼 = base36(contentFingerprint) + "." + base36(seed)
contentFingerprint = hash(已載入 packs 的 "id@version" 排序後串接)
```

載入時比對不上就明確告知「此種子需要 core-tw v1.0 + xxx v2.1」。
**這必須從第一天就進種子編碼格式**，事後補等於要求所有人重新分享。

### 5.2 RNG 是注入的實例，而且要分流

```ts
class SeededRng {
  constructor(seed: string)
  stream(id: string): RngStream   // 每個用途一條獨立子序列
}
```

`SeededRng` 由 sim 建立並**顯式傳進 reducer**。domain 內部拿不到全域亂數。

**分流的理由**：不同系統用不同子序列（`stream('events')`、`stream('era')`、
`stream('career')`），這樣日後新增一個系統時，不會把既有系統的隨機序列往後推、
讓所有舊種子失效。這是很多專案吃過的苦。

### 5.3 強制紀律（用 lint 擋，不靠自律）

ESLint 規則禁止在 `domain/`、`sim/`、`content/` 出現：

- `Math.random`
- `Date.now`、`new Date()`
- `import` 任何來自 `presentation/`、`ui/`、`app/` 的東西
- 直接讀寫 `window`、`document`、`localStorage`

React 19 + React Compiler 已啟用，render 會重複執行。若隨機出現在 render path，
同一種子會跑出不同人生。這條 lint 是保命用的。

### 5.4 Golden test

`tests/golden/` 存放 `(seed, contentFingerprint, commandLog) → 最終狀態摘要` 的快照。
任何改動只要動到隨機序列，golden test 就會紅。這是唯一能長期守住決定論的方法。

建議加入 `vitest` 作為 devDependency。目前 `package.json` 沒有測試框架。

---

## 6. UGC 契約

### 6.1 ModStateView —— 對 mod 作者的公開 API

**絕對不能讓 mod 直接讀內部狀態。** 若 mod 寫得出 `state.love.caught > 0`，
你就永遠不能重構狀態結構——改一個欄位名，全世界的內容包同時壞掉。

中間必須有一層**穩定的、扁平的、有版本的白名單**：

```ts
// domain/facade/ModStateView.ts
type FacadePath =
  | 'age' | 'year' | 'stage'
  | 'capital' | 'income' | 'savingsRate' | 'debt'
  | 'cognition' | 'network' | 'nerve' | 'time'
  | 'career.id' | 'career.industry' | 'career.rank'
  | 'era.phase' | 'era.themes'
  | 'family.status' | 'family.kids'
  | 'position.count' | 'position.worstDrawdown'
  | `flag.${string}`
  | `counter.${string}`
```

- 內部愛怎麼重構就怎麼重構，只要維持這層對映。
- 這層介面該像 API 一樣管版本（`facadeVersion`），不該像資料結構一樣隨手改。
- **這層也剛好是填空編輯器的欄位來源**——編輯器的下拉選單直接由它產生，
  不用維護第二份清單。
- 每個 `GameSystem` 可以貢獻自己的 facade 欄位（`facadeFields()`），
  所以新增系統會自動擴充 mod 能用的條件，不需手動同步。

### 6.2 條件樹 (Expr)

```json
{ "all": [
    { ">=": ["age", 30] },
    { ">=": ["capital", 5000000] },
    { "==": ["career.industry", "tech"] },
    { "not": { "flag": "burned_by_2000_bubble" } }
]}
```

- 運算子集合固定：`all` `any` `not` `==` `!=` `>` `>=` `<` `<=` `in` `flag` `chance`
- 左側 path 必須在 `ModStateView` 白名單內
- **驗證發生在載入時，不是執行時**。不認的 path 直接拒載並指出位置，
  絕不允許遊戲中途炸掉。
- ⚠️ **行號需要額外工作**：沒有任何驗證庫給得出行號。zod／ajv 只給結構路徑
  （`["events", 3, "require"]`）。要指到原始檔的行號，必須用會記錄字元位置的
  JSON parser（CST／JSONC 類）解析原始文字，再把結構路徑對映回位置。
  這是獨立於驗證庫的一小塊工作，且**對未來的填空編輯器是必需品**（表單要能
  高亮出錯欄位）。第一版可先只給結構路徑，但介面要留位置欄位。
- `chance` 必須從注入的 rng stream 取值，不可自帶亂數

### 6.3 效果 (Effect) 分兩種

這個區分是「日後補美術」的關鍵：

```ts
type Effect = StateEffect | SceneHint

// 對狀態的變更（已被 reducer 套用；列出來是為了讓演出知道哪個數字跳了多少）
type StateEffect =
  | { type: 'stat.add';      key: string; value: number }
  | { type: 'capital.mul';   value: number }
  | { type: 'flag.set';      key: string }
  | { type: 'trait.grant';   id: string }
  | { type: 'position.open'; opportunityId: string; sizing: Sizing }
  | { type: 'event.trigger'; eventId: string }

// 對演出的提示（純粹給 director，不影響任何狀態）
type SceneHint =
  | { type: 'scene.bg';    id: string }
  | { type: 'scene.actor'; id: string; emote?: string; at?: 'left'|'right' }
  | { type: 'scene.say';   actor: string; text: string }
  | { type: 'scene.sfx';   id: string; priority?: 'high'|'normal'; dedupeMs?: number } // §10.7
  | { type: 'scene.bgm';   id: string; fadeMs?: number }                              // §10.7
  | { type: 'scene.fx';    id: string }   // 崩盤紅光、開香檳…
```

**mod 作者填的是 SceneHint 的 id。素材不存在時 `AssetResolver` 回傳 fallback**
（角色 → 名字色塊；背景 → 漸層；SFX → 靜音；FX → CSS 動畫）。
日後把 PNG／Spine／音檔塞進 manifest，同一份內容包立刻變成大富翁式演出，
domain 一行都不用改。

### 6.4 內容包 manifest

```json
{
  "id": "core-tw",
  "version": "1.0.0",
  "engineApi": "^1",
  "facadeVersion": 1,
  "provides": {
    "events": 120, "opportunities": 24,
    "careers": 18, "traits": 30,
    "worldGenerators": ["tw-history", "random"]
  },
  "requires": [],
  "assets": { "actors": {}, "bg": {}, "sfx": {} }
}
```

- `engineApi` / `facadeVersion` 不相容就**拒絕載入並說明原因**
- **官方內容包走跟 mod 完全一樣的載入器**（dogfooding）。
  這樣結構上就不可能出現「官方做得到但 mod 做不到」的事。

---

## 7. 主要資料形狀

### 7.1 Opportunity —— 本遊戲的核心物件

```json
{
  "id": "mem_supercycle_a",
  "tier": "life",
  "window": { "eraPhase": ["boom", "mania"], "themes": ["memory"] },
  "require": { "all": [ { ">=": ["cognition", 30] } ] },
  "sourcedBy": ["colleague", "broker", "forum"],

  "truth": {
    "multiple": [6, 12],
    "years": [2, 4],
    "ruinChance": 15
  },

  "signal": {
    "low":  { "text": "同事說這檔穩賺，他表哥在裡面做", "reveal": [] },
    "mid":  { "text": "做記憶體的，聽說產業要回溫了", "reveal": ["theme"] },
    "high": { "text": "營收連三月雙位數成長、外資連買、本益比 12 倍，但客戶集中度偏高",
              "reveal": ["theme", "valuation", "risk"] }
  },

  "sizing": ["light", "normal", "heavy", "leveraged"],
  "trials": ["drawdown_50", "triple_temptation", "family_emergency"],
  "scene": { "bg": "office_night", "actor": "colleague_a", "sfx": "phone_ring" }
}
```

- `truth` **玩家永遠看不到**，由種子＋時代決定
- `signal` 三版選填；只填一版時其他層級 fallback 到已填的那版
- `tier: "life"` 才會走 `trials` 逐年考驗；`normal` 一次結算
- `tier` 是**資料欄位而非硬編碼**，所以 mod 作者做得出自己的人生級機會

### 7.2 Event

沿用 yakyulife 已驗證有效的「三檔風險」結構，但條件與效果換成條件樹：

```json
{
  "id": "overtime_crunch",
  "require": { "==": ["career.industry", "tech"] },
  "weight": 10,
  "prompt": "晚上九點，主管還在。他剛剛經過你桌邊兩次，但什麼都沒說。",
  "choices": [
    { "id": "safe",   "label": "準時下班",  "odds": "+20", "mag": 1 },
    { "id": "normal", "label": "配合加班",  "odds": "0",   "mag": 2 },
    { "id": "bold",   "label": "拼命表現",  "odds": "-15", "mag": 3 }
  ],
  "good": { "text": "…", "effects": [ { "type": "stat.add", "key": "income", "value": 2 } ] },
  "bad":  { "text": "…", "effects": [ { "type": "stat.add", "key": "time",   "value": -2 } ] },
  "scene": { "bg": "office", "sfx": "keyboard" }
}
```

**一個事件演兩次，中間夾著玩家的選擇：**

| 時機 | 發出什麼 | 玩家看到 |
|---|---|---|
| **提出**（抽到／被 `event.trigger` 叫到） | `scene.bg`、`scene.actor`、`scene.say(prompt)` | 情境。**這是他做決定的唯一依據** |
| **結算**（`resolveEvent` 之後） | `scene.say(good.text \| bad.text)`、`scene.sfx`、`scene.fx` | 結果 |

⚠️ `prompt` 不是可有可無的裝飾：沒有它，玩家看到的就只有三個動詞加三個百分比，
不知道自己在決定什麼。**結局文字取代不了它**——結局是選完之後才看得到的東西。

（第一版 `prompt` 在 schema 上是選填，只為了讓既有內容包能逐步補齊；
`core-tw` 補完後就收成必填。）

### 7.3 Career —— 一張有向圖

```json
{
  "nodes": [
    { "id": "engineer_junior", "industry": "tech", "rank": 1, "income": [45, 65] }
  ],
  "edges": [
    { "from": "engineer_junior", "to": "engineer_senior",
      "require": { ">=": ["age", 26] },
      "surfacedAs": "opportunity" }
  ]
}
```

**「事件驅動」與「太閤式主動規劃」不衝突，而且擴充性幾乎免費**：
邊上的 `surfacedAs: "opportunity"` 表示目前系統會在你符合條件時把這條邊當成機會提案給你。
日後要進化成主動規劃，只是多開一個「讓玩家瀏覽這張圖」的 UI——**圖本身完全不用改**。
同一份資料，兩種玩法。

### 7.4 WorldGenerator —— 註冊制插件

```ts
interface WorldGenerator {
  id: string
  generate(rng: RngStream, opts: WorldOptions): Timeline
}
```

- `tw-history`：真實歷史骨架（1990 萬點 → 2000 網路泡沫 → 2008 海嘯 → 2020 疫情 → 2025 AI）
- `random`：程序生成（約 8–12 年一次大崩、5–8 年一波主題）
- mod 可註冊第三個（「1980 日本泡沫」、「美股百年」）

標的名稱一律走內容包的字串表，官方 `core-tw` 採「暗示但不指名」風格
（護國神山、某記憶體大廠），法律與觀感風險低而共鳴不減。

### 7.5 Trait —— 行為計數器 + 門檻

**這是 yakyulife 最該抄的機制，也是本遊戲留住玩家的核心。**

關鍵不是「有幾個特性」，而是：**特性是玩家行為的函數，不是隨機掉落的。**
系統偷偷觀察你的打法，然後在某一年跳出來說「我看見你了」。

```json
{
  "id": "diamond_hands",
  "name": "鑽石手",
  "tone": "gold",
  "require": { "all": [
    { ">=": ["counter.held_through_drawdown", 3] },
    { "<=": ["counter.panic_sold", 0] }
  ]},
  "exclude": ["paper_hands"],
  "grants": [ { "type": "stat.add", "key": "nerve", "value": 10 } ],
  "text": "帳面腰斬三次，你一股都沒賣。市場的噪音再也動不了你——**持倉考驗的失敗率大幅降低**。",
  "scene": { "fx": "trait_unlock", "sfx": "chime" }
}
```

實作要求：

- **計數器是一等公民**：`counter.*` 由各 system 透過 effect 累加，
  並整批曝露在 `ModStateView` 白名單裡（`counter.${string}`），
  所以 **mod 作者能用官方計數器寫出自己的特性**
- **門檻檢查的時機是資料驅動的**：`checkOn: ['turn.end', 'position.close', 'event.resolve']`，
  不硬編碼在流程裡（yakyulife 是硬編碼在 `checkTraitsMid()` 裡）
- **互斥與移除**：`exclude` 讓對立人格不會同時成立；被覆蓋的特性進 `removed[]`，
  結算畫面畫刪除線（yakyulife 這個小設計很有效，照抄）
- 負面特性也走同一套（`tone: 'bad'`），不需要另一條路徑

**投資人格範例方向**：存股仔、當沖魔人、鑽石手、韭菜、逆勢狙擊手、
定期定額修行僧、槓桿賭徒、資訊焦慮症、後見之明大師。

---

## 8. 系統註冊表

```ts
interface GameSystem {
  id: string
  order: number                        // turn 內的結算順序
  onPhase?(phase: Phase, ctx: SystemCtx): void
  facadeFields?(): FacadeField[]       // 貢獻給 mod 的白名單欄位
}
// ctx 提供 state、rng.stream(this.id)、emit(effect)
```

日後要加期權、房地產、加密貨幣、稅制、貸款 = **新增一個 system + 一個內容包，引擎不動**。
這是「新機制可擴充」的具體交付方式。

---

## 9. 短局 → 長局

`Calendar` 服務把「回合」與「時間」解耦：

- 短局：`granularity: 'year'`
- 長局：改 `'quarter'`，內容不用改

**紀律：所有內容的觸發條件一律寫 `age` / `year` / `stage`，永遠不寫 `turnIndex`。**

存檔格式從第一天就帶 `schemaVersion` 與 migration 掛勾，
否則長局的存檔續玩需求會逼你放棄舊存檔。

---

## 10. Tech Stack（已定案）

### 10.1 決定表

| 領域 | 決定 | 版本 |
|---|---|---|
| Repo | **pnpm workspace + Turborepo** | turbo 最新 |
| 建置 | Vite（apps/web）、tsc（packages/engine） | vite 8 |
| 語言 | TypeScript | 6.0 |
| UI | React + React Compiler（已啟用） | 19.2 |
| CSS | **Tailwind v4 全面採用** + 三層 design token pipeline | 4.3 |
| Token 生成 | **style-dictionary**（devDep，DTCG → CSS + `@theme`） | 5.x |
| Class 合併 | `clsx` + `tailwind-merge`（`cn()`，見 §10.3） | — |
| 動畫 | **自建 director + Web Animations API**，零依賴 | — |
| Schema | **zod**（授權真相）→ `toJSONSchema()` 匯出 | 4.4.3 |
| 測試 | **vitest**，兩個 project（node / browser） | 4.1 |
| Router | **無** —— 畫面是狀態機，種子分享用 `URLSearchParams` | — |
| 狀態管理 | **無** —— sim 持有，UI 用 `useSyncExternalStore` | — |
| immer | **無** —— 改用 clone-then-mutate（見 §4.3），不需要 immutability | — |

`packages/engine` 的 runtime dependencies 只有 `zod`。`apps/web` 只多 react / react-dom。

### 10.2 Monorepo 佈局

```
stock-life/
  pnpm-workspace.yaml
  turbo.json
  packages/engine/     ← dependencies: { zod }。沒有 react
  packages/tokens/     ← DTCG token JSON + style-dictionary build。零 runtime 依賴
  apps/web/            ← dependencies: { react, react-dom, clsx, tailwind-merge,
                                         @stock-life/engine, @stock-life/tokens }
```

**這是 §3.1 紀律的物理落實**：`packages/engine/package.json` 不列 react，
pnpm 嚴格 node_modules 讓「從 domain import UI」成為**編譯期錯誤**，
而不是可以用一行 `eslint-disable` 穿過的 lint 警告。

Turborepo 負責：`build` 的 engine → web 依賴順序、test／lint 快取、
以及把 TODO #8 的無頭平衡跑分獨立成 `test:balance` task。

`packages/tokens` 從第一天就獨立成 package——不是為了「未來可能有第二個消費端」，
而是因為它有自己的 build step（style-dictionary）與自己的 devDependencies，
塞在 `apps/web` 裡會讓 web 的 build 綁上一個與 React 無關的產生器。
Turborepo 負責 `tokens → web` 的 build 順序。

### 10.3 Design Token Pipeline（三層）

架構參考 `pcsc/f2e-uniopen` 的 `@pcsc/tailwind-config`（見 §10.6 的差異說明）。
三層用**前綴**表達，命名本身就昭示層級：

| 層 | 前綴 | 內容 | 進 Tailwind utility？ |
|---|---|---|---|
| Tier 1 · global | `gt-` | 原色與原始尺寸（`gt-green-500`） | ❌ **不進** |
| Tier 2 · alias | `at-` | 語意（`at-surface-raised`、`at-loss`） | ✅ 進 |
| Tier 3 · component | `ct-` | 元件專屬（`ct-stage-actor_shadow`） | ✅ 進 |

**命名規則（兩個分隔符，各一種語意）：**

| 字元 | 語意 | 例 |
|---|---|---|
| `-` | **層級**分隔符 | `ct-button_filled-main-default` = `ct` › `button_filled` › `main` › `default` |
| `_` | 同一層級內的**複合詞**分隔符 | `button_filled`、`actor_shadow`、`text_muted` |

⚠️ **token JSON 的 key 絕對不能含 `-`**。因為 `-` 恆為層級分隔符，
`{"at": {"text-muted": …}}` 產出的名稱會與兩層 nesting 完全無法區分，
命名就失去機器可逆性。此規則必須進 schema 驗證（見 §10.3 的驗證項）。

#### 資料流

```
packages/tokens/src/*.tokens.json      DTCG 格式（$type/$value）· 唯一真相
        │
        ▼ style-dictionary（單一 build，多個 platform 輸出）
        ├──► tokens.css        :root { --gt-* --at-* --ct-* }        全部三層
        └──► theme.css         @theme { --color-at-* --color-ct-* }  只有 at + ct
        │
        ▼ apps/web/src/styles/globals.css
    @import "tailwindcss";
    @import "@stock-life/tokens/tokens.css";
    @import "@stock-life/tokens/theme.css";
```

**兩個輸出都由同一次 style-dictionary build 產生**，各是一個 custom format
消費同一份 token AST。**不做「先生成 CSS 再用字串轉換成 class 表」的後處理**（§10.6 ④）。

#### 命名規則讓轉換層整個消失

DTCG 的 nesting 經 style-dictionary 預設就是用 `-` 串接，而 `_` 原樣保留。
所以層級與複合詞的區分**不需要任何 custom name transform**：

```json
{ "ct": { "button_filled": { "main": { "default": { "$type": "color", "$value": "…" } } } } }
```
→ `--ct-button_filled-main-default`（零設定）

`theme.css` 的 format 也只是加前綴，沒有跳脫、沒有字串重組：

```css
@theme {
  --color-at-surface-raised: var(--at-surface-raised);
  --color-ct-stage-actor_shadow: var(--ct-stage-actor_shadow);
}
```

於是整條 pipeline 唯一的邏輯就是 **prefix filter 掉 `gt`**。
參考專案的 126 行腳本與 30+ 項複合詞白名單，是選用 `/` 分隔的必然代價（§10.6 ④）。

#### 為什麼 `gt/` 不進 `@theme`

Tailwind 的 utility 表面就等於「允許使用的層級」。`bg-at-surface-raised` 存在，
而 `bg-gt-green-500` **根本不存在**——想繞過語意層直接用原色，語法上就辦不到。
於是「用 Tailwind」與「遵守 token 階層」變成同一件事，靠 API 表面強制，
不靠 code review 提醒。實作上就是 `theme.css` 的 format 加一行 prefix filter。

#### 主題

主題切換**只覆寫 alias 層**，global 不動：

```css
[data-theme="scoreboard"] {
  --at-surface-base: var(--gt-green-950);
  --at-accent:       var(--gt-gold-400);
}
```

Tailwind utility 因為指向 `var(--at-*)`，會自動跟著換色。
**與 UGC 對齊**：主題既然只是一組 alias 變數的覆寫，日後 mod 就能發佈主題包。

#### 用 `-` 而非 `/` 換到的三件事

1. **alpha 修飾符可用**：`bg-at-loss/20` 正常運作。`/` 分隔會與 Tailwind 的
   `bg-{color}/{opacity}` 語法衝突——參考專案的 `gt/black-opacity/*`、
   `gt/white-opacity/*` 兩組原色，應該就是這個限制的補償產物。
2. **零轉換層**（見上一節）。
3. **`@theme` 不需跳脫**：`/` 在 CSS 識別字裡要寫成 `\/`。

**代價**：`ct-button_filled-main-default` 比 `ct/button-filled/main/default`
難掃視——`/` 版本視覺上會自動分組。這是明知的取捨。

**S12 要驗一件事**：Tailwind 的 `_` → 空白轉換規則只作用於方括號裡的
arbitrary value（`grid-cols-[1fr_2fr]`），具名 theme key 裡的 `_` 應該原樣保留。
用一個真的含 `_` 的 class 實測確認，不要假設——靜默失敗會很難查。

#### `cn()` 必須擴充 tailwind-merge ⭐

```ts
// apps/web/src/styles/cn.ts
const twMerge = extendTailwindMerge({
  extend: {
    theme: { colors: Object.keys(exposedTokens) },
    classGroups: { "font-size": typeRoles.map(r => `text-${r}`) },
  },
})
export const cn = (...i: ClassValue[]) => twMerge(clsx(i))
```

**漏掉這步是個真實的坑**：自訂 color / fontSize key 沒註冊進 tailwind-merge，
`cn('text-at-text-primary', 'text-at-text-muted')` 不會正確去重，兩個 class
都會留著，最終顏色由 CSS 順序決定而不是由呼叫順序決定。

v4 沒有 `tailwind.config.ts` 物件可以 `Object.keys()`，所以 key 清單必須
**由 token build 一併產出**（`tokens.keys.ts`），`cn.ts` 從那裡讀。

#### `ct/` 層保持最小

`ct/` 只給少數複雜到需要的元件——主要是 `presentation/stage/`。
**不預先生成大批 component token**（參考專案有 302 個，那是多 app 電商的規模）。
`presentation/stage/` 也是全專案唯一允許手寫原生 CSS 的地方。

### 10.4 舞台層的例外（無論 CSS 方案為何都成立）

`presentation/stage/` 的視覺值是**執行期由 director 算出**的（角色位置、
fallback 色塊、崩盤紅光強度、數字跳動進度）。utility class 表達不了動態值，
所以這一層一律走 **CSS 自訂屬性 + inline style 注入**：

```tsx
<div className="stage-actor" style={{ '--c-actor-x': `${x}px`, '--c-actor-opacity': o }} />
```

director 只寫 CSS 變數，CSS 決定怎麼呈現。這讓「換美術素材」與「換演出風格」
都不需要動 TypeScript。

### 10.5 Typographic 機制（待建，先鎖住約束）

採 **semantic type roles** 而非裸尺寸：`display / title / body / caption / numeric`。
每個 role 綁定 `fontSize + lineHeight + fontWeight` 三件一組，不是裸尺寸值。

#### Typography 也必須走 §10.3 的同一條 pipeline

**不要手寫在樣式檔裡。** 參考專案的 color 有 style-dictionary 守著所以乾乾淨淨，
但 `fontSize` 是手寫的，43 個 key 裡至少 8 個已經腐化：

| 症狀 | 實例 |
|---|---|
| 拼錯 | `H5.mudium`（vs `H5.medium`）、`Caption.regualr`（vs `Caption.regular`） |
| 大小寫重複 | `small.medium` / `Small.medium`、`button.xxlg` / `Button.xxlg` |
| 命名不一致 | `H1.Bold` vs `H2.bold` |

沒有 schema 驗證的 token 一定會長出錯字與重複。typography 進 token JSON，
跟 color 共用同一次 build 與同一套驗證。

三個繁體中文特有的坑，必須寫進 token 設計：

1. **行高**：中文沒有 x-height，body 需要 `1.7–1.8`（拉丁文 1.5 就夠）。
   本遊戲以文字流為主體，行高錯了整體閱讀感直接毀掉。
2. **字重層級不可靠**：繁中字體多半只有 Regular / Bold 兩級，沒有 Medium／SemiBold。
   所以視覺層級**不能靠字重建立**，要靠尺寸、顏色、字間距、留白。
   這與拉丁文排版直覺相反，是最常見的中文介面失誤。
3. **Webfont 體積 vs UGC**：Noto Sans TC 完整字集數 MB，對零後端靜態部署是實際負擔。
   選項是（a）系統字體 stack（0 KB，yakyulife 的做法）、（b）webfont + 用字 subset、
   （c）動態 subset。**注意衝突**：UGC 內容包會帶進你事前不知道的字，
   subset 策略與 UGC 天生矛盾。決定字體時必須連這條一起想。

**`numeric` role 必須是 tabular**：`font-variant-numeric: tabular-nums`。
演出裡有「資產數字跳動」，非等寬數字在 count-up 過程中會左右抖動，
這是免費就能避免的廉價瑕疵。

### 10.6 與參考專案（`@pcsc/tailwind-config`）的差異

架構承襲自 `pcsc/f2e-uniopen/packages/tailwind-config`。**照抄的部分**：
DTCG token JSON 當唯一真相、style-dictionary 生成、`gt`/`at`/`ct` 三層前綴、
生成檔標記 `Do not edit directly`、`cn()` 擴充 tailwind-merge。

**刻意偏離的五處**，每一處都有理由：

| # | 參考專案 | 本專案 | 理由 |
|---|---|---|---|
| ① | gt/at/ct **全部**進 `theme.extend.colors` | **只有 at + ct** | 能繞過的地方就會被繞過。對方有設計系統團隊與 code review 撐著；本專案沒有，約束必須靠工具而非自律 |
| ② | `fontSize` 手寫在 config 裡 | typography **進 token pipeline** | 對方 43 個 key 已腐化出錯字與大小寫重複（§10.5）。沒有驗證的 token 必然腐化 |
| ③ | `/` 當層級分隔、`-` 當複合詞分隔（同字元兩種語意），另做 `black-opacity` 原色補償 alpha | **`-` 當層級、`_` 當複合詞**（兩個字元、各一種語意） | 一個字元兩種語意 → 機器無法區分 → 必須人工維護白名單（見 ④）。分開之後歧義消失，且拿回 `/50` 修飾符、免去 CSS 跳脫 |
| ④ | CSS → 字串後處理生成 class 表（126 行，寫死 header 行數 + 30+ 項複合詞白名單） | **零轉換層**——DTCG nesting 經 style-dictionary 預設就是 `-` 串接、`_` 原樣保留 | 那 126 行與白名單是 ③ 的必然後果，不是獨立的實作缺陷。改掉分隔符，整段程式碼就不需要存在 |
| ⑤ | 302 個 `ct` token | `ct` **保持最小**，只給 `presentation/stage/` | 對方是多 app 電商平台；本專案是單一文字遊戲。不為不存在的元件鋪路 |

**版本落差**：參考專案是 Tailwind **v3**（`^3.4.17`、`tailwind.config.ts`、
`theme.extend.colors`）。本專案是 **v4**（`@theme` directive、無 config 檔），
所以 pipeline 的第二個輸出是 CSS `@theme` 區塊而非 JS 物件，
且 `cn()` 的 key 清單必須由 build 一併產出（§10.3）。

---

### 10.7 音效架構

現階段**沒有任何音檔**，但整套排程、匯流排、節流、fallback 都要先做好，
日後只需把檔案填進 manifest。

#### 唯一入口：`playSound(actionId, opts?)`

音效只有一個 API，**所有呼叫者共用它**——包含但不限於：director 的演出音效、
按鈕 click、選項 selected、畫面過場、面板展開、數字結算。

```ts
type Bus = 'bgm' | 'sfx' | 'ui'
type Priority = 'high' | 'normal'

function playSound(
  actionId: ActionId,                                    // 型別化 union，見下
  opts?: { when?: number; bus?: Bus; priority?: Priority; dedupeMs?: number },
): void
```

| 呼叫者 | 寫法 | 語意 |
|---|---|---|
| UI 元件 | `playSound('ui_option_select')` | 立即播、`ui` bus |
| director | `playSound('event_crash', { when, bus: 'sfx', priority: 'high' })` | 排程播、對齊畫面節拍 |

**單一 choke point 是重點**：找不到檔案就靜音、節流、去重、靜音狀態、
加速/跳過策略——全部只有一個地方需要正確。

**兩條路徑有一處行為必須分開**（由有沒有 `when` 區分）：

| | 互動音效（無 `when`） | 演出音效（有 `when`） |
|---|---|---|
| 受 `rate(n)` 影響 | **不受** | 受（見下方表格） |
| 被 `finish()` / 跳過取消 | **不取消** | **取消** |

理由：使用者按按鈕的回饋音不該因為 director 正在快轉就消失——那會讓介面
感覺壞掉。反之，跳過演出時排程中的演出音效必須清掉，否則是一陣噪音。

#### Action id 的兩個來源

| 類型 | 來源 | 可被 mod 覆寫？ | 例 |
|---|---|---|---|
| 互動音效 | **app 的靜態 manifest** | ❌ 介面音不屬於遊戲內容 | `ui_click`、`ui_option_select`、`ui_transition` |
| 演出音效 | **內容包的 `assets.sfx`**（§6.4） | ✅ mod 作者要能為自己的事件配音 | `event_crash`、`dice_roll`、`trait_unlock` |

兩者經同一個 `AudioResolver` 解析，只是來源合併。

#### `ActionId` 必須是型別化的 union

`playSound()` 能從任何地方呼叫，代價是**呼叫點散落、難以盤點**。
不加約束的話，三個月後沒人知道存在哪些 id，然後開始長出 `ui_clik` 這種錯字——
與 §10.5 那份 `fontSize` 長出 `H5.mudium` 是同一種腐化。

所以 `ActionId` 由 manifest 產生型別，`playSound('clik')` 是**編譯期錯誤**，
不是執行期靜默失敗。內容包來的 id 無法靜態檢查，改在**載入時**驗證
（未知 id 只警告不拒載——音效缺失不該讓內容包整包失效）。

#### 三條獨立的匯流排

把 BGM 和 SFX 混在一起是這類系統最常見的錯誤——生命週期、並發數、
音量控制、持久化偏好全都不同。

| Bus | 內容 | 生命週期 | 並發 |
|---|---|---|---|
| `bgm` | 長循環背景樂（依人生階段／時代 phase 切換） | 跨場景存活，切換時交叉淡入淡出 | 同時只有 1 |
| `sfx` | 演出音效（擲骰、翻牌、崩盤、成交、特性解鎖） | fire-and-forget | 多個並發，需節流 |
| `ui` | 介面音（按鈕、切換） | 立即 | 多個並發 |

每條 bus 一個 `GainNode`，音量與靜音是改 gain，不是逐一操作 source。

#### 用 Web Audio API，不用 `<audio>` 元素

理由與 §10.1 選 WAAPI 做視覺動態完全平行：

- `AudioContext` + 預先 decode 的 `AudioBuffer` → `source.start(when)` 是
  **取樣級精確排程**，能跟 director 的邏輯時間軸對齊
- `<audio>` 元素的播放延遲不可預測，且大量並發會失控
- 音量／靜音／淡入淡出走 `GainNode`，天生可組合

#### ⚠️ Autoplay 政策是頭號坑

瀏覽器在使用者手勢之前不允許播放音訊，`AudioContext` 會停在 `suspended`。
**後果極具欺騙性**：開發時你點過畫面所以一切正常，新訪客進來完全沒聲音，
而且**不會拋任何錯誤**。

必須做到：

- 首次使用者手勢時呼叫 `audioContext.resume()`
- 標題頁的「開始人生」按鈕天然就是那個手勢——把 unlock 綁在那裡
- 仍要有獨立的靜音／取消靜音控制，同時作為 unlock 的備援路徑
- `context.state === 'suspended'` 時，UI 要**明確顯示「點一下開啟音效」**，
  不要假裝在播

#### 跳過與加速時聲音怎麼辦

director 有 `rate(n)` 與 `finish()`（§4）。**聲音不能跟著變速**——4× 音高
聽起來就是壞掉。規則必須先定，事後補會很痛：

**只作用於排程音效（有 `when`）。`ui` bus 完全不受下表影響。**

| director 狀態 | `bgm` | `sfx`（排程） | `ui`（互動） |
|---|---|---|---|
| 正常播放 | 正常 | 照排程播 | 立即播 |
| `rate(n)` 任何倍率 | 正常速度、不變調 | **靠 debounce 自然稀釋**（見下） | 不受影響 |
| `finish()` / 跳過 | 正常 | **取消排程中的 `normal`**；`high` 可存活（見下） | 不受影響 |
| `seek()` 往回 | 正常 | 不重播（避免回捲時的音爆） | 不受影響 |

#### Debounce 取代了「按倍率過濾」

原本這裡有一條「`rate > 2` 只播 `priority: 'high'`」的規則，**已刪除**。
理由：加速時同樣的事件本來就變 n 倍密，一個 leading-edge 的時間窗過濾器
天然就把它們稀釋掉——不需要另外維護一份「哪些音效算重要」的人工分類表。
一個機制取代一套分類。

**必須是 leading-edge，不是 trailing：**

```
leading  ── 立刻發聲，然後在 dedupeMs 內抑制同 id 的重複   ✅
trailing ── 等安靜了才發聲                                 ❌ click 音會遲到，手感壞掉
```

「debounce」一般用法多指 trailing。音效要的是前者；方向搞反就是延遲感。

- 去重是 **per-id** 的，不同 id 互不影響
- 預設 `dedupeMs` 由 manifest 逐 id 設定（短促的 UI 音給小值，
  長尾的演出音給大值）

#### ⚠️ Debounce 解決不了跳過

per-id 去重對跳過**完全無效**：`finish()` 收合到同一瞬間的是幾十個
**不同的** id，每一個都是它自己的「第一次」，沒有任何一個會被抑制。
結果是最多 8 個（全域併發上限）不同音效同時響——一個和弦式的噪音爆。

**所以排程取消那條規則必須獨立存在，debounce 取代不了它。**

#### `priority` 的角色已降級

不再負責倍率過濾，只剩兩個用途：

1. 全域併發上限（8）爆掉時，**先丟 `normal`**
2. `finish()` / 跳過時，**讓少數 `high` 存活**——按下跳過，玩家還是會想聽到
   結算那一下的定音，而不是完全靜默

因此 `SceneHint` 的 `scene.sfx` 需要兩個額外欄位：

```ts
{ type: 'scene.sfx'; id: string; priority?: 'high' | 'normal'; dedupeMs?: number }
```

**節流**：同時播放上限（起始值 8），超過就丟掉最舊的 `normal` 優先度。
「資產數字跳動」這類每 frame 都想發音的演出，光靠 per-id debounce 不夠
（它們可能是不同 id），還需要這道全域上限。

#### ⚠️ 音效的隨機變體絕不可碰 `SeededRng`

「同一個音效隨機挑 3 個變體之一」聽起來無害，但如果那個隨機從
`SeededRng` 的任何 stream 取值，就會污染序列，讓**同種子跑出不同人生**（§5.2）。

音效變體的隨機必須來自 **presentation 層自己的、非種子的** 亂數。
這是 §5.3 那條 lint 規則保護不到的地方——`presentation/` 允許用 `Math.random()`，
所以編譯器不會擋。**紀律靠這一行文件與 code review。**

更一般的規則：**音效屬於 `SceneHint`，永遠不影響 state**（§6.3）。

#### 素材缺失的 fallback

`AudioResolver` 是 `AssetResolver`（§6.3）的孿生：id → `AudioBuffer`。

- 找不到 id → **什麼都不做**。不報錯、不崩潰、production 不印警告
- dev 模式下 `console.debug('[audio] would play: dice_roll')`，
  這樣**現在就能開發並驗證時序與呼叫點**，不需要任何音檔
- 日後把檔案填進 manifest 就有聲音，`domain/` 與 director 一行都不用改

**副產品**：dev 模式蒐集到的 would-play 清單**就是音效需求清單**。
不必先憑空想「我需要哪些音效」——玩過一輪，程式會告訴你。
S15 要提供一個把它匯出成清單的方式。

#### 格式與體積

零後端靜態部署，總體積要控制。第一版 manifest **同時支援兩種來源**：

- 獨立檔案（`{ id, url }`）——補素材最方便，適合開發期
- audio sprite（`{ id, url, offset, duration }`）——一檔多音效，減少請求數

先用獨立檔案；等音效數量多到請求數有感再打包成 sprite，manifest 格式不用改。

## 11. 不重複 yakyulife 的四個錯誤

1. ~~`flow/` import `ui/dom`~~ → domain 零 UI 依賴
2. ~~進度存在 onclick callback 裡~~ → command → advance() → effects → director
3. ~~`S` 是一層 60+ 欄位的扁平巨物~~ → 分域狀態 + 系統各自持有切片
4. ~~效果只能是數值加減、條件只能是單軸過濾~~ → 條件樹 + 具名效果註冊表
