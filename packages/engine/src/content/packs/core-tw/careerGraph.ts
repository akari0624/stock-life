export const coreTwCareerGraph = {
  nodes: [
    { id: 'engineer_junior', industry: 'tech', rank: 1, income: [45, 65] },
    { id: 'engineer_senior', industry: 'tech', rank: 2, income: [70, 100] },
  ],
  edges: [
    {
      from: 'engineer_junior',
      to: 'engineer_senior',
      require: { '>=': ['age', 26] },
      surfacedAs: 'opportunity',
    },
  ],
}
