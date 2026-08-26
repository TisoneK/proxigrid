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
  - Lint: `npm run lint` (clean on eslint 9). Typecheck: `npx tsc --noEmit` (has pre-existing errors — see backlog). Build: `npx next build` (green; skips type validation).
  - DB: create `.env` with `DATABASE_URL="file:./dev.db"`, then `npm run db:push` (creates `prisma/dev.db`, gitignored). No seed script — DB starts empty.
  - Run app: `npm run dev` → http://localhost:3000 (Next 16, Turbopack). Preferred via `.claude/launch.json` (server name `proxigrid-dev`). `.claude/` is gitignored, so the launch.json is local-only.
- **Quirks:** Repo was initially checked out entirely as `root:staff`, blocking all writes and commits; fixed with `sudo chown -R bao:staff /Users/bao/Code/proxigrid`. Git then reported "dubious ownership"; added `git config --global --add safe.directory /Users/bao/Code/proxigrid`. Git user identity was unset — configured repo-locally as `Tisone Kironget <tisonkironget@gmail.com>`. **Binance is geo-restricted here:** `api.binance.com` and `testnet.binance.vision` return HTTP 451, 500-ing the market endpoints; set `BINANCE_REST_URL="https://data-api.binance.vision"` in `.env` (public data endpoint, reachable) to get live market data — supported via the override added in Session 6.
