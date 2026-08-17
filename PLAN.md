# 實作步驟 · 分 session 執行

每個 step 設計成**可在一個沒有對話記憶的新 session 裡獨立完成**。
每個 step 都附：依據文件的哪一節、產出檔案、完成判準、明確禁止事項，
以及一段**可直接貼給新 session 的起始指令**。

## 使用方式

1. 開新 session，貼上該 step 的「起始指令」
2. 完成後，回到本文件把該 step 的 `[ ]` 改成 `[x]`，並在「交接筆記」欄補上偏離設計之處
3. 下一個 session 只需讀 `DESIGN.md` 指定章節 + 本文件的已完成狀態

## 鐵則（每個 session 都適用）

- **`DESIGN.md` 是唯一依據。** 與它衝突的程式碼算 bug。
  若實作中發現設計有錯，**先改 `DESIGN.md` 再改程式碼**，並在交接筆記記錄。
- **不要越界做下一個 step 的事。** 每個 step 有「本步驟不做」清單，請遵守。
- **不要跳過完成判準。** 判準是給下一個 session 的保證。
- 設計相關的延後項目一律查 `TODO.md`，不要自行發明。

## 進度

| Step | 名稱 | 狀態 | 交接筆記 |
|---|---|---|---|
| S1 | Workspace 地基與強制機制 | [x] | pnpm workspace + Turborepo 完成；boundary.test.ts 用 `'window' in globalThis` 而非 `typeof window`，因 engine tsconfig 無 DOM lib 會讓後者型別報錯；apps/web/vite.config.ts 用 resolve.alias 將 `@stock-life/engine` 指向 `packages/engine/src`，讓 Vite 直接消費 TS 原始碼，不需 pre-build；apps/web/vitest.config.ts 設 `passWithNoTests: true`，S1 無 web 測試亦能通過 |
| S2 | SeededRng 與種子編碼 | [x] | stream() 用 `hash(seed::id)` 各自獨立初始化 sfc32（非延續同一序列），故新增 stream 不影響既有 stream，已有測試證明；fingerprint/seed 皆為 number，`toString(36)`／`parseInt(.., 36)` 做編解碼；decode() 回傳 discriminated union（`ok/error`）而非 throw |
| S3 | GameState、ModStateView、Calendar | [x] | GameState 分域為 player/capitalState/career/era/positions/traits/counters/flags；`createInitialGameState()` 是唯一的狀態工廠，測試一律透過它 + `readFacade()` 存取，不直接假設內部欄位形狀，藉此滿足「重構內部不弄壞 facade」判準；FacadePath 白名單型別在編譯期擋非白名單 path（`@ts-expect-error` 測試 + `tsc --noEmit` 驗證該行確實是型別錯誤）；`listFacadeFields()` 目前只列 20 個靜態欄位，`flag.*`/`counter.*` 是開放命名空間不進列表，留給 S5 schema 用 prefix pattern 處理；Calendar 以 turnIndex 換算 year/age，quarter granularity 每 4 turn 才推進一次 age/year（stage 分級為 student/early_career/mid_career/late_career/retirement，門檻為設計判斷，DESIGN.md 未明定） |
| S4 | Expr 求值器與 Effect 系統 | [x] | evaluate() 回傳 `{ok,...}` 而非丟例外（沿用 S2 shareCode 的模式），步數上限用內部 throw + try/catch 轉成結果物件；`structuredClone` 在 engine 的 no-DOM tsconfig 下型別找不到，改寫 `cloneGameState()` 手動深拷貝（`domain/state/GameState.ts`）；`erasableSyntaxOnly` 不允許 constructor parameter property（`readonly x` 寫在建構子參數上），改成欄位宣告+建構子內賦值；`position.open` 只累加 `positions.count`、`event.trigger` 對 state 是 no-op，完整持倉/事件排程留給 S9/S10；新增 `EffectRegistry`（具名效果註冊表）滿足 §11 錯誤 4；ESLint 根設定新增 `argsIgnorePattern: '^_'` 讓刻意未用的參數（如預留給未來效果的 rng）可用底線前綴通過 |
| S5 | zod Schema 與內容載入器 | [x] | facadePathSchema 對靜態 path 用 `z.enum(listFacadeFields().map(f=>f.path))`（程式產生，無第二份清單），`flag.*`/`counter.*` 動態命名空間用 regex；未知效果名的拒絕是靠 `z.discriminatedUnion('type', [...])` 天然達成，不需另一份 named-effect 白名單；`node scripts/exportSchema.ts` 因 NodeNext 的 `.js` import 在原始 TS 執行時無法解析回 `.ts`（tsc 才懂這個映射），改用 `tsx` 執行（已加為 engine devDependency，並 `pnpm approve-builds esbuild`）；`schema-export/` 為建置產物，加進 .gitignore；`ContentValidationIssue` 目前只填 `path`（結構路徑），`line`/`column` 依 §6.2 保留為 optional 欄位供未來 CST parser 使用；`checkCompatibility()` 的 engineApi 比對只做簡化版 caret-major 比對（`^1` 等），未實作完整 semver range；trait/opportunity 的 `scene` 欄位合併成同一個 `sceneRefSchema`（bg/actor/sfx/fx 皆 optional）而非各自定義；career edge 新增「edge 端點必須存在於 nodes[]」的 refine 檢查（DESIGN 未明定，屬合理延伸）；`EffectRegistry`（S4 產出）本步驟未接入 schema，因為目前內容範例都是直接內嵌 typed StateEffect，不是用名稱引用具名效果 |
| S6 | GameSystem 註冊表與 turn 排程 | [x] | `advance(state, command, rng)` 的字面簽章靠 `createAdvance({registry, calendar})` 回傳閉包達成——registry/calendar 不是 advance 的參數，而是建構時注入，滿足「純函式只有三個參數」與「可配置依賴」兩個要求；GameState 新增 `commandIndex` 欄位（純內部 RNG keying 用，不進 facade 白名單）：每次 advance() 呼叫遞增一次，每個 system 的每個 hook（onCommand 或某個 phase）用 `${systemId}:${commandIndex}:${hook}` 當 `rng.stream()` 的 key，這樣同一 turnIndex 內連續多個 command 仍各自拿到獨立亂數，同時 replay 同 seed+commandLog 仍逐位元重現（因為 key 完全由 state 衍生，不依賴任何外部可變計數器）；GameSystem 介面在 §8 之外新增 `onCommand?()`（§8 pseudocode 只列 onPhase，但 S6 條目明講「command 由各 system 處理自己關心的部分」，需要這個 hook 才做得到不集中 dispatch）；advance() 內部 clone 用 S4 的 `cloneGameState()` 而非 DESIGN §4.3 範例裡的 `structuredClone`（engine 無 DOM lib 型別，原因同 S4 交接筆記）；`SystemRegistry.allFacadeFields()` 把靜態 `listFacadeFields()` 與各 system 的 `facadeFields()` 合併，但 S5 的 zod schema 目前仍只吃靜態清單——S7+ 真的新增 system 貢獻欄位時需要回頭把 schema 接上動態清單；Sim 額外提供 `subscribe()`（非 DESIGN 明文要求，但直接對應 §10.1 "useSyncExternalStore" 的訂閱需求，S16 會用到） |
| S7 | 世界產生器與時代系統 | [x] | `Timeline` 為純資料（phases 連續分段 + themes 可重疊波段），**不存進 GameState**——它由 seed + generatorId + options 完全決定，存檔只需 seed+commandLog（§5.1／TODO #4）；`RandomWorldGenerator` 的循環以 **crash 為起點**排列（crash→recession→recovery→boom→mania），這樣連續兩次崩盤的間距就恆等於該循環長度 8–12；若循環以 recovery 起頭，crash 間距會隨各段內部分配漂移而跑出區間，這是刻意的結構選擇；第一個循環刻意砍掉 crash/recession 段（遊戲從循環中段開場，不會一出生就崩）；主題波每 5–8 年起一波、各持續 3–6 年、相鄰不重複（只 re-roll 一次，避免亂數卡住）；**修正 S6 的一個 bug**：`advance()` 原本五個 phase 全在 turnIndex++ 之前跑，與 `GameSystem.ts` 自己的註解（「turn.end runs after」）矛盾——現改為 turn.start/pre/mid/end → 時間推進 → turn.end，讓 EraSystem 能在跨年後重新同步 era，避免回傳給 UI 的 state 落後一年（S10 的 trait `checkOn: 'turn.end'` 因此發生在新年度，特性是累積計數的函數故不受影響）；`createInitialGameState()` 新增 optional `era`（配 `eraStateFor(timeline, year)`），否則 turn 0 在第一個 command 前會顯示 `unknown`；`SystemRegistry.allFacadeFields()` 改為依 path 去重、system 貢獻覆蓋靜態欄位——EraSystem 用這條把真正的 phase enum 掛到 `era.phase` 上；`facadePathSchema` 目前仍消費靜態 `listFacadeFields()`，S7–S10 沒有新路徑需求（新欄位不是既有靜態路徑就是 `counter.*` 動態命名空間），故未改動 schema |
| S8 | 三種資本與職涯圖 | [x] | **`stat.add` 的路由是本步驟最重要的決定**：`domain/state/stats.ts` 統一判定——key 若是已知 stat（capital/income/savingsRate/debt/cognition/network/nerve/time）就改該欄位（含 clamp：capital/debt/income≥0、savingsRate∈[0,1]、nerve/time∈[0,100]），否則落進 `counters.*`；S4 的 `applyStateEffect()` 原本無條件寫 counters，與 §7.2「`stat.add key:'income'`」和 §7.5「grants nerve+10」矛盾，已改為共用 `addStat()`，systems 與內容效果不可能對「這個 key 落在哪」有分歧；`addStat()` 回傳實際套用的 delta（clamp 後），系統就用它 emit effect，演出看到的數字跳動與 state 一致；**GameState 新增 `offers: Offer[]`**——§2「系統主動提案」需要一個待決提案清單，command 的 `id` 就是 offer id；`Offer` 明文註記「truth 衍生資料絕不可放上來」（S9 有測試守）；職涯提案用 `sizing: ['normal']` 表達「接受/拒絕」二選一，因此不需要為職涯新增 command 型別（§7.3 的 `surfacedAs: 'opportunity'` 本來就是這個意思）；**依賴方向修正**：§3 是 `content ──► domain`，所以 CareerGraph 的型別定義搬到 `domain/systems/career/CareerGraph.ts`，`content/schema/career.ts` 改成 `z.ZodType<CareerGraph>` 標註（與 exprSchema 對 Expr 的作法一致），S9/S10 的 Opportunity/Event/Trait 沿用同一模式；季初擲骰配點（DiceSystem）**不新增 state slice 也不新增 effect 型別**——pool/spent/各通道累計全部走 `counter.*`（§7.5 一等公民），因此 mod 可以直接用「你這輩子花了幾點在 study」寫特性條件；四個通道 study/social/work/rest → cognition/network/income/nerve；擲骰為 `1d6 + career.rank`（rank 讓好工作換到更多自我投資的時間），未花完的點數在下次擲骰時歸零、不累積；`allocateDice` 對超額分配採 clamp（不是報錯，advance() 沒有錯誤通道），未知通道與負數直接忽略；分配時對 assignment 的 key 排序後處理，確保重播與序列化順序無關；`createInitialGameState()` 新增 optional `capital`（起始三資本／儲蓄率）與 `DEFAULT_STARTING_CAPITAL` 常數——零狀態測試維持不變，合理起始值由組裝端（S11/S16）傳入；CareerSystem 在 `turn.start` 發現 `career.id` 不在圖上時才落到 startNode（idempotent），`pre` 重新產生提案（每回合清掉自己的舊 offer 再重算），節點沒有顯示名稱欄位故 label 暫用 node.id |
| S9 | 機會系統與持倉考驗 | [x] | **truth 的隔離做成物理邊界**：`truth` 在開倉當下就 roll 成實數（`resolveTruth()`，受開倉時 era 調節 multiple/ruinChance），存在 `Position.secret`；新增 `domain/state/playerView.ts` 的 `toPlayerView(state)` 把 `secret` 整個欄位**刪掉**（不是歸零，這樣外洩會是「缺欄位」而不是「看起來合理的錯誤數字」），呈現層只准吃這個形狀；測試用深度掃 key + 比對完整精度浮點數證明 offers／effects／playerView 在持倉期間都沒有 truth；`reveal` 只放**內容作者寫好的事實**（theme → window.themes），valuation/risk 沒有結構化欄位、資訊藏在該層級的 signal 文字裡——這正是「訊號品質是能力的函數」不需要洩漏 truth 就成立的原因；signal 分層 = cognition 決定層級（20/40 門檻）、network ≥30 再往上跳一級，fallback 先往下找再往上找；**機會抵達你的機率是 network 的函數**（每個 sourcedBy 各擲一次，per-source 機率 2%+0.4%×network、上限 25%），每回合最多提案 1 次；**拒絕過的機會永遠不再出現**（`flag.declined_*`）——不可逆是本遊戲的張力來源（§4.1）；四檔倉位 fraction 為 light/normal/heavy/leveraged = 0.1/0.3/0.8/1.0，leveraged 額外借入 1× stake（2× 曝險），結算時 proceeds 不足以還保證金就轉成 debt + 設 `flag.leveraged_wipeout`——**家庭/健康負面事件鏈是內容用這個 flag 當 require 解鎖的**（已在 core-tw 加 `debt_collector_call`／`health_scare`），引擎不硬編碼事件鏈；trials 走一般事件管線：PositionSystem 每年擲 `TRIAL_CHANCE` 後 `emit({type:'event.trigger', eventId})`，考驗事件（drawdown_50／triple_temptation／family_emergency）就是 core-tw 裡的普通 event，**新增 `weight: 0` 語意＝只能被 `event.trigger` 叫到、不進隨機池**（schema 的 weight 從 positive 放寬為 nonnegative）；考驗的機制後果由 PositionSystem 用 `resolveTrial` command 處理（hold/sell），**沒有回答就算 hold**（下一回合 turn.start 自動結算），這樣無頭 runner 與分心的玩家落在同一個明確定義上；`tier` 完全讀資料欄位（`LIFE_TIER` 常數比對 `position.tier`），沒有任何地方比對 opportunity id；**`applyStateEffect` 的 `position.open` 改為 no-op**——開倉需要 calendar/era/rng 才能 resolve truth，PositionSystem 是唯一擁有者，原本只加 `positions.count` 的第二個 writer 會讓 count 與 list 不一致（S4 測試已同步更新；內容自帶的 `position.open` 效果由 S10 的事件管線轉交 `openPosition()`）；`createPositionSystem()` 不需要參數，`turnsPerYear` 只有開倉時要用，故由 `positionOpener(deps)` 帶著——OpportunitySystem 的 `onAccept` 就是接這個，兩個 system 的組合縫是顯式的 |
| S10 | 事件系統與特性計數器 | [x] | **顯示與擲骰同源**靠一個函式強制：`successChance(choice)` 是唯一計算成功率的地方（base 50 + odds 偏移，clamp 0–100），`PendingEvent` 給玩家看的 `chance` 就是它算出來的值，結算時**直接讀回那個 view 的數字**去擲，不重算——結構上不可能漂移；另有統計測試（400 seed，顯示 70% → 實測落在 60–80%）；GameState 新增 `events: { queue, pending }` 與 `moments: string[]` 兩個 slice：queue 是 `event.trigger` 的收件匣（S9 的 trials 就走這裡），pending 是已排好的玩家決策（可多筆，先進先出，`resolveEvent` 解決隊首）；**`moments` 是讓 `checkOn` 真正資料驅動的關鍵**——各 system 只管 `pushMoment(state, 'position.close' \| 'event.resolve')`，TraitSystem 只管 `drainMoments()`，兩邊互不認識，換 `checkOn` 完全不需動引擎（有測試：同一個 trait 只改 checkOn 就改變解鎖時機）；`turn.end` 這個 moment 由 TraitSystem 自己在 turn.end phase 推上去；**踩到一個真 bug**：EventSystem 原本在 `onCommand` 無條件 drain queue，導致 `advanceTurn` 時剛排入的考驗會在同一次 advance 的 turn.start 被當成「未回答」自動結算，玩家永遠看不到那個決策——改為 `advanceTurn` 直接跳過 onCommand（交給 phase 處理）；未回答的事件在下一個 turn.start 以 `normal` 自動結算（與 S9 的「沒回答＝hold」同一條原則：讓無頭 runner 與分心的玩家落在同一個定義上）；`mag` 是效果倍率（bold 風險高、倍率大），套用在內容效果的數值上；**內容效果只有一個套用路徑**：`applyContentEffects()`（event 結局與 trait grants 共用），其中 `position.open` 轉交 S9 的 `openPosition()`、`event.trigger` 排進 queue——這就是 S9 交接筆記說的「第二個呼叫者」，mod 寫的效果不會在某處有效、在另一處靜默失效；CounterSystem 除了固定宣告，還會**掃描已載入內容的 `stat.add` key**（非 stat 者即 counter）自動列進 facade 白名單，所以第三方內容自創的計數器也會出現在未來編輯器的下拉選單裡（有測試：完全外部的 trait 資料靠官方 `counter.burnout` 解鎖）；`exclude` 互斥＝新拿到的人格勝出、被取代者進 `removed[]`，且**已被取代的人格不再重新解鎖**（人格丟了就是丟了；DESIGN 未明定，屬設計判斷）；trait schema 的 `checkOn` enum 改由 `TRAIT_MOMENTS` 常數產生，不再手寫第二份清單；core-tw 補上韭菜（`retail_leek`，與鑽石手互斥）與槓桿賭徒（`leverage_gambler`，require 用 S9 的 `flag.leveraged_wipeout`），鑽石手的 exclude 從不存在的 `paper_hands` 改指 `retail_leek` |
| **S11** | **無頭 runner ▸ 里程碑：引擎完成** | [x] | 新增 `sim/createLife.ts`——**全引擎唯一的組裝點**（載內容→產世界→註冊 11 個 system→建 Sim），S16 的 app 也走同一個函式，兩邊不可能對「一場遊戲由什麼組成」有分歧；它是 async 的（內容載入 async，TODO #2），內容驗證失敗回傳 `{ok:false,errors}` 而不是啟動一個壞掉的遊戲；system order：era 10 → dice 20 → capital 30 → cognition 40 → network 50 → career 60 → opportunity 70 → position 80 → event 90 → counter 95 → trait 100；`runLife({seed,sources,policy})` 每回合反覆問 policy 要下一個 command（回 undefined 就推進回合，另有每回合 32 步的死迴圈保險），回傳 `{summary, commandLog}`；**policy 只拿得到 `PlayerView`**（`Sim.getPlayerView()`），所以模擬玩家跟真玩家一樣看不到 truth——有測試用一個會偷看的 policy 證明 `secret` 欄位根本不存在；`replayLife()` 把 commandLog 重播到同一份 summary（S17 的存檔重播就是這條路徑）；`defaultPolicy()` 可調 risk／sizing／是否接機會／考驗 hold 或 sell／骰點分配權重，`splitDice()` 保證餘數落到權重最高的通道、絕不提出全零分配（否則 policy 會卡死）；`scripts/balance.ts` + `pnpm --filter engine run balance -- --runs 10000` **實測 30.6 秒跑完、純 node 無 DOM**，另加 `test:balance` turbo task（預設 200 局）；完整一局 golden test 用 snapshot 鎖住 summary；**分布報表已經看得出三個明顯的平衡問題（留給 S19）**：① 82% 的人生落在同一個 comfortable 檔、沒有人破產（張力不足）② 每局只提案 0.29 個機會——`core-tw` 只有 1 個機會且 window 要求 `eraPhase: boom/mania` ∩ `themes: memory`，但隨機世界的主題池有 10 個主題，兩者交集太罕見，**S19 要讓內容的 window 與 world generator 的主題池對齊**③ leveraged wipeout 0%（機會太少，槓桿的代價根本沒被觸發）；`outcomeFor()` 的結局門檻（2000/800/200 万）是暫定值，S19 用跑分器調 |
| S12 | Tailwind 與三層 design token | [x] | 參考專案路徑（`/Users/morrischen/...`）是 macOS 路徑，本機不存在，故完全依 §10.6 的差異表實作；**主題 token 掛進 `themes.<name>.at.*` 命名空間、與一般 token 在同一個 dictionary**——這樣 `{gt.*}` 參照解析得出來，真的只需要一次 build，輸出時把 `themes.<name>` 兩層剝掉還原成 `--at-*`；style-dictionary v5 的 `files[].format` **型別上允許 inline function 但執行期會報 `Can't find format`**，必須走 `config.hooks.formats` 具名註冊；實際是**三個** format（多一個 `keys.ts`）；**「任何主題都不得修改 `--gt-*`」做成 build 驗證而非自律**：主題檔只准有 `at` 這一個最外層 key、且每個值只准是 `{gt.*}` 純參照，違反就 build 失敗（字面色值也擋）；`-`／`_` 兩個分隔符的規則讓 name transform 整個消失，只用內建 `name/kebab`；Tailwind 沒有 `--text-*--font-variant-numeric` 這個修飾符，所以 `theme.css` 對「宣告了 `variant_numeric` 欄位的 role」額外生成一條 `@layer utilities { .text-<role> { font-variant-numeric: var(--at-type-<role>-variant_numeric) } }`——判定條件是欄位存在，不是硬編碼 `numeric`；`cn()` 用 tailwind-merge v3 的 `theme.color` / `theme.text` / `theme.font`（v4 對齊的 theme group id）而非 §10.3 範例的 `classGroups['font-size']`，效果相同但少一層字串拼接；`@stock-life/tokens` 的 `exports` 直接指向 `dist/keys.ts`（TS 原始碼，與 engine 的消費模式一致），`dist/` 進 .gitignore；**「gt utility 不存在」是用 `@tailwindcss/cli` 真的編譯一份 probe.css 再 grep 出來的**（fixtures 在 `apps/web/src/styles/__tests__/fixtures/`，`source(none)` + `@source ./candidates.txt` 讓輸出小而穩定），`_` 保留與 `/20` alpha 也在同一份編譯結果上驗證；`pnpm-workspace.yaml` 的 `allowBuilds` 加 `'@parcel/watcher': false`（只有 tailwind CLI 的 `--watch` 需要它）；turbo `dev` 加 `dependsOn: ['^build']`（web 的 dev/test/typecheck 都需要 tokens 的 dist 先存在）；順手清掉 Vite scaffold 殘留（`App.css`／`index.css`／`src/assets/`／`public/icons.svg`），`main.tsx` 改 import `styles/globals.css`，`index.html` 改 `lang="zh-TW"`；`ct` 層目前只有 2 個 token（`stage.actor_shadow`／`stage.bg_wash`），依 §10.6 ⑤ 留給 S14 長 |
| S13 | Director 與 WAAPI 演出 | [x] | Scene 的時間欄位叫 `start`（不叫 `at`）——`SceneHint` 的 actor 已經有一個 `at: 'left'\|'right'`，同名會很難讀；**節奏表 `SCENE_BEATS`／`BADGE_BEATS` 把「演多久」與「游標往前多少」分成兩個數字**（`duration` / `advance`），所以音效與 BGM 可以是 `advance: 0` 的瞬間 cue、對話則 `advance == duration` 會擋住時間軸，調節奏不必碰編譯邏輯；`compile()` 是純函式且不碰 sim，所以「同一份 commandLog 重播出同一段演出」**是結構上成立的**，不需要另存演出紀錄（有測試）；**數字怎麼跳的關鍵決定**：sim 的 state 早就是最終值，所以投影提供 `pendingStats[key]`（未演到的差額）與 `pendingCapitalFactor`（未演到的倍率），呈現值 = `最終值 - pending`／`最終值 ÷ factor`——因此**未來的 stat scene 也要算進投影**，不是只算正在播的；`StageState` 是給 `useSyncExternalStore` 用的，`getStage()` 用 `(planVersion,time,rate,playing,finished)` 當 key 做快取，沒變化時回傳同一個物件（漏掉會讓 S16 無限 re-render）；**`onCue(listener)` 是為 S15 準備的縫**：跨過 scene 起點時發 cue 並帶 `skipped` 旗標——`finish()` 會把剩下的 cue 一次補發並標記 `skipped: true`，這正是 §10.7「跳過時取消排程中的 normal、high 存活」需要的資訊，而 seek 往回只移游標不重播（同一條規則）；WAAPI 用結構型別 `ControllableAnimation`（真的 `Animation` 天然滿足）而非直接依賴 `Animation`，因為 **jsdom 沒有 WAAPI**，測試要塞假的；`animation.finish()` 對無限動畫會丟例外，故包 try/catch——演出不該因為一個動畫而中斷；`rate()` 會先 `tick()` 結算已跑掉的時間再換倍率，否則新倍率會回頭套用到過去的區間（有測試）；`stageVars.ts` 只算數字（progress／offset／chars），實際位移幾 px、透明度曲線留給 S14 的 stage CSS——這就是 §10.4「director 只寫 CSS 變數」的落實；本步驟**沒有動 App.tsx**（畫面是 S16），所以 director 目前只在測試裡被驅動 |
| S14 | AssetResolver 與 fallback 舞台 | [x] | **改了一處引擎**：`MergedContent` 新增 `manifests: Manifest[]`（`mergeContentPacks` 帶出來）——`assets` 區塊在 manifest 裡（§6.4），但原本 `Life.content` 沒有把 manifest 帶給呈現層，AssetResolver 就拿不到素材表；替代方案是 app 自己再 `loadContentPack` 一次，那會出現第二份真相，故選擇補這個欄位（引擎 209 個測試全綠）；**manifest 的 `assets` 值在 schema 裡是 `unknown` 是對的**——素材長什麼樣是呈現層的事，`presentation/assets/AssetManifest.ts` 是唯一把它正規化的地方（接受 `"path.png"` 或 `{url,label,offset,duration,dedupeMs}`，看不懂的形狀等於沒這筆、不丟例外），**S15 的 AudioResolver 沿用同一份正規化結果的 `sfx`**，不要再解析一次；**FX 沒有檔案**（§6.4 的 assets 也沒有 fx 區塊），永遠是 CSS 動畫，所以 `fx()` 只回傳動畫名；fallback 的變化（背景色相、角色色塊色相、選哪個 fx 動畫）由 **id 的 FNV-1a 雜湊**決定——不碰 `SeededRng`（同 §10.7 的原則：演出亂數會讓同種子跑出不同人生），也因此「同 id 永遠同長相」；**fallback 的顏色仍然全部來自 ct token**，TS 只注入 `--c-bg-hue`／`--c-actor-hue` 這種**衍生數值**，由 stage.css 用 `hue-rotate()` 套上去——這樣「零素材也好看」與「顏色只能來自 token」不衝突；`ct` 從 2 個長到 11 個（都在 `stage.*`，§10.6 ⑤ 的「需要時才長」）；`presentation/stage/stage.css` 是全專案唯一手寫原生 CSS 的檔案，逐字顯示用 `clip-path` 而不是切字串（切字串會讓換行跳動）；**「不得硬編碼路徑」做成測試**：掃 `presentation/` 全部原始碼，禁止檔名字面量與寫死的 `url()`（註解裡舉例不算）；Stage 的測試用 `renderToStaticMarkup`（不裝 @testing-library，jsdom 也沒有 WAAPI，本來就只需要驗 markup）；`AssetResolver.missing()` 蒐集「問過但沒素材」的 id——玩一輪之後那份清單就是美術需求清單（與 §10.7 的 would-play 同一招）；本步驟仍**沒有動 App.tsx**（畫面是 S16），Stage 只在測試裡被 render |
| S15 | 音效抽象層 playSound() | [x] | **最重要的一個偏離**：§10.7 的表格讀起來像是「演出開始時就把整段音效預先排程，跳過時再取消」，但 director 的 cue 是在**真實時間**跨過 scene 起點時才發的——cue 抵達的那一刻就是該發聲的那一刻（倍率已經被 director 吃掉），所以 `directorAudio.ts` 是 **cue 驅動的立即播放**，不是預先排程。這樣 §10.7 的兩條規則反而更自然地成立：`rate(n)` → cue 變 n 倍密 → leading-edge debounce 自然稀釋（**實測 1× 全響 6 次、4× 只響 <3 次**，真的不需要任何倍率分類表）；`finish()` → 剩下的 cue 一次湧入且帶 `skipped: true` → `normal` 直接不播、`high` 存活。`when` 仍然完整實作（排程 + `cancelScheduled()`），給「結算完 200ms 後的定音」這種真的要延遲的呼叫者用，跳過時它們才是被取消的對象；分層是 **`playSound()` → `AudioEngine`（政策）→ `AudioOutput`（發聲）**，政策全在 engine、output 很薄——jsdom 沒有 Web Audio，這個接縫讓去重／併發／跳過取消**全部都測得到**，而不是只能靠讀程式碼相信；`ActionId` = `keyof typeof UI_SOUNDS`（app 靜態 manifest，型別來源）∪ **branded 的 `ContentSfxId`**（只能經 `contentSfx()` 產生，那個函式只有內容／director 管線呼叫），所以 `playSound('ui_clik')` 是編譯期錯誤（有 `@ts-expect-error` 測試守著）；**BGM 不變調是靠「根本沒有那段程式碼」保證的**——`PlayRequest` 裡沒有速率欄位，`WebAudioOutput` 從不設 `playbackRate`／`detune`，並有測試掃 `presentation/audio/` 擋掉這兩個字（同一個掃描也擋 `SeededRng`／`RngStream`／`rng.stream`）；`ui` bus 跟著 `sfx` 的音量／靜音設定（§10.7 只要求 bgm 與 sfx 分開持久化，而玩家按靜音時的意思是「安靜」，不會只想關掉演出音效），但仍是獨立的 `GainNode`，未來要拆開只需加一組設定；併發上限滿了而**八個都是 high** 時，新來的那個直接放棄（不能拿 high 換 high）；`bgm` 不佔併發額度（同時只有一首，換首是 output 的 crossfade）；AudioBus 的 localStorage 讀寫全包 try/catch（無痕視窗連 `setItem` 都可能丟，音量記不住不是錯誤）；`AudioResolver` 吃的是 **S14 已經正規化過的 `assets.sfx`**（同一份 manifest 解析，沒有第二套）；⚠️ **唯一沒能實測的判準是「無痕視窗的 autoplay」**——本開發環境沒有瀏覽器，unlock 流程（延遲建立 AudioContext、`unlockAudio()`、`isAudioLocked()`）已實作並用假 output 測過 plumbing，但 `context.state === 'suspended'` → 手勢 → `running` 這條要在 S16 把按鈕接上時用真瀏覽器（無痕）驗；`src/dev/AudioLab.tsx` 是開發用測試頁（列出所有 ui id、可調倍率、跳過、20 個不同 id 的洪水按鈕、would-play 清單）——S16 把它與 S12 的 token 示範一起搬進 `dev` 畫面（標題頁 → 開發工具），因為 autoplay 那條判準只有真瀏覽器驗得出來，需要一個手動驗的地方 |
| **S16** | **UI 組裝 ▸ 里程碑：可玩** | [x] | **加了兩處引擎**：① `sim/decisions.ts` 的 `nextDecision(view)`——「現在輪到玩家決定什麼」原本只存在於 `defaultPolicy` 裡，UI 若自己再推一次，哪天兩邊漂移就會讓「同分享碼＋同選擇 = 同人生」悄悄失效；現在 policy 與 UI **共用同一個函式**（policy 已改寫成消費它，引擎 209 個測試含 golden snapshot 全綠，證明行為沒變）② `summariseLife(life, seed)` 改為匯出，結算畫面與平衡跑分報表因此是同一份摘要定義；**三個 hook 而不是一個 store**：`useApp`（畫面狀態機，很少變）／`useSession`（每個 command 一次，含深拷貝的 PlayerView）／`useStage`（每 frame 一次，director 內部已快取）——全塞一起會讓演出期間每 frame 重算 PlayerView；`useSyncExternalStore` 的第三個參數（getServerSnapshot）填同一個 getter，只為了讓 `renderToStaticMarkup` 的畫面冒煙測試能跑（這些 store 純前端，沒有伺服器狀態）；`GameSession.entries` 是**不可變陣列**（每次 `[...prev, ...batch]`）——原地 push 會讓 React Compiler 依識別碼判斷「沒變」而讓文字流卡住；**數字跳動用的是 S13 的 `pendingStats`／`pendingCapitalFactor`**：sim 早就是最終值，畫面顯示 `最終值 − 未演到的差額`，所以跳過與播完都不可能顯示錯的數字；文字流條目是 dispatch 當下從 `effects[]` 記的（不是從 state 反推），與演出同源；種子輸入接三種寫法（分享碼／純整數／留空隨機），**指紋不符時明確說「這組分享碼是用另一套內容包產生的」而不是靜默跑出另一段人生**；「開始人生」同時是 audio unlock 的手勢（§10.7）；⚠️ **事件沒有題目文字**——`EventDef` 只有三個選項的 label 與結局 text（DESIGN §7.2 就是這樣設計的），所以決策區的抬頭是通用的「你要怎麼做」，敘事靠選項 label 與結算後的 `scene.say`；若 S19 覺得太單薄，那要先改 DESIGN 再改 schema；`dev` 是第五個畫面（不在 PLAN 原本的四個之列）——S12 的 token 示範與 S15 的音效測試頁搬進去，理由是 autoplay 那條判準只有真瀏覽器驗得出來，需要留一個手動驗的入口；內容包畫面只做「看得到已載入什麼」，匯入匯出留給 S18；**驗收**：`playthrough.test.ts` 走 `AppStore → GameSession → nextDecision` 真的玩完 48 回合到結算（不是走 `runLife`，否則證明不了畫面接對），同分享碼＋同選擇的 commandLog 與摘要逐項相同，拒絕過的機會不再出現；`mount.test.tsx` 真的把 app 掛進 jsdom、按下「開始人生」後畫面上出現本金與舞台；`boundary.test.ts` 掃原始碼確認對引擎的 import 只走 `@stock-life/engine` 這個公開入口；⚠️ **無痕視窗的音效實測仍未做**（本環境沒有瀏覽器）——unlock 的提示與流程都已接上並有測試，但 `suspended → 手勢 → running` 這條要人拿瀏覽器驗 |
| S17 | 存檔、重播、種子分享 | [x] | **存檔格式住在引擎（`sim/save.ts`），存放處住在 app（`app/save/SaveStorage.ts`）**——引擎不准碰 localStorage（§5.3），但「存檔長什麼樣」只能有一份定義，這條縫就是那個切點；`Life` 新增 `seed` 與 `options`（`ResolvedLifeOptions`：填好預設值、去掉不可序列化的 sources），因為重播需要「seed 以外還要對齊什麼」，原本這些資訊在 `createLife()` 裡算完就丟了；`summariseLife(life, seed?)` 的第二個參數因此改為 optional（預設 `String(life.seed)`）；**存檔多存一份 `packs: {id,version}[]`**——指紋是個雜湊、反推不出名字，而 §5.1 要求的訊息是「此種子需要 core-tw v1.0 + xxx v2.1」，所以名字必須存；`commandSchema` 標註成 `z.ZodType<Command>`（沿用 exprSchema 對 Expr 的模式），漏掉 variant 由測試的 `Record<Command['type'], Command>` 在編譯期擋下；`migrateSave(raw, {migrations, targetVersion})` 兩個參數都可注入，所以 v1 階段（`SAVE_MIGRATIONS` 必然是空的）仍能用假的 v1→v3 證明掛勾真的會跑；**續玩與重播走同一條路**：`restoreLife({applyLog:false})` 只重建世界並把 log 交回來，續玩＝`GameSession` 一次快轉套用（順便把文字流長回來，重開瀏覽器不會失去這輩子的紀錄），重播＝一步一步交給 director 演——兩者都是 `sim.dispatch()`，所以「重播完可以直接接手繼續玩」是結構上成立的（`takeOver()`）；重播的自動前進靠 director 的 subscribe（演完一段才演下一段）+ `schedule()` 排程（零長度演出不會堆成一疊遞迴），測試則直接呼叫 `replayStep()` 不碰計時器；**每個 command 之後自動存檔**（存檔就是一串 command，很便宜），但**刻意不 patch()**——每個 command 通知一次會讓整個畫面白重繪一輪，標題頁要看存檔時是重新讀 storage；重播期間不寫存檔（否則走到一半的 log 會把完整存檔截短，有測試）；`?s=<分享碼>` 進網址列（`replaceState`），開局時寫回去、開頁時當成種子輸入；`AppStore` 的建構子改成 options 物件（`{sources, storage, search, syncUrl}`），測試因此能注入 MemoryStore 與假的查詢字串；`explainSaveError()` 是唯一把引擎的結構化錯誤翻成中文的地方；「放棄這局」改名「離開（自動存檔）」，因為現在它真的不會弄丟進度 |
| S18 | 內容包匯入匯出 | [x] | **`FileSource` 也放在引擎**：用結構型別 `ReadableFile = { name, text() }`（同 S13 `ControllableAnimation` 的手法），所以引擎連 `File` 這個字都沒提到、§5.3 的 no-DOM 仍然成立，而「新增來源＝新增實作」這條邊界在同一個地方看得到兩個實作；`PasteSource` 是唯一解析 JSON 的地方，`FileSource` 讀完字串就轉交它；**`ContentSource.load()` 丟例外現在會被 `loadContentPack` 接住並轉成 `section: 'source'` 的驗證錯誤**——來源本來就可能連位元組都拿不到（壞 JSON、讀不到檔、日後的 404），那是驗證失敗不是當機；**踩到兩個 S5 埋下的坑**：① career schema 的 `nodes.min(1)` 會讓「只加事件的 mod」不合法 ② 「edge 端點必須存在」的 per-pack refine 會讓「從 core-tw 的節點分支出去的 mod」不可能存在——兩條都是**合併後**才成立的規則，故搬到新的 `validateMergedContent()`（由 `createLife` 呼叫），單一 pack 因此可以是 fragment，組合起來仍必須是一張完整的圖（三條測試分別守著 fragment 可用／懸空邊被擋／完全沒有節點被擋）；manifest 的 `id`/`version` 收緊成「小寫英數」與「真 semver」，因為它們是指紋的輸入（`v2` 與 `2.0.0` 不能是同一個東西）；`trust.ts` 把「格式合法」與「內容可信」做成**兩個回傳值、兩種 error section**，第一版只畫最便宜的線（各區塊數量、檔案大小），但市集要加的檢查有一個具名的地方可去；app 端 `PackLibrary` 存的是**驗證通過後再序列化**的內容（進得來的一定通過同一套 schema），同 id 再匯入是升級而不是裝兩份，匯入失敗完全不動既有清單（有測試）；`AppStore.sources` 改成 getter（每次開局重新取），所以剛匯入的包下一局就算數、指紋也跟著變；內容包畫面分三段：匯入（檔案／貼上／下載官方 JSON Schema）、已安裝（啟用停用／匯出／移除）、這一局實際載入的 manifest；匯出走 Blob + `<a download>`，純前端無後端 |
| **S19** | **tw-history 與內容擴充 ▸ 里程碑：第一版** | [x] | **`tw-history` 的兩條規則**：① 歷史不是隨機的——每個種子看到的崩盤都在同一年（1990 萬點／1997 亞洲金融／2001 網路泡沫／2008 海嘯／2015／2020 疫情／2022 升息），這正是這個模式的賣點；② **未來是隨機的**——表寫到 2027 就停，之後交給與 `random` 共用的循環產生器，否則 2010 年開局的人生會退休在一個凍住十年的相位裡；為此把 `rollCycle`／`cycleSegments`／`generateThemeWaves`／`continueCycles` 抽到 `world/cycles.ts`，`createDefaultWorldGeneratorRegistry` 也搬到自己的 `defaultRegistry.ts`（兩個產生器不互相 import，第三方註冊走同一條路）；歷史的主題波**刻意只用 `DEFAULT_THEME_POOL` 的十個字**——內容的 `window.themes` 因此在兩種世界都成立，這就是 S11 報表指出「內容與主題池對不上」的修法（有測試擋住任何新字）；**內容量**：92 事件（含 8 個 `weight: 0` 的持倉考驗）／24 機會（6 個 life tier，三版 signal 寫滿率 100%）／37 人格／29 職涯節點 42 條邊；事件條件一律寫 `era.phase` 不寫年份，所以同一批事件在兩種世界都說得通；**跑分器抓到一個真 bug**：`PositionSystem` 的考驗只 `emit({type:'event.trigger'})`、從來沒有寫進 `state.events.queue`，所以四十年下來玩家一次都沒看過考驗事件的文字（`resolveTrial` 的抱／賣是另一條路，那條是好的）——新增 `enqueueEvent(state, id)` 當唯一的收件匣入口，內容的 `event.trigger` 與 PositionSystem 都走它，並補了一條「考驗真的變成玩家要回答的事件」的測試；**平衡**（3000 局／30 秒）：`BASE_SOURCE_CHANCE` 0.02→0.004（內容從 1 個機會長到 24 個，抵達率必須跟著降）、`OUTCOME_THRESHOLDS` 2000/800/200→5000/2000/800（門檻是百分位決定，不是意見）、rank 4 的職涯條件大幅提高（原本 77% 的人生走得到）、早期職涯與「自己做」那幾條邊加上 `chance`（否則所有人第一份工作永遠是陣列裡的第一條邊，三局玩下來職涯一模一樣）；最終分布 **11 / 33 / 36 / 19 / 0**（S11 是 84% 擠在同一格），`--risk safe --sizing light` 的人幾乎不會落到最底、`--sizing leveraged` 的人 29% 爆倉、12% 負債收場——§1.3 的承諾在數字上兌現；37 個人格沒有一個是死內容（四種 policy 分別涵蓋）；**重玩三局**：各看到 30 種上下的事件、彼此重疊 <70%、三局聯集 >45 種（有測試），十二個「一輩子一次」的事件用 `flag` 自我封印；一局約 153 個玩家決策（§4.2 估的 100–200），對應 10–20 分鐘；**S19 之後依實玩回饋補的三件事**：① 舞台跨演出保留佈景（`StageCarry`）——實測 35 次 dispatch 只有 12 次會發 `scene.*`，`director.load()` 每次清空等於三分之二的時間在看黑盒子 ② **`DESIGN.md` §7.2 加 `prompt`**：事件原本只有選項與結局，玩家做決定時看不到任何情境；現在一個事件演兩次（提出時演背景＋人物＋情境、結算時只說結果），92 個事件全部補上，schema 收成必填 ③ 隨機抽取與持倉考驗都加上「上一次抽到的這次不抽」，沒得抽就安靜過一年——情境變成看得見之後，連續兩年同一句話會像壞掉（實測 40 局連續重複 14 → 0）|

