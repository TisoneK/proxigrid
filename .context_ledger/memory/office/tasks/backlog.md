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

### Medium Priority

| ID | Summary |
|----|---------|
| B-2026-08-28-1 | **Testnet order-path validation** (re-seeded from office-001, added 2026-08-28) — the `placeOrder` path (filters/TIF/STP) is written but never run against a live matching engine. Once hosted where Binance signed endpoints are reachable, run a real testnet order via a `place_order` rule + OrderConfirmDialog and fix whatever surfaces. Gates the whole "it actually trades" story. |
| B-2026-09-13-1 | **Paper-trading runner** (re-seeded from office-001; open since session 68, never backlogged until the office close) — PAPER strategies have no forward simulation: build the runner that feeds recent candles to PaperTrader for strategies in PAPER status so they accrue live evidence, giving the monitor pass something to grade and the →LIVE promotion a basis. Pure PaperTrader + monitor cores exist and are tested. |
| B-2026-08-26-2 | **Binance User Data Streams + listenKey lifecycle** (re-seeded from office-001, added 2026-08-26) — not implemented. For real-time execution reports and balance updates: `POST /api/v3/userDataStream` to get a listenKey, `PUT` ping every ~30 min (expires after 60), `DELETE` on shutdown. Would let the automation worker react to fills without polling. Needs API credentials. |
| B-2026-08-29-1 | **Multi-exchange v2 — canonical symbols + Coinbase scanning** (re-seeded from office-001, added 2026-08-29) — v1 shipped native per-exchange symbols (browse-only Coinbase, dormant behind COINBASE_ENABLED). v2: (a) canonical base-asset symbols for unified cross-exchange views / one watchlist per asset; (b) extend the signal scanner + intelligence service to scan Coinbase markets too. Exchange `kind` badge in the switcher, per-exchange watchlist scoping. |
| B-2026-09-04-3 | **Per-regime metric breakout in lab runs** (re-seeded from office-001, added 2026-09-04) — partial: lab runs already report the regime *distribution* (shipped in old-office session 66), but metrics are never sliced per regime. Spec §6: compute a per-regime MetricSet in the run response so the UI can show "works in TRENDING only". |
| B-2026-09-13-2 | **Research engine step 9 — AI researcher** (re-seeded from office-001; flagged sessions 62–64, blocked) — the last unbuilt engine step. Needs USER INPUTS, not just code: LLM choice + credentials, prompt design, and safety boundaries for an agent that proposes strategies. Prereq (generic Backtestable gates) is done. Do not start without the user's inputs. |

### Low Priority

| ID | Summary |
|----|---------|
| B-2026-08-26-3 | **Binance FIX protocol connectivity** (re-seeded from office-001, added 2026-08-26) — parked; institutional low-latency order entry over persistent TCP. Only worth it for HFT use cases; the REST/WS adapter covers current needs. |
| B-2026-08-26-4 | **eslint 10 blocked by Next lint stack** (re-seeded from office-001, added 2026-08-26) — the eslint 9.x line is flagged "no longer supported", but `eslint-config-next@16`'s bundled `eslint-plugin-react` caps its eslint peer at `^9.7` and crashes `npm run lint` under eslint 10 (verified 2026-08-26). Kept on `^9`. Recheck when `eslint-config-next` / `eslint-plugin-react` ship eslint-10 support, then bump and re-run lint. |

<!-- Re-seeded from office-001's backlog at the office close (2026-09-13,
     session S071): original IDs kept for traceability with the frozen
     backlog in .context_ledger/history/office-001/; new items take fresh
     IDs in this office. Rows verified done at close time were NOT
     re-seeded — see history/office-001.md "Open threads". -->

<!-- TEMPLATE — add one row to the matching priority table:
| B-<YYYY-MM-DD>-<n> | <enough context that a fresh agent can act on
      this without any chat history — status qualifiers in the text> |
-->
