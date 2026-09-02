/**
 * Proxigrid — Strategy backtester (pure)
 *
 * Simulates a long-only strategy over historical candles and reports P&L.
 * Enters fully on a buy signal, exits fully on a sell signal; equity compounds
 * across completed round-trips. Reuses lib/indicators.
 *
 * Costs are modeled per side: feeBps (exchange fee) + slippageBps (spread
 * walking). Buys fill at close*(1+c), sells realize close*(1-c), so a
 * round trip pays 2c — the default 15bps/side is ~0.3% per position.
 * totalReturnPct is NET (what the trader keeps); grossReturnPct is the
 * zero-cost comparison. Wins are counted on net P&L.
 */

import { ema, rsi } from "@/lib/indicators";
import type { Candle } from "@/hooks/use-candles";

export type Strategy = "ma_crossover" | "rsi_reversion";

export interface BacktestParams {
  strategy: Strategy;
  // ma_crossover
  fastMA: number;
  slowMA: number;
  // rsi_reversion
  rsiPeriod: number;
  oversold: number;
  overbought: number;
  // Trading costs, per side, in basis points. Binance spot taker fee is 10bps;
  // slippage models walking the spread. A round trip pays both sides, so the
  // default 15bps/side is ~0.3% per position — the bar any strategy must clear.
  feeBps?: number;
  slippageBps?: number;
}

export interface Trade {
  index: number;
  time: number;
  price: number;
  side: "buy" | "sell";
}

export interface BacktestResult {
  trades: Trade[];
  /** Return with fees + slippage applied — what the trader actually keeps. */
  totalReturnPct: number;
  /** Return with zero trading costs, for comparison. */
  grossReturnPct: number;
  winRate: number; // 0..1 — wins are counted on NET round-trip P&L
  totalTrades: number; // completed round-trips
  /** True when a position was still open at the end (its P&L is marked to market). */
  hasOpenPosition: boolean;
  fast: (number | null)[];
  slow: (number | null)[];
}

export const DEFAULT_PARAMS: BacktestParams = {
  strategy: "ma_crossover",
  fastMA: 7,
  slowMA: 20,
  rsiPeriod: 14,
  oversold: 30,
  overbought: 70,
  feeBps: 10,
  slippageBps: 5,
};

/** Per-bar signals: +1 = enter long, -1 = exit long, 0 = hold. */
function signalSeries(
  candles: Candle[],
  p: BacktestParams
): { signals: number[]; fast: (number | null)[]; slow: (number | null)[] } {
  const n = candles.length;
  const signals = new Array(n).fill(0);

  if (p.strategy === "ma_crossover") {
    const fast = ema(candles, Math.max(1, p.fastMA));
    const slow = ema(candles, Math.max(1, p.slowMA));
    for (let i = 1; i < n; i++) {
      const f0 = fast[i - 1];
      const s0 = slow[i - 1];
      const f1 = fast[i];
      const s1 = slow[i];
      if (f0 === null || s0 === null || f1 === null || s1 === null) continue;
      if (f0 <= s0 && f1 > s1) signals[i] = 1; // golden cross
      else if (f0 >= s0 && f1 < s1) signals[i] = -1; // death cross
    }
    return { signals, fast, slow };
  }

  // rsi_reversion
  const r = rsi(candles, Math.max(2, p.rsiPeriod));
  for (let i = 1; i < n; i++) {
    const prev = r[i - 1];
    const cur = r[i];
    if (prev === null || cur === null) continue;
    if (prev >= p.oversold && cur < p.oversold) signals[i] = 1; // dropped into oversold
    else if (prev <= p.overbought && cur > p.overbought) signals[i] = -1; // rose into overbought
  }
  return { signals, fast: r, slow: [] };
}

export function runBacktest(candles: Candle[], p: BacktestParams): BacktestResult {
  const { signals, fast, slow } = signalSeries(candles, p);
  // Per-side cost: buys fill worse (price * up), sells realize less (price * down).
  const c = (Math.max(0, p.feeBps ?? 0) + Math.max(0, p.slippageBps ?? 0)) / 10_000;
  const buyFill = 1 + c;
  const sellFill = 1 - c;
  const trades: Trade[] = [];
  let inPosition = false;
  let entryPrice = 0; // raw signal price; the cost basis is entryPrice * buyFill
  let gross = 1;
  let net = 1;
  let wins = 0;
  let completed = 0;

  for (let i = 0; i < candles.length; i++) {
    const price = candles[i].close;
    const time = candles[i].closeTime;
    if (!inPosition && signals[i] === 1) {
      inPosition = true;
      entryPrice = price;
      trades.push({ index: i, time, price, side: "buy" });
    } else if (inPosition && signals[i] === -1) {
      inPosition = false;
      const grossRet = price / entryPrice;
      const netRet = (price * sellFill) / (entryPrice * buyFill);
      gross *= grossRet;
      net *= netRet;
      completed += 1;
      if (netRet > 1) wins += 1;
      trades.push({ index: i, time, price, side: "sell" });
    }
  }

  // Mark-to-market an open position at the last close as a liquidation value
  // (exit costs applied — that's what the position is worth if sold now).
  if (inPosition && candles.length > 0) {
    const last = candles[candles.length - 1].close;
    gross *= last / entryPrice;
    net *= (last * sellFill) / (entryPrice * buyFill);
  }

  return {
    trades,
    totalReturnPct: (net - 1) * 100,
    grossReturnPct: (gross - 1) * 100,
    winRate: completed > 0 ? wins / completed : 0,
    totalTrades: completed,
    hasOpenPosition: inPosition,
    fast,
    slow,
  };
}
