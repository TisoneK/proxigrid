import { describe, it, expect } from "vitest";
import {
  STRATEGY_STATUSES,
  isStrategyStatus,
  isTerminal,
  nextStates,
  canTransition,
  transition,
  canPromoteToPaper,
  canPromoteToLive,
  type StrategyStatus,
} from "./state-machine";

/** The linear "happy path" hops through the lifecycle (spec §10). */
const LINEAR: ReadonlyArray<[StrategyStatus, StrategyStatus]> = [
  ["RESEARCH", "HYPOTHESIS"],
  ["HYPOTHESIS", "BACKTESTING"],
  ["BACKTESTING", "VALIDATION"],
  ["VALIDATION", "PAPER"],
  ["PAPER", "LIVE"],
  ["LIVE", "MONITORING"],
];

describe("status set", () => {
  it("has the nine spec statuses", () => {
    expect(STRATEGY_STATUSES).toHaveLength(9);
    expect(STRATEGY_STATUSES).toContain("RESEARCH");
    expect(STRATEGY_STATUSES).toContain("RETIRED");
  });

  it("isStrategyStatus narrows valid strings and rejects junk", () => {
    expect(isStrategyStatus("PAPER")).toBe(true);
    expect(isStrategyStatus("paper")).toBe(false);
    expect(isStrategyStatus("NONSENSE")).toBe(false);
  });
});

describe("legal transitions", () => {
  it.each(LINEAR)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(transition(from, to)).toBe(to);
  });

  it("MONITORING can stay healthy (→ LIVE) or degrade (→ DEGRADING)", () => {
    expect(canTransition("MONITORING", "LIVE")).toBe(true);
    expect(canTransition("MONITORING", "DEGRADING")).toBe(true);
  });

  it("DEGRADING goes back to RESEARCH to improve/replace", () => {
    expect(canTransition("DEGRADING", "RESEARCH")).toBe(true);
    expect(transition("DEGRADING", "RESEARCH")).toBe("RESEARCH");
  });
});

describe("illegal transitions throw", () => {
  it("cannot skip straight to LIVE", () => {
    expect(canTransition("RESEARCH", "LIVE")).toBe(false);
    expect(() => transition("RESEARCH", "LIVE")).toThrow(/Illegal strategy transition/);
  });

  it("cannot run the lifecycle backwards", () => {
    expect(canTransition("BACKTESTING", "HYPOTHESIS")).toBe(false);
    expect(() => transition("VALIDATION", "BACKTESTING")).toThrow();
  });

  it("cannot leave a terminal state", () => {
    expect(() => transition("RETIRED", "RESEARCH")).toThrow();
    expect(canTransition("RETIRED", "RESEARCH")).toBe(false);
  });

  it("throw message lists the allowed next states", () => {
    expect(() => transition("RESEARCH", "LIVE")).toThrow(/HYPOTHESIS/);
  });
});

describe("RETIRED is reachable from anywhere non-terminal", () => {
  it.each(STRATEGY_STATUSES.filter((s) => s !== "RETIRED"))(
    "%s → RETIRED",
    (from) => {
      expect(canTransition(from, "RETIRED")).toBe(true);
      expect(transition(from, "RETIRED")).toBe("RETIRED");
    },
  );

  it("RETIRED itself cannot go to RETIRED", () => {
    expect(canTransition("RETIRED", "RETIRED")).toBe(false);
  });
});

describe("isTerminal", () => {
  it("only RETIRED is terminal", () => {
    for (const s of STRATEGY_STATUSES) {
      expect(isTerminal(s)).toBe(s === "RETIRED");
    }
  });
});

describe("nextStates", () => {
  it("returns an empty list for the terminal state", () => {
    expect(nextStates("RETIRED")).toEqual([]);
  });

  it("always includes RETIRED for non-terminal states, without duplicates", () => {
    for (const s of STRATEGY_STATUSES) {
      if (s === "RETIRED") continue;
      const next = nextStates(s);
      expect(next).toContain("RETIRED");
      expect(new Set(next).size).toBe(next.length);
    }
  });

  it("lists exactly the legal successors for a branching state", () => {
    expect(new Set(nextStates("MONITORING"))).toEqual(
      new Set<StrategyStatus>(["LIVE", "DEGRADING", "RETIRED"]),
    );
  });

  it("every listed successor is itself a legal transition", () => {
    for (const from of STRATEGY_STATUSES) {
      for (const to of nextStates(from)) {
        expect(canTransition(from, to)).toBe(true);
      }
    }
  });
});

describe("promotion guards", () => {
  it("canPromoteToPaper requires a passing OOS experiment", () => {
    expect(canPromoteToPaper(true)).toBe(true);
    expect(canPromoteToPaper(false)).toBe(false);
  });

  it("canPromoteToLive requires enough paper days", () => {
    expect(canPromoteToLive(30, 30)).toBe(true); // exactly the threshold
    expect(canPromoteToLive(45, 30)).toBe(true);
    expect(canPromoteToLive(10, 30)).toBe(false);
  });
});