---

# Phase 0 · 地基

## S1 · Workspace 地基與強制機制

**目標**：把 §3.1 的分層紀律變成物理牆，並讓 lint／test／build 三條命令能跑。

**依據**：`DESIGN.md` §3、§3.1、§5.3、§10.1、§10.2

**前置**：無。現況是單一 Vite scaffold（`src/App.tsx` 等），需重組。

**產出**：
- `pnpm-workspace.yaml`、`turbo.json`、根 `package.json`（scripts: build/test/lint/typecheck）
- `packages/engine/`：`package.json`（dependencies **只有 zod**，**不得有 react**）、
  `tsconfig.json`、`src/index.ts`、空的 `src/{domain,content,sim}/` 目錄
- `apps/web/`：搬入現有 Vite scaffold，`package.json` 依賴 `@stock-life/engine`（workspace 協定）
- ESLint：§5.3 的四條禁令（`Math.random`／`Date.now`／`new Date()`／往上 import／
  直接碰 `window`/`document`/`localStorage`），**只套用於 `packages/engine`**
- Vitest 兩個 project：`engine`（node 環境）、`web`（browser/jsdom）
- `packages/engine/src/__tests__/boundary.test.ts`：驗證 engine 匯出不含任何 DOM 依賴

**完成判準**：
- `pnpm install && pnpm build && pnpm test && pnpm lint && pnpm typecheck` 全綠
- 在 `packages/engine` 內寫 `import React from 'react'` 會**失敗**（不是警告）
- 在 `packages/engine` 內寫 `Math.random()` 會被 lint 擋下
- `apps/web` 的 dev server 起得來，畫面隨便顯示什麼都可以

