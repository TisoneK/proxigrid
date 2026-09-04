/**
 * Proxigrid Research Engine — Strategy Lifecycle State Machine
 *
 * The status transitions a `Strategy` may take, mirroring docs/RESEARCH-ENGINE.md
 * §10 (lifecycle) and §13 (the status set). Nothing jumps straight to LIVE: every
 * hop is an explicit, guarded edge in the transition table below.
 *
 *   RESEARCH → HYPOTHESIS → BACKTESTING → VALIDATION → PAPER → LIVE → MONITORING
 *   MONITORING → LIVE (stay healthy) | MONITORING → DEGRADING
 *   DEGRADING → RESEARCH (improve / retest / replace)
 *   any → RETIRED
 *
 * This module is deliberately PURE: it operates on the status string only, never
 * touching Prisma or any strategy record, so it is trivially unit-testable and
 * usable from any layer. Persisting the resulting status is the caller's job.
 */

/** The nine lifecycle states a strategy can occupy (spec §13). */
export type StrategyStatus =
  | "RESEARCH"
  | "HYPOTHESIS"
  | "BACKTESTING"
  | "VALIDATION"
  | "PAPER"
  | "LIVE"
  | "MONITORING"
  | "DEGRADING"
  | "RETIRED";

/** Every status, in lifecycle order. Handy for iteration and validation. */
export const STRATEGY_STATUSES: readonly StrategyStatus[] = [
  "RESEARCH",
  "HYPOTHESIS",
  "BACKTESTING",
  "VALIDATION",
  "PAPER",
  "LIVE",
  "MONITORING",
  "DEGRADING",
  "RETIRED",
] as const;

/** The only terminal state — a retired strategy has no outgoing transitions. */
const TERMINAL: StrategyStatus = "RETIRED";

/**
 * Adjacency table of legal transitions. Every state (except the terminal
 * RETIRED) may also transition to RETIRED; that edge is added programmatically
 * in {@link nextStates} so it does not have to be repeated here.
 */
const TRANSITIONS: Record<StrategyStatus, readonly StrategyStatus[]> = {
  RESEARCH: ["HYPOTHESIS"],
  HYPOTHESIS: ["BACKTESTING"],
  BACKTESTING: ["VALIDATION"],
  VALIDATION: ["PAPER"],
  PAPER: ["LIVE"],
  LIVE: ["MONITORING"],
  // Healthy monitoring stays LIVE; deterioration drops to DEGRADING.
  MONITORING: ["LIVE", "DEGRADING"],
  // A degrading strategy goes back to research to be improved or replaced.
  DEGRADING: ["RESEARCH"],
  // Terminal.
  RETIRED: [],
};

/** True if `s` is a valid StrategyStatus. */
export function isStrategyStatus(s: string): s is StrategyStatus {
  return (STRATEGY_STATUSES as readonly string[]).includes(s);
}

/** A strategy in a terminal state can make no further transitions. */
export function isTerminal(status: StrategyStatus): boolean {
  return status === TERMINAL;
}

/**
 * The set of states reachable from `from` in one legal hop. Any non-terminal
 * state can additionally be RETIRED. The result is de-duplicated and never
 * includes `from` unless `from` is genuinely a self-transition target
 * (MONITORING → LIVE is the only "stay in the loop" edge, and it targets LIVE,
 * not MONITORING, so no state lists itself here).
 */
export function nextStates(from: StrategyStatus): StrategyStatus[] {
  if (isTerminal(from)) return [];
  const base = TRANSITIONS[from] ?? [];
  const withRetire = base.includes(TERMINAL) ? base : [...base, TERMINAL];
  return [...withRetire];
}

/** True if `from → to` is a legal transition. */
export function canTransition(from: StrategyStatus, to: StrategyStatus): boolean {
  return nextStates(from).includes(to);
}

/**
 * Apply a transition, returning the new status. Throws on an illegal edge so a
 * bad transition can never silently corrupt a strategy's lifecycle.
 */
export function transition(from: StrategyStatus, to: StrategyStatus): StrategyStatus {
  if (!canTransition(from, to)) {
    throw new Error(
      `Illegal strategy transition: ${from} → ${to}. ` +
        `Allowed from ${from}: ${nextStates(from).join(", ") || "(none — terminal)"}.`,
    );
  }
  return to;
}

// ----------------------------------------------------------------------------
// Promotion guards (spec §10)
//
// The state machine says a transition is *structurally* legal; these guards
// enforce the *evidentiary* preconditions the doc attaches to the two most
// consequential promotions. They are pure predicates — the caller feeds in the
// facts (does a passing OOS experiment exist? how many paper days?) and gets a
// yes/no. Both edges must ALSO be legal per canTransition.
// ----------------------------------------------------------------------------

/**
 * → PAPER requires a passing out-of-sample experiment (spec §10). Generating a
 * hypothesis is never acceptance; only a strategy that has cleared OOS earns a
 * forward simulation.
 */
export function canPromoteToPaper(hasPassingOosExperiment: boolean): boolean {
  return hasPassingOosExperiment;
}

/**
 * → LIVE requires at least `minPaperDays` of paper-trading history (spec §10),
 * after which it starts at a small allocation. `minPaperDays` is the policy
 * threshold; `paperDays` is the observed run length.
 */
export function canPromoteToLive(paperDays: number, minPaperDays: number): boolean {
  return paperDays >= minPaperDays;
}
