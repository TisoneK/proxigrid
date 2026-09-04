/**
 * Proxigrid Research Engine — Feature registry
 *
 * A named, versioned lookup for `Feature` functions (spec §3, "Feature
 * registry"). The generator/scientist/critic reference features by name; this
 * registry resolves a name to its implementation and computes its series.
 *
 * Registration is strict: registering a name that already exists throws, so a
 * research run can never silently shadow a feature (which would corrupt the
 * lineage of any experiment that read the old math). A module-level `defaultRegistry`
 * is provided for the common case; construct a fresh `FeatureRegistry` for
 * isolated tests or alternate feature sets.
 *
 * Pure and dependency-free apart from the `Feature` type.
 */

import type { Candle } from "@/lib/exchanges/types";
import type { Feature } from "./feature";

export class FeatureRegistry {
  private readonly features = new Map<string, Feature>();

  /**
   * Register a feature under its `name`. Throws if that name is already taken —
   * duplicate registration is a programming error, not an override.
   */
  register(feature: Feature): void {
    if (this.features.has(feature.name)) {
      throw new Error(`Feature "${feature.name}" is already registered`);
    }
    this.features.set(feature.name, feature);
  }

  /** Look up a feature by name, or `undefined` if it is not registered. */
  get(name: string): Feature | undefined {
    return this.features.get(name);
  }

  /** True if a feature with this name is registered. */
  has(name: string): boolean {
    return this.features.has(name);
  }

  /** All registered features, in insertion order. */
  list(): Feature[] {
    return Array.from(this.features.values());
  }

  /**
   * Compute a registered feature's series over `candles`.
   * @throws if no feature is registered under `name`.
   */
  compute(name: string, candles: Candle[]): (number | null)[] {
    const feature = this.features.get(name);
    if (!feature) {
      throw new Error(`Feature "${name}" is not registered`);
    }
    return feature.compute(candles);
  }
}

/** Shared registry instance; `registerBuiltins` (builtins.ts) populates it. */
export const defaultRegistry = new FeatureRegistry();
