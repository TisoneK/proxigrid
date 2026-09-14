# Session Summary (compressed history — entries are removable)

One compact entry per session, newest at the bottom. Unlike
`agents/sessions.md` (the formal registry, append-only forever), this
file is a **working summary**: entries may be removed when a session is
no longer useful, and older detail is expected to compress over time.

The purpose is **continuity, not archival completeness**. A future agent
should understand at a glance what important work happened recently,
what significant decisions were made, and where to find detail if needed.

Entries are separated by `---` so agents can parse them as discrete
records.

<!-- TEMPLATE — copy below the last entry:
---
- **YYYY-MM-DD — Session N** — <agent> / <model> — <one-line outcome>.
  <Key decision or discovery, if any.>
  Detail: .context_ledger/memory/office/sessions/YYYY-MM-DD-N/notes.md (or \"summary only\").
-->

<!-- GC GUIDANCE (not part of the template — remove this comment before committing):
- Keep all entries from the last ~10 sessions.
- Older entries: distill key facts into the durable logs (decisions,
  inefficiencies, backlog) if they haven't been promoted already, then
  remove the summary line. The compact entry in agents/sessions.md is
  the permanent record that the session happened.
- Never let SUMMARY.md become another giant history file — if it exceeds
  ~40 lines, it's time to compress.
- A removed summary line MUST have a corresponding permanent entry in
  agents/sessions.md — never delete the only record of a session.
-->

---
- **2026-09-13 — Session 71** — ZCode (Mei/S071) / GLM-5.3-Flash — Closed office-001 (70 sessions) verbatim into `history/office-001/` with its permanent record; fresh office re-seeded (8 backlog rows incl. 2 newly backlogged threads, 2 live traps). Also cleared the new js-yaml high advisory with a lockfile-only bump (`npm audit` 0). Detail: summary only.

---
- **2026-09-14 — Session 2** — Claude Code (Rhea/S002) / qwen3.8-flash[1m] — Context sync; applied core 1.0.6→1.1.1 (entrypoints regenerated, roster to 6-col), baseline re-verified 191/191. Renumbered from a mis-carried S072 after supervisor correction — fresh offices number from S001. Detail: summary only.
