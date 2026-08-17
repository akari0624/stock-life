import type { RngStream } from '../../rng/SeededRng.js'
import type { EraPhase, PhaseSegment, ThemeWave, Timeline } from './Timeline.js'
import type { WorldGenerator, WorldOptions } from './WorldGenerator.js'
import { continueCycles, generateThemeWaves } from './cycles.js'

// §7.4's second generator: the real skeleton. 1990 萬點 → 2000 網路泡沫 →
// 2008 海嘯 → 2020 疫情 → 2025 AI.
//
// Two deliberate rules:
//
// 1. **History is not random.** Every seed sees the same crashes in the same
//    years — that is the whole appeal of the mode. The seed still decides
//    everything else (which opportunities reach you, what they turn out to
//    be), so two lives in the same history are still two different lives.
// 2. **The future is.** The table stops at the last year anyone can claim to
//    know; beyond it the timeline continues with the procedural cycle roller.
//    A life that starts in 2010 therefore retires into a world that is
//    genuinely unwritten, instead of a decade frozen in the final phase.
//
// Theme labels come from the same vocabulary the random generator uses, so a
// content pack's `window.themes` works in both modes without a second table
// (this alignment is what S11's balance report flagged as missing).

export const TW_HISTORY_ID = 'tw-history'

/** The last year the table claims to describe. After this, cycles are rolled. */
export const TW_HISTORY_LAST_YEAR = 2027

interface HistoryEntry {
  year: number
  phase: EraPhase
  /** What that year is remembered for — kept in the file, not in the UI. */
  note: string
}

/**
 * One entry per year, phase-by-phase. Written out longhand rather than as
 * (start, length) segments because that is how it gets fact-checked: you can
 * read down the column and see the years you lived through.
 */
const HISTORY: readonly HistoryEntry[] = [
  { year: 1985, phase: 'recovery', note: '低利、熱錢開始流入' },
  { year: 1986, phase: 'boom', note: '台股站上千點' },
  { year: 1987, phase: 'boom', note: '全民瘋股票' },
  { year: 1988, phase: 'mania', note: '證所稅風暴前的最後狂歡' },
  { year: 1989, phase: 'mania', note: '一路衝向萬點' },
  { year: 1990, phase: 'crash', note: '萬二到兩千五，八個月蒸發八成' },
  { year: 1991, phase: 'recession', note: '斷頭與跳票的餘震' },
  { year: 1992, phase: 'recession', note: '成交量枯竭' },
  { year: 1993, phase: 'recovery', note: '電子股接棒金融股' },
  { year: 1994, phase: 'recovery', note: '晶圓代工開始被看見' },
  { year: 1995, phase: 'boom', note: '記憶體與主機板的黃金年代' },
  { year: 1996, phase: 'boom', note: '資金回流、指數翻倍' },
  { year: 1997, phase: 'crash', note: '亞洲金融風暴' },
  { year: 1998, phase: 'recession', note: '本土型金融風暴、地雷股' },
  { year: 1999, phase: 'recovery', note: '九二一之後的重建與網路熱' },
  { year: 2000, phase: 'mania', note: '達康狂熱，什麼都能上市' },
  { year: 2001, phase: 'crash', note: '網路泡沫破裂' },
  { year: 2002, phase: 'recession', note: '裁員、無薪假、股價腰斬再腰斬' },
  { year: 2003, phase: 'recovery', note: 'SARS 之後的急遽反彈' },
  { year: 2004, phase: 'recovery', note: '面板與 DRAM 的資本支出競賽' },
  { year: 2005, phase: 'boom', note: '原物料與航運起飛' },
  { year: 2006, phase: 'boom', note: '房市與資產股同步走高' },
  { year: 2007, phase: 'mania', note: '什麼都漲，融資餘額創新高' },
  { year: 2008, phase: 'crash', note: '金融海嘯' },
  { year: 2009, phase: 'recovery', note: '救市資金與 V 型反彈' },
  { year: 2010, phase: 'recovery', note: '智慧型手機供應鏈成形' },
  { year: 2011, phase: 'recession', note: '歐債危機、面板慘業' },
  { year: 2012, phase: 'recovery', note: '手機零組件的最後一波' },
  { year: 2013, phase: 'boom', note: '生技股與資金派對' },
  { year: 2014, phase: 'boom', note: '製造業回溫、房價高點' },
  { year: 2015, phase: 'crash', note: '八月股災與資金撤出' },
  { year: 2016, phase: 'recovery', note: '被動元件與高股息' },
  { year: 2017, phase: 'boom', note: '記憶體漲價循環、加密貨幣第一次上新聞' },
  { year: 2018, phase: 'recession', note: '貿易戰與年底急跌' },
  { year: 2019, phase: 'recovery', note: '台商回流、伺服器需求' },
  { year: 2020, phase: 'crash', note: '三月疫情熔斷' },
  { year: 2021, phase: 'mania', note: '航運與資金狂潮，人人都是少年股神' },
  { year: 2022, phase: 'crash', note: '升息、成長股殺估值、幣圈崩塌' },
  { year: 2023, phase: 'recovery', note: '通膨降溫，AI 開始被談論' },
  { year: 2024, phase: 'boom', note: 'AI 供應鏈全面點火' },
  { year: 2025, phase: 'mania', note: '算力軍備競賽，估值講的是十年後' },
  { year: 2026, phase: 'crash', note: '（表的盡頭：此後由種子接手）' },
  { year: 2027, phase: 'recession', note: '（表的盡頭：此後由種子接手）' },
]

