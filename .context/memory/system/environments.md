# Environments (update in place)

Machines and sandboxes agents have run on, and what it takes to work on
this project from each. One block per environment; update the matching
block (and its "last verified" date) every time you run on it again.

## Rules

1. **Match before you add.** At session start, check whether the machine
   you're on already has a block (use its "Identify by" line). Update the
   match; add a new block only for a genuinely new environment.
2. **Record what you verified, not what you assume.** A command belongs
   under "Verified commands" only after it ran successfully on this
   environment, this project.
3. **Agents never delete blocks.** An environment the project no longer
   uses may be pruned by the user; if you can't verify a block, leave it
   alone — its last-verified date already says how stale it is.
4. **Machine facts only.** Secret values go in `secrets/`; user
   preferences in `user/`; project-wide decisions in `plans/`.

<!-- TEMPLATE — one block per environment:
---
## <stable label — hostname, "Z sandbox", "GitHub Actions ubuntu-24.04"> (last verified YYYY-MM-DD)
- **Identify by:** <how an agent recognizes this env — hostname, $USER, workspace path>
- **OS:** <e.g., macOS 15.5 / Ubuntu 24.04 sandbox>
- **Runtimes:** <node X, python Y, ...>
- **Package manager:** <npm/bun/pnpm/pip/...>
- **Verified commands:** <install / test / lint / typecheck / dev-server commands that actually worked here, with cwd if it matters>
- **Quirks:** <e.g., "no psql installed", "port 3000 usually taken", "system Python locked down">
-->

---
## bao's macOS workstation (last verified 2026-08-26)
- **Identify by:** `$USER` = `bao`; workspace path `/Users/bao/Code/proxigrid`
- **OS:** macOS 15.7.7 (build 24G720)
- **Runtimes:** node v24.17.0. `package.json` scripts (`start`) invoke `bun` — presence not yet verified on this machine.
- **Package manager:** npm (lockfile-driven); `bun` used for the standalone server start per `package.json`
- **Verified commands (from repo root):**
  - Install: `npm install --cache <writable-dir>` — the default `~/.npm` cache has root-owned objects from the original checkout; use a fresh cache dir to avoid EACCES (Session 2).
  - Lint: `npm run lint` (clean on eslint 9). Typecheck: `npx tsc --noEmit` (clean since Session 7). Build: `npx next build` (green; skips type validation). Test: `npm test` (Vitest, added Session 9).
  - DB: create `.env` with `DATABASE_URL="file:./dev.db"`, then `npm run db:push` (creates `prisma/dev.db`, gitignored). No seed script — DB starts empty.
  - Run app: `npm run dev` → http://localhost:3000 (Next 16, Turbopack). Preferred via `.claude/launch.json` (server name `proxigrid-dev`). `.claude/` is gitignored, so the launch.json is local-only.
- **Quirks:** Repo was initially checked out entirely as `root:staff`, blocking all writes and commits; fixed with `sudo chown -R bao:staff /Users/bao/Code/proxigrid`. Git then reported "dubious ownership"; added `git config --global --add safe.directory /Users/bao/Code/proxigrid`. Git user identity was unset — configured repo-locally as `Tisone Kironget <tisonkironget@gmail.com>`. **Binance is geo-restricted here:** `api.binance.com` and `testnet.binance.vision` return HTTP 451, 500-ing the market endpoints; set `BINANCE_REST_URL="https://data-api.binance.vision"` in `.env` (public data endpoint, reachable) to get live market data — supported via the override added in Session 6. **Automation runtime env (Session 25):** `ENABLE_AUTOMATION_WORKER=true` starts the in-process rule sweeper (interval `AUTOMATION_SWEEP_SEC`, default 60) via `src/instrumentation.ts`; actual order placement additionally requires `ENABLE_LIVE_TRADING=true` + configured Binance keys. `POST /api/automation/sweep` triggers a sweep manually (cron alternative). `ENABLE_SIGNAL_SCANNER=true` starts the watchlist signal scanner (`SIGNAL_SCAN_SYMBOLS` default BTC/ETH/SOL/BNB/XRP, `SIGNAL_SCAN_SEC` default 120, `SIGNAL_SCAN_TIMEFRAME` default 1h) so the opportunity feed surfaces alerts on its own. `POST /api/orders` places a single order, gated by `ENABLE_LIVE_TRADING`. NOTE: signed/account/order endpoints (and Binance testnet) are geo-blocked (451) from this machine — real-account/testnet trading must run from an allowed region; the `data-api.binance.vision` override only covers public market data, not signed calls.

---
## Tisone's Windows workstation (last verified 2026-09-02)
- **Identify by:** `$USER` = `tison`; workspace path `C:\Users\tison\Dev\proxigrid`; OS win32
- **OS:** Windows (build 10.0.26200), Git Bash as shell; `sh` (POSIX edition of core tools) works here
- **Runtimes:** node v24.13.0
- **Package manager:** npm (package-lock.json authoritative; `cross-env` added Session 52 for the `start` script)
- **Verified commands (from repo root, this session):** `npm run lint` (clean), `npx tsc --noEmit` (exit 0), `npm test` (60/60), `npm run build` (green, runs TypeScript validation), `npm audit` (3 high — known prisma chain). DB: `.env` has `DATABASE_URL` (Postgres, reachable) + `BINANCE_REST_URL`; schema pushed (Signal table live).
- **Quirks:**
  - `git core.autocrlf=true` checks files out CRLF → `context-sync verify` false-fails against the LF MANIFEST (see flaws/log.md before running rollback!). `.ps1` core tools: `context-gates.ps1` is broken; use the `sh` editions via Git Bash.
  - A stray `package-lock.json` sits in `C:\Users\tison` — `turbopack.root` is now pinned in next.config so builds ignore it; don't delete the user's file.
  - Binance geo-block status untested on this machine (`.env` already sets `BINANCE_REST_URL` per the macOS session-6 workaround).
  - `bun` presence not verified (not needed anymore — `start` runs node + cross-env since Session 52).
- **Session 53 update (2026-09-02):** `.env` had a stale SQLite `DATABASE_URL` (pre-Vercel-migration leftover), which broke `db:push` and silently made the Prisma client fall back to a sqlite file DB for ad-hoc scripts. Fixed: Postgres 18.4 runs locally (`postgres`/`postgres`, port 5432), created a `proxigrid` database, `.env` now points at `postgresql://...localhost:5432/proxigrid` (value in local `.env` only, never tracked). `npm run db:push` verified. Also: port 3000 has TWO listeners on this machine — another app holds `[::1]:3000` (IPv6 localhost), the Next dev server holds `0.0.0.0:3000`; probe with `127.0.0.1:3000`, not `localhost`.
