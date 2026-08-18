# ART · 素材需求與 prompt

> **這個檔案是產生的，不要手改。**
> 改題材去 `packages/engine/scripts/art/subjects.ts`，改畫風去 `art/styles.ts`，
> 然後 `pnpm --filter engine run art`（加 `--style <id>` 換風格）。
> id 清單來自內容本身，內容多一個背景這裡就會多一條。

目前風格：**dusk** — 柔和電影感水粉（預設）——最不挑題材，文字壓上去也讀得清楚

共 71 張：背景 51、角色 20。

## 規格

- **檔名就是 id**：背景 `<id>.webp`、角色 `<id>.webp`（例：`office.webp`）
- **尺寸**：背景 1344×768（16:9）、角色 896×1152（3:4）；之後再放大
- **角色要去背**（PNG 帶 alpha 再轉 webp）。舞台是靠下對齊、寬度 22%，會裁到腰上下
- **背景會被壓暗**（不透明度 0.35–1），對話框壓在底部 20%，兩側 22% 站角色——
  所以那三塊要留白、低細節，畫面重心放中上
- **不能有看得懂的字、商標、可辨識的企業**（DESIGN §2：暗示但不指名）
- **背景裡不要有醒目的人**：角色是另一層貼上去的
- 生完把檔名填進內容包的 `manifest.assets`（骨架：`pnpm --filter engine run assets -- --manifest`）

## 怎麼生

本機 ComfyUI（WSL）+ SDXL。開好服務之後：

```bash
pnpm --filter engine run art:gen                        # 全部 71 張
pnpm --filter engine run art:gen -- --only office,bank  # 只重跑這幾張
pnpm --filter engine run art:gen -- --seed 1            # 換一批構圖
```

產出在 `art-out/<style>/<id>.png`（不進 git）。每張的 seed 由 id 決定，
所以重跑同一個 id 會拿到同一張；要換構圖就改 `--seed`。

## 共用風格（改這段等於改全部）

```
look     : soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges
palette  : muted desaturated palette, warm amber against cool slate, restrained contrast
light    : diffused overcast light with one warm source, long soft shadows, slight atmospheric haze
rules    : blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
negative : (text:1.5), (letters:1.5), (words:1.5), (signage:1.4), logo, brand name, watermark, signature, harsh contrast, oversaturated, cluttered lower third, Japanese architecture, kimono, sakura, pagoda, ancient Chinese village, deformed hands, extra limbs, blurry, low quality
```

可換的風格：
- `dusk` ←（目前） — 柔和電影感水粉（預設）——最不挑題材，文字壓上去也讀得清楚
- `ink` — 鋼筆線稿＋淡彩——安靜、成本低、放大也不糊
- `film` — 底片攝影感——最寫實，但同一批要對齊最難
- `pixel` — 16-bit 像素——最容易統一，也最便宜；但年代感會蓋過台灣感

## 背景（照使用次數排，先畫上面的）

### `home_desk.webp` · 10×

個人書桌。理財、報稅、算退休金都在這張桌上發生　（用在：better_offer_elsewhere、dividend_habit、index_fund_boring、long_term_conviction、paper_gains_tax、read_the_annual_report 等 10 筆）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. dark night sky, black beyond the lit area, warm artificial light sources in frame, deep shadows. a small home desk pushed against a window, laptop, a stack of statements and a mug, one warm desk lamp, night city glow outside. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `office.webp` · 9×

一般日間辦公室。加薪、裁員、被拜託的事都在這裡　（用在：boss_asks_favour、colleague_pre_ipo、company_stock_options、mentor_a_junior、overtime_crunch、recovery_hiring 等 9 筆）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an open-plan office of low cubicle partitions, monitors and paper trays, fluorescent ceiling, half-drawn blinds, nobody at the desks. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `trading_floor.webp` · 9×

券商營業廳。注意台灣是紅漲綠跌　（用在：buy_the_dip、chase_the_top、company_gone_bad、distressed_after_crash、index_at_the_ceiling、market_selloff 等 9 筆）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a securities brokerage hall, a wall of quote boards glowing red and green (Taiwanese convention: red is up), rows of worn chairs facing it. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `home.webp` · 7×

