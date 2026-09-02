# Agent Sessions (append-only)

One entry per agent session, newest at the bottom. Never edit or delete
past entries — append corrections instead.

<!-- TEMPLATE — copy below the last entry and FILL IN every placeholder:
---
## YYYY-MM-DD — Session N
- **Agent:** <name> | **Model:** <model id> | **Platform:** <machine/sandbox + OS> | **Role:** <engineer, or overlay from .context/core/roles/> | **Core:** <version from .context/core/VERSION>
- **Task:** <what this session set out to do>
- **Commits:** <count> (<first-sha>..<last-sha>)
- **Outcome:** <done / partial / blocked — one line>
- **Open items:** <pointers into tasks/backlog.md, or "none">
- **Notes:** .context/memory/sessions/<date>-<N>/notes.md  (or "none")
- **Report:** .context/memory/reviews/YYYY-MM-DD-review.md
-->

---
## 2026-08-26 — Session 1
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Bootstrap the `.context/` protocol into the Proxigrid repo and fill initial memory.
- **Commits:** 1 (bootstrap commit — this session)
- **Outcome:** done — `.context/` vendored (core 0.8.0), `AGENTS.md` written, Project Facts + initial memory filled.
- **Open items:** none. First working session should run `context-sync verify`/`status` and Phase 1 discovery per the local edition.
- **Notes:** none
- **Report:** none (bootstrap, no review produced)

---
## 2026-08-26 — Session 2
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Consolidate branches onto `main`, install dependencies, and patch security advisories (Dependabot high).
- **Commits:** 4 (633fe3d default-branch→main; 6af2c52 deps+security; plus 1ca0c98 identity fix and the branch consolidation this session).
- **Outcome:** done — remote reduced to a single `main` branch (default switched on GitHub by the user; stray `master` removed). `npm install` (837 pkgs, routed around a root-owned `~/.npm` cache) + `npm audit fix --force` cleared 6 of 9 advisories. `next build` verified green.
- **Open items:** `tasks/backlog.md` — remaining prisma-chain deepmerge-ts advisory (no stable fix yet); pre-existing setState-in-effect lint errors.
- **Notes:** none
- **Report:** none
- **Correction:** git identity from Session 1 was fixed to `Tisone Kironget <tisonkironget@gmail.com>` (commit 1ca0c98); the Session 1 bootstrap commit 3c099ce remains authored under the old placeholder identity (not rewritten — pushed history).

---
## 2026-08-26 — Session 3
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Fix the 5 pre-existing `react-hooks/set-state-in-effect` lint errors, per the user's standing preference to fix found errors rather than backlog them.
- **Commits:** 2 (cdd4576 fix(ui) lint errors; + this chore(context) memory commit).
- **Outcome:** done — all 5 errors resolved via `useSyncExternalStore` (media query, UTC clock, Embla carousel) and derived render state (count-up). `npm run lint` clean; `next build` green. Baseline lint is now 0 errors.
- **Open items:** `tasks/backlog.md` — remaining prisma-chain deepmerge-ts advisory (no stable fix yet).
- **Notes:** none
- **New override:** recorded in `overrides/rules.md` + `user/preferences.md` — fix found errors in-session (incl. pre-existing), flag only genuinely architectural changes.
- **Report:** none

---
## 2026-08-27 — Session 4
- **Agent:** Kiro | **Model:** claude-sonnet-4.5 | **Platform:** Windows workstation (win32) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Pull latest changes from remote (Session 3 lint fixes), install npm dependencies, document deprecated packages in backlog.
- **Commits:** 1 (this chore(context) commit)
- **Outcome:** done — pulled 8 files including Session 3 lint fixes, installed 793 npm packages successfully. Identified 2 deprecated packages (recharts@2.15.4, eslint@9.39.5) and confirmed 3 high-severity deepmerge-ts vulnerabilities already documented in backlog by Session 2. Added deprecated packages entry to `tasks/backlog.md`.
- **Open items:** `tasks/backlog.md` — deepmerge-ts vulnerability (already tracked), deprecated packages (new entry).
- **Notes:** none
- **Report:** none

