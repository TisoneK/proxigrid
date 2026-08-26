/**
 * Proxigrid — Rule conditions
 *
 * Each condition is a JSON-serialisable predicate evaluated against a
 * RuleContext (snapshot of market state + indicator values at evaluation time).
 *
 * Adding a new condition type = register it in the registry below.
 */

export type ConditionType = "price" | "indicator" | "volume";

export interface BaseCondition {
  type: ConditionType;
  operator: ">" | "<" | ">=" | "<=" | "==" | "crosses_above" | "crosses_below";
  value?: number;
  /** For indicator conditions: indicator name + params */
  indicator?: string;
  period?: number;
  /** Reference series for cross conditions */
  refIndicator?: string;
  refPeriod?: number;
}

export interface RuleContext {
  exchangeCode: string;
  symbol: string;
  timeframe: string;
  price: number;
  candles: { close: number; volume: number; openTime: number }[];
  indicators: Record<string, (number | null)[]>; // keyed by `${indicator}_${period}`
}

export type ConditionResult =
  | { ok: true; note?: string }
  | { ok: false; reason: string };

function compare(
  a: number,
  op: BaseCondition["operator"],
  b: number
): boolean {
  switch (op) {
    case ">":
      return a > b;
    case "<":
      return a < b;
    case ">=":
      return a >= b;
    case "<=":
      return a <= b;
    case "==":
      return Math.abs(a - b) < 1e-9;
    case "crosses_above":
    case "crosses_below":
      // Cross is evaluated at higher level with prev/curr arrays
      return false;
  }
}

export type ConditionEvaluator = (
  cond: BaseCondition,
  ctx: RuleContext
) => ConditionResult;

// ---- Evaluators ----

const priceEvaluator: ConditionEvaluator = (cond, ctx) => {
  if (cond.value === undefined) {
    return { ok: false, reason: "price condition requires value" };
  }
  const ok = compare(ctx.price, cond.operator, cond.value);
  return ok
    ? { ok: true, note: `price ${ctx.price} ${cond.operator} ${cond.value}` }
    : { ok: false, reason: `price ${ctx.price} not ${cond.operator} ${cond.value}` };
};

const indicatorEvaluator: ConditionEvaluator = (cond, ctx) => {
  if (!cond.indicator) return { ok: false, reason: "indicator name missing" };

  const key = `${cond.indicator}_${cond.period ?? ""}`;
  const series = ctx.indicators[key];
  if (!series || series.length < 2) {
    return { ok: false, reason: `indicator ${key} not available` };
  }

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (last === null || prev === null) {
    return { ok: false, reason: "indicator values not ready" };
  }

  // Cross conditions
  if (cond.operator === "crosses_above" || cond.operator === "crosses_below") {
    // Cross against refIndicator (or numeric value)
    let prevRef: number | null = null;
    let currRef: number | null = null;
    if (cond.refIndicator) {
      const refKey = `${cond.refIndicator}_${cond.refPeriod ?? ""}`;
      const refSeries = ctx.indicators[refKey];
      if (!refSeries) return { ok: false, reason: `ref ${refKey} not available` };
      prevRef = refSeries[refSeries.length - 2];
      currRef = refSeries[refSeries.length - 1];
    } else if (cond.value !== undefined) {
      prevRef = cond.value;
      currRef = cond.value;
    } else {
      return { ok: false, reason: "cross needs refIndicator or value" };
    }

    if (prevRef === null || currRef === null) {
      return { ok: false, reason: "ref values not ready" };
    }

    if (cond.operator === "crosses_above") {
      const crossed = prev <= prevRef && last > currRef;
      return crossed
        ? { ok: true, note: `${cond.indicator} crossed above ${cond.refIndicator ?? cond.value}` }
        : { ok: false, reason: "no upward cross" };
    } else {
      const crossed = prev >= prevRef && last < currRef;
      return crossed
        ? { ok: true, note: `${cond.indicator} crossed below ${cond.refIndicator ?? cond.value}` }
        : { ok: false, reason: "no downward cross" };
    }
  }

  // Simple comparison against cond.value
  if (cond.value === undefined) {
    return { ok: false, reason: "indicator condition requires value" };
  }
  const ok = compare(last, cond.operator, cond.value);
  return ok
    ? { ok: true, note: `${cond.indicator}[${last.toFixed(4)}] ${cond.operator} ${cond.value}` }
    : { ok: false, reason: `${cond.indicator}[${last.toFixed(4)}] not ${cond.operator} ${cond.value}` };
};

const volumeEvaluator: ConditionEvaluator = (cond, ctx) => {
  if (cond.value === undefined) return { ok: false, reason: "volume condition requires value" };
  const lastVol = ctx.candles[ctx.candles.length - 1]?.volume ?? 0;
  const ok = compare(lastVol, cond.operator, cond.value);
  return ok
    ? { ok: true, note: `volume ${lastVol} ${cond.operator} ${cond.value}` }
    : { ok: false, reason: `volume ${lastVol} not ${cond.operator} ${cond.value}` };
};

// ---- Registry ----

const evaluators: Record<ConditionType, ConditionEvaluator> = {
  price: priceEvaluator,
  indicator: indicatorEvaluator,
  volume: volumeEvaluator,
};

export function evaluateCondition(
  cond: BaseCondition,
  ctx: RuleContext
): ConditionResult {
  const evaluator = evaluators[cond.type];
  if (!evaluator) {
    return { ok: false, reason: `unknown condition type "${cond.type}"` };
  }
  return evaluator(cond, ctx);
}

export function evaluateAll(
  conditions: BaseCondition[],
  ctx: RuleContext,
  matchMode: "all" | "any" = "all"
): { matched: boolean; notes: string[]; reasons: string[] } {
  const notes: string[] = [];
  const reasons: string[] = [];
  let matches = 0;
  for (const c of conditions) {
    const r = evaluateCondition(c, ctx);
    if (r.ok) {
      notes.push(r.note ?? "");
      matches++;
    } else {
      reasons.push(r.reason);
    }
  }
  const matched =
    matchMode === "all" ? matches === conditions.length : matches > 0;
  return { matched, notes, reasons };
}
