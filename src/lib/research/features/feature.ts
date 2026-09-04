/**
 * Proxigrid Research Engine — Feature interface
 *
 * A Feature is a named, versioned, pure transform from a candle window to a
 * per-bar series (spec §4). The output is index-aligned with the input candles
 * and carries `null` wherever there is insufficient history to compute a value,
 * exactly like the raw indicators in `lib/indicators`. Bumping `version` signals
 * that the math changed, so cached/persisted series must be recomputed.
 *
 * Keeping this surface small and pure lets the registry, generator, scientist
 * and critic all treat features uniformly and unit-test them in isolation.
 */

import type { Candle } from "@/lib/exchanges/types";

export interface Feature {
  /** Stable identifier, e.g. "rsi_14" or "price_accel_over_vol". */
  name: string;
  /** Bump when the computation changes; invalidates any cached series. */
  version: number;
  /** Compute the per-bar series, aligned to `candles`, null where undefined. */
  compute(candles: Candle[]): (number | null)[];
}
