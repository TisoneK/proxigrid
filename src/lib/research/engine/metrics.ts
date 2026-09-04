/**
 * Proxigrid Research Engine — Metrics
 *
 * The full, honest metric set the Scientist needs (spec §5). Every metric is
 * computed *after* costs. Equity-curve metrics (return, Sharpe, Sortino, vol,
 * max drawdown, CAGR, cost drag) come from the per-bar net return series;
 * trade-level metrics (win rate, expectancy, profit factor) come from the
 * completed round-trip blotter. Both views are standard and intentionally
 * separate — see docs/RESEARCH-ENGINE.md §5.
 *
 * Pure and dependency-free so it is trivially unit-testable.
 */

export interface MetricSet {
  observations: number; // number of bars evaluated
  trades: number; // completed round-trips
  winRate: number; // 0..1
  avgReturn: number; // mean net return per trade (fraction)
  expectancy: number; // net expected value per trade (fraction)
  profitFactor: number; // gross profit / gross loss (Infinity if no losses)
  totalReturnPct: number; // net, over the whole window
  cagrPct: number; // annualized net return
  maxDrawdownPct: number; // worst peak-to-trough on the net equity curve
  sharpe: number; // annualized, risk-free = 0
  sortino: number; // annualized, downside-only
  volatilityPct: number; // annualized stdev of bar returns
  turnover: number; // sum of |Δposition| — overtrading sanity check
  costDragPct: number; // return lost to fees/slippage/spread (gross − net)
}

export interface MetricsInput {
  /** Per-bar net returns of the equity curve (fraction, e.g. 0.001 = +0.1%). */
  netBarReturns: number[];
  /** Per-bar gross returns (before costs), same length — used for cost drag. */
  grossBarReturns: number[];
  /** Net return of each completed trade (fraction). */
  tradeReturns: number[];
  /** Sum of |Δposition| across the sim (notional turnover). */
  turnover: number;
  /** Bars per year for the timeframe (annualization factor). */
  barsPerYear: number;
}

/** Bars per year for a candle interval (crypto trades 24/7/365). */
export function barsPerYear(timeframe: string): number {
  switch (timeframe) {
    case "1m":
      return 525_600;
    case "5m":
      return 105_120;
    case "15m":
      return 35_040;
    case "1h":
      return 8_760;
    case "4h":
      return 2_190;
    case "1d":
      return 365;
    default:
      return 365;
  }
}

const EMPTY: MetricSet = {
  observations: 0,
  trades: 0,
  winRate: 0,
  avgReturn: 0,
  expectancy: 0,
  profitFactor: 0,
  totalReturnPct: 0,
  cagrPct: 0,
  maxDrawdownPct: 0,
  sharpe: 0,
  sortino: 0,
  volatilityPct: 0,
  turnover: 0,
  costDragPct: 0,
};

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample standard deviation (n−1). Returns 0 for fewer than 2 points. */
function sampleStd(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = mean(xs);
  let sq = 0;
  for (const x of xs) sq += (x - m) * (x - m);
  return Math.sqrt(sq / (n - 1));
}

/** Downside deviation vs a 0 target: sqrt(mean(min(0, r)^2)). */
function downsideDeviation(xs: number[]): number {
  if (xs.length === 0) return 0;
  let sq = 0;
  for (const x of xs) {
    const d = Math.min(0, x);
    sq += d * d;
  }
  return Math.sqrt(sq / xs.length);
}

/** Compound a return series into a terminal equity multiple (starting at 1). */
function terminalEquity(returns: number[]): number {
  let eq = 1;
  for (const r of returns) eq *= 1 + r;
  return eq;
}

/** Worst peak-to-trough drawdown of the equity curve, as a positive fraction. */
function maxDrawdown(returns: number[]): number {
  let eq = 1;
  let peak = 1;
  let worst = 0;
  for (const r of returns) {
    eq *= 1 + r;
    if (eq > peak) peak = eq;
    const dd = peak > 0 ? (peak - eq) / peak : 0;
    if (dd > worst) worst = dd;
  }
  return worst;
}

export function computeMetrics(input: MetricsInput): MetricSet {
  const { netBarReturns, grossBarReturns, tradeReturns, turnover, barsPerYear: bpy } = input;
  const n = netBarReturns.length;
  if (n === 0) return { ...EMPTY, turnover };

  const netEquity = terminalEquity(netBarReturns);
  const grossEquity = terminalEquity(grossBarReturns);

  const totalReturnPct = (netEquity - 1) * 100;
  const grossReturnPct = (grossEquity - 1) * 100;

  const m = mean(netBarReturns);
  const sd = sampleStd(netBarReturns);
  const dd = downsideDeviation(netBarReturns);

  const sharpe = sd > 0 ? (m / sd) * Math.sqrt(bpy) : 0;
  const sortino = dd > 0 ? (m / dd) * Math.sqrt(bpy) : 0;
  const volatilityPct = sd * Math.sqrt(bpy) * 100;

  const cagrPct = netEquity > 0 ? (Math.pow(netEquity, bpy / n) - 1) * 100 : -100;

  // Trade-level stats
  const trades = tradeReturns.length;
  const wins = tradeReturns.filter((r) => r > 0);
  const losses = tradeReturns.filter((r) => r < 0);
  const winRate = trades > 0 ? wins.length / trades : 0;
  const avgReturn = trades > 0 ? mean(tradeReturns) : 0;
  const grossProfit = wins.reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  // Expected value per trade = P(win)·avgWin − P(loss)·avgLoss (equals avgReturn by identity).
  const avgWin = wins.length > 0 ? mean(wins) : 0;
  const avgLoss = losses.length > 0 ? Math.abs(mean(losses)) : 0;
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

  return {
    observations: n,
    trades,
    winRate,
    avgReturn,
    expectancy,
    profitFactor,
    totalReturnPct,
    cagrPct,
    maxDrawdownPct: maxDrawdown(netBarReturns) * 100,
    sharpe,
    sortino,
    volatilityPct,
    turnover,
    costDragPct: grossReturnPct - totalReturnPct,
  };
}

/**
 * Replace non-finite metric values (Infinity/NaN from edge cases) with a JSON-
 * safe sentinel. Use before persisting a MetricSet to Prisma `Json`, which
 * cannot represent Infinity.
 */
export function sanitizeMetrics(m: MetricSet, infinitySentinel = 9_999): MetricSet {
  const fix = (v: number) =>
    Number.isFinite(v) ? v : v === Infinity ? infinitySentinel : v === -Infinity ? -infinitySentinel : 0;
  return {
    ...m,
    winRate: fix(m.winRate),
    avgReturn: fix(m.avgReturn),
    expectancy: fix(m.expectancy),
    profitFactor: fix(m.profitFactor),
    totalReturnPct: fix(m.totalReturnPct),
    cagrPct: fix(m.cagrPct),
    maxDrawdownPct: fix(m.maxDrawdownPct),
    sharpe: fix(m.sharpe),
    sortino: fix(m.sortino),
    volatilityPct: fix(m.volatilityPct),
    turnover: fix(m.turnover),
    costDragPct: fix(m.costDragPct),
  };
}
