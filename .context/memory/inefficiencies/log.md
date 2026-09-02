# Inefficiency Log (append-only, mandatory)

Every session appends one block — honestly. Friction you absorb silently
is friction the next agent hits blind. "None this session" is valid only
if literally nothing slowed you down.

Most inefficiencies are project-local (an environment quirk, a one-off
cost) and stay here. When one is actually **protocol-level** — the core
workflow itself made you slower and every project would hit it — mark it
`Upstream: candidate`. `context-sync harvest` collects those (and open
`flaws/`) into the package for an upstream fix. Unmarked entries are
never harvested.

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
## 2026-09-02 — ZCode / glm-5.3-flash
- **Problem:** First session on this Windows machine required environment discovery from scratch (git identity fine, but line-ending config, shell, DB state, and toolchain all unknown; `environments.md` only had bao's macOS block).
- **Cost:** ~10 minutes of checks (node version, autocrlf, DB probe, lockfile).
- **Cause:** New machine, first Windows-based session in the repo's history.
- **Workaround / fix:** Ran discovery probes directly; recorded a full environment block in `system/environments.md` so the next Windows session starts warm.
- **Prevent next time:** Done — see environments.md "Tisone's Windows workstation".

---
## 2026-09-02 — ZCode / glm-5.3-flash
- **Problem:** `npm audit` says "fix available via `npm audit fix`" for the prisma→deepmerge-ts chain, but the dry-run shows no in-range fix exists (the "fix" is prisma 8, still an RC).
- **Cost:** A few minutes confirming via `npm view` that no stable release clears the advisory; risk of a future agent running the fix and getting a pre-release dependency.
- **Cause:** npm audit's messaging conflates "a semver-incompatible release exists" with "a fix is available".
- **Workaround / fix:** Verified with `npm view prisma version` (8.0.0-rc.12) + `npm audit fix --dry-run`; left the dependency untouched. Backlog entry already covers it.
- **Prevent next time:** Distrust "fix available" without a dry-run; this is now noted in the backlog item itself.

---
## 2026-09-02 — ZCode / glm-5.3-flash
- **Problem:** Stopping a background `npm run dev` (TaskStop / Ctrl-C) kills the npm wrapper but orphans the node child on Windows — the stale server kept port 3000 and served old code, causing confusing 404s/hangs during verification.
- **Cost:** ~10 minutes of misdiagnosis across two start/stop cycles.
- **Cause:** Windows process-tree semantics: killing npm/cmd does not propagate to the node grandchild.
- **Workaround / fix:** After stopping a dev server, verify with `netstat -ano | findstr :3000` and `taskkill //F //PID <pid>` any surviving node.exe before restarting.
- **Prevent next time:** Recorded here and in environments.md quirks; prefer `taskkill //F //T //PID` (tree kill) when cleaning up.
