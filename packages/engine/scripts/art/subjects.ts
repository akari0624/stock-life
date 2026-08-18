// 每個 id 畫什麼。**只寫題材，不寫畫風**——畫風在 styles.ts，換一次全部跟著換。
//
// 每一條都是從真的用到它的事件文字長出來的（跑 `_dumpScenes` 看得到來源）：
// `office` 要同時撐得住「晚上九點主管還在」和「會議室裡沒有人先開口」，
// 所以它畫的是一間**沒有事情正在發生**的辦公室——留白給文字去填。

export interface Subject {
  /** 給人看的一句話 */
  zh: string
  /** 進 prompt 的那一句 */
  en: string
  /**
   * 覆寫共用風格的光線。**只有夜景需要**——共用的「柔和陰天」會把夜市畫成大白天，
   * 這是共用風格唯一擋不住的東西（材質、色調可以共用，太陽在不在天上不行）。
   */
  light?: string
}

export const BG_SUBJECTS: Record<string, Subject> = {
  life_start: {
    zh: '開場。每一局的第一眼，畫的是「還沒發生任何事」',
    en: 'an empty small-town Taiwanese street at first light, roller shutters still down, an arcade walkway, one parked scooter, the road running out of frame',
  },
  home_desk: {
    zh: '個人書桌。理財、報稅、算退休金都在這張桌上發生',
    en: 'a small home desk pushed against a window, laptop, a stack of statements and a mug, one warm desk lamp, night city glow outside',
    light: 'dark night sky, black beyond the lit area, warm artificial light sources in frame, deep shadows',
  },
  office: {
    zh: '一般日間辦公室。加薪、裁員、被拜託的事都在這裡',
    en: 'an open-plan office of low cubicle partitions, monitors and paper trays, fluorescent ceiling, half-drawn blinds, nobody at the desks',
  },
  trading_floor: {
    zh: '券商營業廳。注意台灣是紅漲綠跌',
    en: 'a securities brokerage hall, a wall of quote boards glowing red and green (Taiwanese convention: red is up), rows of worn chairs facing it',
  },
  home: {
    zh: '自己的客廳。第一筆薪水、孩子的問題、催收電話',
    en: 'a modest Taiwanese living room, terrazzo floor, fabric sofa, sliding balcony door with laundry drying beyond, an iron window grille',
  },
  phone: {
    zh: '手機。詐騙、傳言、朋友傳來的連結',
    en: 'a phone lying face up on a table in a dim room, blank glowing screen lighting the surface around it, close intimate framing',
  },
  bank: {
    zh: '銀行營業廳。負債、匯率、圈存、鎖定期',
    en: 'a bank branch hall, numbered queue seats, counter glass and teller windows, a wall clock, polished floor',
  },
  cafe: {
    zh: '咖啡店。被挖角、被借錢、被推銷保險',
    en: 'a small café by a window, two chairs at a two-person table, condensation on the glass, afternoon light',
  },
  factory: {
    zh: '傳統製造廠房。接單、停線、買二手機台',
    en: 'an older manufacturing plant floor, conveyor line and metal presses, overhead lamps, oil-stained concrete, machines idle',
  },
  family_home: {
    zh: '老家。長輩的房子，不是自己的家',
    en: "an elder's home interior, ancestral shelf, plastic-covered sofa, an old wall calendar, afternoon light through window grilles",
  },
  hospital: {
    zh: '醫院。健檢紅字、生孩子、家裡急用錢',
    en: 'a hospital corridor with a row of waiting chairs, curtain rails, a gurney parked against the wall, cold even light',
  },
  restaurant: {
    zh: '餐廳包廂。應酬、同學會、所有人勸你賣掉',
    en: 'a private banquet room, round table with a lazy susan, used glasses and plates, warm ceiling light, door slightly ajar',
  },
  apartment_block: {
    zh: '公寓外觀。房價、收租',
    en: 'a facade of Taiwanese apartment blocks, iron window grilles, split air-conditioner units, stainless water tanks on the roof, tiled exterior walls, tangled cables',
  },
  bedroom_night: {
    zh: '深夜臥室。睡不著、部位剩一半',
    en: 'a bedroom at night, unmade bed, faint street light through a thin curtain, a phone face down on the sheets',
    light: 'night, a single faint cool light source, almost dark, deep shadows',
  },
  conference: {
    zh: '產業研討會。上台當講者、聽不懂的新名詞',
    en: 'an industry conference hall, rows of empty seats, a lit stage with an empty lectern, projector haze in the beam',
  },
  meeting_room: {
    zh: '會議室。扛責任、被小八歲的主管質問',
    en: 'a corporate meeting room, long table, whiteboard wiped but streaked, blinds, chairs pushed out of line',
  },
  office_night: {
    zh: '深夜的辦公室。三倍了、還沒走',
    en: 'the same open-plan office after midnight, most ceiling lights off, one desk lamp burning, city lights beyond the glass',
    light: 'dark night sky, black beyond the lit area, warm artificial light sources in frame, deep shadows',
  },
  parking_lot: {
    zh: '地下停車場。有人在這裡叫住你',
    en: 'an underground car park, concrete pillars, sodium lamps, mostly empty bays, a ramp curving up out of frame',
  },
  startup_office: {
    zh: '新創辦公室。同學說他在做一個很大的東西',
    en: 'a small startup office in a converted apartment, mismatched desks, a whiteboard covered in diagrams, cardboard boxes stacked in a corner',
  },
  street: {
    zh: '白天的街。樂透排隊、鄰居換車',
    en: 'a daytime Taiwanese street, ground-floor arcade walkway with square concrete columns, tiled building facades, scooters parked nose-in along the curb',
  },
  airport: {
    zh: '機場。外派一年',
    en: 'an airport departure hall, a row of check-in counters, luggage trolleys, tall windows with an aircraft tail beyond',
  },
  banquet: {
    zh: '喜宴。要辦幾桌',
    en: 'a wedding banquet hall, round tables under red cloth, a gold fabric backdrop, stacked spare chairs at the side',
  },
  car_dealer: {
    zh: '車商展示間。要不要換車',
    en: 'a car showroom, polished floor, two sedans under spot lighting, a glass wall onto the street',
  },
  city_skyline: {
    zh: '城市天際線。你做了二十年的東西變成傳統產業',
    en: 'a Taiwanese city skyline at dusk from a rooftop, water tanks and rooftop additions in front of glass towers, a mountain ridge behind',
  },
  classroom: {
    zh: '學校教室。這一局的玩家是老師',
    en: 'a school classroom, wooden desks in rows, a chalkboard, ceiling fans, late afternoon light across the floor',
  },
  clinic: {
    zh: '診所。健檢通知放到快過期',
    en: 'a small neighbourhood clinic waiting area, plastic chairs, a reception window, a rack of pamphlets',
  },
  community_center: {
    zh: '社區活動中心。當志工',
    en: 'a Taiwanese community activity centre hall, folding tables, stacked red plastic chairs, roll-up banners, terrazzo floor',
  },
  commute: {
    zh: '通勤。倦怠的那一年',
    en: 'the interior of a metro carriage, hand straps swaying, an empty seat row, tunnel darkness through the window',
  },
  countryside: {
    zh: '農地。長輩說那塊地將來一定會發',
    en: 'farmland on the Taiwanese western plain, rice paddies, an irrigation channel, betel palms, a low three-section farmhouse, hills behind',
  },
  data_center: {
    zh: '機房。AI 建置潮',
    en: 'a data centre aisle, server racks with rows of indicator lights, overhead cable trays, cold blue light',
  },
  empty_apartment: {
    zh: '空屋看房。總價是你全部的積蓄',
    en: 'an empty apartment for sale, bare tiled floor, a rectangle of sunlight on a blank wall, an open window, no furniture',
  },
  empty_office: {
    zh: '蕭條。已經沒有人在講股票了',
    en: 'a mostly emptied office, stripped desks, network cables hanging from the ceiling, boxes by the door, one light on',
  },
  fab: {
    zh: '晶圓廠。代工廠很缺人',
    en: 'a semiconductor fab bay seen through observation glass, yellow cleanroom light, tool cabinets in a row, no people',
  },
  factory_gate: {
    zh: '廠區大門。連署書傳了一圈',
    en: 'a Taiwanese industrial park factory gate, guard booth, chain-link fence, rows of parked scooters, overcast sky',
  },
  harbour: {
    zh: '貨櫃碼頭。運價翻五倍',
    en: 'a container port, stacked containers in blocks, gantry cranes, a ship at berth, hazy sky',
  },
  lab: {
    zh: '生技實驗室。新藥二期',
    en: 'a biotech laboratory bench, pipette racks, sample trays, a fume hood, cold white light',
  },
  market_street: {
    zh: '早餐店。隔壁桌在比誰賺得多',
    en: 'a Taiwanese breakfast shop on a market street, stainless griddle and stacked steamer baskets, steam, plastic stools, a wall-mounted television, half-raised roller shutter',
  },
  night_classroom: {
    zh: '補習班。晚上七點到十點',
    en: 'a Taiwanese cram-school classroom at night, rows of small desks, hard fluorescent light, a glass door onto a corridor',
    light: 'night outside, hard fluorescent interior light, dark windows',
  },
  night_market: {
    zh: '夜市。晚上去顧攤',
    en: 'a Taiwanese night market lane, stainless steel food carts under corrugated awnings, bare hanging bulbs, red plastic stools, steam, tiled shophouse facades above',
    light: 'dark night sky, black beyond the lit area, warm artificial light sources in frame, deep shadows',
  },
  old_apartment: {
    zh: '老公寓。便宜，整理一下就能賣',
    en: 'an old Taiwanese walk-up stairwell, mosaic tile walls, a bank of steel mailboxes, an iron security gate, a bicycle chained under the stairs',
  },
  pantry: {
    zh: '茶水間。有人壓低聲音報明牌',
    en: 'an office pantry, water dispenser and microwave, a small round table, a notice board with blank sheets',
  },
  park: {
    zh: '公園。爬四層樓要停一次',
    en: 'a Taiwanese neighbourhood park at dusk, outdoor exercise machines, a tiled walking loop, a large banyan tree with aerial roots',
  },
  school_gate: {
    zh: '校門口。安親班、才藝班、補習班',
    en: 'a Taiwanese primary school gate at pickup time, steel guardrail, waiting scooters, a covered walkway',
  },
  seminar_hall: {
    zh: '投資講座。前兩個小時免費',
    en: 'a rented seminar room, a projector screen glowing blank, rows of folding chairs, a leaflet table at the back',
  },
  shop_front: {
    zh: '店面。加盟很好賺',
    en: 'a vacant Taiwanese street-level shop unit, half-raised roller shutter, tiled step, arcade column, glass reflecting parked scooters',
  },
  street_food: {
    zh: '麵店。朋友要開店，問你要不要入一股',
    en: 'a small Taiwanese noodle shop, stainless steel counter and steaming stockpot, four folding tables with red plastic stools, tiled walls',
  },
  street_night: {
    zh: '夜晚的街。有人問你週末有沒有空',
    en: 'a quiet Taiwanese street at night, closed roller shutters, a lit vending machine, scooters under a street lamp, wet asphalt reflections',
    light: 'dark night sky, black beyond the lit area, warm artificial light sources in frame, deep shadows',
  },
  study_room: {
    zh: '自習室。升等考的簡章放了兩個禮拜',
    en: 'a public self-study room, partitioned desks each with its own lamp, stacks of reference books, one seat pulled out',
  },
  temple: {
    zh: '廟埕。訃聞來得突然',
    en: 'a Taiwanese folk temple courtyard, swallowtail roof ridge with ceramic figures, red lanterns, a bronze incense burner, worn stone paving',
  },
  warehouse: {
    zh: '倉庫。那個零件缺到有錢買不到',
    en: 'a component warehouse, steel shelving to the ceiling, boxed parts on pallets, a forklift aisle, high windows',
  },
  wind_farm: {
    zh: '風場。政策要推的東西',
    en: 'coastal wind turbines on flat reclaimed land, low grass, a grey sea beyond, overcast sky',
  },
}

