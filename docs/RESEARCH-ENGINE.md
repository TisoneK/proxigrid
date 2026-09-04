# Proxigrid Research Engine — Technical Spec

This is the concrete design for turning Proxigrid from a **fixed-rule signal
generator** into the **self-learning research engine** described in *"Building a
Self-Learning Trading-Intelligence System."*

It targets **this codebase** — it extends the existing `backtest.ts`,
`intelligence-service`, indicators, and adapters rather than replacing them, and
adds the missing pieces: a strategy datamodel, a research pipeline, honest
metrics, out-of-sample discipline, and a lifecycle state machine.

> **Guiding constraint (from the business doc):** *"Build something that works
> before building something that sells."* Everything below is Stage 1–2
> (research + validation). None of it is user-facing. The first deliverable is a
> credible answer to one question: **does a discovered relationship survive
> out-of-sample, after costs?**

---

## 1. Where we are vs. where the doc points

| Pipeline stage (doc) | In the repo today | Gap |
|---|---|---|
| Market data | `ExchangeAdapter.getCandles()`, `market-data-service` | Live only; no stored history for research |
| Feature extraction | `lib/indicators` (RSI/MACD/EMA/SMA/Bollinger) | Fixed indicator set, computed on demand, not persisted |
| Regime detection | — | Missing |
| Hypothesis generation | — | Missing (signals are hand-coded generators) |
| Backtesting | `lib/backtest.ts` | Long-only, **no fees/slippage**, no OOS split, thin metrics |
| Statistical tests | — | Missing |
| Critic | — | Missing |
| Out-of-sample | — | Missing (backtest runs on one candle array) |
| Paper trading | — | Missing |
| Live validation | `placeOrder` exists on adapters | No small-allocation harness |
| Monitoring / learning | — | Missing |
| Strategy lifecycle store | — | Missing (no `Strategy`/`Experiment` models) |

The honest summary: **we have the platform shell (Stage 3) but not the research
loop (Stage 1–2).** This spec builds the loop.

---

## 2. Module layout

New code lives under `src/lib/research/`. It depends *downward* on existing
`lib/exchanges`, `lib/indicators`, `lib/db` — never upward on `app/` or
components.

```
src/lib/research/
├── data/
│   ├── history-store.ts        # persist + page historical candles for research
│   └── dataset.ts              # split a symbol/timeframe into research/validation windows
├── features/
│   ├── feature.ts              # Feature interface: (candles) => (number|null)[]
│   ├── registry.ts             # named, versioned feature functions
│   └── builtins.ts             # wrap existing indicators + derived features
├── regime/
│   └── detector.ts             # classify each bar: TRENDING | RANGING | HIGH_VOL | ...
├── hypothesis/
│   ├── hypothesis.ts           # Hypothesis type: predicate over features -> entry/exit
│   └── generator.ts            # enumerate/sample candidate hypotheses (grid first, AI later)
├── engine/
│   ├── backtester.ts           # cost-aware, long/short, position-sizing simulator
│   ├── metrics.ts              # Sharpe, Sortino, profit factor, max DD, expectancy
│   ├── scientist.ts            # run metrics + robustness (param-sensitivity) checks
│   ├── critic.ts               # falsification checks -> pass/reject with reasons
│   └── pipeline.ts             # orchestrates one hypothesis through all stages
├── lifecycle/
│   └── state-machine.ts        # RESEARCH -> ... -> LIVE -> MONITORING transitions
├── paper/
│   └── paper-trader.ts         # forward simulation on live candles, no capital
└── lab/
    └── lab.ts                  # the research loop: generate -> pipeline -> record
```

`lib/backtest.ts` stays as the **UI-facing quick backtest** (the
`backtest-panel` component uses it). `engine/backtester.ts` is the
**research-grade** simulator. They can share signal helpers, but the research one
is the source of truth for any go/no-go decision.

---

## 3. Data model (Prisma)

Add these models to `prisma/schema.prisma`. They are the "PXG-001… research lab"
database from §16 of the doc, made concrete. IDs use a human-readable `code`
(`PXG-017`) alongside the cuid.

```prisma
/// A stored historical candle for offline research (separate from live fetches).
model HistoricalCandle {
  id           String   @id @default(cuid())
  exchangeCode String
  symbol       String
  timeframe    String   // "5m" | "1h" | ...
  openTime     BigInt
  open         Float
  high         Float
  low          Float
  close        Float
  volume       Float
  closeTime    BigInt

  @@unique([exchangeCode, symbol, timeframe, openTime])
  @@index([exchangeCode, symbol, timeframe, openTime])
}

/// A research object with a lifecycle. This is a "PXG-###" strategy.
model Strategy {
  id            String   @id @default(cuid())
  code          String   @unique      // "PXG-017"
  title         String
  hypothesis    String                // human-readable research question
  status        String   @default("RESEARCH")
  // RESEARCH | HYPOTHESIS | BACKTESTING | VALIDATION | PAPER | LIVE
  //   | MONITORING | DEGRADING | RETIRED
  regime        String?               // regime this strategy specializes in, if any
  spec          Json                  // serialized Hypothesis (features, params, rules)
  assets        String[]              // ["BTCUSDT","ETHUSDT"]
  timeframe     String
  allocation    Float    @default(0)  // fraction of research capital, 0..1

  experiments   Experiment[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status])
}

/// One run of the pipeline (or a monitoring re-eval) against a strategy.
model Experiment {
  id           String   @id @default(cuid())
  strategyId   String
  strategy     Strategy @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  kind         String   // "backtest" | "oos" | "paper" | "monitor"
  window       Json     // { from, to, split } used
  costs        Json     // { feeBps, slippageBps, spreadBps } applied
  metrics      Json     // full MetricSet (see §5)
  criticReport Json     // { passed: bool, checks: [{name, passed, detail}] }
  passed       Boolean
  createdAt    DateTime @default(now())

  @@index([strategyId, kind, createdAt])
}
```