自己的客廳。第一筆薪水、孩子的問題、催收電話　（用在：account_untouched、debt_collector_call、first_paycheck、hobby_years、kids_ask_about_money、no_spend_year 等 7 筆）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a modest Taiwanese living room, terrazzo floor, fabric sofa, sliding balcony door with laundry drying beyond, an iron window grille. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `phone.webp` · 7×

手機。詐騙、傳言、朋友傳來的連結　（用在：blackout_of_information、crypto_curiosity、crypto_early、margin_call_temptation、rumour_of_fraud、scam_call 等 7 筆）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a phone lying face up on a table in a dim room, blank glowing screen lighting the surface around it, close intimate framing. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `bank.webp` · 6×

銀行營業廳。負債、匯率、圈存、鎖定期　（用在：bank_merger_play、currency_shock、debt_snowball、gold_and_fear、lockup_years、the_ipo_queue）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a bank branch hall, numbered queue seats, counter glass and teller windows, a wall clock, polished floor. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `cafe.webp` · 5×

咖啡店。被挖角、被借錢、被推銷保險　（用在：friend_wants_to_borrow、headhunter_call、insurance_pitch、someone_else_made_it、teach_someone_to_invest）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a small café by a window, two chairs at a two-person table, condensation on the glass, afternoon light. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `factory.webp` · 5×

傳統製造廠房。接單、停線、買二手機台　（用在：export_orders_boom、factory_line_stop、panel_capex_race、second_hand_machine、supplier_equity_swap）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an older manufacturing plant floor, conveyor line and metal presses, overhead lamps, oil-stained concrete, machines idle. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `family_home.webp` · 4×

老家。長輩的房子，不是自己的家　（用在：family_blames_you、inheritance、move_back_home、parents_need_help）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an elder's home interior, ancestral shelf, plastic-covered sofa, an old wall calendar, afternoon light through window grilles. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `hospital.webp` · 4×

醫院。健檢紅字、生孩子、家裡急用錢　（用在：family_emergency、have_a_child、health_scare、medical_bill）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a hospital corridor with a row of waiting chairs, curtain rails, a gurney parked against the wall, cold even light. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `restaurant.webp` · 3×

餐廳包廂。應酬、同學會、所有人勸你賣掉　（用在：client_dinner、everyone_says_sell、old_friends_dinner）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a private banquet room, round table with a lazy susan, used glasses and plates, warm ceiling light, door slightly ajar. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `apartment_block.webp` · 2×

公寓外觀。房價、收租　（用在：property_fever、the_boring_landlord）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a facade of Taiwanese apartment blocks, iron window grilles, split air-conditioner units, stainless water tanks on the roof, tiled exterior walls, tangled cables. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `bedroom_night.webp` · 2×

深夜臥室。睡不著、部位剩一半　（用在：drawdown_50、sleepless_year）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. night, a single faint cool light source, almost dark, deep shadows. a bedroom at night, unmade bed, faint street light through a thin curtain, a phone face down on the sheets. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `conference.webp` · 2×

產業研討會。上台當講者、聽不懂的新名詞　（用在：industry_conference、new_industry_hype）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an industry conference hall, rows of empty seats, a lit stage with an empty lectern, projector haze in the beam. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `meeting_room.webp` · 2×

會議室。扛責任、被小八歲的主管質問　（用在：late_career_squeeze、take_the_blame）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a corporate meeting room, long table, whiteboard wiped but streaked, blinds, chairs pushed out of line. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `office_night.webp` · 2×

深夜的辦公室。三倍了、還沒走　（用在：mem_supercycle_a、triple_temptation）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. dark night sky, black beyond the lit area, warm artificial light sources in frame, deep shadows. the same open-plan office after midnight, most ceiling lights off, one desk lamp burning, city lights beyond the glass. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `parking_lot.webp` · 2×

地下停車場。有人在這裡叫住你　（用在：insider_rumour、trade_secret_offer）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an underground car park, concrete pillars, sodium lamps, mostly empty bays, a ramp curving up out of frame. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `startup_office.webp` · 2×

