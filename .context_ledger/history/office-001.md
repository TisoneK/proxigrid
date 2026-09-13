# Office 001 — accomplishments record (permanent)

- Opened: 2026-08-26
- Closed: 2026-09-13
- Sessions: 70

The frozen office lives at history/office-001/ until it is zipped into
archive/office-001.tar.gz. This record stays in history/ forever — even after
the tarball is garbage-collected, the office is never forgotten. Not read at
session start; deliberate lookback only.

## Accomplished

Proxigrid went from an empty shell to a working market-intelligence and
automation platform across this office's 70 sessions (2026-08-26 → 2026-09-13),
on two macOS/Windows machines and three agent+model pairs (Claude Code /
claude-opus-4-8, ZCode / glm-5.3-flash, ZCode / qwen3.8-flash). Highlights:

- **Product platform** (Next.js 16 + TypeScript + Tailwind/shadcn, Prisma →
  PostgreSQL, Vercel-ready): live Binance market data with a curated
  USDT-quoted grid and real sparklines; intelligence signals (EMA/Bollinger/
  MACD/RSI, deduped, outcome-graded with hit-rate surfacing); a rule engine
  with a background automation worker and cron tick; one-click order placement
  (exchange-filter/TIF/STP validated, Ed25519 or HMAC signing, double-gated
  behind ENABLE_LIVE_TRADING); opportunity feed with configurable alert
  threshold; watchlist, command palette, price alerts, notifications, mobile
  polish; a strategy backtester with net-of-costs honesty (fees + slippage).
- **Exchange architecture:** ExchangeAdapter interface + registry (the
  extension point for any market); Coinbase adapter built and left dormant/
  opt-in behind COINBASE_ENABLED with a "coming soon" switcher per the user's
  Binance-first direction.
- **Research engine** (docs/RESEARCH-ENGINE.md, spec'd from the user's vision
  docs): steps 1–8 pure cores shipped and tested — honest MetricSet,
  cost-aware long/short backtester, dataset split with a spec-hash-locked
  one-shot out-of-sample guard, Scientist robustness gate + adversarial
  Critic, feature registry + feature-hypothesis generator, regime detector,
  paper trader + degradation monitor, the runLab batch loop, and a generic
  Backtestable unifying named strategies and feature hypotheses. Surfaced to
  the app: PXG-strategy store with guarded lifecycle, /api/research routes,
  Research Lab dashboard card, HistoricalCandle history store (idempotent
  backfill, history-first runs), monitor pass wired into every scan tick,
  regime distribution and multi-asset runs. Suite grew 0 → 191 tests.
- **Protocol:** .context_ledger/ bootstrapped (core 0.8.0) and migrated to
  core 1.0.6 (office regroup, ledger-* tools, eol=lf .gitattributes fixing
  the Windows CRLF verify false-fail); environment registry blocks for three
  machines; the office closed full at 70/20.
- **Dependency posture:** the long-standing prisma→deepmerge-ts advisory was
  cleared via an npm override (2026-09-03); the later js-yaml high
  (GHSA-2883-xcg3-v3hh) cleared at close time via @mdxeditor/editor 4.2.5 +
  js-yaml 4.3.2 — `npm audit` reports 0 vulnerabilities.
- **New-machine setup** (session 70): repo running on Lameck's
  DESKTOP-3LRR8MD with local PostgreSQL 18.6, baseline green (tsc/lint/
  191 tests), dev server verified live.

## Decisions still in force

(No formal ADRs were recorded in this office — plans/decisions.md stayed
empty; these working agreements live in the session history and still bind.)

- **Binance is the only live exchange.** Coinbase (and any future adapter)
  stays dormant unless enabled by env flag; the switcher teases the rest as
  "coming soon" (user direction, session 42). The adapter registry is the
  extension point — no per-provider branching outside adapters.
- **Trading is double-gated:** order placement requires ENABLE_LIVE_TRADING
  plus explicit user action, and every order validates against live exchange
  filters before submit. Paper/testnet defaults on.
- **Research honesty gates are not to be weakened:** validation is scored at
  most once per strategy spec (spec-hash locked); monitoring returns
  INSUFFICIENT_EVIDENCE rather than guessing; lifecycle promotions only
  through guarded transitions.
- **PostgreSQL only** (SQLite support removed for the Vercel adaptation);
  `next build` type-checks.
- **Standing override** (overrides/rules.md, durable): fix errors found in
  the codebase in-session — including pre-existing ones — rather than
  backlog them; genuinely architectural changes are flagged for approval.

## Open threads

Re-seeded into the fresh office's backlog (original IDs kept for traceability
with the frozen backlog; new items take fresh IDs in the new office):

- B-2026-08-28-1 — testnet order-path validation (gates the "it trades" story)
- B-2026-08-26-2 — Binance User Data Streams + listenKey lifecycle
- B-2026-08-29-1 — multi-exchange v2 (canonical symbols, Coinbase scanning)
- B-2026-09-04-3 — per-regime metric breakout (regime distribution shipped in
  session 66; per-regime MetricSet in the run response remains)
- B-2026-09-13-1 (new ID) — paper-trading runner bridging PAPER strategies to
  forward simulation (open from session 68, never backlogged until now)
- B-2026-09-13-2 (new ID) — research engine step 9, AI researcher (blocked on
  user inputs: LLM choice, credentials, prompt/safety design)
- B-2026-08-26-3 — Binance FIX protocol (parked, low)
- B-2026-08-26-4 — eslint 10 blocked by the Next lint stack (low)

Backlog rows **not** re-seeded because they were verified done at close time
(session 71 against the code): B-2026-08-26-1 (prisma/deepmerge-ts advisory —
cleared by the session-55 npm override; `npm audit` clean), B-2026-09-13-1 of
the old office (this close), B-2026-09-04-1 (monitor pass wired into
scanOnce), B-2026-09-04-2 (HistoricalCandle store + backfill route shipped),
B-2026-09-04-4 (richer Phase A grid — 4 strategy families shipped).

Two still-live project traps were re-seeded into the new office's
inefficiencies log (Windows orphan dev-server child; stale Prisma client
after pulling schema changes). The office's logged flaws were all 0.8.0-era
and are superseded by core 1.0.6: the CRLF verify false-fail is fixed
(installed .gitattributes), the gates .ps1 port crash and the Git-Bash
guidance gap are addressed by the 1.0.6 tooling/docs (gates ran clean through
the close session) — none re-seeded.

Recorded here only (not re-seeded): a possible Donchian regime-conditional
short side (session 67, needs a design decision); the research-engine step-9
blocker detail above; Dependabot's alert banner may lag the audit fix at
close time (local `npm audit` was already 0) — it clears on GitHub's rescan.