**本步驟不做**：任何遊戲邏輯、任何 Tailwind 設定、任何 UI 設計。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §3、§3.1、§5.3、§10.1、§10.2，以及 PLAN.md 的 S1。
執行 S1：把現有的單一 Vite scaffold 重組成 pnpm workspace + Turborepo，
建立 packages/engine 與 apps/web，並把 §5.3 的紀律做成真正會失敗的強制機制。
嚴格遵守 S1 的「本步驟不做」清單。完成後回報完成判準的實際執行結果。
```
</details>

---

# Phase 1 · 引擎核心

## S2 · SeededRng 與種子編碼

**目標**：決定論的基礎設施。這是全專案最不能事後修的一塊。

**依據**：`DESIGN.md` §5.1、§5.2、§5.4

**前置**：S1

**產出**：
- `packages/engine/src/domain/rng/SeededRng.ts`：可注入的 class，
  `stream(id)` 回傳獨立子序列（**不同 stream 互不干擾**，這是 §5.2 的重點）
- `RngStream`：`next()` / `int(a,b)` / `pick(arr)` / `chance(p)` / `normal(sd)`
- `packages/engine/src/domain/rng/shareCode.ts`：
  `encode(fingerprint, seed)` / `decode(code)`，格式見 §5.1
- `packages/engine/src/content/loader/fingerprint.ts`：由 `id@version` 清單算指紋
- Golden test：固定 seed 下各 stream 的前 20 個值快照

**完成判準**：
- 同 seed 重跑得到完全相同序列
- **新增一個 stream 不改變既有 stream 的序列**（這條測試必須存在）
- 分享碼可 round-trip，且指紋不符時 `decode` 回傳明確的錯誤物件而非丟例外

**本步驟不做**：GameState、任何遊戲規則、載入真實內容包。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §5.1、§5.2、§5.4，以及 PLAN.md 的 S2。
執行 S2：實作 SeededRng（含 stream 分流）、分享碼編解碼、內容指紋計算，
並寫 golden test。特別注意 §5.2 那條「新增 stream 不得讓舊種子失效」，
它必須有對應測試。嚴格遵守 S2 的「本步驟不做」清單。
```
</details>

