# Flaws Log (append-only — flows to the protocol package)

Friction caused by the `.context_ledger/` system or the protocol itself. See
`README.md` in this directory for the split between `flaws/` and
`inefficiencies/`.

Append-only, but prunable to cold storage: once an entry is explicitly
marked `RESOLVED` / `superseded` / fixed, move it **verbatim** into
`archive.md` in this directory so startup reads only the live entries.
`ledger-mem prune` reports which entries are archive-eligible (`--list`
names them); age alone never makes an entry eligible — an unresolved flaw
stays here as a live trap.

<!-- TEMPLATE — copy below the last entry:
---
## YYYY-MM-DD — <agent> / <model> (Session N)

- **Flaw:** <what in the protocol or .context_ledger/ system didn't work>
- **Symptom:** <what happened to the agent — the observable friction>
- **Root cause:** <why the protocol/.context_ledger/ let this happen>
- **Suggested fix:** <concrete change to the package — a step, a pitfall,
  a template, a rule>
- **Status:** open | fixed in package <commit-sha or date>
-->

---
## 2026-09-14 — Rhea / qwen3.8-flash[1m] (S002)

- **Flaw:** `ledger-mem lint --tree` reports every generated protocol entrypoint (`AGENTS.md`, `CLAUDE.md`) as a one-way-linkage leak.
- **Symptom:** First run of the new tree sweep after the core 1.1.1 migration exits 1 with ~40 LEAK hits, all of them `.context_ledger/` path citations inside `AGENTS.md` and `CLAUDE.md` — files whose content is dictated by `core/templates/AGENTS.md` / `core/templates/CLAUDE.md` and whose whole job is routing agents into `.context_ledger/`. Following the "strip on sight" instruction literally would destroy the routing files; an agent that doesn't spot the false positive either wrecks its own entrypoints or wastes the session arguing with the gate.
- **Root cause:** `--tree` excludes only the `.context_ledger/` directory; the rule it enforces ("product code must stand on its own") is about *product* files, but the agent-instruction files at the repo root are protocol-owned surfaces, not product — the exclusion list predates them being swept.
- **Suggested fix:** in `ledger-mem lint --tree`, skip the protocol entrypoints generated from core templates (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules*`) — or scope the sweep to the product tree only.
- **Status:** open

---
## 2026-09-14 — Rhea / qwen3.8-flash[1m] (S002)

- **Flaw:** the fresh office's session registry seeded a number that contradicts the 1.1.0 clean-restart rule, and no check flagged it.
- **Symptom:** at check-in I read "the next free session number" from the last `agents/sessions.md` entry per kickoff Step 2, and the office-001 close (run under core 1.0.6, whose rule said numbering *continues* across the boundary) had logged "Session 71" into the fresh office — so I signed S072. The supervisor corrected it: under 1.1.0 a fresh office numbers from S001/Session 1; this office holds 2.
- **Root cause:** the office-001 close straddled the 1.1.0 rule change and its registry entry kept the old carry-over convention; the door rule only fires the *close* when the registry is past `office_size` — nothing validates that a non-empty fresh registry starts at Session 1, and the check-in step reads "next free number" purely mechanically.
- **Suggested fix:** when `ledger-history close` seeds the new office, write the frozen registry's last entries into `history/` only (registry starts from the empty skeleton); and/or have `ledger-mem check` warn when the office's first entry isn't "Session 1" while `history/` holds a prior office.
- **Status:** open