/**
 * 角色。舞台是把立繪貼在左右兩側、底部對齊，所以一律**去背、半身、三七分**。
 *
 * `narrator` 不在這裡：它只會出現在對話框的名字欄，永遠不佔角色位（見 ART.md）。
 */
export const ACTOR_SUBJECTS: Record<string, Subject> = {
  friend: { zh: '同輩朋友', en: 'a friend of the same age in casual clothes, relaxed open posture, faint smile' },
  classmate: {
    zh: '同學（多半來找你投資）',
    en: 'a former classmate in slightly untidy casual wear, one backpack strap on a shoulder, eager leaning-in posture',
  },
  client: {
    zh: '客戶',
    en: 'a client in a business shirt holding a glass, polite but guarded smile, one hand resting on a folder',
  },
  hr: {
    zh: '人資',
    en: 'an HR staffer holding a closed document folder against the chest, blank lanyard, carefully neutral expression',
  },
  partner: { zh: '伴侶', en: 'a life partner in soft home clothes, calm, arms loosely folded' },
  boss: {
    zh: '主管',
    en: 'a middle-aged manager in a tucked-in shirt, reading glasses pushed up on the forehead, hands behind the back',
  },
  child: { zh: '自己的小孩', en: 'a primary-school-age child in a plain school uniform, looking up, curious' },
  colleague_a: {
    zh: '同事甲（報明牌那個）',
    en: 'a coworker leaning in, one hand half covering the mouth as if lowering their voice, conspiratorial',
  },
  colleague_b: {
    zh: '同事乙（消息比較硬的那個）',
    en: 'another coworker with headphones around the neck, holding a laptop against the hip, matter-of-fact',
  },
  family: {
    zh: '家人（一群，不是單一個人）',
    en: 'two family members standing shoulder to shoulder, an older one and a younger one, together as one group',
  },
  parent: { zh: '爸媽', en: 'an ageing parent in simple home clothes, a phone held to the ear, slightly stooped' },
  relative: { zh: '親戚', en: 'a relative in semi-formal clothes at a family gathering, hands folded in front, reserved' },
  stranger: {
    zh: '陌生人（給你不該給的消息那種）',
    en: 'an unidentifiable figure in a plain jacket, face shadowed under a cap brim, hands in pockets',
  },
  agent: {
    zh: '保險業務',
    en: 'an insurance agent presenting an open document folder, practised smile, pen in the other hand',
  },
  broker: { zh: '營業員', en: 'a securities broker in a shirt and blank lanyard, phone in hand, alert and quick' },
  headhunter: { zh: '獵人頭', en: 'a recruiter in smart casual, phone to the ear, confident half-turned stance' },
  junior: {
    zh: '新人',
    en: 'a fresh graduate in a slightly oversized shirt, clutching a notebook, hesitant posture',
  },
  neighbour: {
    zh: '鄰居',
    en: 'a neighbour in home slippers and a polo shirt, car key dangling from a finger, quietly pleased',
  },
  salesman: { zh: '銷售員', en: 'a car salesperson in a pressed shirt, one hand extended toward the viewer, upbeat' },
  speaker: {
    zh: '講座講者',
    en: 'a seminar speaker with a lapel mic, caught mid-gesture, over-confident stance',
  },
}