Note `Signal` (existing) stays for the user-facing feed; a validated `Strategy`
can *emit* `Signal` rows once it reaches PAPER/LIVE. Keep them separate: signals
are output, strategies are the research object that produces them.

---

## 4. Core interfaces

Kept small and pure so every stage is unit-testable. Reuse the existing
`Candle` type from `lib/exchanges/types`.

```ts
// features/feature.ts
export interface Feature {
  name: string;                     // "rsi_14", "price_accel_over_vol"
  version: number;                  // bump when the math changes
  compute(candles: Candle[]): (number | null)[];
}

// hypothesis/hypothesis.ts
export interface Hypothesis {
  id: string;                       // stable within a generation run
  description: string;
  features: string[];               // feature names it reads
  // Per-bar decision from computed feature series -> +1 enter / -1 exit / 0 hold
  signal(bar: number, f: Record<string, (number | null)[]>): -1 | 0 | 1;
  params: Record<string, number>;   // the knobs, for robustness testing
}

// engine/backtester.ts
export interface CostModel {
  feeBps: number;                   // per side, e.g. 10 = 0.10%
  slippageBps: number;              // modeled fill slippage
  spreadBps: number;                // half-spread crossing cost
}

export interface BacktestConfig {
  costs: CostModel;
  allowShort: boolean;
  positionSizing: "full" | "fixed_fraction" | "vol_target";
  fraction?: number;                // for fixed_fraction
}
```

The generator (§7) produces `Hypothesis[]`; the pipeline (§8) turns each into an
`Experiment`.

---

## 5. Honest metrics (`engine/metrics.ts`)

The single most important upgrade over today's `backtest.ts`, which reports only
`totalReturnPct / winRate / totalTrades`. The scientist (§8 in the doc) needs the
full set:

```ts
export interface MetricSet {
  observations: number;
  trades: number;
  winRate: number;
  avgReturn: number;         // per trade, net of costs
  expectancy: number;        // avgWin*P(win) - avgLoss*P(loss)
  profitFactor: number;      // gross profit / gross loss
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  sharpe: number;            // annualized, from per-bar returns
  sortino: number;
  volatilityPct: number;
  turnover: number;          // sanity check on overtrading
  costDragPct: number;       // return lost to fees/slippage/spread — surface it
}
```

**Every metric is computed after costs.** A strategy's headline number is its
net Sharpe on validation data, not gross return on research data.

---

## 6. Regime detector (`regime/detector.ts`)

A deliberately simple, transparent classifier first (rolling ADX / realized-vol
/ range-vs-trend), returning one label per bar from the doc's set:
`TRENDING | RANGING | HIGH_VOL | LOW_VOL | BREAKOUT | CONSOLIDATION | UNCERTAIN`.

Its job is not to be right — it's to let the scientist ask *"does this hypothesis
perform differently by regime?"* and let the lab build **regime-specialized
strategies** (the portfolio in §14) rather than one strategy for all conditions.
Metrics are always broken out per-regime in the `Experiment`.

---

## 7. Hypothesis generation (`hypothesis/generator.ts`)

Start **mechanical, not AI** — it's cheaper to validate the pipeline with a grid
than to debug an LLM and a leaky backtester at the same time.