---
## 2026-08-26 — Session 5
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Upgrade the deprecated packages flagged by Session 4 (recharts v2→v3, eslint v9→v10).
- **Commits:** 2 (d6986e6 fix(deps) recharts v3; + this chore(context) memory commit).
- **Outcome:** partial — **recharts 2.15.4 → 3.10.1** done: ported the (unused) `chart.tsx` tooltip/legend wrappers to recharts v3 types, added `react-is ^19`; `tsc --noEmit` clean on chart.tsx, lint clean, `next build` green. **eslint NOT upgraded** — the whole 9.x line is deprecated but eslint 10 crashes `npm run lint` (eslint-config-next@16's bundled eslint-plugin-react caps at eslint ^9.7). Kept eslint ^9 so lint works; tracked as a new backlog item.
- **Open items:** `tasks/backlog.md` — eslint 10 blocked by Next lint stack; prisma-chain deepmerge-ts advisory (unchanged).
- **Notes:** Pre-existing `tsc --noEmit` errors unrelated to this task remain and were NOT introduced here: `src/lib/exchanges/binance/binance-adapter.ts` (Candle openTime/closeTime typed as kline tuples, ~6 errors) and `mini-services/realtime-service/index.ts` (missing `socket.io` types — separate service with its own deps). The app build skips type validation, so these never surfaced. Surfaced to the user; not yet backlogged pending their call on scope.
- **Report:** none

---
## 2026-08-26 — Session 6
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Live session — run the Proxigrid app locally and exercise the dashboard/API in the browser.
- **Commits:** 2 (61f06a3 feat(binance) REST override + gitignore *.db; + this chore(context) memory commit).
- **Outcome:** done — app runs on :3000 and all core flows verified live: dashboard shell, **live Markets grid** (real Binance data), Portfolio graceful unconfigured state, **Scan BTC** signal generation (real EMA/Bollinger/MACD/RSI indicators, 4 signals persisted), **automation rule create** (RSI<30 on BTCUSDT), and **rule Evaluate now** (correctly did NOT fire: live RSI 51.9 not < 30, with a clear toast). Set up `.env` (DATABASE_URL) + `npm run db:push` + `.claude/launch.json`.
- **Findings:** (1) Binance geo-block (451) 500s the market endpoints → added `BINANCE_REST_URL` override to reach `data-api.binance.vision` (commit 61f06a3). (2) Markets grid shows infinite skeletons with no error state on data-fetch failure → backlogged. (3) `prisma/dev.db` was not gitignored → added `*.db` to `.gitignore` (commit 61f06a3).
- **Open items:** `tasks/backlog.md` — market-grid error state; eslint-10 blocked; prisma-chain advisory; (unbacklogged) pre-existing tsc errors in binance-adapter / mini-services.
- **Notes:** Browser pane `scroll` action timed out repeatedly ("pane hidden"); worked around by resizing the viewport taller. Screenshots/clicks/refs were fine.
- **Report:** none

---
## 2026-08-26 — Session 7
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Full code-quality sweep, backend → UI, running the app; fix everything found.
- **Commits:** 5 (0f0255d fix binance kline type; 5158440 tsconfig exclude mini-services; 1822211 fix header getSnapshot; 05543e0 feat market-grid error state; + this chore(context) memory commit).
- **Outcome:** done — baseline had 8 `tsc` errors; **now 0** (lint clean, build green throughout). Fixed: (1) **real bug** — `BinanceKlineResponse` was typed as an array-of-tuples, doubly-wrapping `getKlines()` and breaking the candle mapping (verified `/candles` returns correct OHLCV after the fix). (2) `mini-services` (standalone bun service) excluded from the app typecheck. (3) **regression from Session 3** — the header clock's `useSyncExternalStore` `getSnapshot` returned a fresh string each call, tripping React's "getSnapshot should be cached" infinite-loop guard; now uses a module-level cache. (4) added the Markets grid error/empty state (backlog item) — verified live against a broken endpoint (Offline badge + Retry).
- **Backend review:** indicators (SMA/EMA/RSI-Wilder/MACD/Bollinger) mathematically sound; rule engine key scheme (`${indicator}_${period}`) consistent with `buildRuleContext`; `place_order` correctly gated behind `ENABLE_LIVE_TRADING`; Prisma singleton correct. No further bugs found.
- **Open items:** `tasks/backlog.md` — eslint-10 blocked; prisma-chain advisory. Minor (not actioned): `db.ts` logs every query (`log: ['query']`) — noisy in dev; webhook action has no SSRF guard (intentional user-configured URLs).
- **Notes:** Dev StrictMode double-mount cancels react-query's first fetch, so `isError` doesn't latch in dev on a hard failure — the market-grid empty state was made robust to a blank result rather than depending on `isError`. Verifying UI states required full dev-server restarts (HMR served stale code mid-edit, producing transient `showError is not defined` / getSnapshot console errors that cleared on clean reload).
- **Report:** none

---
## 2026-08-26 — Session 8
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Align the Binance integration with the user's Binance API manual (PDF on Desktop) — user chose all three: robustness, order-safety, Ed25519.
- **Commits:** 4 (1af9e65 Ed25519 signer; 0e66071 client hardening; bbf7507 order-safety filters+TIF/STP; + this chore(context) commit).
- **Outcome:** done. (A) **Robustness** — server-time offset sync (GET /api/v3/time) applied to signed timestamps + single auto-retry on -1021; HTTP 429/418 now raise a typed `BinanceRateLimitError` with Retry-After (corrected a stale comment that claimed unimplemented behavior). (B) **Order-safety** — new `binance-filters.ts` validates price/qty against PRICE_FILTER/LOT_SIZE/NOTIONAL before submit (adapter caches per-symbol filters 60s); `OrderRequest` gained TIF (GTC/IOC/FOK/GTX) + STP modes. (C) **Ed25519** — signer supports HMAC or Ed25519 (base64, URL-encoded); client prefers Ed25519 when `BINANCE_PRIVATE_KEY` (PEM) is set, else HMAC via `BINANCE_API_SECRET`.
- **Verification:** can't hit authenticated Binance (no creds + geo-block), so verified with Node self-tests — HMAC matches known hex; **Ed25519 88-byte sig verifies against the derived public key** (matches manual's spec); filter validation checked against **live BTCUSDT filters** (valid passes; bad tick/step/notional rejected). tsc/lint/build all green; app public paths unaffected (100 tickers, candles 200).
- **New env vars:** `BINANCE_API_KEY`, `BINANCE_API_SECRET` (HMAC) or `BINANCE_PRIVATE_KEY` (Ed25519 PEM, escaped newlines ok), `BINANCE_PAPER` (default testnet), `BINANCE_REST_URL` (Session 6), `ENABLE_LIVE_TRADING`.
- **Open items:** `tasks/backlog.md` — User Data Streams + listenKey lifecycle, and FIX protocol (both from the manual, deliberately not implemented).
- **Report:** none

---
## 2026-08-26 — Session 9
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** "Pick up next thing" — chose to add the project's first test suite, guarding the financial-critical logic touched in Sessions 5–8.
- **Commits:** 2 (fe53b6a test suite; + this chore(context) commit).
- **Outcome:** done — introduced **Vitest** (`npm test` / `npm run test:watch`, added as devDependency; no config file needed — the tested modules use relative imports). **24 tests, all green**, covering: indicators (SMA/EMA seeding, RSI bounds + extremes, MACD histogram = macd−signal, Bollinger ordering + zero-variance), `binance-filters` (tick/step/notional/minQty rejection, market + unknown-filter cases), `binance-signer` (HMAC reference digest + tamper check, Ed25519 88-char sign/verify, buildSignedQuery recvWindow cap + URL-encoding). tsc/lint/build all unaffected.
- **Open items:** `tasks/backlog.md` — test coverage could be extended to the services/adapter layer with mocks (new item).
- **Report:** none

---
## 2026-08-26 — Session 10
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** UI redesign — the app felt like a dev terminal; make it a consumer crypto site. User chose: light+dark both first-class (default light) with a visible toggle; full pass over header + KPI + all four cards.
- **Commits:** 3 (5722895 design-system + theme toggle; 1a7deb0 dashboard redesign; + this chore(context) commit).
- **Outcome:** done. Reworked `globals.css` into polished first-class light (default) + dark palettes with soft theme-aware card elevation; **de-monospaced** by pointing `--font-mono` at the sans face (tabular figures retained), so no per-component churn was needed. Added a visible **ThemeToggle** (sun/moon; client-only via `useSyncExternalStore` to stay lint-clean — same rule as the header clock). New `coins.ts` + `CoinAvatar` give markets friendly names ("Bitcoin", "The Sandbox") + monogram avatars + BASE/QUOTE pairs. Redesigned header (dropped the terminal UTC clock), KPI (separate soft stat tiles), markets (coin cards), portfolio/signals/automations (sentence-case labels, light+dark-safe colors, "Rules Engine"→"Automations"). Switched `page.tsx` from a locked single-screen to natural scroll + sticky header. **Verified in-browser in both themes** (screenshots); tsc/lint/build green.
- **Notes:** New reusable design token in globals: `--shadow-card` / `--shadow-card-hover` (theme-tuned). The old "terminal" utility class names (card-premium, lit-top, tint-up/down, scrollbar-terminal, shadow-glow-brand) were kept but restyled theme-aware, so no component references broke.
- **Open items:** possible follow-ups — humanize signal-row symbols (still raw BTCUSDT), and real coin logos (currently monogram avatars, no logo assets shipped).
- **Report:** none