---

## S3 · GameState、ModStateView、Calendar

**目標**：狀態的內部結構，以及對 UGC 的公開契約（兩者刻意分離）。

**依據**：`DESIGN.md` §6.1、§9、§1.1（三種資本的欄位）

**前置**：S1、S2

**產出**：
- `packages/engine/src/domain/state/GameState.ts`：**分域**的狀態
  （§11 錯誤 3：不要做成一層 60+ 欄位的扁平巨物）。至少分出
  `player` / `capitalState` / `career` / `era` / `positions` / `traits` / `counters` / `flags`
- `packages/engine/src/domain/facade/ModStateView.ts`：
  §6.1 的白名單 path 型別 + `read(state, path)` 實作 + `facadeVersion` 常數
- `packages/engine/src/domain/facade/FacadeField.ts`：欄位 metadata 型別
  （`path` / `label` / `type` / `enum?` / `range?`）——**未來編輯器的欄位來源**
- `packages/engine/src/domain/Calendar.ts`：§9 的 `granularity: 'year' | 'quarter'`

**完成判準**：
- `ModStateView.read()` 對白名單外的 path 在**型別層**就不通過
- 有一份可列舉的 `FacadeField[]`（`listFacadeFields()`），S5 的 schema 會消費它
- Calendar 切換 granularity 時，`age` / `year` / `stage` 的推導仍正確
- 測試涵蓋：改動 `GameState` 內部結構但維持 facade 對映，facade 測試仍綠