新創辦公室。同學說他在做一個很大的東西　（用在：classmate_startup、the_internet_thing）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a small startup office in a converted apartment, mismatched desks, a whiteboard covered in diagrams, cardboard boxes stacked in a corner. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `street.webp` · 2×

白天的街。樂透排隊、鄰居換車　（用在：lottery_ticket、neighbour_jumped_in）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a daytime Taiwanese street, ground-floor arcade walkway with square concrete columns, tiled building facades, scooters parked nose-in along the curb. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `airport.webp` · 1×

機場。外派一年　（用在：relocation_offer）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an airport departure hall, a row of check-in counters, luggage trolleys, tall windows with an aircraft tail beyond. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `banquet.webp` · 1×

喜宴。要辦幾桌　（用在：wedding_budget）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a wedding banquet hall, round tables under red cloth, a gold fabric backdrop, stacked spare chairs at the side. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `car_dealer.webp` · 1×

車商展示間。要不要換車　（用在：car_or_not）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a car showroom, polished floor, two sedans under spot lighting, a glass wall onto the street. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `city_skyline.webp` · 1×

城市天際線。你做了二十年的東西變成傳統產業　（用在：the_island_moves_on）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a Taiwanese city skyline at dusk from a rooftop, water tanks and rooftop additions in front of glass towers, a mountain ridge behind. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `classroom.webp` · 1×

學校教室。這一局的玩家是老師　（用在：class_of_forty）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a school classroom, wooden desks in rows, a chalkboard, ceiling fans, late afternoon light across the floor. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `clinic.webp` · 1×

診所。健檢通知放到快過期　（用在：health_check）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a small neighbourhood clinic waiting area, plastic chairs, a reception window, a rack of pamphlets. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `community_center.webp` · 1×

社區活動中心。當志工　（用在：volunteer）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a Taiwanese community activity centre hall, folding tables, stacked red plastic chairs, roll-up banners, terrazzo floor. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `commute.webp` · 1×

通勤。倦怠的那一年　（用在：burnout_warning）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. the interior of a metro carriage, hand straps swaying, an empty seat row, tunnel darkness through the window. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `countryside.webp` · 1×

農地。長輩說那塊地將來一定會發　（用在：the_family_land）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. farmland on the Taiwanese western plain, rice paddies, an irrigation channel, betel palms, a low three-section farmhouse, hills behind. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `data_center.webp` · 1×

機房。AI 建置潮　（用在：ai_buildout）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a data centre aisle, server racks with rows of indicator lights, overhead cable trays, cold blue light. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `empty_apartment.webp` · 1×

空屋看房。總價是你全部的積蓄　（用在：first_apartment）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an empty apartment for sale, bare tiled floor, a rectangle of sunlight on a blank wall, an open window, no furniture. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `empty_office.webp` · 1×

蕭條。已經沒有人在講股票了　（用在：the_quiet_bottom）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a mostly emptied office, stripped desks, network cables hanging from the ceiling, boxes by the door, one light on. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `fab.webp` · 1×

晶圓廠。代工廠很缺人　（用在：foundry_before_everyone）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a semiconductor fab bay seen through observation glass, yellow cleanroom light, tool cabinets in a row, no people. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `factory_gate.webp` · 1×

廠區大門。連署書傳了一圈　（用在：union_or_not）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a Taiwanese industrial park factory gate, guard booth, chain-link fence, rows of parked scooters, overcast sky. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `harbour.webp` · 1×

貨櫃碼頭。運價翻五倍　（用在：shipping_supercycle）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a container port, stacked containers in blocks, gantry cranes, a ship at berth, hazy sky. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `lab.webp` · 1×

生技實驗室。新藥二期　（用在：biotech_phase_two）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a biotech laboratory bench, pipette racks, sample trays, a fume hood, cold white light. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `life_start.webp` · 1×

開場。每一局的第一眼，畫的是「還沒發生任何事」　（用在：(engine)）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an empty small-town Taiwanese street at first light, roller shutters still down, an arcade walkway, one parked scooter, the road running out of frame. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `market_street.webp` · 1×

