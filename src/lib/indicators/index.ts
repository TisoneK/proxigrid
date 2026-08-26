/**
 * Proxigrid — Technical Indicators
 *
 * Pure functions over Candle arrays. Each indicator returns:
 *   - the latest value(s), and
 *   - a series aligned with the input (with leading nulls where undefined).
 *
 * Used by IntelligenceService to generate signals.
 */

import type { Candle } from "../exchanges/types";

// ===========================================================================
// Moving averages
// ===========================================================================

export function sma(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    out.push(sum / period);
  }
  return out;
}

export function ema(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const price = candles[i].close;
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev === null) {
      // seed with SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
      prev = sum / period;
    } else {
      prev = price * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

// ===========================================================================
// RSI
// ===========================================================================

export function rsi(candles: Candle[], period: number = 14): (number | null)[] {
  const out: (number | null)[] = [];
  if (candles.length < period + 1) {
    return candles.map(() => null);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  for (let i = 0; i < period; i++) out[i] = null;
  return out;
}

// ===========================================================================
// MACD
// ===========================================================================

export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function macd(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEma = ema(candles, fastPeriod);
  const slowEma = ema(candles, slowPeriod);

  const macdLine: (number | null)[] = candles.map((_, i) => {
    if (fastEma[i] === null || slowEma[i] === null) return null;
    return (fastEma[i] as number) - (slowEma[i] as number);
  });

  // Signal line is EMA of MACD line. We need a synthetic series of just the
  // non-null macd values to compute the EMA correctly.
  const startIdx = macdLine.findIndex((v) => v !== null);
  const signalLine: (number | null)[] = candles.map(() => null);

  if (startIdx >= 0 && candles.length - startIdx >= signalPeriod) {
    const macdValues: number[] = [];
    for (let i = startIdx; i < candles.length; i++) {
      macdValues.push(macdLine[i] as number);
    }
    // Compute EMA over the trimmed macdValues
    const k = 2 / (signalPeriod + 1);
    let prev: number | null = null;
    const signalTrimmed: (number | null)[] = [];

    for (let i = 0; i < macdValues.length; i++) {
      if (i < signalPeriod - 1) {
        signalTrimmed.push(null);
        continue;
      }
      if (prev === null) {
        let sum = 0;
        for (let j = i - signalPeriod + 1; j <= i; j++) sum += macdValues[j];
        prev = sum / signalPeriod;
      } else {
        prev = macdValues[i] * k + prev * (1 - k);
      }
      signalTrimmed.push(prev);
    }

    for (let i = 0; i < signalTrimmed.length; i++) {
      signalLine[startIdx + i] = signalTrimmed[i];
    }
  }

  const histogram: (number | null)[] = candles.map((_, i) => {
    if (macdLine[i] === null || signalLine[i] === null) return null;
    return (macdLine[i] as number) - (signalLine[i] as number);
  });

  return { macd: macdLine, signal: signalLine, histogram };
}

// ===========================================================================
// Bollinger Bands
// ===========================================================================

export interface BollingerResult {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

export function bollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMult: number = 2
): BollingerResult {
  const middle = sma(candles, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const mean = middle[i] as number;
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j].close - mean;
      sumSq += diff * diff;
    }
    const std = Math.sqrt(sumSq / period);
    upper.push(mean + stdDevMult * std);
    lower.push(mean - stdDevMult * std);
  }

  return { middle, upper, lower };
}

// ===========================================================================
// Helpers
// ===========================================================================

export function lastNonNull(series: (number | null)[]): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] !== null) return series[i];
  }
  return null;
}

export function valueAtOrNull(
  series: (number | null)[],
  idx: number
): number | null {
  return series[idx] ?? null;
}