---
## 2026-08-26 — Session 11
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User feedback "something still feels vibe coded" — hunt down and fix the tells.
- **Commits:** 3 (c870f28 curate markets; 33753e7 real sparklines; + this chore(context) commit).
- **Outcome:** done — found two integrity tells and fixed both. (1) **Markets were nonsensical**: sorting all pairs by raw quote volume surfaced fiat pairs (BTC/IDR etc.) shown as USD → "Bitcoin $1,042,508,253". The ticker route now curates to USDT-quoted spot coins (excludes stablecoin/fiat bases + leveraged tokens; `?quote=` override); top markets are now BTC/ETH/SOL/BNB/DOGE at real prices, and "Avg 24h change" is meaningful. (2) **Sparklines were fabricated**: `synthesizeSeries()` generated pseudo-random per-ticker chart data. Replaced with `MarketSparkline` + `useSparkline` hook fetching each symbol's real last-24 hourly candles (cached 60s); deleted the fabricator. Verified in-browser (real prices + distinct real chart shapes); tsc/lint/build green.
- **Notes:** The dev console showed stale `synthesizeSeries/Sparkline/showError is not defined` errors that persisted across reloads — they are `read_console_messages` buffered history from this session's many HMR reloads, NOT live (page renders clean with no Next error overlay; production build is green). This session's HMR staleness is a recurring friction; a clean dev-server restart is the reliable way to get a truthful console.
- **Open items:** signal notes still dump raw indicator values (e.g. "MACD hist=… macd=… signal=…") — developer-y, could be humanized; user said signal rows are otherwise fine.
- **Report:** none

---
## 2026-08-26 — Session 12
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: the UI still felt "vibe coded (AI generated)". Chose direction "serious data-forward fintech, keep green (refined)". Plus fixed a hydration error they pasted.
- **Commits:** 3 (2b9bd7c fintech refactor; 94a8f09 ThemeToggle hydration fix; + this chore(context) commit).
- **Outcome:** done — the AI-generated tells were the **emerald→teal gradients + glow orbs everywhere** and generic soft shadcn cards. Reworked `globals.css` to ink-neutral surfaces (dark is now true near-black, not blue-navy), a **single refined green used sparingly (no gradients)**, crisp flat hairline cards, 0.5rem radius, and precise numeric type (tabular + slashed-zero + tight tracking). Removed gradient logo/wordmark/buttons, portfolio hero gradient + blur orbs, and gradient/blur empty-state icons; neutralized the glow utility. Then fixed a **hydration mismatch** in ThemeToggle: aria-label/icon read `resolvedTheme` without gating on mount → server/client disagreed; folded the mount check into `isDark`. Both themes verified; no hydration error on a clean load; tsc/lint/build green.
- **Open items:** asked the user whether to push **density** further (tighter rows / more data per screen) for the data-forward feel — awaiting their steer. The `text-brand-gradient` CSS class is now a solid-color no-op kept for existing references.
- **Report:** none

---
## 2026-08-27 — Session 13
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Tighten UI density for the data-forward fintech feel (user said "Tighten").
- **Commits:** 2 (34d2261 density; + this chore(context) commit).
- **Outcome:** done — compacted the whole dashboard: markets now show 16 rows (was 12) with shorter rows and a new 24h VOLUME column (`formatCompact` -> 1.24B/340.5M); tighter page rhythm (py-4/space-y-4/gap-3), smaller stat tiles, tighter card headers + list rows, full-strength hairline borders. Reads like a pro trading app (CoinGecko/Coinbase-Pro register). Both themes verified; tsc/lint/build green.
- **Report:** none

---
## 2026-08-27 — Session 14
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: "the light theme is too bright." Soften it.
- **Commits:** 2 (light-theme softening; + this chore(context) commit).
- **Outcome:** done — light `--background` 0.984 → 0.955 (soft gray canvas), `--card` 1.0 → 0.992, muted/secondary/border nudged for depth. Cards now lift off the canvas instead of blending into a blinding white sheet. Dark theme unchanged. Verified in-browser.
- **Report:** none

---
## 2026-08-27 — Session 15
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: the "Live" pills are redundant (there are multiple). Remove them.
- **Commits:** 2 (drop Live pills; + this chore(context) commit).
- **Outcome:** done — removed the header's always-on "Live" pill; the Markets pill now renders only when the feed is down ("Offline"), making it a real status signal. tsc/lint green.
- **Report:** none

---
## 2026-08-27 — Session 16
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: download real logos (Binance + coins).
- **Commits:** 2 (8618d04 logos; + this chore(context) commit). Also dropped Live pills (82ab3e9) and footer GitHub link (cc4b690) earlier this thread.
- **Outcome:** done — bundled self-hosted coin logos from `cryptocurrency-icons` (CC0/public-domain, 483 SVGs → `public/coins/`, no runtime external fetch, CSP-safe). New `CoinLogo` component renders a coin's real logo with onError fallback to the monogram `CoinAvatar` (covers the long tail: ENA/SUI/PYTH/TAO/etc. not in the set). Wired into markets grid + portfolio holdings; header 'Binance testnet' chip now shows the Binance/BNB mark (`bnb.svg`). Majors (BTC/ETH/SOL/XRP/BNB/DOGE/ZEC) get real logos. tsc/lint/build green; verified in-browser.
- **Notes:** chose the CC0 icon package over scraping trademarked assets off exchange sites. Binance exchange logo == BNB gold diamond, so `bnb.svg` doubles as the Binance mark.
- **Report:** none

---
## 2026-08-27 — Session 17
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: signals lack logos; footer 'Not financial advice' contradicts the app's goal.
- **Commits:** 2 (signals logos + footer copy; + this chore(context) commit).
- **Outcome:** done — added CoinLogo to each signal row; changed footer to 'Market data via Binance · Signals & automation' (the 'Not financial advice' line undercut a product whose purpose is generating signals + automating actions). Verified in-browser; tsc/lint green.
- **Report:** none

---
## 2026-08-27 — Session 18
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: remove the placeholder "P" icon from the header (no product icon designed yet).
- **Commits:** 2 (drop P logo; + this chore(context) commit).
- **Outcome:** done — removed the green "P" square; header is now just the Proxigrid wordmark + tagline. lint green.
- **Report:** none

---
## 2026-08-27 — Session 19
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: the card icons look vibe-coded — keep icons but make them real/clean.
- **Commits:** 2 (clean card icons; + this chore(context) commit).
- **Outcome:** done — removed the tinted colored-disc treatment on KPI tiles and the Portfolio/Signals/Automations card headers; icons are now clean small monochrome glyphs inline with the label (Wallet/LineChart/Radar/Zap). Dropped the now-unused `accent` prop from StatCard. (Briefly removed icons per an initial reading, then the user clarified "do not remove, we need real icons" — reverted to keeping them, cleaned the treatment.) tsc/lint green; verified in-browser.
- **Report:** none

---
## 2026-08-27 — Session 20
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: the body Portfolio card duplicates the KPI tile — remove it; make the top KPI tiles clickable to open a detail popup.
- **Commits:** 2 (clickable tiles + detail dialogs, delete portfolio-card; + this chore(context) commit).
- **Outcome:** done — removed the redundant body Portfolio card (Markets now full-width) and deleted the orphaned `portfolio-card.tsx`. Made StatCard clickable (optional onClick, keyboard-accessible). New `StatDetailDialog` opens a drill-down per tile: Portfolio→balances/holdings, Avg 24h change→top movers (gainers/losers), Active signals→recent signals, Automations→rules. Verified both Portfolio and Movers dialogs live in-browser; tsc/lint/build green.
- **Report:** none

