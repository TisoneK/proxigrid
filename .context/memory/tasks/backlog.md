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
- [ ] **Upgrade deprecated packages** (added 2026-08-27 by Kiro) — Two deprecated packages were flagged during npm install: `recharts@2.15.4` (1.x and 2.x branches no longer active, upgrade to v3 needed per https://github.com/recharts/recharts/wiki/3.0-migration-guide) and `eslint@9.39.5` (version no longer supported per https://eslint.org/version-support). Low severity but should be addressed to stay current with security patches and bug fixes.