早餐店。隔壁桌在比誰賺得多　（用在：everyone_is_talking_stocks）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a Taiwanese breakfast shop on a market street, stainless griddle and stacked steamer baskets, steam, plastic stools, a wall-mounted television, half-raised roller shutter. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `night_classroom.webp` · 1×

補習班。晚上七點到十點　（用在：night_shift_study）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. night outside, hard fluorescent interior light, dark windows. a Taiwanese cram-school classroom at night, rows of small desks, hard fluorescent light, a glass door onto a corridor. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `night_market.webp` · 1×

夜市。晚上去顧攤　（用在：night_market_stall）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. dark night sky, black beyond the lit area, warm artificial light sources in frame, deep shadows. a Taiwanese night market lane, stainless steel food carts under corrugated awnings, bare hanging bulbs, red plastic stools, steam, tiled shophouse facades above. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `old_apartment.webp` · 1×

老公寓。便宜，整理一下就能賣　（用在：old_apartment_renovation）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an old Taiwanese walk-up stairwell, mosaic tile walls, a bank of steel mailboxes, an iron security gate, a bicycle chained under the stairs. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `pantry.webp` · 1×

茶水間。有人壓低聲音報明牌　（用在：hot_tip_from_colleague）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. an office pantry, water dispenser and microwave, a small round table, a notice board with blank sheets. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `park.webp` · 1×

公園。爬四層樓要停一次　（用在：exercise_habit）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a Taiwanese neighbourhood park at dusk, outdoor exercise machines, a tiled walking loop, a large banyan tree with aerial roots. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `school_gate.webp` · 1×

校門口。安親班、才藝班、補習班　（用在：kids_tuition）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a Taiwanese primary school gate at pickup time, steel guardrail, waiting scooters, a covered walkway. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `seminar_hall.webp` · 1×

投資講座。前兩個小時免費　（用在：investment_seminar）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a rented seminar room, a projector screen glowing blank, rows of folding chairs, a leaflet table at the back. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `shop_front.webp` · 1×

店面。加盟很好賺　（用在：franchise_licence）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a vacant Taiwanese street-level shop unit, half-raised roller shutter, tiled step, arcade column, glass reflecting parked scooters. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `street_food.webp` · 1×

麵店。朋友要開店，問你要不要入一股　（用在：friend_noodle_shop）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a small Taiwanese noodle shop, stainless steel counter and steaming stockpot, four folding tables with red plastic stools, tiled walls. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `street_night.webp` · 1×

夜晚的街。有人問你週末有沒有空　（用在：meet_someone）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. dark night sky, black beyond the lit area, warm artificial light sources in frame, deep shadows. a quiet Taiwanese street at night, closed roller shutters, a lit vending machine, scooters under a street lamp, wet asphalt reflections. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `study_room.webp` · 1×

自習室。升等考的簡章放了兩個禮拜　（用在：public_exam_prep）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a public self-study room, partitioned desks each with its own lamp, stacks of reference books, one seat pulled out. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `temple.webp` · 1×

廟埕。訃聞來得突然　（用在：funeral）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a Taiwanese folk temple courtyard, swallowtail roof ridge with ceramic figures, red lanterns, a bronze incense burner, worn stone paving. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `warehouse.webp` · 1×

倉庫。那個零件缺到有錢買不到　（用在：passive_component_squeeze）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. a component warehouse, steel shelving to the ceiling, boxed parts on pallets, a forklift aisle, high windows. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `wind_farm.webp` · 1×

風場。政策要推的東西　（用在：green_energy_grid）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. coastal wind turbines on flat reclaimed land, low grass, a grey sea beyond, overcast sky. wide establishing shot, eye level, open uncluttered centre, calm empty lower third, deserted. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

## 角色

`narrator` 不用畫：它只是對話框上的名字，永遠不佔角色位。

### `friend.webp` · 7×