**本步驟不做**：任何 system、任何 reducer、任何內容。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.1、§9、§1.1、§11，以及 PLAN.md 的 S3。
執行 S3：定義分域的 GameState、ModStateView 白名單 facade（含可列舉的
FacadeField metadata）、以及 Calendar。重點是 §6.1 那條「mod 只能碰白名單、
內部結構可自由重構」——請寫一個測試證明重構內部不會弄壞 facade。
嚴格遵守 S3 的「本步驟不做」清單。
```
</details>

---

## S4 · Expr 求值器與 Effect 系統

**目標**：條件樹與效果——UGC 表達力的引擎端。

**依據**：`DESIGN.md` §6.2、§6.3

**前置**：S3（需要 `ModStateView`）

**產出**：
- `packages/engine/src/domain/expr/evaluate.ts`：
  運算子固定為 `all` `any` `not` `==` `!=` `>` `>=` `<` `<=` `in` `flag` `chance`
- **`chance` 必須從注入的 `RngStream` 取值**，不可自帶亂數
- **執行步數上限**（`TODO.md` #2 的邊界：防惡意內容包做出無窮觸發鏈）
- `packages/engine/src/domain/expr/effects.ts`：
  §6.3 的 `StateEffect` 與 `SceneHint` 兩個聯集型別，**嚴格分離**
- `applyStateEffect(state, effect, rng)`：純函式
- 具名效果註冊表（§11 錯誤 4）：資料只引用效果名字，不內嵌邏輯

**完成判準**：
- 條件樹求值有完整測試，含巢狀 `all`/`any`/`not`
- `chance` 在同 seed 下結果固定
- 超過步數上限時回傳明確錯誤，不掛掉
- `SceneHint` 完全不影響 state（有測試證明）

**本步驟不做**：schema 驗證、載入內容、任何 system。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.2、§6.3、§11，以及 PLAN.md 的 S4。
執行 S4：實作條件樹求值器（含 chance 走注入的 RngStream、含執行步數上限）
與 Effect 系統（StateEffect 與 SceneHint 嚴格分離、具名效果註冊表）。
嚴格遵守 S4 的「本步驟不做」清單。
```
</details>

---

## S5 · zod Schema 與內容載入器

**目標**：內容包的驗證與載入。**官方內容走跟 mod 完全一樣的管線**（dogfooding）。

**依據**：`DESIGN.md` §6.2、§6.4、§7.1–§7.5；`TODO.md` #1、#2 的邊界清單

**前置**：S3（facade 欄位）、S4（Expr 型別）

**產出**：
- `packages/engine/src/content/schema/`：zod schema，涵蓋
  `pack.json` manifest（§6.4）、Opportunity（§7.1）、Event（§7.2）、
  Career（§7.3）、Trait（§7.5）
- **列舉白名單由程式產生**：`z.enum(listFacadeFields().map(f => f.path))`，
  不得手寫第二份清單（`TODO.md` #1）
- `toJSONSchema.ts`：用 `z.toJSONSchema()` 匯出，供未來編輯器與 mod 文件消費
  （zod 4.4.3 已確認有此 API）
- `packages/engine/src/content/loader/`：
  `ContentSource` 介面 + `MemorySource` 實作（`TODO.md` #2 邊界：載入流程必須 async）
  、驗證、合併、指紋計算（接 S2）
- 驗證錯誤物件含**位置欄位**（§6.2 的 ⚠️：第一版可只填結構路徑，介面要先留位置）
- `packages/engine/src/content/packs/core-tw/`：**最小內容包**——
  3 個事件、1 個機會、2 個職涯節點、1 個特性。夠測管線就好

**完成判準**：
- `core-tw` 能被載入器成功載入並驗證通過
- 故意寫錯的內容包（未知 facade path、未知效果名、缺必填欄位）**在載入時**被拒，
  錯誤訊息可讀且指出結構路徑
- `pnpm --filter engine run schema:export` 產出 JSON Schema 檔案
- 指紋計算對同一組 pack 穩定、對不同版本不同

**本步驟不做**：大量內容（S19 才做）、編輯器 UI（`TODO.md` #1，不做）、
從 URL 或檔案載入（`TODO.md` #2，S18 才做）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.2、§6.4、§7.1–§7.5，TODO.md 的 #1 與 #2，以及 PLAN.md 的 S5。
執行 S5：用 zod 4 寫內容 schema（列舉白名單必須從 listFacadeFields() 程式產生，
不得手寫第二份）、匯出 JSON Schema、實作 async 的 ContentSource/loader，
並寫一個最小的 core-tw 內容包（3 事件 / 1 機會 / 2 職涯節點 / 1 特性）。
嚴格遵守 S5 的「本步驟不做」清單——特別是不要寫大量內容。
```
</details>

---

## S6 · GameSystem 註冊表與 turn 排程

**目標**：把前面的零件接成「能推進一個回合」的引擎外殼。

**依據**：`DESIGN.md` §4、**§4.1、§4.2、§4.3**、§8、§9

**前置**：S2–S5

> ⚠️ **這不是 Redux。** 讀 §4.1 的對照表。不要做單一巨型 `switch`、
> 不要引入 immer、不要做 undo/redo。

**產出**：
- `packages/engine/src/domain/systems/GameSystem.ts`：§8 的介面
  （`id` / `order` / `onPhase` / `facadeFields`）
- `SystemRegistry`：依 `order` 排序，`ctx` 提供 `state`、`rng.stream(system.id)`、`emit()`。
  **command 由各 system 處理自己關心的部分**（§4.1），不集中在一個 dispatcher
- `packages/engine/src/domain/turn/advance.ts`：
  `advance(state, command, rng) => { nextState, effects: Effect[] }`
  ——**純函式、同步、一次算完**。內部用 §4.3 的 clone-then-mutate
- `packages/engine/src/domain/turn/Command.ts`：§4.2 的 command 聯集型別。
  **玩家決策級**，UI 互動不進 log
- `packages/engine/src/sim/Sim.ts`：持有狀態、`dispatch(command)`、
  維護 `commandLog`、對外發布 `{ state, version, effects }`
- Phase 定義：`turn.start` / `pre` / `mid` / `end` / `turn.end`

**完成判準**：
- 可以 `dispatch` 一個「推進一回合」的 command，得到 `nextState` 與 `effects[]`
- `advance()` 是純函式（同輸入同輸出，有測試）
- **`advance()` 絕不 mutate 傳入的 `state`**（§4.3 紀律：傳入前後深度比較的測試）
- 每個 system 拿到的是**自己的** rng stream（有測試）
- `commandLog` 完整記錄，且用同 `seed + log` 重播得到相同 `nextState`（golden test）
- 沒有 undo/redo API，也沒有巨型 switch

**本步驟不做**：具體遊戲規則系統（S7–S10）、任何呈現。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §4、§4.1、§4.2、§4.3、§8、§9，以及 PLAN.md 的 S6。
執行 S6：實作 GameSystem 介面與註冊表、純函式 advance()、Command 型別、
以及 Sim 外殼（持有狀態、dispatch、commandLog）。

特別注意 §4.1：這不是 Redux——不要做巨型 switch（command 交給各 system 處理）、
不要引入 immer（用 §4.3 的 clone-then-mutate）、不要做 undo/redo。
Command 顆粒度是玩家決策級（§4.2），UI 互動不進 log。

必寫測試：advance() 不 mutate 傳入的 state；同 seed + 同 commandLog 重播
得到相同狀態。嚴格遵守 S6 的「本步驟不做」清單。
```
</details>