---
## 2026-08-27 — Session 21
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: dialogs need a fixed header + scrollable body; stat tiles should animate on hover/click.
- **Commits:** 2 (sticky dialog header/scroll body + tile animation; + this chore(context) commit).
- **Outcome:** done — StatDetailDialog now pins the DialogHeader (border-b, shrink-0) and scrolls only the body (overflow-y-auto). StatCard clickable tiles lift on hover (-translate-y-0.5, border highlight, shadow grows) and press on click (active:scale-0.985). Verified in-browser (movers dialog body scrolls beneath the fixed header); tsc/lint green.
- **Report:** none

---
## 2026-08-27 — Session 22
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: the Automations detail dialog has no options/buttons.
- **Commits:** 2 (functional automations dialog; + this chore(context) commit).
- **Outcome:** done — extracted `RuleRow` (evaluate/toggle/delete controls, own mutation hooks) and exported `CreateRuleDialog` from automation-rules-table; the StatDetailDialog Automations view now renders a 'New rule' button + `RuleRow` per rule, sharing one implementation with the card (DRY). Verified in-browser (dialog shows New rule + play/toggle/delete on the BTC oversold rule); tsc/lint/build green.
- **Report:** none

---
## 2026-08-27 — Session 23
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: create-rule form fields lack margins; markets rows are hollow in the middle.
- **Commits:** 2 (form spacing + market row fill; + this chore(context) commit).
- **Outcome:** done — create-rule form: added label margin via `[&_label]:block [&_label]:mb-1.5` on the container + `space-y-4` between fields. Markets rows: the name was `flex-1` (data hugged both edges, hollow center); gave the name a natural `max-w-[45%]` and made the sparkline container `flex-1` centered to fill the middle. Verified both in-browser; tsc/lint green.
- **Report:** none

---
## 2026-08-27 — Session 24
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: cards too bright in light mode.
- **Commits:** 2 (soften light cards; + this chore(context) commit).
- **Outcome:** done — light `--card`/`--popover` 0.992 → 0.978 (gentle off-white); cards lift off the 0.955 gray canvas via border + shadow instead of glaring. Dark unchanged. Verified in-browser.
- **Report:** none

---
## 2026-08-27 — Session 25
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Build the two code gaps toward running the app on a real Binance account: (1) background automation worker so rules fire on their own; (2) expose the place_order action so automations can trade.
- **Commits:** 3 (cdf0935 worker + sweep route + instrumentation; d086eac place_order in rule form; + this chore(context) commit).
- **Outcome:** done — `automation-worker.ts` (interval sweep, default 60s), `src/instrumentation.ts` starts it on boot gated behind `ENABLE_AUTOMATION_WORKER=true`, and `POST /api/automation/sweep` for manual/cron triggering (tested: swept 1 rule, 0 fired). Rule form gains a 'Place order (live trade)' action with side/order-type/quantity(+limit price) + safety note; still double-gated by `ENABLE_LIVE_TRADING`. tsc/lint/build green; UI verified in-browser.
- **Notes:** For real-account/testnet testing the app must run where Binance isn't geo-blocked (signed endpoints + testnet are 451 here; the data-api override is public-data-only). Recorded env + geo caveat in system/environments.md. Remaining toward live trading (not built): validate the order path on testnet, User Data Streams for fills, encrypted key storage (only relevant if multi-tenant later).
- **Report:** none

---
## 2026-08-27 — Session 26
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Opportunity feed — auto-detect strong signals and prompt the user to act (popup → one-click place order).
- **Commits:** 3 (baea32d scanner + order route; 0fea220 opportunity watcher + confirm dialog; + this chore(context) commit).
- **Outcome:** done — `signal-scanner.ts` auto-generates signals for a watchlist (gated `ENABLE_SIGNAL_SCANNER`), wired into instrumentation. `POST /api/orders` places one order (gated `ENABLE_LIVE_TRADING`; returns `skipped` otherwise — verified). `OpportunityWatcher` (mounted in page.tsx) detects strong new directional signals (>=0.5, <10min) from the live feed and raises a sonner toast with a 'Place order' action → `OrderConfirmDialog` (coin/side/qty) → /api/orders. Detection verified firing via console; order leg returns skipped safely. tsc/lint/build green.
- **Notes:** In quiet markets few signals clear 0.5 (correct — no strong opportunity, no alert). Threshold is a constant (0.5) for now; could be user-configurable later. Scanner persists all generated signals each pass → DB growth over time (retention/pruning is a future cleanup). Verifying the toast needed a temp low threshold + fast poll (reverted).
- **Report:** none