同輩朋友　（用在：everyone_says_sell、franchise_licence、friend_noodle_shop、friend_wants_to_borrow、old_friends_dinner、someone_else_made_it 等 7 筆）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a friend of the same age in casual clothes, relaxed open posture, faint smile. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `classmate.webp` · 4×

同學（多半來找你投資）　（用在：biotech_phase_two、classmate_startup、foundry_before_everyone、the_internet_thing）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a former classmate in slightly untidy casual wear, one backpack strap on a shoulder, eager leaning-in posture. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `client.webp` · 3×

客戶　（用在：client_dinner、shipping_supercycle、supplier_equity_swap）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a client in a business shirt holding a glass, polite but guarded smile, one hand resting on a folder. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `hr.webp` · 3×

人資　（用在：restructuring、salary_frozen、severance_package）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. an HR staffer holding a closed document folder against the chest, blank lanyard, carefully neutral expression. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `partner.webp` · 3×

伴侶　（用在：have_a_child、meet_someone、partner_career_clash）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a life partner in soft home clothes, calm, arms loosely folded. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `boss.webp` · 2×

主管　（用在：boss_asks_favour、take_the_blame）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a middle-aged manager in a tucked-in shirt, reading glasses pushed up on the forehead, hands behind the back. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `child.webp` · 2×

自己的小孩　（用在：kids_ask_about_money、kids_tuition）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a primary-school-age child in a plain school uniform, looking up, curious. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `colleague_a.webp` · 2×

同事甲（報明牌那個）　（用在：hot_tip_from_colleague、mem_supercycle_a）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a coworker leaning in, one hand half covering the mouth as if lowering their voice, conspiratorial. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `colleague_b.webp` · 2×

同事乙（消息比較硬的那個）　（用在：ai_buildout、colleague_pre_ipo）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. another coworker with headphones around the neck, holding a laptop against the hip, matter-of-fact. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `family.webp` · 2×

家人（一群，不是單一個人）　（用在：family_blames_you、first_paycheck）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. two family members standing shoulder to shoulder, an older one and a younger one, together as one group. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `parent.webp` · 2×

爸媽　（用在：gold_and_fear、parents_need_help）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. an ageing parent in simple home clothes, a phone held to the ear, slightly stooped. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `relative.webp` · 2×

親戚　（用在：inheritance、the_family_land）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a relative in semi-formal clothes at a family gathering, hands folded in front, reserved. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `stranger.webp` · 2×

陌生人（給你不該給的消息那種）　（用在：insider_rumour、trade_secret_offer）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. an unidentifiable figure in a plain jacket, face shadowed under a cap brim, hands in pockets. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `agent.webp` · 1×

保險業務　（用在：insurance_pitch）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. an insurance agent presenting an open document folder, practised smile, pen in the other hand. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `broker.webp` · 1×

營業員　（用在：bank_merger_play）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a securities broker in a shirt and blank lanyard, phone in hand, alert and quick. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `headhunter.webp` · 1×

獵人頭　（用在：headhunter_call）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a recruiter in smart casual, phone to the ear, confident half-turned stance. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `junior.webp` · 1×

新人　（用在：mentor_a_junior）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a fresh graduate in a slightly oversized shirt, clutching a notebook, hesitant posture. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `neighbour.webp` · 1×

鄰居　（用在：neighbour_jumped_in）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a neighbour in home slippers and a polo shirt, car key dangling from a finger, quietly pleased. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `salesman.webp` · 1×

銷售員　（用在：car_or_not）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a car salesperson in a pressed shirt, one hand extended toward the viewer, upbeat. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```

### `speaker.webp` · 1×

講座講者　（用在：investment_seminar）

```
soft cinematic gouache illustration, painterly brushwork, simplified shapes, gentle edges. muted desaturated palette, warm amber against cool slate, restrained contrast. diffused overcast light with one warm source, long soft shadows, slight atmospheric haze. portrait of a contemporary Taiwanese person, East Asian features, black hair, single figure, waist up, three-quarter view, plain flat backdrop, ordinary everyday clothing. a seminar speaker with a lapel mic, caught mid-gesture, over-confident stance. blank unlettered signs, Taiwan, era-neutral between 1985 and 2027
```