- **Phase A (grid/random search):** enumerate combinations over the feature
  registry and parameter ranges (e.g. "feature X crosses threshold T while regime
  = TRENDING"). This alone exercises every downstream stage.
- **Phase B (feature discovery, doc §6):** derived features — `price_accel /
  volatility`, `volume_accel × liquidity_change`, `orderbook_imbalance vs recent
  move` — added to the registry and swept the same way.
- **Phase C (AI researcher, doc §5):** an LLM proposes *typed* `Hypothesis`
  objects (constrained to the feature registry + a small DSL), which flow through
  the **identical** pipeline. The AI never gets to skip validation.

Generating a hypothesis is never acceptance. The pipeline decides.

---

## 8. The pipeline (`engine/pipeline.ts`)

One hypothesis, in order, short-circuiting on first failure:

```
Hypothesis
  → dataset.split()            # research window only, validation LOCKED (§9)
  → backtester.run(research)   # cost-aware sim
  → scientist.evaluate()       # MetricSet + per-regime + param-sensitivity
        ↳ reject if: too few trades, negative net expectancy,
          collapses under ±small param perturbation (doc §7 robustness)
  → critic.falsify()           # doc §8 checks, see below
        ↳ reject if any check fails
  → backtester.run(validation) # the LOCKED window, ONCE
  → record Experiment(kind:"oos")
```

**Critic checks (`engine/critic.ts`)** — each returns `{name, passed, detail}`:

- **Overfit / param fragility** — does net performance survive ±10% on every param?
- **Lookahead** — any feature reads bar `i` using data from `> i`? (static + runtime guard)
- **Single-event dependence** — remove the best trade; does edge survive?
- **Single-asset / single-cycle** — does it hold across `assets[]` and across time slices?
- **Costs** — is edge still positive after `CostModel`? (`costDragPct` from §5)
- **Execution realism** — are assumed fills achievable given spread/volume?

> Motto from the doc, made literal: **"Try to kill the strategy before real money
> does."** A strategy that survives the critic is *interesting*, not *deployed*.

---

## 9. Out-of-sample discipline (`data/dataset.ts`) — the part that matters most

The dominant failure mode of automated strategy discovery is **learning the
validation set.** Enforce it structurally, not by convention:

- `dataset.split()` returns `{ research, validation }` where `validation` is the
  most-recent contiguous window (e.g. last 30%).
- The validation window is **write-once per strategy spec.** Record a hash of the
  `Hypothesis.spec` with each OOS `Experiment`. If the spec changes, it's a *new*
  `Strategy` code — you don't get to re-run OOS on a tweaked strategy and keep the
  old lineage.
- The generator/scientist/critic only ever receive `research`. Only
  `pipeline` touches `validation`, once, at the end.

This is the guardrail the doc calls out in §9 and §15. Build it first; it's what
makes every later number trustworthy.

---

## 10. Lifecycle state machine (`lifecycle/state-machine.ts`)

`Strategy.status` transitions, mirroring doc §13. Transitions are explicit
functions with guards; nothing jumps straight to LIVE.

```
RESEARCH → HYPOTHESIS → BACKTESTING → VALIDATION → PAPER → LIVE → MONITORING
                                                              ↘ (degrading)
MONITORING → { healthy: stay } | { degrading: → RESEARCH (improve/retest/replace) }
any → RETIRED
```

- **→ PAPER** requires a passing OOS `Experiment`.
- **→ LIVE** requires N days of paper performance consistent with backtest, and
  starts at a **small `allocation`** (doc §11).
- **MONITORING** re-runs the pipeline on recent data on a schedule; only
  *statistically significant* deterioration (doc §15 — not one losing trade)
  flags DEGRADING.

---

## 11. Paper trading + monitoring

- `paper/paper-trader.ts` runs live candles from the existing
  `market-data-service` through a strategy's `signal()`, recording simulated
  fills with the same `CostModel`. Bridges historical → real-time (doc §10).
- Monitoring is a scheduled job. The repo already runs periodic work via
  `GET /api/cron/tick` (see `docs/DEPLOY-VERCEL.md`) and the self-hosted
  `signal-scanner` / `automation-worker`. Add a `research-monitor` pass there
  that re-evaluates LIVE/PAPER strategies and writes `Experiment(kind:"monitor")`.

No new infra — this slots into the existing tick.

---

## 12. Build order (Stage 1 → 2)

Each step is independently testable and leaves the repo working.

1. **Cost-aware backtester + full metrics** (`engine/backtester.ts`,
   `engine/metrics.ts`) with unit tests. *Immediate value:* re-run the existing
   two strategies with fees/slippage and see how much edge survives. This alone
   is a reality check.
2. **Dataset split + OOS guard** (`data/dataset.ts`, `data/history-store.ts`).
   The trust foundation.
3. **Feature registry** wrapping current indicators + a couple derived features
   (`features/`).
4. **Scientist + Critic** (`engine/scientist.ts`, `engine/critic.ts`) with the
   robustness and falsification checks.
5. **Prisma models + lifecycle** (`Strategy`, `Experiment`, state machine).
6. **Grid hypothesis generator + pipeline** (`hypothesis/generator.ts`,
   `engine/pipeline.ts`) — the first end-to-end loop, mechanical only.
7. **Regime detector**, then per-regime metrics.
8. **Paper trader + monitor pass** on the existing cron tick.
9. **(Later) AI researcher** proposing typed hypotheses into the same pipeline.

Ship 1–2 before anything else. They convert "we have a backtester" into "we have
a backtester we can believe."

---

## 13. What this is not

- Not a promise of profit. The doc is explicit: the goal is *"continuous
  discovery of robust, testable market edges,"* not a winning algorithm.
- Not user-facing yet. No subscription/signals productization until a strategy
  clears OOS + paper. That's Stage 3+, gated on Stage 1–2 results.
- Not a replacement for `lib/backtest.ts` — that stays for the dashboard's quick
  interactive backtest.

The competitive advantage the doc names in §17 is **the pipeline itself** — the
discovery-and-falsification infrastructure — not any single `PXG-###`. This spec
is that pipeline.
