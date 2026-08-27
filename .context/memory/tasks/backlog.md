# Backlog (append-only)

Open items for future sessions. Append at the bottom; never delete or
reorder. When an item is done, check it off and note the session/commit —
don't remove the line.

<!-- TEMPLATE — copy below the last entry:
---
- [ ] **<short title>** (added YYYY-MM-DD by <agent>) — <enough context that
      a fresh agent can act on this without any chat history. Severity if known.>
-->

---
- [ ] **Remaining prisma-chain security advisory** (added 2026-08-26 by Claude Code) — 3 high-severity advisories persist after `npm audit fix --force`: `prisma` → `@prisma/config` → `deepmerge-ts <8.0.0` (GHSA-ggr8-5vv4-36mx, stack exhaustion on recursive-object-graph merges). Build-time CLI tooling; `prisma`/`@prisma/client` are at 6.19.3. The only fix npm offers is a prisma dev pre-release, so it was left in place. Recheck when Prisma ships a stable release whose `@prisma/config` pins `deepmerge-ts@>=8`.
- [x] **Pre-existing lint errors: setState-in-effect** (added 2026-08-26 by Claude Code) — `npm run lint` reported 5 errors (`react-hooks/set-state-in-effect`) in `count-up.tsx`, `header.tsx`, `carousel.tsx`, and `use-mobile.ts`. Fixed in commit cdd4576 via `useSyncExternalStore` (media query / clock / Embla) and derived render state (count-up); lint clean, build green. (done 2026-08-26, Session 3)

---
- [x] **Upgrade deprecated packages** (added 2026-08-27 by Kiro) — Two deprecated packages were flagged during npm install: `recharts@2.15.4` (1.x and 2.x branches no longer active, upgrade to v3 needed per https://github.com/recharts/recharts/wiki/3.0-migration-guide) and `eslint@9.39.5` (version no longer supported per https://eslint.org/version-support). Low severity but should be addressed to stay current with security patches and bug fixes. **Partially done (2026-08-26, Session 5, commit d6986e6): recharts → 3.10.1 (chart.tsx ported to v3 types; +react-is ^19). eslint deferred — see item below.**
- [x] **Markets grid has no error state on data-fetch failure** (added 2026-08-26 by Claude Code, Session 6) — When `/api/markets/[exchange]/ticker` fails (e.g. Binance HTTP 451 geo-block → 500), the Markets grid (`src/components/dashboard/`, the MarketGrid) shows loading skeletons indefinitely with no error/empty state surfaced to the user. Contrast the Portfolio panel, which shows a clean "Unconfigured: binance" message. Add an error/empty state to the market grid (surface the API error + a retry). Medium/UX severity. **Done (2026-08-26, Session 7, commit 05543e0): added an Offline badge + error/empty panel with a Retry button, shown whenever the query settles with no data (robust to dev StrictMode swallowing react-query's isError). Verified live against a broken endpoint.**
- [ ] **Binance User Data Streams + listenKey lifecycle** (added 2026-08-26 by Claude Code, Session 8) — Not implemented. For real-time execution reports and balance updates, add a private user WebSocket stream: `POST /api/v3/userDataStream` to get a listenKey, keep it alive with a `PUT` ping every ~30 min (expires after 60), and `DELETE` on shutdown (manual §4). Would let AutomationService react to fills without polling. Needs API credentials.
- [ ] **Binance FIX protocol connectivity** (added 2026-08-26 by Claude Code, Session 8) — Out of scope for now; institutional low-latency order entry over persistent TCP (manual §1). Only worth it for HFT use cases; the REST/WS adapter covers current needs.
- [ ] **eslint 10 blocked by Next lint stack** (added 2026-08-26 by Claude Code) — The whole eslint 9.x line (incl. latest 9.39.5) is flagged "no longer supported", so the deprecation can only be cleared by eslint 10. But `eslint-config-next@16`'s bundled `eslint-plugin-react` caps its eslint peer at `^9.7` (no ^10) and **crashes `npm run lint` under eslint 10** (verified 2026-08-26). Kept on `^9` so lint keeps working. Recheck when `eslint-config-next` / `eslint-plugin-react` ship eslint-10 support, then bump `eslint` to `^10` and re-run `npm run lint`.
