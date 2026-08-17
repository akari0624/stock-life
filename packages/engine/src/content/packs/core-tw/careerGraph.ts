// §7.3 職涯圖：節點是位置，邊是「系統在你符合條件時提案的轉換」。
//
// 三條設計線：
// 1. **收入不是唯一的軸。** 公職／教職給的是穩定與時間（rank 高 → 骰點多），
//    金融與創業給的是變動極大的區間。玩家要的是本金，但本金不只來自薪水。
// 2. **每個節點的出邊不超過三條**，否則每一年光是職涯就要回答四五個問題。
// 3. **邊的條件用能力，不用年資。** 「你這輩子花了幾點在 study」比「幾歲」
//    更能說出這個人是誰（counter.dice_* 是 §7.5 的一等公民）。
//
// income 單位是「万／年」，與引擎的 capital 同一單位。

export const coreTwCareerGraph = {
  nodes: [
    // 起點：十八歲，還沒決定自己是誰
    { id: 'part_timer', industry: 'service', rank: 1, income: [18, 26] },

    // r1 · 第一份正職
    { id: 'engineer_junior', industry: 'tech', rank: 1, income: [45, 65] },
    { id: 'bank_teller', industry: 'finance', rank: 1, income: [38, 52] },
    { id: 'sales_junior', industry: 'trade', rank: 1, income: [32, 60] },
    { id: 'civil_servant_junior', industry: 'public', rank: 1, income: [42, 54] },
    { id: 'teacher', industry: 'education', rank: 1, income: [44, 58] },
    { id: 'operator', industry: 'factory', rank: 1, income: [34, 46] },

    // r2 · 開始被叫「資深」
    { id: 'engineer_senior', industry: 'tech', rank: 2, income: [70, 100] },
    { id: 'product_manager', industry: 'tech', rank: 2, income: [78, 112] },
    { id: 'analyst', industry: 'finance', rank: 2, income: [72, 108] },
    { id: 'broker', industry: 'finance', rank: 2, income: [45, 150] },
    { id: 'sales_manager', industry: 'trade', rank: 2, income: [70, 125] },
    { id: 'civil_servant_mid', industry: 'public', rank: 2, income: [58, 74] },
    { id: 'senior_teacher', industry: 'education', rank: 2, income: [62, 80] },
    { id: 'line_lead', industry: 'factory', rank: 2, income: [50, 66] },
    { id: 'shop_owner', industry: 'own', rank: 2, income: [30, 130] },

    // r3 · 有人開始叫你老師、老闆、學長
    { id: 'tech_lead', industry: 'tech', rank: 3, income: [120, 165] },
    { id: 'engineering_director', industry: 'tech', rank: 3, income: [150, 225] },
    { id: 'fund_manager', industry: 'finance', rank: 3, income: [140, 300] },
    { id: 'branch_manager', industry: 'finance', rank: 3, income: [110, 155] },
    { id: 'trading_boss', industry: 'trade', rank: 3, income: [95, 240] },
    { id: 'civil_servant_senior', industry: 'public', rank: 3, income: [82, 104] },
    { id: 'principal', industry: 'education', rank: 3, income: [88, 112] },
    { id: 'plant_manager', industry: 'factory', rank: 3, income: [92, 132] },
    { id: 'founder', industry: 'own', rank: 3, income: [0, 220] },
    { id: 'consultant', industry: 'own', rank: 3, income: [70, 190] },

    // r4 · 少數人到得了的地方
    { id: 'cto', industry: 'tech', rank: 4, income: [240, 400] },
    { id: 'managing_director', industry: 'finance', rank: 4, income: [280, 520] },
    { id: 'entrepreneur', industry: 'own', rank: 4, income: [40, 620] },
  ],

  edges: [
    // 十八到二十二歲：你選了一條路，其實只是選了第一份工作
    {
      from: 'part_timer',
      to: 'engineer_junior',
      require: { all: [{ '>=': ['age', 22] }, { '>=': ['cognition', 12] }, { chance: 0.3 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'part_timer',
      to: 'bank_teller',
      require: { all: [{ '>=': ['age', 22] }, { '>=': ['network', 10] }, { chance: 0.3 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'part_timer',
      to: 'sales_junior',
      require: { all: [{ '>=': ['age', 21] }, { '>=': ['network', 7] }, { chance: 0.3 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'part_timer',
      to: 'civil_servant_junior',
      require: { all: [{ '>=': ['age', 23] }, { '>=': ['counter.dice_study', 8] }, { chance: 0.3 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'part_timer',
      to: 'teacher',
      require: { all: [{ '>=': ['age', 23] }, { '>=': ['counter.dice_study', 6] }, { '>=': ['nerve', 40] }, { chance: 0.3 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'part_timer',
      to: 'operator',
      require: { all: [{ '>=': ['age', 20] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },

    // 工程師這條線
    {
      from: 'engineer_junior',
      to: 'engineer_senior',
      require: { all: [{ '>=': ['age', 26] }, { '>=': ['cognition', 20] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'engineer_junior',
      to: 'product_manager',
      require: { all: [{ '>=': ['age', 27] }, { '>=': ['network', 22] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'engineer_senior',
      to: 'tech_lead',
      require: { all: [{ '>=': ['age', 32] }, { '>=': ['cognition', 35] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'engineer_senior',
      to: 'consultant',
      require: { all: [{ '>=': ['age', 34] }, { '>=': ['network', 34] }, { '>=': ['nerve', 55] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'product_manager',
      to: 'engineering_director',
      require: { all: [{ '>=': ['age', 34] }, { '>=': ['network', 30] }, { '>=': ['cognition', 30] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'product_manager',
      to: 'founder',
      require: { all: [{ '>=': ['age', 30] }, { '>=': ['nerve', 65] }, { '>=': ['network', 28] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'tech_lead',
      to: 'engineering_director',
      require: { all: [{ '>=': ['age', 38] }, { '>=': ['network', 32] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'tech_lead',
      to: 'founder',
      require: { all: [{ '>=': ['age', 35] }, { '>=': ['nerve', 70] }, { '>=': ['capital', 150] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'engineering_director',
      to: 'cto',
      require: { all: [{ '>=': ['age', 46] }, { '>=': ['cognition', 78] }, { '>=': ['network', 58] }] },
      surfacedAs: 'opportunity',
    },

    // 金融這條線：看得懂數字的人，最後在賣自己的判斷
    {
      from: 'bank_teller',
      to: 'analyst',
      require: { all: [{ '>=': ['age', 26] }, { '>=': ['cognition', 24] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'bank_teller',
      to: 'broker',
      require: { all: [{ '>=': ['age', 25] }, { '>=': ['network', 20] }, { '>=': ['nerve', 55] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'analyst',
      to: 'fund_manager',
      require: { all: [{ '>=': ['age', 34] }, { '>=': ['cognition', 45] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'analyst',
      to: 'branch_manager',
      require: { all: [{ '>=': ['age', 33] }, { '>=': ['network', 30] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'broker',
      to: 'branch_manager',
      require: { all: [{ '>=': ['age', 33] }, { '>=': ['network', 34] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'broker',
      to: 'fund_manager',
      require: { all: [{ '>=': ['age', 36] }, { '>=': ['cognition', 48] }, { '>=': ['counter.opportunities_taken', 2] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'fund_manager',
      to: 'managing_director',
      require: { all: [{ '>=': ['age', 47] }, { '>=': ['network', 62] }, { '>=': ['cognition', 80] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'branch_manager',
      to: 'managing_director',
      require: { all: [{ '>=': ['age', 48] }, { '>=': ['network', 70] }, { '>=': ['capital', 600] }] },
      surfacedAs: 'opportunity',
    },

    // 業務／貿易：人脈直接換成收入的那條路
    {
      from: 'sales_junior',
      to: 'sales_manager',
      require: { all: [{ '>=': ['age', 27] }, { '>=': ['network', 24] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'sales_junior',
      to: 'shop_owner',
      require: { all: [{ '>=': ['age', 28] }, { '>=': ['capital', 60] }, { '>=': ['nerve', 60] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'sales_manager',
      to: 'trading_boss',
      require: { all: [{ '>=': ['age', 35] }, { '>=': ['network', 38] }, { '>=': ['capital', 120] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'sales_manager',
      to: 'consultant',
      require: { all: [{ '>=': ['age', 38] }, { '>=': ['cognition', 32] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'trading_boss',
      to: 'entrepreneur',
      require: { all: [{ '>=': ['age', 48] }, { '>=': ['capital', 2500] }, { '>=': ['nerve', 75] }] },
      surfacedAs: 'opportunity',
    },

    // 公職與教職：薪水的天花板很低，但時間與穩定是真的
    {
      from: 'civil_servant_junior',
      to: 'civil_servant_mid',
      require: { all: [{ '>=': ['age', 29] }, { '>=': ['counter.experience_years', 6] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'civil_servant_mid',
      to: 'civil_servant_senior',
      require: { all: [{ '>=': ['age', 40] }, { '>=': ['counter.experience_years', 16] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'teacher',
      to: 'senior_teacher',
      require: { all: [{ '>=': ['age', 30] }, { '>=': ['counter.experience_years', 7] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'senior_teacher',
      to: 'principal',
      require: { all: [{ '>=': ['age', 42] }, { '>=': ['network', 26] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'senior_teacher',
      to: 'consultant',
      require: { all: [{ '>=': ['age', 40] }, { '>=': ['cognition', 45] }, { '>=': ['network', 30] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },

    // 現場：從作業員一路做到廠長，是這個島真正發生過最多次的故事
    {
      from: 'operator',
      to: 'line_lead',
      require: { all: [{ '>=': ['age', 26] }, { '>=': ['counter.experience_years', 5] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'operator',
      to: 'engineer_junior',
      require: { all: [{ '>=': ['age', 25] }, { '>=': ['counter.dice_study', 14] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'line_lead',
      to: 'plant_manager',
      require: { all: [{ '>=': ['age', 38] }, { '>=': ['counter.experience_years', 15] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'line_lead',
      to: 'shop_owner',
      require: { all: [{ '>=': ['age', 34] }, { '>=': ['capital', 80] }, { '>=': ['nerve', 62] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'plant_manager',
      to: 'entrepreneur',
      require: { all: [{ '>=': ['age', 50] }, { '>=': ['capital', 2500] }, { '>=': ['network', 60] }] },
      surfacedAs: 'opportunity',
    },

    // 自己做：唯一一條收入下限是零的路
    {
      from: 'shop_owner',
      to: 'trading_boss',
      require: { all: [{ '>=': ['age', 36] }, { '>=': ['capital', 200] }, { '>=': ['network', 30] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'founder',
      to: 'entrepreneur',
      require: { all: [{ '>=': ['age', 46] }, { '>=': ['capital', 2000] }, { '>=': ['nerve', 65] }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'founder',
      to: 'consultant',
      require: { all: [{ '>=': ['age', 40] }, { '<=': ['capital', 120] }, { chance: 0.25 }] },
      surfacedAs: 'opportunity',
    },
    {
      from: 'consultant',
      to: 'entrepreneur',
      require: { all: [{ '>=': ['age', 50] }, { '>=': ['capital', 2500] }, { '>=': ['nerve', 70] }] },
      surfacedAs: 'opportunity',
    },
  ],
}