/**
 * Theme waves, in the same vocabulary as `DEFAULT_THEME_POOL`. Overlapping on
 * purpose — more than one thing is hot at a time, and an opportunity written
 * for `property` should be able to show up during the電子 boom too.
 */
const THEME_WAVES: readonly ThemeWave[] = [
  { theme: 'finance', startYear: 1985, years: 6 },
  { theme: 'property', startYear: 1987, years: 5 },
  { theme: 'memory', startYear: 1993, years: 5 },
  { theme: 'consumer', startYear: 1994, years: 4 },
  { theme: 'internet', startYear: 1998, years: 4 },
  { theme: 'biotech', startYear: 2001, years: 3 },
  { theme: 'shipping', startYear: 2003, years: 5 },
  { theme: 'energy', startYear: 2004, years: 5 },
  { theme: 'property', startYear: 2005, years: 5 },
  { theme: 'finance', startYear: 2007, years: 3 },
  { theme: 'consumer', startYear: 2009, years: 5 },
  { theme: 'biotech', startYear: 2012, years: 4 },
  { theme: 'memory', startYear: 2013, years: 4 },
  { theme: 'property', startYear: 2013, years: 4 },
  { theme: 'crypto', startYear: 2017, years: 2 },
  { theme: 'memory', startYear: 2017, years: 3 },
  { theme: 'shipping', startYear: 2020, years: 3 },
  { theme: 'biotech', startYear: 2020, years: 3 },
  { theme: 'crypto', startYear: 2020, years: 3 },
  { theme: 'energy', startYear: 2022, years: 4 },
  { theme: 'ai', startYear: 2023, years: 5 },
]

/** Collapses the year-by-year table into the contiguous segments a Timeline wants. */
function segmentsFrom(entries: readonly HistoryEntry[]): PhaseSegment[] {
  const segments: PhaseSegment[] = []
  for (const entry of entries) {
    const last = segments[segments.length - 1]
    if (last && last.phase === entry.phase && last.startYear + last.years === entry.year) {
      last.years += 1
    } else {
      segments.push({ phase: entry.phase, startYear: entry.year, years: 1 })
    }
  }
  return segments
}

/** The remembered phase of a single year — used by tests and by content notes. */
export function twHistoryPhaseAt(year: number): EraPhase | undefined {
  return HISTORY.find((entry) => entry.year === year)?.phase
}

export function twHistoryNoteAt(year: number): string | undefined {
  return HISTORY.find((entry) => entry.year === year)?.note
}

export const twHistoryWorldGenerator: WorldGenerator = {
  id: TW_HISTORY_ID,

  generate(rng: RngStream, opts: WorldOptions): Timeline {
    if (opts.endYear < opts.startYear) {
      throw new Error('WorldOptions.endYear must be >= startYear')
    }

    // Everything from the table that this life can actually see, plus one
    // segment of history before it so `eraAt` has something to clamp to.
    const covered = HISTORY.filter((entry) => entry.year <= opts.endYear)
    const phases = segmentsFrom(covered)

    // Past the last remembered year, the future is rolled like any other world.
    const lastYear = phases.reduce((year, segment) => Math.max(year, segment.startYear + segment.years), opts.startYear)
    if (lastYear <= opts.endYear) phases.push(...continueCycles(rng, lastYear, opts.endYear))

    const themes: ThemeWave[] = THEME_WAVES.filter((wave) => wave.startYear <= opts.endYear).map((wave) => ({ ...wave }))
    // Same treatment for themes: nobody knows what is hot in 2040.
    if (lastYear <= opts.endYear) {
      const pool = opts.themePool
      themes.push(...generateThemeWaves(rng, lastYear, opts.endYear, pool))
    }

    return {
      generatorId: TW_HISTORY_ID,
      startYear: opts.startYear,
      endYear: opts.endYear,
      phases,
      themes,
    }
  },
}