---

# Phase 2 · 遊戲規則

## S7 · 世界產生器與時代系統

**目標**：時代這張舞台。先做 `random`（`tw-history` 留到 S19）。

**依據**：`DESIGN.md` §7.4、§2（兩種世界並存）

**前置**：S6

**產出**：
- `packages/engine/src/domain/systems/world/WorldGenerator.ts`：§7.4 介面 + 註冊表
- `RandomWorldGenerator`：程序生成 `Timeline`，
  節奏約「8–12 年一次大崩、5–8 年一波主題」
- `EraSystem`：把 `Timeline` 推進成當前 `era.phase` 與 `era.themes`，
  並曝露為 facade 欄位

**完成判準**：
- 同 seed 產生同一條 Timeline
- Timeline 的崩盤與主題波間隔落在設計區間內（統計測試，跑多個 seed）
- `era.phase` / `era.themes` 出現在 `ModStateView` 白名單且可被條件樹讀取

**本步驟不做**：`tw-history`（S19）、真實公司名稱、任何機會判定。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §7.4、§2，以及 PLAN.md 的 S7。
執行 S7：實作 WorldGenerator 介面與註冊表、RandomWorldGenerator、EraSystem，
並讓 era.phase / era.themes 進入 facade 白名單。
嚴格遵守 S7 的「本步驟不做」清單——tw-history 留到 S19。
```
</details>

---

## S8 · 三種資本與職涯圖

**目標**：本金／認知／人脈，以及推動本金的職涯。

**依據**：`DESIGN.md` §1.1、§7.3、§2（職業先走事件驅動）；`TODO.md` #3 的邊界

**前置**：S7

**產出**：
- `CapitalSystem`：本金、收入、儲蓄率、負債
- `CognitionSystem`、`NetworkSystem`：§1.1 的另兩種資本
- `CareerSystem`：§7.3 的**有向圖**（節點=職位、邊=轉換+條件+`surfacedAs`）。
  第一版只實作 `surfacedAs: "opportunity"`（系統在符合條件時提案）
- 季初擲骰配點機制（§2 核心迴圈：骰點分配到能力）

**完成判準**：
- 職涯是圖結構而非線性陣列（`TODO.md` #3 邊界）
- 三種資本都出現在 facade 白名單
- 擲骰配點在同 seed 下可重現
- 一個角色能從起始節點沿邊推進到第二個職位

**本步驟不做**：主動職涯規劃 UI（`TODO.md` #3，不做）、機會系統（S9）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §1.1、§7.3、§2，TODO.md 的 #3，以及 PLAN.md 的 S8。
執行 S8：實作三種資本的 system 與職涯圖 system（有向圖，第一版只用
surfacedAs: "opportunity"），以及季初擲骰配點。
嚴格遵守 S8 的「本步驟不做」清單。
```
</details>

---

## S9 · 機會系統與持倉考驗

**目標**：本遊戲的核心物件。§1 的公式在這裡兌現。

**依據**：`DESIGN.md` §1（含 §1.1、§1.2、§1.3）、§7.1、§2

**前置**：S8

**產出**：
- `OpportunitySystem`：依 `window` / `require` / `sourcedBy` 篩選並提案
- **`truth` 對玩家不可見**，倍數與年限由 seed + 時代決定（§7.1）
- **`signal` 分層**（§1.2）：依 `cognition` / `network` 決定玩家看到哪一版描述
  與 `reveal` 哪些欄位；三版選填，缺的層級 fallback 到已填的那版
- **四檔倉位**（§1.3）：`light` / `normal` / `heavy` / `leveraged`。
  `leveraged` 賠掉會產生負債並解鎖家庭/健康負面事件鏈
- `PositionSystem`：`tier: "life"` 進入逐年 `trials` 考驗；`normal` 一次結算。
  **`tier` 讀資料欄位，不得硬編碼**
- 考驗事件庫（`drawdown_50` / `triple_temptation` / `family_emergency`）走一般事件管線

**完成判準**：
- 同一個機會、不同 `cognition`，玩家看到不同 `signal`（有測試）
- `truth` 從未出現在任何送給呈現層的資料裡（有測試）
- `tier: "life"` 的機會會產生持倉並在後續回合觸發考驗
- `leveraged` 失敗會產生負債
- 全部在同 seed 下可重現

**本步驟不做**：特性解鎖（S10）、任何演出。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §1、§7.1、§2，以及 PLAN.md 的 S9。
執行 S9：實作機會系統（signal 依認知/人脈分層、truth 對玩家不可見、四檔倉位）
與持倉考驗系統（tier 讀資料欄位不得硬編碼）。
必寫測試：truth 絕不外洩到呈現層；同機會不同認知看到不同描述。
嚴格遵守 S9 的「本步驟不做」清單。
```
</details>

---

## S10 · 事件系統與特性計數器

**目標**：日常事件，以及「系統看見你的打法」的機制。

**依據**：`DESIGN.md` §7.2、§7.5

**前置**：S9

**產出**：
- `EventSystem`：§7.2 的三檔風險結構（`safe` / `normal` / `bold`），
  成功率與顯示**同源**（yakyulife 這個「所見即所得」的細節值得照抄）
- `CounterSystem`：`counter.*` 為一等公民，各 system 透過 effect 累加，
  整批曝露在 facade 白名單（§7.5）
- `TraitSystem`：§7.5 的門檻檢查。**`checkOn` 是資料驅動的**
  （`turn.end` / `position.close` / `event.resolve`），不硬編碼在流程裡
- `exclude` 互斥 + `removed[]`（結算畫刪除線用）
- 在 `core-tw` 補幾個投資人格特性作為示範（鑽石手、韭菜、槓桿賭徒）

**完成判準**：
- 三檔風險的顯示機率與實際擲骰同源（有測試）
- 計數器可被 mod 的條件樹讀取（有測試：用一個外部特性資料解鎖）
- 特性互斥生效，被覆蓋的進 `removed[]`
- `checkOn` 換成不同時機不需改引擎程式碼

**本步驟不做**：大量事件內容（S19）、演出。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §7.2、§7.5，以及 PLAN.md 的 S10。
執行 S10：實作事件系統（三檔風險、顯示與擲骰同源）、計數器系統
（counter.* 為一等公民且進 facade 白名單）、特性系統（checkOn 資料驅動、
exclude 互斥、removed 記錄）。在 core-tw 補 3 個示範投資人格。
嚴格遵守 S10 的「本步驟不做」清單。
```
</details>

---

## S11 · 無頭 runner ▸ 里程碑：引擎完成

**目標**：證明引擎完全不需要瀏覽器就能跑完整局人生。這是 §3.1 紀律的最終驗收。

**依據**：`DESIGN.md` §4、§5.4；`TODO.md` #8

**前置**：S10

**產出**：
- `packages/engine/src/sim/headless.ts`：`runLife(seed, packs, policy)` →
  完整 `commandLog` + 結算摘要。`policy` 是自動決策函式（模擬玩家）
- `turbo` task `test:balance`：跑 N 局並輸出分布
  （最終資產分布、各結局占比、各特性解鎖率、機會接受率）
- 完整一局的 golden test：`seed + fingerprint + commandLog` → 結算摘要快照

**完成判準**：
- `pnpm --filter engine run balance -- --runs 10000` 在 node 裡跑完，**不 import 任何 DOM**
- 完整一局的 golden test 綠燈
- 分布報表能看出明顯的平衡問題（例如：所有人都破產／所有人都財務自由）

**本步驟不做**：實際調平衡數值（內容不足，S19 再調）、任何 UI。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §4、§5.4、§3.1，TODO.md 的 #8，以及 PLAN.md 的 S11。
執行 S11：實作無頭 runner 與批次平衡跑分 task，並加上「完整一局」的 golden test。
這是 §3.1 分層紀律的最終驗收——請確認整條路徑不 import 任何 DOM/React。
嚴格遵守 S11 的「本步驟不做」清單。
```
</details>

---

# Phase 3 · 呈現層

## S12 · Tailwind 與三層 design token

**目標**：`packages/tokens` 的 DTCG → style-dictionary → Tailwind v4 pipeline。
**核心紀律：只有 `at` + `ct` 進 `@theme`，`gt` 不生成 utility。**

**依據**：`DESIGN.md` §10.3、§10.5、**§10.6**；`TODO.md` #9

**前置**：S1（不需等引擎）

> 📖 **架構參考**：`/Users/morrischen/code_base/pcsc/f2e-uniopen/packages/tailwind-config`
> 與 `apps/uniopen-www/src/app/globals.css`。**先讀 `DESIGN.md §10.6` 的差異表**——
> 那份參考是 Tailwind v3，且有五處刻意不照抄。承襲它的 pipeline 形狀，
> 不要承襲它的 `fontSize` 手寫、gt 全暴露、字串後處理三個問題。

**產出**：
- `packages/tokens/`：獨立 package，devDep 只有 `style-dictionary`
  - `src/color.tokens.json`、`src/typography.tokens.json` — DTCG 格式（`$type`/`$value`），
    層級用 nesting 表達；複合詞用 `_`（`button_filled`）。
    **key 絕對不能含 `-`**（`-` 恆為層級分隔符，含 `-` 的 key 會讓命名失去可逆性）
  - `build.ts`：**一次 build，兩個 custom format**，都消費同一份 token AST。
    命名不需要任何 custom name transform——style-dictionary 預設就用 `-` 串接
    nesting、`_` 原樣保留（§10.3）：
    - `tokens.css` → `:root { --gt-* --at-* --ct-* }`（全部三層）
    - `theme.css` → `@theme { --color-at-* --color-ct-* --text-* }`（**prefix filter 掉 gt**）
    - `keys.ts` → 匯出已暴露的 key 清單，給 `cn()` 用
  - 生成檔全部標記 `Do not edit directly`
  - **驗證**：build 時檢查所有 token key 皆不含 `-`，違反就讓 build 失敗
- `apps/web/src/styles/globals.css`：三行 `@import`（tailwindcss / tokens.css / theme.css）
- `apps/web/src/styles/cn.ts`：`clsx` + `extendTailwindMerge`，
  color 與 font-size classGroups 從 `@stock-life/tokens/keys` 讀（§10.3 ⭐）
- 至少兩個主題（`default`、`scoreboard`），**切換只覆寫 `--at-*`**
- Typography：semantic type roles（`display`/`title`/`body`/`caption`/`numeric`），
  每個 role 綁 size + lineHeight + weight；body 行高 1.7–1.8；
  `numeric` 含 `tabular-nums`（§10.5）
- 字體：先採系統字體 stack，並在 `TODO.md` #9 記錄結論
- Turborepo：`tokens#build` 為 `web#build` 的依賴

