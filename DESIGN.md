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
      audio/                AudioBus（現在 no-op）
    ui/                     React 元件，只讀 view model
    styles/                 design token 三層（見 §10.3）
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
  | { type: 'scene.sfx';   id: string }
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
| CSS | **Tailwind v4 全面採用** + 三層 design token | 4.3 |
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
  apps/web/            ← dependencies: { react, react-dom, @stock-life/engine }
```

**這是 §3.1 紀律的物理落實**：`packages/engine/package.json` 不列 react，
pnpm 嚴格 node_modules 讓「從 domain import UI」成為**編譯期錯誤**，
而不是可以用一行 `eslint-disable` 穿過的 lint 警告。

Turborepo 負責：`build` 的 engine → web 依賴順序、test／lint 快取、
以及把 TODO #8 的無頭平衡跑分獨立成 `test:balance` task。

> `packages/tokens` 暫不獨立。design token 先放 `apps/web/src/styles/`，
> 等未來編輯器 app 出現（第二個消費端）再抽出來。避免過早抽象。

### 10.3 Tailwind v4 與三層 token 的接合

三層＝ **global（原色）→ alias（語意）→ component**。
與 Tailwind v4 接合的關鍵一步是：**只有 alias 層進 `@theme`。**

```css
/* Tier 1 · global primitive —— 純 :root 變數，刻意不進 @theme */
:root {
  --g-green-950: #0a1a0f;  --g-green-900: #0d1f14;  --g-green-500: #2d5a3d;
  --g-amber-400: #e8b64c;  --g-red-500:   #c8442f;  --g-neutral-50: #f5f2e8;
}

/* Tier 2 · alias / semantic —— 進 @theme，成為 utility 的唯一來源 */
@theme {
  --color-surface:        var(--g-green-900);
  --color-surface-raised: var(--g-green-800);
  --color-text:           var(--g-neutral-50);
  --color-text-muted:     var(--g-neutral-400);
  --color-accent:         var(--g-amber-400);
  --color-gain:           var(--g-green-400);
  --color-loss:           var(--g-red-500);
}

/* 主題切換只動 alias 層，global 不動 */
[data-theme="scoreboard"] { --color-surface: var(--g-green-950); /* … */ }
```

**為什麼這樣接**：Tailwind 的 utility 表面就等於 alias 層。
`bg-surface-raised`、`text-loss` 存在，而 `bg-g-green-500` **不存在**——
想繞過語意層直接用原色，語法上就辦不到。於是「用 Tailwind」與「遵守 token 階層」
變成同一件事，靠 API 表面強制，不靠 code review 提醒。

**Tier 3 · component token** 只給少數複雜到需要的元件（主要是
`presentation/stage/`），寫在該元件自己的 CSS 檔裡並引用 alias 變數：
`--c-stage-actor-shadow: …`。這也是全專案唯一允許出現手寫原生 CSS 的地方。

**與 UGC 的對齊**：主題既然只是一組 alias 變數的覆寫，日後 mod 就能發佈主題包。

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

---

## 11. 不重複 yakyulife 的四個錯誤

1. ~~`flow/` import `ui/dom`~~ → domain 零 UI 依賴
2. ~~進度存在 onclick callback 裡~~ → command → advance() → effects → director
3. ~~`S` 是一層 60+ 欄位的扁平巨物~~ → 分域狀態 + 系統各自持有切片
4. ~~效果只能是數值加減、條件只能是單軸過濾~~ → 條件樹 + 具名效果註冊表