---
## 2026-08-28 — Session 27
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User asked me to stop waiting for feature requests and build proactively. Shipped a feature batch.
- **Commits:** 3 (772b7fb coin detail + chart; + notifications bell; + this chore(context) commit).
- **Outcome:** done — (1) **Coin detail view**: market rows are clickable → dialog with a real recharts area price chart (1h/4h/1d, use-candles hook, price-chart component), live price + 24h change, 24h high/low/volume, the coin's signals + Scan, and Buy/Sell quick-trade wired to OrderConfirmDialog. (2) **Notifications bell** in the header: panel of recent strong signals + rule executions with an unread badge (localStorage last-seen); use-executions hook. Both verified in-browser (BTC chart renders; panel shows ETH/BTC signals); tsc/lint/build green.
- **Notes:** recharts stroke uses literal hex (#10b981/#f43f5e) — CSS vars don't resolve as SVG presentation attributes. Notification bell trigger sits at the screen top edge; clicking via center works.
- **Report:** none

---
## 2026-08-28 — Session 28
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: notification items aren't clickable.
- **Commits:** 2 (clickable notifications; + this chore(context) commit).
- **Outcome:** done — notification items are now buttons; each carries symbol/price and on click closes the panel + opens that coin's CoinDetailDialog (uses the live ticker if present, else a minimal ticker from the signal). Verified: clicking 'Ethereum: Sell signal' opened ETH's detail with chart/stats/signals. tsc/lint/build green.
- **Report:** none

---
## 2026-08-28 — Session 29
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Autonomous feature batch (user greenlit): DB-backed watchlist + Cmd/Ctrl-K command palette.
- **Commits:** 3 (6708483 watchlist; 85d84b6 command palette; + this chore(context) commit).
- **Outcome:** done — (1) **Watchlist**: new `WatchItem` Prisma model (db push), `/api/watchlist` GET/POST + `/api/watchlist/[symbol]` DELETE, `useWatchlist`/`WatchStar`; stars on market rows + coin detail; a 'Watchlist' filter on the markets card; the signal scanner now also scans watched symbols. (2) **Command palette**: Cmd/Ctrl-K (or header Search button, via a `proxigrid:command` CustomEvent) opens a cmdk palette to jump to any coin (→ CoinDetailDialog) or run actions (toggle theme, scan BTC). Both verified in-browser (star BTC/ETH persist + filter; palette 'sol' → Solana detail). tsc/lint/build green.
- **Notes:** IMPORTANT — after a Prisma schema change + `db push`, the RUNNING dev server keeps the stale generated client (`db.watchItem` undefined → 500); **restart the dev server** to load the regenerated client. Prod build is fine (regenerates at build).
- **Report:** none

---
## 2026-08-28 — Session 30
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: coin detail close (X) overlaps the Sell button — accidental-click hazard; fix header + UI inconsistencies. Also added the feature roadmap to backlog.
- **Commits:** 3 (250af1a feature roadmap in backlog; coin-detail header fix; + this chore(context) commit).
- **Outcome:** done — moved Buy/Sell out of the coin-detail header (where they collided with the dialog X) into a full-width action row in the body; header keeps coin identity + watch star with pr-8 reserving X space. Verified in-browser. Other dialogs (StatDetail/OrderConfirm/CreateRule) have no right-aligned header content, so no similar collision. Also seeded `tasks/backlog.md` with a 10-item feature roadmap (headline: strategy backtester from the user's mockup).
- **Report:** none

---
## 2026-08-28 — Session 31
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User: make the dialog close (X) container turn red on hover/click.
- **Commits:** 2 (dialog close red hover; + this chore(context) commit).
- **Outcome:** done — `src/components/ui/dialog.tsx` close button now has a padded rounded container with hover:bg-destructive/15 + red icon and active:bg-destructive/25; applies to every dialog. Verified in-browser (red tint on hover). lint green.
- **Report:** none

---
## 2026-08-28 — Session 32
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Work the backlog top-down — build the Strategy backtester (top item).
- **Commits:** 3 (backtester feat; backlog mark-done; + this chore(context) commit).
- **Outcome:** done — pure `lib/backtest.ts` (long-only sim, compounding equity, MA crossover / RSI reversion) + `BacktestPanel` (symbol/timeframe picker, strategy toggle, param sliders, recharts price+MA chart with green buy / red sell ReferenceDots, Total Return / Win Rate / Total Trades). Mounted on the dashboard. Added `vitest.config.ts` resolving the `@/` alias (previously tests could only use relative imports); 3 backtest tests → **27 total green**. Matches the user's mockup; verified in-browser (BTC MA-crossover: +0.2% / 40% / 5 trades). tsc/lint/build green. Marked the backlog item done.
- **Notes:** recharts v3: `ReferenceDot` has no `isFront` prop (tsc caught it). RSI-reversion backtest buys on *crossing into* oversold, so a monotonic decline (already oversold) yields no trade — test series must rise→fall→rise to cross the thresholds.
- **Report:** none

---
## 2026-08-28 — Session 33
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Backlog #2 — candlestick chart mode.
- **Commits:** 2 (candlestick feat; + this chore(context) log/mark-done).
- **Outcome:** done — `PriceChart` now takes a `mode` prop (`area` | `candles`). Candlesticks render with a recharts `ComposedChart` + a `Bar` whose custom shape draws the high/low wick and the open/close body (green close>=open / red) using the [low,high] range bar's pixel scale. A line/candles icon toggle sits left of the timeframe buttons in the coin detail dialog; candle tooltip shows O/H/L/C. tsc/lint/build green; verified in-browser (BTC candles + OHLC tooltip render correctly).
- **Notes:** recharts has no native candlestick — the range-bar-plus-custom-shape trick (dataKey `[low, high]`, derive px/price from the resolved y/height) is the reliable v3 path. Area chart is still the default mode.
- **Report:** none

---
## 2026-08-28 — Session 34
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Backlog #3 — price alerts.
- **Commits:** 2 (price-alerts feat; + this chore(context) log/mark-done).
- **Outcome:** done — `PriceAlertDialog` gives a consumer-friendly "notify me when <coin> rises above / falls below $X" flow by composing an automation rule (`price` condition + `notify` in-app action) through the existing `useCreateRule` — no backend changes. Triggered by a bell button added to the coin detail header (beside the watch star); seeds the target with the live price; 3600s cooldown so a price hovering at the threshold doesn't spam. Verified in-browser: created "BTC above 85,000.00" → toast + appears in the Automations list. tsc/lint/build green.
- **Notes:** hit the `react-hooks/set-state-in-effect` lint rule again when seeding the form from the intent prop — resolved with the render-time reset pattern (compare intent by reference to a `seededFor` state, adjust state during render, not in an effect). The parent passes a fresh intent object per open so it reseeds each time.
- **Report:** none

---
## 2026-08-28 — Session 35
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Backlog #4 — configurable opportunity-alert threshold.
- **Commits:** 2 (settings feat; + this chore(context) log/mark-done).
- **Outcome:** done — the OpportunityWatcher's hardcoded `0.5` strength cutoff is now a user setting. New `useLocalSetting` hook (localStorage-backed, SSR-safe via `useSyncExternalStore`, same-tab broadcast + cross-tab `storage` event), `lib/settings.ts` (key + default), and a `SettingsMenu` popover (gear in the header) with a sensitivity slider. Watcher reads the threshold via the hook. Verified in-browser: seeded localStorage → reload → popover shows ≥75% (read/persist path). tsc/lint/build green.
- **Notes:** two lint rules bit in sequence — `react-hooks/refs` now forbids assigning `ref.current` during render (had tried it to read latest threshold in the effect without re-running); resolved by just putting `threshold` in the effect deps (re-run is harmless — all prior signals are in `seen`). Radix Slider drags don't fire via synthetic pointer events in the Browser pane; verified the value path by seeding localStorage + reload instead.
- **Report:** none

---
## 2026-08-28 — Session 36
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Backlog #5 — signal retention / pruning + dedupe.
- **Commits:** 2 (signals feat; + this chore(context) log/mark-done).
- **Outcome:** done — `generateAndPersist` dedupes: it queries the most recent stored signal per (symbol, timeframe, indicator) and only persists when the direction changed, so each Signal row is a real state change (and the OpportunityWatcher stops re-alerting on unchanged conditions). Added `pruneOldSignals(SIGNAL_RETENTION_DAYS|7)` (deleteMany where createdAt < cutoff), called each scanner tick. Verified via the /api/signals POST: first scan created 2, immediate re-scan created 0. tsc/lint/build green.
- **Notes:** dedupe changes manual-scan UX slightly — a re-scan with no state change now returns 0 created (honest: nothing changed). Prune interval piggybacks the scanner (only runs when ENABLE_SIGNAL_SCANNER=true); a standalone cron could be added later if the scanner is off but signals still accumulate via manual scans.
- **Report:** none

---
## 2026-08-28 — Session 37
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Backlog #6 — rule execution detail view.
- **Commits:** 2 (execution-detail feat; + this chore(context) log/mark-done).
- **Outcome:** done — `ExecutionDetailDialog` inspects one rule fire: trigger snapshot (symbol, price at fire, exchange, timeframe, the matched-condition notes) + action result (status, detail, and a raw JSON block for extras like an order payload). Two entry points: notification-bell "Rule fired" items now open the inspector (signals still open coin detail), and each automations RuleRow's "Last fired" line is a button opening that rule's latest execution (rules API already includes the 5 latest). Widened the RuleExecution type (ctx.exchange/timeframe, actionResult index signature). Verified in-browser: created + evaluated an always-true price rule → dialog showed SUCCESS, price 77,678.64, "price 77678.64 <= 999999", notify payload. Cleaned up the throwaway rule. tsc/lint/build green.
- **Notes:** the executions embedded on a rule (use-automation-rules) are typed with `unknown` snapshots and carry no back-reference to the rule name — cast to RuleExecution and inject `{ rule: { name } }` when opening from the table.
- **Report:** none

---
## 2026-08-28 — Session 38
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Backlog #7 — portfolio allocation chart.
- **Commits:** 2 (allocation feat; + this chore(context) log/mark-done).
- **Outcome:** done — `PortfolioAllocation` renders a recharts donut of holdings by value in the Portfolio stat-detail dialog: aggregates by asset across exchanges, keeps the top 6 slices and groups the tail into "Other", literal-hex palette with a color-matched legend (asset · value · %) and a % tooltip; returns null when total <= 0 so it stays hidden in the current unconfigured/no-balances state. Verified in-browser by temporarily injecting synthetic holdings into /api/portfolio (BTC 51% / ETH 19% / SOL 12% / BNB 10% / XRP 5% / TRX 2% / Other 2%) — donut + legend correct, DOGE correctly folded into Other — then fully reverted the debug block (git diff clean). tsc/lint/build green.
- **Notes:** real balances still need creds + a Binance-reachable host (signed endpoints are 451 geo-blocked here), so the donut is dormant until an account is connected — the component and its empty behavior are done and shippable.
- **Report:** none

---
## 2026-08-28 — Session 39
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Backlog #8 — mobile / responsive polish. (Multi-exchange, the item above it, deliberately skipped — see Notes.)
- **Commits:** 2 (mobile feat; + this chore(context) log/mark-done).
- **Outcome:** done — audited the dashboard at 375px: the KPI 2x2 grid, single-column markets, signals/automations, backtester (chart + metrics + sliders) and footer all already stack cleanly (no horizontal overflow). Fixed two real gaps: (1) the Markets list's unconditional `max-h-[28rem] overflow-y-auto` created a nested scroll-trap on touch — gated it to `xl:` so mobile flows with the page; (2) the search/command-palette trigger was `hidden sm:inline-flex` — added a compact `sm:hidden` search icon in the header dispatching the same `proxigrid:command` event. Verified in-browser (mobile emulation): search icon present, market list flows without an inner scrollbar, palette opens as a usable bottom sheet. tsc/lint/build green.
- **Notes:** DEVIATED from strict top-down order — the backlog item above this one, **Multi-exchange support**, is an architectural spike (cross-exchange symbol mapping BTCUSDT↔BTC-USD, getTickers rate-limits with no cheap batch endpoint on Coinbase, and a UI exchange-switcher) that needs a design decision, so per the standing "flag architectural changes" rule it was left in the backlog for a dedicated session rather than half-built. Browser-pane mobile emulation flakiness: taps sometimes select text / time out ("pane hidden"); verified layout via tall-viewport screenshots + JS-dispatched events instead of synthetic taps.
- **Report:** none

---
## 2026-08-28 — Session 40
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Backlog — extend test coverage to services + adapter.
- **Commits:** 2 (test-coverage feat, amended to include the files after a git-add slip; + this chore(context) log/mark-done).
- **Outcome:** done — +27 tests (suite 27 -> 54, 7 files green). `conditions.test.ts` covers the rule-engine core: price/indicator/volume compares, crosses_above/below against a numeric value and against a ref indicator (incl. the "already above, no cross" and "not ready/unavailable" paths), and matchMode all/any. `signal-generators.test.ts` asserts each generator's direction on crafted series (RSI over/oversold, MACD momentum via a quadratic trend, EMA trend, Bollinger band-pierce + neutral) plus the common output shape — exported `SIGNAL_GENERATORS` to enable it. `binance-adapter.test.ts` guards the kline->Candle mapping (the past double-wrap regression) by spying on `getClient().getKlines`. tsc/lint/build green.
- **Notes:** MACD needs an *accelerating* series (quadratic `i*i`), not a linear ramp — a linear trend flattens the histogram and the sign flips as signal catches up. Renamed `vitest.config.ts` -> `.mts` to clear the CJS/ESM config warning that printed on every run. git-add gotcha: passing the old `vitest.config.ts` path (already renamed) made `git add` abort and stage nothing, so the first commit caught only the rename — fixed with `--amend`. Remaining follow-up noted in backlog: automation-service sweep/cooldown DB-path tests (need a Prisma mock).
- **Report:** none

---
## 2026-08-29 — Session 41
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Multi-exchange support — design-for-approval, then build v1 (Coinbase).
- **Commits:** 3 (phase 1 adapter; phase 2 switcher; + this chore(context) log/mark-done).
- **Outcome:** done (v1). User picked "Design multi-exchange" then approved v1 scope (native symbols, Coinbase browse-only, trading stays Binance). Wrote a design doc (artifact fb40249a-0e52-48d1-8df7-8ccd5251cdb9). **Phase 1:** CoinbaseAdapter over Coinbase's public Advanced Trade market API (getSymbols/getTicker(s)/getCandles/getOrderBook), reachable here without creds/geo-block; native BTC-USD symbols; parsePair now splits dash format; private methods throw market-data-only; registered behind COINBASE_ENABLED. +6 mapping tests (suite 54->60). Verified via /api/markets/coinbase/*. **Phase 2:** useExchange (localStorage + useSyncExternalStore string store) + ExchangeSwitcher dropdown in the Markets header (from useExchanges()); threaded selection through grid/KPI/sparklines/command-palette/movers. Coin detail keys candles off the ticker's exchangeCode and gates Buy/Sell + alert + signals behind a browse-only note for non-Binance; 24h high/low derived from candles when the feed omits them. Verified in-browser: Coinbase grid shows USD pairs w/ logos, browse-only detail, persists across reload; switching back restores full Binance trading UI. tsc/lint/build/tests all green.
- **Notes:** Extensibility (user asked mid-session): everything routes through the ExchangeAdapter interface + registry — a new provider (another exchange, or a forex/derivatives broker like Deriv; `kind` already supports forex/stock/commodity) is implement-in-its-own-folder + register, nothing else changes. NO per-provider branching leaked into routes/hooks — the ticker route's Binance-specific curation naturally no-ops for Coinbase (falls back to volume-sorted), so it needed no change. Coinbase quirks: no 4h granularity (mapped 4h->SIX_HOUR); candles come newest-first (sorted ascending); products feed has no 24h high/low (derived from candles); base volume only (quoteVolume approximated as base*price for sorting). Renamed vitest.config .ts->.mts earlier; fixed __dirname->import.meta.dirname. v2 backlog line added (canonical symbols + Coinbase scanning).
- **Report:** none

---
## 2026-08-29 — Session 42
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Make the app purely Binance for now; tease other exchanges as "coming soon".
- **Commits:** 2 (exchange default/teaser feat; + this chore(context) log).
- **Outcome:** done — user directed "purely Binance for now", then refined: keep other exchanges visible as "coming soon" popups. Coinbase is now opt-in (registry registers it only when COINBASE_ENABLED=true), so out of the box Binance is the only live exchange and no Coinbase data is served — all the session-41 adapter/UI code stays in-tree, dormant. ExchangeSwitcher rebuilt as a DropdownMenu: live exchanges (from /api/exchanges) are selectable radio items; a "Coming soon" section lists Coinbase/Kraken/Deriv with a SOON badge and pops a teaser toast (no switch). useExchange is self-healing — coerces a stored exchange that isn't currently registered back to the default (guards the stale-'coinbase'-in-localStorage case from my session-41 testing) while keeping the stored value so re-enabling restores it. tsc/lint/build/60 tests green. Verified in-browser: switcher shows Binance live + Coinbase/Kraken/Deriv "coming soon", teaser toast fires, grid stays on Binance, stale localStorage self-healed.
- **Notes:** Design decision reversal is clean because session 41 gated Coinbase behind an env flag and hid the switcher on a single exchange — flipping default + adding the teaser list was ~3 files, no revert. To bring Coinbase back live: COINBASE_ENABLED=true (it then leaves the coming-soon list and becomes selectable automatically). The Deriv probe earlier (public app_id 1089) connected but returned zero active_symbols, so Deriv stays a roadmap teaser, not a build.
- **Report:** none

---
## 2026-08-29 — Session 43
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Header cleanup — theme toggle redundant with settings; search bar too short.
- **Commits:** 2 (header refactor; + this chore(context) log).
- **Outcome:** done — user noted the standalone theme toggle overlapped the settings gear. Moved the theme control into the SettingsMenu popover as an Appearance segmented control (Light / Dark / Auto, with a mounted-gated active highlight to avoid a hydration mismatch), removed the ThemeToggle button from the header, and deleted the now-dead theme-toggle.tsx. Also widened the header search trigger from a stubby pill into a proper search bar (w-56 / lg:w-72, "Search markets…" with ⌘K pushed right via ml-auto). Verified in-browser: header shows the wider search + bell + settings only; Settings popover switches theme live (Light/Dark/Auto). tsc/lint/build/60 tests green.
- **Notes:** command-palette's "Toggle theme" action still works (it uses next-themes useTheme directly, not the removed component). Restored the theme to Light after testing so the user's preference isn't changed.
- **Report:** none

---
## 2026-08-29 — Session 44
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Move the exchange switcher from the Markets card onto the header Binance/testnet badge.
- **Commits:** 2 (switcher relocation; + this chore(context) log).
- **Outcome:** done — user expected the header's "Binance · testnet" badge to be the clickable exchange picker (with Deriv etc.), not a dropdown on the Markets card. Reworked ExchangeSwitcher so its trigger IS the header badge (per-exchange logo · name · testnet-from-isPaper · chevron), moved it into the header where the static badge was, and removed it from the Markets card header (kept useExchange there for the ticker/sparkline queries). Menu unchanged: Binance live radio + Coming soon (Coinbase/Kraken/Deriv) teaser toasts. Verified in-browser: header badge opens the menu, Deriv teaser fires, app stays on Binance. tsc/lint/build/60 tests green.
- **Notes:** trigger stays hidden below md (matches the original badge's `hidden md:flex`). Only Binance has a logo (/coins/bnb.svg); other exchanges would need one when they go live, but the trigger only ever shows the active (live) exchange so it's a non-issue for now.
- **Report:** none

---
## 2026-08-29 — Session 45
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Use real exchange logos in the switcher.
- **Commits:** 2 (exchange logos; + this chore(context) log).
- **Outcome:** done — vendored Binance + Coinbase brand SVGs to public/exchanges/ (Simple Icons, CC0 — mirrors the coin-logos-in-public/coins pattern). Added ExchangeLogo (renders /exchanges/{code}.svg, falls back to a brand-colored monogram roundel). Wired it into the switcher trigger and all menu rows. Simple Icons has no Kraken/Deriv icon (404), so those show brand-colored K/D monograms (kraken #7132F5, deriv #FF444F) until official SVGs are dropped in. Verified in-browser: header badge shows the Binance diamond; menu shows Coinbase (real), Kraken/Deriv (monograms). tsc/lint/build/60 tests green.
- **Notes:** user context — Deriv is its own platform (like Binance), deliberately on hold until Binance is solid; stays in the coming-soon list. To add exact Kraken/Deriv logos later: drop kraken.svg / deriv.svg into public/exchanges/ and ExchangeLogo picks them up automatically (no code change).
- **Report:** none

---
## 2026-08-29 — Session 46
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Trim the coming-soon exchange list to the real roadmap.
- **Commits:** 2 (drop Kraken; + this chore(context) log).
- **Outcome:** done — searched for real Kraken/Deriv logos across Simple Icons (CC0), VectorLogoZone, and svgl; none carry the Kraken exchange or Deriv (svgl only has KrakenJS, a JS lib). Rather than scrape unclear-license trademarked SVGs, kept brand-colored monograms for the unsourced ones. Then, per user, removed Kraken (my speculative pick) from COMING_SOON — the list is now Coinbase + Deriv, matching the real roadmap (Binance live, Coinbase built/opt-in, Deriv on hold). Verified in-browser. tsc/lint/build green.
- **Notes:** ExchangeLogo auto-adopts a real /exchanges/{code}.svg if one is dropped in later (official brand/press-kit SVG is the licensing-clean source). Binance + Coinbase already have real CC0 marks vendored.
- **Report:** none

---
## 2026-08-29 — Session 47
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Get the real Deriv logo (I'd wrongly concluded it wasn't findable).
- **Commits:** 2 (vendor deriv.svg; + this chore(context) log).
- **Outcome:** done — user pointed out Deriv obviously publishes its logo. My earlier check only covered CC0 icon *sets* (Simple Icons/VectorLogoZone/svgl), not Deriv's own brand assets. Grepped deriv.com's homepage for its logo SVG (on their website-files CDN), fetched the official 'd' mark (32x32, #FF444F), validated it (closing tag), and vendored it to public/exchanges/deriv.svg. ExchangeLogo auto-adopts it — Deriv now shows its real mark, no code change. All three exchange logos are official assets. Verified in-browser; build green.
- **Notes:** lesson — for brand logos, the company's own brand-assets/press-kit page is the right source, not just CC0 icon libraries. Kraken (removed last session) would be the same if ever re-added.
- **Report:** none

---
## 2026-08-29 — Session 48
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Verify the Coinbase logo is real/right (user asked).
- **Commits:** 2 (swap Coinbase wordmark->symbol; + this chore(context) log).
- **Outcome:** done — inspected the vendored coinbase.svg by opening it full-size: it was the Coinbase *wordmark* ("coinbase" text, from Simple Icons), which renders as an unreadable blue smudge at 18px. Sourced the real Coinbase coin *symbol* (blue roundel + white C mark) from svgl (also on vectorlogo.zone), vendored it over public/exchanges/coinbase.svg. Now Binance/Coinbase/Deriv are all recognizable brand symbols at small size. Verified in-browser; build green.
- **Notes:** lesson refined — check the *kind* of mark, not just that a logo exists: Simple Icons' Coinbase entry is the wordmark, useless as a small badge. Always eyeball the vendored SVG at render size. svgl/vectorlogo.zone carry proper square symbol icons.
- **Report:** none

---
## 2026-08-29 — Session 49
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Design + ship the first Proxigrid product mark (favicon / app icon).
- **Commits:** 2 (favicon; + this chore(context) log).
- **Outcome:** done — showed the user favicon concepts (green P vs a grid mark) then 6 grid-mark variations via the visualize widget; user chose their own idea: a 2x2 grid on a dark rounded tile, top-right green (#34D399) / bottom-left white (#F6F8F7) / other two muted (#2E3731) — a market grid with one lit signal cell (the 'grid' in Proxigrid). Added src/app/icon.svg (64x64) + src/app/apple-icon.svg (180) — Next.js App Router auto-serves them as favicon + touch icon. Verified: /icon.svg 200 image/svg+xml, linked in <head>, renders correctly at tab size. Build green.
- **Notes:** original in-house mark (no third-party asset). To restyle later just edit the two SVGs. Header still has no P/logo mark — could add this grid mark beside the wordmark if wanted; not done (out of scope of the favicon ask).
- **Report:** none

---
## 2026-08-29 — Session 50
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Make the header wordmark an SVG (keep its exact look).
- **Commits:** 2 (svg wordmark; + this chore(context) log).
- **Outcome:** done — replaced the header's two text spans with a Wordmark <svg> component. Font is Geist Bold (the app font, --font-geist-sans), tracking-tight, viewBox sized to Geist metrics (advance 441.7 @ em100, so nothing clips); "Proxi" fills var(--primary) green, "grid" fills currentColor — both theme-aware. Verified in-browser: matches the original exactly. tsc/lint/build green.
- **Notes:** first tried TRUE outlined paths (fetched Geist-Bold.ttf OFL, opentype.js). My manual glyph-by-glyph concat dropped "roxi"; switching to font.getPath fixed Proxi but "grid" still dropped the d + i-dot under nonzero fill winding (Proxi rendered fine — asymmetry unexplained). Abandoned outlining for the robust SVG <text> (font-dependent, but Geist is loaded app-wide, so identical result). The browser pane intermittently "not compositing frames" made getBBox/screenshots unreliable mid-debug — standalone /public svg in a fresh foreground tab was the reliable visual check. If a font-INDEPENDENT logo asset is ever needed, revisit outlining (try per-glyph separate <path> elements, or a proper text-to-path tool).
- **Report:** none

---
## 2026-08-29 — Session 51
- **Agent:** Claude Code | **Model:** claude-opus-4-8 | **Platform:** bao's macOS workstation (macOS 15.7.7) | **Role:** engineer | **Core:** 0.8.0
- **Task:** Adapt the app for Vercel (user was trying to deploy there).
- **Commits:** 2 (vercel adaptation; + this chore(context) log).
- **Outcome:** done — diagnosed the mismatch (app was built long-running: SQLite file DB + setInterval workers + standalone/bun serve — none work on Vercel serverless), user chose "adapt for Vercel". Changes: Prisma sqlite->postgresql (schema was already portable); `postinstall: prisma generate`; `vercel.json` with a Vercel-only buildCommand (`prisma db push --skip-generate && next build`) + a cron hitting `/api/cron/tick` every 10 min; `next.config` emits standalone only when not on Vercel (VERCEL=1); extracted `scanOnce()` in signal-scanner (shared by the interval worker + cron) and added `GET /api/cron/tick` (scan + automation sweep, guarded by CRON_SECRET); `.env.example` (un-ignored via `!.env.example`) + `docs/DEPLOY-VERCEL.md`. tsc/lint/build/60 tests green — `next build` compiles without a DB connection (routes are dynamic), so it passes locally even though local DATABASE_URL still points at the old sqlite file.
- **Notes:** the deploy steps are the USER's (Vercel account): import repo, add Vercel Postgres (auto-sets DATABASE_URL), set CRON_SECRET, deploy. Vercel Hobby restricts cron frequency (schedule set to */10; Pro allows minutely). Local dev now REQUIRES Postgres (point DATABASE_URL at local/Neon PG, then `npm run db:push`). Trading still dry-run unless ENABLE_LIVE_TRADING + creds; Binance signed endpoints may be geo-blocked from Vercel's region.
- **Report:** none


---
## 2026-09-02 — Session 52
- **Agent:** ZCode | **Model:** glm-5.3-flash | **Platform:** Tisone's Windows workstation (win32, Git Bash) | **Role:** engineer | **Core:** 0.8.0
- **Task:** "analyze" — general sweep: re-baseline on a new Windows machine (first non-macOS session), full code review, fix safe issues.
- **Commits:** 8 product/report (cf19f41 cron security; 3cc3b2d orders validation; 75a7ffb param clamps + watchlist/timeframe validation; fb79c5b dead useTicker removal; 210d7af config hygiene incl. typecheck-on-build + turbopack.root + portable scripts; f9701d7 rules 404s; dfccb4c README refresh; 646166d review report) + this chore(context) commit.
- **Outcome:** done — baseline green (lint/tsc/60 tests/build; build now type-checks). High: cron endpoint fail-closed + timing-safe. Key flags (not fixed, architectural): no-auth API surface, webhook SSRF-by-design, plaintext Exchange.apiKey/apiSecret columns (unused). Audit chain rechecked — still no stable fix (prisma 8 RC).
- **Open items:** `tasks/backlog.md` unchanged in substance (prisma advisory recheck note added). New in flaws/log.md: context-sync CRLF false-positive on Windows (rollback NOT run — core verified intact via blob hashes), broken context-gates.ps1, Git Bash guidance.
- **Notes:** none
- **Report:** .context/memory/reviews/2026-09-02-review.md

---
## 2026-09-02 — Session 53
- **Agent:** ZCode | **Model:** glm-5.3-flash | **Platform:** Tisone's Windows workstation (win32, Git Bash) | **Role:** engineer | **Core:** 0.8.0
- **Task:** User asked "can this make me money?" → approved both honesty features: fees+slippage in the backtester, and signal outcome tracking (measured accuracy).
- **Commits:** 4 (e180b72 backtest costs net/gross; 8e2db67 outcome grading backend; a986e6e performance API + feed strip; cbdf353 README row) + this chore(context) commit.
- **Outcome:** done — backtester now reports net-of-costs return (10bps fee + 5bps slippage per side, ~0.3%/round trip) vs gross, wins count on net; 6 backtest tests incl. one demonstrating a profitable-gross/net-negative strategy. Signals grade themselves: return1h/return24h (direction-adjusted) resolve via checkSignalOutcomes() in every scan tick; /api/signals/performance + a hit-rate strip in the feed (hidden until data exists). Verified end-to-end live: generated real BTC/ETH/SOL signals, resolver graded aged seeds correctly, perf endpoint 200.
- **Open items:** none new; existing backlog stands (testnet order validation remains the gate to real trading).
- **Notes:** Environment fixes en route (see environments.md): stale sqlite DATABASE_URL replaced with local Postgres 18 (proxigrid db created); port 3000 dual-listener quirk (use 127.0.0.1).
- **Report:** none (feature session; report not required — deliverable is the feature set)
