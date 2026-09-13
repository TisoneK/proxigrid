# Inefficiency Log (append-only, mandatory)

Every session appends one block — honestly. Friction you absorb silently
is friction the next agent hits blind. "None this session" is valid only
if literally nothing slowed you down.

Most inefficiencies are project-local (an environment quirk, a one-off
cost) and stay here. When one is actually **protocol-level** — the core
workflow itself made you slower and every project would hit it — mark it
`Upstream: candidate`. `ledger-sync harvest` collects those (and open
`flaws/`) into the package for an upstream fix. Unmarked entries are
never harvested.

Append-only, but prunable to cold storage: once an entry is explicitly
marked `RESOLVED` / `superseded` / fixed, move it **verbatim** into
`archive.md` in this directory so startup reads only the live entries.
`ledger-mem prune` reports which entries are archive-eligible; age alone
never makes an entry eligible.

<!-- TEMPLATE — copy below the last entry:
---
## YYYY-MM-DD — <agent> / <model>
- **Problem:** <what went wrong or was slower than it should be>
- **Cost:** <rough time/effort wasted>
- **Cause:** <root cause if known>
- **Workaround / fix:** <what worked, or "unresolved">
- **Prevent next time:** <protocol/context change that would have avoided it>
- **Upstream:** candidate  ← add this line ONLY for protocol-level friction
  worth a core fix; omit entirely for project-local friction.
-->

---
## 2026-09-02 — ZCode / glm-5.3-flash (re-seeded from office-001, still live)
- **Problem:** Stopping a background `npm run dev` (TaskStop / Ctrl-C) kills the npm wrapper but orphans the node child on Windows — the stale server keeps port 3000 and serves old code, causing confusing 404s/hangs during verification.
- **Cost:** ~10 minutes of misdiagnosis in the original session.
- **Cause:** Windows process-tree semantics: killing npm/cmd does not propagate to the node grandchild.
- **Workaround / fix:** After stopping a dev server, verify with `netstat -ano | findstr :3000` and `taskkill //F //T //PID <pid>` (tree kill) any surviving node.exe before restarting.
- **Prevent next time:** Re-seeded here because it recurs on every Windows machine this repo runs on; also noted in the environment blocks.

---
## 2026-09-03 — Claude Code / claude-opus-4-8 (re-seeded from office-001, still live)
- **Problem:** After `git pull` brings in a `prisma/schema.prisma` change, `tsc` and `next build` fail with "Property X does not exist" — the pulled code references fields the *local* generated Prisma client doesn't know yet.
- **Cost:** A red integration gate that looks like broken code but is a stale client (~2 minutes to diagnose).
- **Cause:** `postinstall: prisma generate` regenerates on install, not on pull.
- **Workaround / fix:** `npx prisma generate`, then re-run the gates.
- **Prevent next time:** After any pull that touches `prisma/schema.prisma`, run `npx prisma generate` before trusting typecheck/build.
