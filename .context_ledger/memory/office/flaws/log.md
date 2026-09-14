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
## 2026-09-14 — Rhea / qwen3.8-flash[1m] (Session 72)

- **Flaw:** `ledger-mem lint --tree` reports every generated protocol entrypoint (`AGENTS.md`, `CLAUDE.md`) as a one-way-linkage leak.
- **Symptom:** First run of the new tree sweep after the core 1.1.1 migration exits 1 with ~40 LEAK hits, all of them `.context_ledger/` path citations inside `AGENTS.md` and `CLAUDE.md` — files whose content is dictated by `core/templates/AGENTS.md` / `core/templates/CLAUDE.md` and whose whole job is routing agents into `.context_ledger/`. Following the "strip on sight" instruction literally would destroy the routing files; an agent that doesn't spot the false positive either wrecks its own entrypoints or wastes the session arguing with the gate.
- **Root cause:** `--tree` excludes only the `.context_ledger/` directory; the rule it enforces ("product code must stand on its own") is about *product* files, but the agent-instruction files at the repo root are protocol-owned surfaces, not product — the exclusion list predates them being swept.
- **Suggested fix:** in `ledger-mem lint --tree`, skip the protocol entrypoints generated from core templates (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules*`) — or scope the sweep to the product tree only.
- **Status:** open