**完成判準**：
- `pnpm --filter tokens build` 產出三個檔案，且重跑結果一致（deterministic）
- 含 `-` 的 token key 會讓 build 失敗（故意加一個測試看它擋不擋）
- `bg-at-surface-raised`、`text-at-loss` 這類 alias utility 可用
- **`bg-gt-green-500` 這類原色 utility 不存在**（要有實際驗證，不是口頭確認）
- **含 `_` 的 class 實測可用**（如 `bg-ct-stage-actor_shadow`）——確認 Tailwind
  沒有把 `_` 轉成空白（§10.3 最後一段）
- **alpha 修飾符可用**：`bg-at-loss/20` 正確產生半透明
- 切 `data-theme` 整頁換色，且 `--gt-*` 未被任何主題修改
- `cn('text-at-text-primary', 'text-at-text-muted')` **只留後者**
  （驗證 tailwind-merge 擴充真的生效——漏掉這步會靜默壞掉）
- 一個示範頁展示所有 type role、所有 alias 色、主題切換

**本步驟不做**：真正的遊戲畫面（S16）、director（S13）、
大批 `ct` token（§10.6 ⑤：`ct` 只在 S14 需要時才長出來）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §10.3、§10.5、§10.6，TODO.md 的 #9，以及 PLAN.md 的 S12。

架構參考（先讀，再讀 §10.6 的差異表）：
  /Users/morrischen/code_base/pcsc/f2e-uniopen/packages/tailwind-config
  /Users/morrischen/code_base/pcsc/f2e-uniopen/apps/uniopen-www/src/app/globals.css
那是 Tailwind v3，我們是 v4；且有五處刻意不照抄，全列在 §10.6。

執行 S12：建立 packages/tokens（DTCG token JSON → style-dictionary →
tokens.css + theme.css + keys.ts，一次 build 兩個 custom format 消費同一份 AST，
不要做 CSS 字串後處理），以及 apps/web 的 globals.css 與 cn()。

命名規則：`-` 是層級分隔符，`_` 是同層級內的複合詞分隔符
（`ct-button_filled-main-default`）。token key 不得含 `-`，build 要擋。
因為這個規則，命名不需要任何 custom name transform——別去寫參考專案那種
CSS 字串後處理腳本。

四條核心紀律：
1. 只有 at + ct 進 @theme——請實際驗證 bg-gt-green-500 不存在
2. typography 也走 token pipeline，不手寫在樣式檔裡（理由見 §10.5 的腐化證據）
3. cn() 的 tailwind-merge 擴充要有測試證明去重生效（漏掉會靜默壞掉）
4. 含 `_` 的 class 與 `/20` alpha 修飾符都要實測，不要假設

嚴格遵守 S12 的「本步驟不做」清單。
```
</details>

---

## S13 · Director 與 WAAPI 演出

**目標**：把 `effects[]` 編譯成可控速、可跳過、可重播的演出。

**依據**：`DESIGN.md` §4、§10.4、§6.3；`TODO.md` #5 的邊界

**前置**：S6（需要 `effects[]` 的形狀）、S12

**產出**：
- `apps/web/src/presentation/director/compile.ts`：`Effect[]` → `Scene[]`
  （`StateEffect` 決定數字怎麼跳，`SceneHint` 決定演出）
- `Director`：rAF 驅動的**邏輯時間軸**，
  API：`play` / `pause` / `rate(n)` / `seek(t)` / `finish()`
- 元素動態交給 WAAPI（`playbackRate` / `currentTime` / `finish()`）
- 舞台一律用 CSS 變數注入（§10.4），不用 utility class 表達動態值

**完成判準**：
- `rate(4)` 演出加速四倍，`finish()` 立刻跳到結果
- **演出長度與跳過行為完全不影響任何模擬結果**（有測試：跳過 vs 播完，
  最終 state 相同）
- 同一份 `commandLog` 可重播出同一段演出

**本步驟不做**：素材載入（S14）、音效（S15）、完整畫面（S16）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §4、§10.4、§6.3，TODO.md 的 #5，以及 PLAN.md 的 S13。
執行 S13：實作 Effect[] → Scene[] 的編譯器與 Director（rAF 邏輯時間軸 +
WAAPI 元素動態，支援 play/pause/rate/seek/finish）。
必寫測試：跳過演出與播完演出的最終模擬狀態完全相同。
嚴格遵守 S13 的「本步驟不做」清單。
```
</details>

---

## S14 · AssetResolver 與 fallback 舞台

**目標**：現在沒有美術素材也能演出，日後補素材不必動任何 TypeScript。

**依據**：`DESIGN.md` §6.3、§10.4；`TODO.md` #5 的邊界清單

**前置**：S13

**產出**：
- `apps/web/src/presentation/assets/AssetResolver.ts`：
  id → 素材，**所有視覺資源只透過 id 引用，不得硬編碼路徑**
- 每種型別都有 fallback：角色→名字色塊、背景→漸層、FX→CSS 動畫
- `presentation/stage/`：全專案唯一允許手寫原生 CSS 的地方（Tier 3 component token）

**完成判準**：
- 內容包引用一個不存在的 `actor` id 時，畫面出現 fallback 色塊而**不是崩掉**
- 在 manifest 塞一張圖進去，同一份內容包立刻改用真圖，`domain/` 零改動
- `TODO.md` #5 的視覺邊界清單全部打勾

**本步驟不做**：真的畫美術、**音效（S15）**。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.3、§10.4，TODO.md 的 #5，以及 PLAN.md 的 S14。
執行 S14：實作 AssetResolver（只透過 id 引用、每型別都有 fallback）、
以及 presentation/stage 的 Tier 3 component token。
驗收重點：引用不存在的素材 id 要 fallback 而非崩潰；塞一張真圖進 manifest
就能生效且 domain 零改動。
音效不在本步驟——那是 S15，且有自己的一套問題。
完成後把 TODO.md #5 的視覺邊界清單打勾。
```
</details>

---

## S15 · 音效抽象層 playSound()

**目標**：一個 `playSound(actionId, opts?)` 當**全專案唯一的音效入口**——
互動音效與演出音效共用它。現在沒有任何音檔也能全程運作，
日後把檔案填進 manifest 就有聲音。

**依據**：`DESIGN.md` **§10.7**、§6.3；`TODO.md` #5 的音效邊界清單

**前置**：S13（需要 director 的時間軸與 `rate`/`finish` 語意）。
**不依賴 S14**——可與 S14 並行。

> 兩者共用 `pack.json` 的 `assets` 區塊（§6.4 的 `actors` / `bg` / `sfx`），
> 所以**後跑的那一步沿用前一步建立的 manifest 解析模式**，不要各造一套。

> ⚠️ **音效不是「AssetResolver 的音檔版」。** 它有三個視覺素材沒有的問題，
> 全在 §10.7：瀏覽器 autoplay 政策、加速/跳過時的行為、以及一條會**破壞決定論**
> 的陷阱。動工前把 §10.7 讀完。

**產出**：
- **`playSound(actionId, opts?)` —— 唯一入口**（`apps/web/src/presentation/audio/`）
  ```ts
  playSound(id: ActionId, opts?: { when?; bus?; priority?; dedupeMs? }): void
  ```
  - 無 `when` → 立即播、`ui` bus（按鈕、選項、過場）
  - 有 `when` → 排程播、`sfx` bus（director 的演出音效）
  - **`ui` bus 完全不受 `rate`/`finish` 影響**（§10.7：按鈕回饋音不該因快轉消失）
- **`ActionId` 是型別化 union，由 manifest 產生**。`playSound('clik')` 必須是
  **編譯期錯誤**，不是執行期靜默失敗（§10.7 的防腐措施）
- **兩個 id 來源，同一個 resolver**：
  - 互動音效 → app 靜態 manifest（`ui_click`、`ui_option_select`、`ui_transition`…），
    mod 不可覆寫
  - 演出音效 → 內容包的 `assets.sfx`（§6.4），mod 可自帶。
    未知 id 在載入時**只警告不拒載**
- `AudioBus.ts`：三條匯流排 `bgm` / `sfx` / `ui`，各一個 `GainNode`
- Web Audio API（`AudioContext` + 預先 decode 的 `AudioBuffer` + `source.start(when)`），
  **不用 `<audio>` 元素**（理由見 §10.7）
- `AudioResolver.ts`：id → `AudioBuffer`。找不到就**什麼都不做**；
  dev 模式 `console.debug('[audio] would play: …')`，production 不印
- **Unlock 流程**：首次使用者手勢 `audioContext.resume()`；
  對外曝露 `isLocked` 讓 UI 顯示提示（S16 用）
- **Leading-edge debounce**（§10.7）：立刻發聲，然後在 `dedupeMs` 內抑制
  **同 id** 的重複。**必須是 leading，不是 trailing**——trailing 會讓 click
  音遲到。`dedupeMs` 由 manifest 逐 id 設定。
  這條取代了原本「按倍率過濾」的規則，所以**不需要**寫 rate-based 篩選邏輯
- **跳過取消**：`finish()`／跳過時取消排程中的 `normal`，`high` 可存活。
  ⚠️ **這條不能用 debounce 代替**——跳過收合的是幾十個不同 id，
  per-id 去重對它們完全無效（§10.7）
- **全域併發上限 8**：超過丟最舊的 `normal`（per-id debounce 擋不住不同 id 的洪水）
- `seek()` 往回不重播；BGM 一律正常速度、不變調
- `priority` 只用於上面兩件事（併發上限、跳過存活），**不用於倍率過濾**
- manifest 同時支援獨立檔案與 audio sprite（`{ id, url, offset?, duration? }`）
- 音量／靜音狀態存 `localStorage`（`bgm` 與 `sfx` 分開）
- **would-play 匯出**：dev 模式蒐集到的 id 清單可匯出——
  **那就是你的音效需求清單**（§10.7 的副產品）
- 開發用測試頁：列出所有已註冊 id、逐一觸發、可調 rate 觀察策略差異

**完成判準**：
- **零音檔狀態下整套可運作**：跑完一局不報錯，dev console 印出所有 would-play
- 在 manifest 放一個真的音檔進去，立刻有聲音，`domain/` 與 director 零改動
- **`playSound('不存在的id')` 是編譯期錯誤**（不是執行期才靜默失敗）
- **`ui` bus 不受演出控制影響**：`rate(4)` 進行中按按鈕仍有音；
  `finish()` 之後按按鈕仍有音（這條最容易做錯——別把 ui 一起清掉）
- **模擬新訪客**（無痕視窗）：首次手勢前 `context.state === 'suspended'`、
  `isLocked === true`；手勢後 `running`，聲音正常
- `rate(4)` 時 BGM **音高不變**（明確驗證，不是聽感描述）
- **debounce 是 leading-edge**：第一次呼叫**立即**發聲（不是等窗口結束才發）
- 連續觸發**同一** id 20 次 → 受 `dedupeMs` 限制，只響少數幾次
- 同時觸發 20 個**不同** id → 受全域上限 8 限制
  （證明 per-id debounce 擋不住這種情況，需要獨立的併發上限）
- 跳過演出時**沒有音效爆發**：排程中的 `normal` 被取消而非一次倒出
- **音效的隨機變體不從 `SeededRng` 取值**——`presentation/audio/` 內不得
  import 任何 rng stream（用測試或 lint 檢查）
- 跳過 vs 播完，最終模擬狀態相同（延續 S13 的判準，音效不得影響 state）

**本步驟不做**：真的做音效素材、BGM 曲目、遊戲畫面（S16）。
UI 上的靜音按鈕**外觀**留給 S16，本步驟只提供它要呼叫的 API 與 `isLocked`。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §10.7（完整讀，這節是本步驟的全部依據）與 §6.3，
TODO.md 的 #5，以及 PLAN.md 的 S15。

執行 S15：實作 playSound(actionId, opts?) 作為全專案唯一的音效入口——
互動音效（按鈕、選項、過場）與 director 的演出音效共用同一個函式，
差別只在有沒有傳 when。另含 AudioBus（bgm/sfx/ui + GainNode）、
AudioResolver（缺檔就什麼都不做 + dev 印 would-play）、autoplay unlock、
以及 §10.7 表格裡的速率/跳過策略、節流、去重。

七件最容易做錯、必須實測的事：
1. ui bus 不受演出控制影響——rate(4) 進行中與 finish() 之後，按按鈕都還要有音。
   把 ui 跟排程 sfx 一起清掉是最常見的錯。
2. Autoplay：用無痕視窗驗證首次手勢前是 suspended、isLocked 為 true、手勢後恢復。
   開發時你點過畫面，所以自己測不出這個 bug。
3. debounce 要 leading-edge（立刻發聲後抑制），不是 trailing（等安靜才發）。
   trailing 會讓 click 音遲到。這條 debounce 取代了「按倍率過濾」，
   別再寫 rate-based 篩選邏輯。
4. 但 debounce 解決不了跳過——收合的是幾十個不同 id，per-id 去重無效。
   跳過取消與全域併發上限必須獨立實作。
5. rate(4) 時 BGM 音高不得改變。
6. 音效的隨機變體絕不可從 SeededRng 取值——那會讓同種子跑出不同人生。
   presentation/audio/ 內不得 import 任何 rng stream。
7. ActionId 是從 manifest 產生的型別化 union，打錯字要在編譯期就爆。

零音檔狀態下整套要能跑完一局不報錯。
嚴格遵守 S15 的「本步驟不做」清單——不要做素材，也不要做 UI 按鈕外觀。
```
</details>

