# Backlog (live queue — open work only)

Open items for future sessions, **arranged by priority so the shape of
the work is visible the moment the file opens**: one row per item, in
its priority table. When an item is finished, **delete its row** — the
backlog holds only open work, never completed rows. The completion
record is the finishing session's `agents/sessions.md` entry and the
commit itself; git history keeps every removed row, so deleting loses
nothing. Never delete a row whose item is still open — a row vanishing
from the diff without a matching session entry is a dropped handoff,
not cleanup. (Legacy checkbox-format backlogs: `ledger-mem closeout`
sweeps checked-off `- [x]` tombstones a session left behind — dry run
by default; `--confirm` deletes.)

Every row gets a stable **ID** — `B-<added YYYY-MM-DD>-<n>`, n = that
date's next sequence in the file — and a **Summary** cell with enough
context that a fresh agent can act on the item without any chat
history; keep status qualifiers in the summary text ("partial",
"done, pending sign-off", "deferred by owner", "advisory"). Priority
is the table an item sits in — when unsure, Medium.

This backlog belongs to the **current office**. When the office closes,
open items do not carry over implicitly — the closing session re-seeds
into the new office's backlog only what still matters, and records the
rest in the permanent record (`history/office-<NNN>.md`, "Open threads").

Full spec: `.context_ledger/core/schemas/ledger-schema.md` →
"The backlog: arrangement + workstream view".

## Open Items

### High Priority

| ID | Summary |
|----|---------|
| B-2026-08-26-1 | **Remaining prisma-chain security advisory** (added 2026-08-26) — 3 high-severity advisories persist after `npm audit fix --force`: `prisma` → `@prisma/config` → `deepmerge-ts <8.0.0` (GHSA-ggr8-5vv4-36mx, stack exhaustion on recursive-object-graph merges). Build-time CLI tooling; `prisma`/`@prisma/client` at 6.19.3. Only npm offer is a prisma dev pre-release, so left in place. Recheck when Prisma ships a stable release whose `@prisma/config` pins `deepmerge-ts@>=8`. Rechecked 2026-09-02 (Session 52): `@prisma/config@6.19.3` pins `deepmerge-ts@7.1.5`; latest stable line — `npm audit` "fix available" means the RC. |

### Medium Priority

| ID | Summary |
|----|---------|
| B-2026-09-13-1 | **Close the full office** (added 2026-09-13, Session 69) — `ledger-gates checkpoint` now warns the live office is full (68 / 20). Run `ledger-history close` in a quiet session: it freezes the office verbatim into `history/office-<NNN>/`, writes the permanent record, and re-seeds open threads (backlog already in 1.0.5 table format; roster/registry start empty). Do NOT do it mid-migration or mid-feature — pick a clean moment. |
| B-2026-08-26-2 | **Binance User Data Streams + listenKey lifecycle** (added 2026-08-26, Session 8) — Not implemented. For real-time execution reports and balance updates: `POST /api/v3/userDataStream` to get a listenKey, `PUT` ping every ~30 min (expires after 60), `DELETE` on shutdown (manual §4). Would let AutomationService react to fills without polling. Needs API credentials. |
| B-2026-08-28-1 | **Testnet order-path validation** (added 2026-08-28) — the `placeOrder` path (filters/TIF/STP) is written but never run against a live matching engine. Once hosted where Binance is reachable, run a real testnet order via a `place_order` rule + OrderConfirmDialog and fix whatever surfaces. Gates the whole "it actually trades" story. |
| B-2026-08-29-1 | **Multi-exchange v2 — canonical symbols + Coinbase scanning** (added 2026-08-29, Session 41) — v1 shipped native per-exchange symbols (browse-only Coinbase). v2: (a) canonical base-asset symbols (base + generic USD quote, per-adapter formatting) for unified cross-exchange views / one watchlist per asset; (b) extend the signal scanner + intelligence service to scan Coinbase markets too (currently Binance-only). Also: exchange `kind` badge in the switcher, per-exchange watchlist scoping. The adapter/registry abstraction is the extension point for more providers (e.g. Deriv — kind supports forex/stock/commodity). |
| B-2026-09-04-1 | **Research monitor pass on the cron tick** (added 2026-09-04, Session 65 review) — the pure `monitorStrategy()` module (`src/lib/research/monitor/monitor.ts`) is built and tested but unwired. Per spec §11: add a research-monitor pass to `scanOnce()` / `/api/cron/tick` that re-evaluates PAPER/LIVE strategies on recent candles, writes `Experiment(kind:"monitor")`, and applies MONITORING → DEGRADING transitions via the state machine only on statistically significant deterioration. |
| B-2026-09-04-2 | **HistoricalCandle history store** (added 2026-09-04, Session 65 review) — the Prisma model exists but the table is empty and nothing writes to it. Spec §2/§9: persist candles on fetch (or a backfill route) so research runs aren't bounded by live-fetch windows; `data/dataset.ts` then reads from the store. Include a backfill endpoint (symbol/timeframe/from/to) with sane caps. |

### Low Priority

| ID | Summary |
|----|---------|
| B-2026-08-26-3 | **Binance FIX protocol connectivity** (added 2026-08-26, Session 8) — out of scope for now; institutional low-latency order entry over persistent TCP (manual §1). Only worth it for HFT use cases; the REST/WS adapter covers current needs. |
| B-2026-08-26-4 | **eslint 10 blocked by Next lint stack** (added 2026-08-26) — the whole eslint 9.x line (incl. latest 9.39.5) is flagged "no longer supported", clearable only by eslint 10. But `eslint-config-next@16`'s bundled `eslint-plugin-react` caps its eslint peer at `^9.7` (no ^10) and crashes `npm run lint` under eslint 10 (verified 2026-08-26). Kept on `^9` so lint works. Recheck when `eslint-config-next` / `eslint-plugin-react` ship eslint-10 support, then bump `eslint` to `^10` and re-run `npm run lint`. |
| B-2026-09-04-3 | **Per-regime metric breakout in lab runs** (added 2026-09-04, Session 65 review) — `regime/detector.ts` classifies every bar but `engine/pipeline.ts` never slices metrics by regime. Spec §6: compute regime distribution + per-regime MetricSet in the run response so the UI can show "works in TRENDING only". |
| B-2026-09-04-4 | **Richer Phase A grid** (added 2026-09-04, Session 65 review) — the named-strategy grid sweeps only ma_crossover/rsi_reversion; add more named strategies to `engine/backtester.ts` (e.g. Bollinger reversion, EMA trend-follow with regime filter) so the generator explores beyond two families. |

<!-- Converted from the legacy checkbox format (append-only) to the 1.0.5
     priority-grouped tables during the core 1.0.6 migration (2026-09-13):
     open `- [ ]` items became ID'd rows; completed `- [x]` tombstones were
     dropped — their completion records live in agents/sessions.md and git. -->