---

## S16 · UI 組裝 ▸ 里程碑：可玩

**目標**：第一次真的能從頭玩到退休。

**依據**：`DESIGN.md` §4（UI 只是 director 的投影）、§10.1（狀態管理用
`useSyncExternalStore`）；`yakyulife` 首頁截圖作為版面參考

**前置**：S11、S14、S15

**產出**：
- 畫面狀態機（無 router）：標題／遊戲／結算／內容包管理
- 標題頁：姓名、起始年代、世界模式（random／history 佔位）、種子輸入、
  顯示設定（主題）。**「開始人生」按鈕同時作為 audio unlock 的手勢**（§10.7）
- 遊戲主畫面：文字流時間軸（年度可摺疊，參考 yakyulife）、資本面板、
  選項按鈕、演出舞台、跳過／速度控制
- **音效控制**：靜音／音量（bgm 與 sfx 分開），呼叫 S15 提供的 API。
  `AudioContext` 仍是 `suspended` 時顯示「點一下開啟音效」提示
- 結算畫面：人生摘要、特性清單（含 `removed[]` 刪除線）、分享碼
- UI 透過 `useSyncExternalStore` 訂閱 sim，**不得直接 import `domain/`**

**完成判準**：
- 能從標題開始，玩完一整局人生到結算
- 輸入同一組分享碼 + 同樣選擇，得到同一段人生
- UI 層對 `packages/engine` 的 import 只走公開 API（有 lint 或測試檢查）
- 無痕視窗開啟 → 按下「開始人生」後音效可用；未按之前有明確提示

**本步驟不做**：存檔（S17）、內容包匯入（S18）、大量內容（S19）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §4、§10.1，PLAN.md 的 S16，並參考 yakyulife 的版面
（深色、文字流、年度摺疊）。
執行 S16：組裝畫面狀態機與三個主要畫面，UI 用 useSyncExternalStore 訂閱 sim，
並接上 S15 的音效 API（靜音/音量控制，bgm 與 sfx 分開；
「開始人生」按鈕同時作為 audio unlock 的手勢，見 DESIGN.md §10.7）。
驗收：能從標題玩到結算；同分享碼 + 同選擇得到同一段人生；
無痕視窗下按過「開始人生」後音效可用，未按之前有明確提示。
嚴格遵守 S16 的「本步驟不做」清單。
```
</details>

---

# Phase 4 · UGC 與收尾

## S17 · 存檔、重播、種子分享

**目標**：把決定論變成使用者看得到的功能。

**依據**：`DESIGN.md` §5.1；`TODO.md` #4 的邊界清單

**前置**：S16

**產出**：
- 存檔存的是 `seed + contentFingerprint + commandLog`，**不是狀態快照**
  （`TODO.md` #4 邊界：這樣格式演進時舊存檔仍可重播）
- `schemaVersion` + migration 掛勾
- 分享碼 URL（`?s=<code>`），指紋不符時顯示「此種子需要 XXX v1.2」
- 重播模式：載入 log 並用 director 播出來

**完成判準**：
- 關掉瀏覽器再回來能續玩
- 貼上別人的分享碼能得到相同人生
- 內容包版本不符時給出**明確可行動**的錯誤訊息，而不是靜默跑錯
- `TODO.md` #4 的邊界清單全部打勾

**本步驟不做**：雲端存檔、任何後端。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §5.1，TODO.md 的 #4，以及 PLAN.md 的 S17。
執行 S17：實作存檔（存 seed + fingerprint + commandLog，不存狀態快照）、
schemaVersion 與 migration 掛勾、分享碼 URL、重播模式。
指紋不符時必須給明確可行動的錯誤訊息。完成後把 TODO.md #4 的邊界清單打勾。
```
</details>

---

## S18 · 內容包匯入匯出

**目標**：UGC 的第一版流通管道。純前端。

**依據**：`DESIGN.md` §6.4；`TODO.md` #2 的邊界清單

**前置**：S17

**產出**：
- `FileSource`、`PasteSource`（`MemorySource` 已在 S5）——
  **新增來源是新增實作，不改呼叫端**（`TODO.md` #2 邊界）
- 內容包管理畫面：已載入清單、啟用／停用、匯入、匯出、驗證錯誤顯示
- `localStorage` 保存已載入的包
- 匯出官方 JSON Schema 供 mod 作者參考（S5 已產出，這裡提供下載入口）

**完成判準**：
- 匯入一個第三方內容包後，其事件/機會/特性真的會出現在遊戲裡
- 匯入格式錯誤的包時，顯示可讀錯誤且**不破壞既有狀態**
- 載入內容包後，分享碼的指紋隨之改變
- `TODO.md` #2 的邊界清單全部打勾（含 async 載入、執行步數上限）

**本步驟不做**：市集、後端、帳號、審核（`TODO.md` #2，不做）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §6.4，TODO.md 的 #2，以及 PLAN.md 的 S18。
執行 S18：實作 FileSource / PasteSource（新增來源不得改呼叫端）、
內容包管理畫面、localStorage 保存。
驗收：匯入第三方包後其內容真的進遊戲；載入後分享碼指紋改變。
完成後把 TODO.md #2 的邊界清單打勾。絕不做後端或市集。
```
</details>

---

## S19 · tw-history 與內容擴充 ▸ 里程碑：第一版

**目標**：把管線填滿到真的好玩，並用 S11 的跑分器調平衡。

**依據**：`DESIGN.md` §7.4、§2（暗示但不指名）、§1；`TODO.md` #8

**前置**：S18

**產出**：
- `TwHistoryWorldGenerator`：1990 台股萬點 → 2000 網路泡沫 → 2008 海嘯 →
  2020 疫情 → 2025 AI
- 標的一律「**暗示但不指名**」（護國神山、某記憶體大廠、某手機代工龍頭）——§2
- 內容量拉到可玩水準：80–150 事件、20+ 機會、完整職涯圖、25+ 特性
- 機會的 `signal` 三版盡量寫滿（官方內容當作 mod 作者的示範）
- 用 `test:balance` 跑一萬局調權重與數值

**完成判準**：
- 兩種世界模式都能玩完整局
- 平衡報表：最終資產分布不極端、主要結局都有人達到、特性解鎖率合理
- 一局 10–20 分鐘（§2 短局目標）
- 重玩三局不會覺得事件重複到出戲

**本步驟不做**：長局模式（`TODO.md` #4）、編輯器（#1）、市集（#2）、
新資產類別（#6）、多語言（#7）。

<details><summary>起始指令</summary>

```
讀 DESIGN.md 的 §7.4、§2、§1，TODO.md 的 #8，以及 PLAN.md 的 S19。
執行 S19：實作 TwHistoryWorldGenerator（標的一律暗示但不指名）、
把內容量拉到 80–150 事件 / 20+ 機會 / 25+ 特性、並用 test:balance
跑一萬局調平衡。目標是一局 10–20 分鐘、重玩三局不出戲。
嚴格遵守 S19 的「本步驟不做」清單。
```
</details>

---

## 依賴關係

```
引擎線   S1 ─► S2 ─► S3 ─► S4 ─► S5 ─► S6 ─► S7 ─► S8 ─► S9 ─► S10 ─► S11 ─┐
          │                                                               │
呈現線    └─► S12 ─► S13 ─┬─► S14 ─┐                                        │
                          └─► S15 ─┤                                        │
                                   ▼                                        ▼
                                 S16 ◄──────────────────────────────────────┘
                                   │
                                   ▼
                                 S17 ─► S18 ─► S19
```

**兩條可並行的分叉**：

- **S12 只依賴 S1**，所以整條呈現線可以與 S2–S11 的引擎線並行開兩個 session。
- **S14 與 S15 都只依賴 S13**，彼此獨立（一個管視覺素材、一個管音效），
  也可以並行。

其餘請照順序，因為每一步都在為下一步提供已驗證的保證。
S16 是兩條線的匯流點——它需要引擎能跑完一局（S11）、需要舞台（S14）、
也需要音效 API（S15）。
